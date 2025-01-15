import { Pinecone } from "@pinecone-database/pinecone";
import { createClient } from '@supabase/supabase-js';

// Initialize clients
const pc = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!
);

// Constants
const BATCH_SIZE = 20;
const RATE_LIMIT_DELAY = 500;
const INDEX_NAME = "minutes";
let INDEX_HOST: string;

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function createOrConfigureIndex() {
  console.log('Creating/configuring Pinecone index...');
  try {
    // Create new index using the raw API endpoint
    console.log('Creating new index...');
    const response = await fetch('https://api.pinecone.io/indexes/create-for-model', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Api-Key': process.env.PINECONE_API_KEY!,
        'X-Pinecone-API-Version': '2025-01'
      },
      body: JSON.stringify({
        name: INDEX_NAME,
        cloud: "aws",
        region: "us-east-1",
        embed: {
          model: "pinecone-sparse-english-v0",
          field_map: {
            text: "content"
          },
          write_parameters: {
            input_type: "passage",
            truncate: "END"
          },
          read_parameters: {
            input_type: "query",
            truncate: "END"
          }
        }
      })
    });

    if (!response.ok) {
      const error = await response.json();
      if (error.message?.includes('already exists')) {
        console.log('Index already exists, proceeding...');
      } else {
        throw new Error(`Failed to create index: ${JSON.stringify(error)}`);
      }
    } else {
      const indexData = await response.json();
      console.log('Index created successfully');
      INDEX_HOST = indexData.host;
    }

    // If we didn't get the host from creation, try to describe the index
    if (!INDEX_HOST) {
      const describeResponse = await fetch(`https://api.pinecone.io/indexes/${INDEX_NAME}`, {
        headers: {
          'Api-Key': process.env.PINECONE_API_KEY!,
          'X-Pinecone-API-Version': '2025-01'
        }
      });
      if (describeResponse.ok) {
        const indexData = await describeResponse.json();
        INDEX_HOST = indexData.host;
      } else {
        throw new Error('Failed to get index host');
      }
    }

    // Wait a bit for the index to be ready
    await sleep(5000);
    return true;
  } catch (error) {
    console.error('Error configuring index:', error);
    throw error;
  }
}

async function processMinutesBatch(minutes: any[]) {
  // Format records as NDJSON
  const ndjsonRecords = minutes.map(record => JSON.stringify({
    _id: record.id.toString(),
    content: record.content,
    channel_id: record.channel_id || "",
    time_period_start: record.time_period_start || "",
    time_period_end: record.time_period_end || ""
  })).join('\n');

  // Upsert to Pinecone using the records API
  const response = await fetch(`https://${INDEX_HOST}/records/namespaces/minutes/upsert`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Api-Key': process.env.PINECONE_API_KEY!,
      'X-Pinecone-API-Version': '2025-01'
    },
    body: ndjsonRecords
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to upsert records: ${JSON.stringify(error)}`);
  }
}

async function deleteIndex() {
  console.log('Deleting existing index if it exists...');
  try {
    const response = await fetch(`https://api.pinecone.io/indexes/${INDEX_NAME}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Api-Key': process.env.PINECONE_API_KEY!,
        'X-Pinecone-API-Version': '2025-01'
      }
    });

    if (!response.ok && response.status !== 404) {
      const error = await response.json();
      throw new Error(`Failed to delete index: ${JSON.stringify(error)}`);
    }
    
    console.log('Index deleted or did not exist');
    // Wait for deletion to complete
    await sleep(10000);
  } catch (error) {
    console.error('Error deleting index:', error);
    throw error;
  }
}

async function main() {
  try {
    // Delete existing index first
    await deleteIndex();
    
    // Create or get the index
    await createOrConfigureIndex();

    // Fetch minutes from Supabase
    const { data: minutes, error } = await supabase
      .from('minutes')
      .select('*')
      .order('id');

    if (error) {
      console.error('Error fetching from Supabase:', error);
      return;
    }

    if (!minutes || minutes.length === 0) {
      console.log('No minutes found to process');
      return;
    }

    console.log(`Found ${minutes.length} minutes to process`);

    // Process in batches
    for (let i = 0; i < minutes.length; i += BATCH_SIZE) {
      const batch = minutes.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(minutes.length / BATCH_SIZE);
      
      console.log(`Processing batch ${batchNumber}/${totalBatches} (${batch.length} records)`);
      
      try {
        await processMinutesBatch(batch);
        console.log(`✓ Completed batch ${batchNumber}/${totalBatches}`);
      } catch (error) {
        console.error(`Error processing batch ${batchNumber}:`, error);
        // Continue with next batch despite errors
      }

      // Rate limiting delay between batches
      if (i + BATCH_SIZE < minutes.length) {
        console.log(`Waiting ${RATE_LIMIT_DELAY}ms before next batch...`);
        await sleep(RATE_LIMIT_DELAY);
      }
    }

    console.log('\nProcessing complete!');
  } catch (error) {
    console.error('Fatal error:', error);
  }
}

main().catch(console.error);
