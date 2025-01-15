import { Pinecone } from '@pinecone-database/pinecone';
import { createClient } from '@supabase/supabase-js';
import OpenAI from "openai";

// Validate environment variables
const requiredEnvVars = [
  'OPENAI_API_KEY',
  'PINECONE_API_KEY',
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_SERVICE_ROLE_KEY'
] as const;

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

// Constants
export const RELEVANCE_THRESHOLD_GPT = 0.6;
export const RELEVANCE_THRESHOLD_CLIENT = 0.75;
export const INDEX_NAME = "minutes";
export let INDEX_HOST: string;

// Headers
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export const sseHeaders = {
  ...corsHeaders,
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  'Connection': 'keep-alive'
};

// Initialize clients
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

export const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!
);

// Initialize Pinecone index host
export async function initializeIndexHost() {
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
  return INDEX_HOST;
} 