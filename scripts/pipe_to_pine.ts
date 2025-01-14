import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";
import { createClient } from '@supabase/supabase-js';

// Initialize clients
const pc = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  // Get the index
  const index = await pc.index("minutes");

  // Fetch minutes from Supabase
  const { data: minutes, error } = await supabase
    .from('minutes')
    .select('*')
    .order('id');

  if (error) {
    console.error('Error fetching from Supabase:', error);
    return;
  }

  // Process each record
  for (const record of minutes || []) {
    try {
      console.log("processing record", record);
      
    //   Generate embedding
      const embedding = await openai.embeddings.create({
        model: "text-embedding-3-large",
        input: record.content,
        encoding_format: "float"
      });

    //   Insert into Pinecone
      await index.upsert([{
        id: record.id.toString(),
        values: embedding.data[0].embedding,
        metadata: {
          channel_id: record.channel_id || "",
          time_period_start: record.time_period_start || "",
          time_period_end: record.time_period_end || "",
        }
      }]);

      console.log(`Processed record ${record.id}`);
    } catch (error) {
      console.error(`Error processing record ${record.id}:`, error);
    }
  }
}

main().catch(console.error);
