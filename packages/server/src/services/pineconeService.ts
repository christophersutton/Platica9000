import { pinecone, supabase } from "../config";
import { SearchResult } from "../types";

/** Constants */
const BATCH_SIZE = 20;
const RATE_LIMIT_DELAY = 500;
export const INDEX_NAME = "minutes";

// We export this so other modules can use it or override it
export let INDEX_HOST: string;

/** Common headers for Pinecone admin operations */
function getPineconeAdminHeaders(contentType: string = "application/json") {
  return {
    "Content-Type": contentType,
    "Api-Key": process.env.PINECONE_API_KEY!,
    "X-Pinecone-API-Version": "2025-01"
  };
}

/** Sleep helper */
async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** 
 * Initialize host if not already set.
 * This was used at server startup, 
 * or you can call createOrConfigureIndex (which also sets INDEX_HOST).
 */
export async function initializeIndexHost(): Promise<string> {
  if (INDEX_HOST) return INDEX_HOST; // If already initialized, return
  
  const response = await fetch(`https://api.pinecone.io/indexes/${INDEX_NAME}`, {
    headers: getPineconeAdminHeaders()
  });

  if (!response.ok) {
    throw new Error("Failed to get index host");
  }
  
  const indexData = await response.json();
  INDEX_HOST = indexData.host;
  return INDEX_HOST;
}

/** Search the existing Pinecone index */
export async function searchPinecone(query: string): Promise<SearchResult[]> {
  // Ensure INDEX_HOST is set
  if (!INDEX_HOST) {
    await initializeIndexHost();
  }

  const searchResponse = await fetch(`https://${INDEX_HOST}/records/namespaces/${INDEX_NAME}/search`, {
    method: "POST",
    headers: getPineconeAdminHeaders(),
    body: JSON.stringify({
      query: {
        inputs: { text: query },
        top_k: 5
      },
    })
  });

  if (!searchResponse.ok) {
    const errorText = await searchResponse.text();
    throw new Error(`Pinecone search failed: ${errorText}`);
  }

  const searchResults = await searchResponse.json();
  return searchResults.result.hits.map((hit: any) => ({
    id: hit._id,
    score: hit._score,
    metadata: hit.fields || {},
    content: ""
  }));
}

/** Delete the entire Pinecone index if it exists */
export async function deleteIndex() {
  console.log("Deleting existing index if it exists...");

  const response = await fetch(`https://api.pinecone.io/indexes/${INDEX_NAME}`, {
    method: "DELETE",
    headers: getPineconeAdminHeaders()
  });

  if (!response.ok && response.status !== 404) {
    const error = await response.json();
    throw new Error(`Failed to delete index: ${JSON.stringify(error)}`);
  }
  
  console.log("Index deleted or did not exist");
  // Wait for deletion to complete
  await sleep(10000);
}

/** Create or configure the Pinecone index, setting INDEX_HOST */
export async function createOrConfigureIndex() {
  console.log("Creating/configuring Pinecone index...");
  try {
    // Attempt to create index
    console.log("Creating new index...");
    const response = await fetch("https://api.pinecone.io/indexes/create-for-model", {
      method: "POST",
      headers: getPineconeAdminHeaders(),
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
      if (error.message?.includes("already exists")) {
        console.log("Index already exists, proceeding...");
      } else {
        throw new Error(`Failed to create index: ${JSON.stringify(error)}`);
      }
    } else {
      const indexData = await response.json();
      console.log("Index created successfully");
      INDEX_HOST = indexData.host;
    }

    // If we didn't get the host from creation, describe the index
    if (!INDEX_HOST) {
      const describeResponse = await fetch(`https://api.pinecone.io/indexes/${INDEX_NAME}`, {
        headers: getPineconeAdminHeaders()
      });
      if (!describeResponse.ok) {
        throw new Error("Failed to get index host");
      }
      const indexData = await describeResponse.json();
      INDEX_HOST = indexData.host;
    }

    // Wait for the index to be ready
    await sleep(5000);
    return true;
  } catch (error) {
    console.error("Error configuring index:", error);
    throw error;
  }
}

/** Upsert a batch of 'minutes' into Pinecone */
export async function processMinutesBatch(minutes: any[]) {
  if (!INDEX_HOST) {
    await initializeIndexHost();
  }

  // Format records as NDJSON
  const ndjsonRecords = minutes.map(record => JSON.stringify({
    _id: record.id.toString(),
    content: record.content,
    channel_id: record.channel_id || "",
    time_period_start: record.time_period_start || "",
    time_period_end: record.time_period_end || ""
  })).join("\n");

  // Upsert to Pinecone using the records API
  const response = await fetch(`https://${INDEX_HOST}/records/namespaces/${INDEX_NAME}/upsert`, {
    method: "POST",
    headers: {
      ...getPineconeAdminHeaders("application/x-ndjson"),
    },
    body: ndjsonRecords
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to upsert records: ${JSON.stringify(error)}`);
  }
}

/** 
 * Example main function for a one-off script usage.
 * Delete existing index -> create/configure -> fetch minutes from Supabase -> upsert in batches
 */
export async function runIndexingPipeline() {
  try {
    // 1) Delete existing index (optional, if you want a fresh start)
    await deleteIndex();
    
    // 2) Create or configure the index
    await createOrConfigureIndex();

    // 3) Fetch all 'minutes' from Supabase
    const { data: minutes, error } = await supabase
      .from("minutes")
      .select("*")
      .order("id");

    if (error) {
      console.error("Error fetching from Supabase:", error);
      return;
    }

    if (!minutes || minutes.length === 0) {
      console.log("No minutes found to process");
      return;
    }

    console.log(`Found ${minutes.length} minutes to process`);

    // 4) Process in batches
    for (let i = 0; i < minutes.length; i += BATCH_SIZE) {
      const batch = minutes.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(minutes.length / BATCH_SIZE);

      console.log(`Processing batch ${batchNumber}/${totalBatches} (${batch.length} records)`);

      try {
        await processMinutesBatch(batch);
        console.log(`✓ Completed batch ${batchNumber}/${totalBatches}`);
      } catch (batchError) {
        console.error(`Error processing batch ${batchNumber}:`, batchError);
        // Continue next batch despite errors
      }

      // Rate-limiting delay between batches
      if (i + BATCH_SIZE < minutes.length) {
        console.log(`Waiting ${RATE_LIMIT_DELAY}ms before next batch...`);
        await sleep(RATE_LIMIT_DELAY);
      }
    }

    console.log("\nProcessing complete!");
  } catch (error) {
    console.error("Fatal error:", error);
  }
}
