import { Pinecone } from '@pinecone-database/pinecone';
import { createClient } from '@supabase/supabase-js';
import OpenAI from "openai";

// Initialize OpenAI client for embeddings
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Pinecone client
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!
);

// Add proper CORS handling
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const server = Bun.serve({
  port: process.env.PORT || 3000,
  async fetch(req) {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders });
    }

    try {
      // Validate environment variables early
      const openaiKey = process.env.OPENAI_API_KEY;
      const pineconeKey = process.env.PINECONE_API_KEY;
      
      if (!openaiKey || !pineconeKey) {
        throw new Error('Missing required environment variables');
      }

      const { query } = await req.json();
      
      
      const embedding = await openai.embeddings.create({
        model: "text-embedding-3-large",
        input: query,
      });

      const index = pinecone.index('minutes');
      
      const queryResponse = await index.query({
        vector: embedding.data[0].embedding,
        topK: 4,
        includeMetadata: true,
      });

      // Get IDs from Pinecone results
      const matchIds = queryResponse.matches.map(match => match.id);
      console.log('Match IDs:', matchIds);
      
      // Fetch full records from Supabase
      const { data: minutesData, error: supabaseError } = await supabase
        .from('minutes')
        .select('*')
        .in('id', matchIds);
        
      if (supabaseError) {
        throw new Error(`Supabase error: ${supabaseError.message}`);
      }

      if (!minutesData || minutesData.length === 0) {
        console.warn('No matching records found in Supabase');
      }
      
      console.log('Supabase results:', minutesData);

      // Combine Pinecone results with Supabase data
      const results = queryResponse.matches.map(match => {
        const minuteRecord = minutesData?.find(m => m.id.toString() === match.id);
        return {
          id: match.id,
          score: match.score,
          metadata: match.metadata,
          content: minuteRecord?.content
        };
      });
      console.log('Results:', results);

      // Send query and context to GPT-4 for summarization
      const contextText = [...results]
        .map(r => r.content)
        .filter(Boolean)
        .join('\n\n');

      const completion = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that answers questions based on meeting minutes context. Keep responses concise and relevant. Use shorthand for names and dates. Do not inlcude long lists. Do not include any other information than the answer to the question."
          },
          {
            role: "user", 
            content: `Context from relevant meeting minutes:\n\n${contextText}\n\nQuestion: ${query}`
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      });

      const answer = completion.choices[0].message.content;
      console.log(answer);

      // Add debug logging
      console.log('Pre-filter results:', results);

      // Debug minutesData first
      console.log('minutesData structure:', minutesData?.map(m => ({
        id: m.id,
        hasDate: !!m.date,
        date: m.date
      })));

      const sourceDocs = results
        // Only filter on content since that's what we definitely need
        .filter(result => result.content)
        .map(result => {
          // Use time_period_start from Pinecone metadata
          const date = result.metadata?.time_period_start 
            ? new Date(result.metadata.time_period_start).toISOString().split('T')[0]
            : null;

          return {
            date,
            content: result.content
          };
        })
        .sort((a, b) => {
          if (!a.date) return 1;
          if (!b.date) return -1;
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        });

      console.log('Formatted sourceDocs:', sourceDocs);

      return new Response(JSON.stringify({ 
        answer,
        sourceDocs 
      }), { 
        headers: { 
          "Content-Type": "application/json",
          ...corsHeaders
        } 
      });

    } catch (error) {
      console.error('Error:', error);
      return new Response(JSON.stringify({ error: error.message }), { 
        status: 500,
        headers: { 
          "Content-Type": "application/json",
          ...corsHeaders
        } 
      });
    }
  },
});

console.log(`Listening on http://localhost:${server.port}`); 