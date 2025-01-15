import { Pinecone } from '@pinecone-database/pinecone';
import { createClient } from '@supabase/supabase-js';
import OpenAI from "openai";

// Initialize OpenAI client for chat
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
const INDEX_NAME = "minutes";
let INDEX_HOST: string;

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

// Helper function to process content
function processContent(content: string | null): string {
  if (!content) return '';
  // Replace literal \n with actual newlines, handle double-escaped if present
  return content
    .replace(/\\n/g, '\n')  // Replace \n with newline
    .replace(/\n\s*\n\s*\n/g, '\n\n')  // Normalize multiple newlines to double
    .trim();
}

// Get the index host on startup
async function getIndexHost() {
  const response = await fetch(`https://api.pinecone.io/indexes/${INDEX_NAME}`, {
    headers: {
      'Api-Key': process.env.PINECONE_API_KEY!,
      'X-Pinecone-API-Version': '2025-01'
    }
  });
  if (!response.ok) {
    throw new Error('Failed to get index host');
  }
  const indexData = await response.json();
  INDEX_HOST = indexData.host;
}

// Initialize index host
getIndexHost().catch(console.error);

const server = Bun.serve({
  port: process.env.PORT || 3000,
  async fetch(req) {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders });
    }

    try {
      // Validate environment variables and index host
      const openaiKey = process.env.OPENAI_API_KEY;
      const pineconeKey = process.env.PINECONE_API_KEY;
      
      if (!openaiKey || !pineconeKey || !INDEX_HOST) {
        throw new Error('Missing required configuration');
      }

      const { query, history = [], previousDocIds = [] } = await req.json() as RequestBody;
      
      console.log(`\nProcessing query: "${query}"`);
      console.log('Previous doc IDs:', previousDocIds);
      
      // Search using Pinecone's integrated search
      console.log('\nExecuting Pinecone integrated search...');
      const searchResponse = await fetch(`https://${INDEX_HOST}/records/namespaces/minutes/search`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Api-Key': pineconeKey,
          'X-Pinecone-API-Version': '2025-01'
        },
        body: JSON.stringify({
          query: {
            inputs: { text: query },
            top_k: 5
          },
          
        })
      });

      if (!searchResponse.ok) {
        const errorText = await searchResponse.text();
        console.error('Pinecone search failed:', errorText);
        throw new Error(`Pinecone search failed: ${errorText}`);
      }

      const searchResults = await searchResponse.json();
      console.log('\nPinecone search results:', JSON.stringify(searchResults, null, 2));
      
      // Get IDs from search results
      const matchIds = searchResults.result.hits
        .filter(hit => hit._score >= RELEVANCE_THRESHOLD_GPT)
        .map(hit => hit._id);
      console.log('\nMatched IDs above GPT threshold:', matchIds);

      // Add previous doc IDs if they're not in new results
      const allDocIds = Array.from(new Set([...matchIds, ...previousDocIds]));
      console.log('All doc IDs to fetch:', allDocIds);
      
      // Fetch full records from Supabase
      console.log('\nFetching records from Supabase...');
      const { data: minutesData, error: supabaseError } = await supabase
        .from('minutes')
        .select('*')
        .in('id', allDocIds);
        
      if (supabaseError) {
        console.error('Supabase error:', supabaseError);
        throw new Error(`Supabase error: ${supabaseError.message}`);
      }
      console.log('Found', minutesData?.length || 0, 'records in Supabase');

      // Combine search results with Supabase data
      const results = searchResults.result.hits.map(hit => {
        const minuteRecord = minutesData?.find(m => m.id.toString() === hit._id);
        if (!minuteRecord) {
          console.warn(`No Supabase record found for ID: ${hit._id}`);
        }
        return {
          id: hit._id,
          score: hit._score,
          metadata: hit.fields || {},
          content: processContent(minuteRecord?.content)
        };
      });

      // Filter results for GPT context
      const gptResults = results.filter(r => r.score >= RELEVANCE_THRESHOLD_GPT);
      console.log('\nResults for GPT context:', gptResults.length);
      gptResults.forEach(r => console.log(`- [${r.id}] Score: ${r.score.toFixed(4)}, Content length: ${r.content?.length || 0}`));

      // Prepare conversation history for GPT
      const conversationHistory: ChatHistoryMessage[] = history.map(msg => ({
        role: msg.isUser ? "user" : "assistant",
        content: msg.content
      }));
      console.log('\nConversation history length:', conversationHistory.length);

      // Send query and context to GPT-4
      const contextText = gptResults
        .map(r => r.content)
        .filter(Boolean)
        .join('\n\n');
      console.log('\nTotal context length for GPT:', contextText.length);

      console.log('\nCalling GPT-4...');

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