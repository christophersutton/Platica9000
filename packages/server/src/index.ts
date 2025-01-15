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

// Constants for relevance thresholds
const RELEVANCE_THRESHOLD_GPT = 0.6;   // Threshold for including in GPT context
const RELEVANCE_THRESHOLD_CLIENT = 0.75; // Threshold for sending back to client

// Types for request body
interface ChatMessage {
  content: string;
  isUser: boolean;
}

interface RequestBody {
  query: string;
  history?: ChatMessage[];
  previousDocIds?: string[];
}

// Types for OpenAI chat
type MessageRole = "system" | "user" | "assistant";
interface ChatHistoryMessage {
  role: MessageRole;
  content: string;
}

interface MinuteMetadata {
  time_period_start?: string;
}

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

      const { query, history = [], previousDocIds = [] } = await req.json() as RequestBody;
      
      const embedding = await openai.embeddings.create({
        model: "text-embedding-3-large",
        input: query,
      });

      const index = pinecone.index('minutes');
      
      const queryResponse = await index.query({
        vector: embedding.data[0].embedding,
        topK: 5,  // Increased to 5
        includeMetadata: true,
      });

      // Get IDs from Pinecone results
      const matchIds = queryResponse.matches
        .filter(match => match.score >= RELEVANCE_THRESHOLD_GPT)  // Filter by GPT threshold
        .map(match => match.id);

      // Add previous doc IDs if they're not in new results
      const allDocIds = Array.from(new Set([...matchIds, ...previousDocIds]));
      
      // Fetch full records from Supabase
      const { data: minutesData, error: supabaseError } = await supabase
        .from('minutes')
        .select('*')
        .in('id', allDocIds);
        
      if (supabaseError) {
        throw new Error(`Supabase error: ${supabaseError.message}`);
      }

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

      // Filter results for GPT context
      const gptResults = results.filter(r => r.score >= RELEVANCE_THRESHOLD_GPT);

      // Prepare conversation history for GPT
      const conversationHistory: ChatHistoryMessage[] = history.map(msg => ({
        role: msg.isUser ? "user" : "assistant",
        content: msg.content
      }));

      // Send query and context to GPT-4
      const contextText = gptResults
        .map(r => r.content)
        .filter(Boolean)
        .join('\n\n');

      const completion = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          {
            role: "system" as const,
            content: "You are a helpful assistant that answers questions based on meeting minutes context. Keep responses concise and relevant. Use shorthand for names and dates. Do not include long lists. Maintain conversation context from previous messages."
          },
          ...conversationHistory,
          {
            role: "user" as const,
            content: `Context from relevant meeting minutes:\n\n${contextText}\n\nQuestion: ${query}`
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      });

      const answer = completion.choices[0].message.content;

      // Filter docs for client response using stricter threshold
      const sourceDocs = results
        .filter(result => result.score >= RELEVANCE_THRESHOLD_CLIENT && result.content)
        .map(result => {
          const metadata = result.metadata as MinuteMetadata;
          const date = metadata?.time_period_start 
            ? new Date(metadata.time_period_start).toISOString().split('T')[0]
            : null;

          return {
            id: result.id,
            date,
            content: result.content,
            score: result.score
          };
        })
        .sort((a, b) => {
          if (!a.date) return 1;
          if (!b.date) return -1;
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        });

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