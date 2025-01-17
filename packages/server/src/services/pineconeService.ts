import { SearchResult } from "../types";

interface IndexConfig {
  host?: string;
  name: string;
}

export class PineconeClient {
  private static instance: PineconeClient;
  private readonly apiKey: string;
  private readonly indexes: Map<string, IndexConfig>;
  private readonly batchSize: number;
  private readonly rateLimit: number;
  private readonly apiVersion: string;

  private constructor() {
    this.apiKey = process.env.PINECONE_API_KEY!;
    this.indexes = new Map();
    this.batchSize = 20;
    this.rateLimit = 500;
    this.apiVersion = "2025-01";
  }

  public static getInstance(): PineconeClient {
    if (!PineconeClient.instance) {
      PineconeClient.instance = new PineconeClient();
    }
    return PineconeClient.instance;
  }

  public registerIndex(name: string): void {
    if (!this.indexes.has(name)) {
      this.indexes.set(name, { name });
    }
  }

  private getAdminHeaders(contentType: string = "application/json"): HeadersInit {
    return {
      "Content-Type": contentType,
      "Api-Key": this.apiKey,
      "X-Pinecone-API-Version": this.apiVersion
    };
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async ensureIndexConfig(indexName: string): Promise<IndexConfig> {
    const config = this.indexes.get(indexName);
    if (!config) {
      throw new Error(`Index ${indexName} not registered. Call registerIndex first.`);
    }
    
    if (!config.host) {
      const response = await fetch(`https://api.pinecone.io/indexes/${indexName}`, {
        headers: this.getAdminHeaders()
      });

      if (!response.ok) {
        throw new Error(`Failed to get index host for ${indexName}`);
      }
      
      const indexData = await response.json();
      config.host = indexData.host;
      this.indexes.set(indexName, config);
    }

    return config;
  }

  public async search(indexName: string, query: string): Promise<SearchResult[]> {
    const config = await this.ensureIndexConfig(indexName);

    const searchResponse = await fetch(
      `https://${config.host}/records/namespaces/${indexName}/search`, 
      {
        method: "POST",
        headers: this.getAdminHeaders(),
        body: JSON.stringify({
          query: {
            inputs: { text: query },
            top_k: 5
          },
        })
      }
    );

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      throw new Error(`Pinecone search failed for index ${indexName}: ${errorText}`);
    }

    const searchResults = await searchResponse.json();
    return searchResults.result.hits.map((hit: any) => ({
      id: hit._id,
      score: hit._score,
      metadata: hit.fields || {},
      content: ""
    }));
  }

  public async deleteIndex(indexName: string): Promise<void> {
    console.log(`Deleting index ${indexName} if it exists...`);

    const response = await fetch(`https://api.pinecone.io/indexes/${indexName}`, {
      method: "DELETE",
      headers: this.getAdminHeaders()
    });

    if (!response.ok && response.status !== 404) {
      const error = await response.json();
      throw new Error(`Failed to delete index ${indexName}: ${JSON.stringify(error)}`);
    }
    
    // Clear the cached host if it exists
    const config = this.indexes.get(indexName);
    if (config) {
      config.host = undefined;
      this.indexes.set(indexName, config);
    }
    
    console.log(`Index ${indexName} deleted or did not exist`);
    await this.sleep(10000);
  }

  public async createOrConfigureIndex(indexName: string, options: {
    cloud?: string;
    region?: string;
    model?: string;
  } = {}): Promise<boolean> {
    console.log(`Creating/configuring Pinecone index ${indexName}...`);
    try {
      console.log("Creating new index...");
      const response = await fetch("https://api.pinecone.io/indexes/create-for-model", {
        method: "POST",
        headers: this.getAdminHeaders(),
        body: JSON.stringify({
          name: indexName,
          cloud: options.cloud || "aws",
          region: options.region || "us-east-1",
          embed: {
            model: options.model || "pinecone-sparse-english-v0",
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
          console.log(`Index ${indexName} already exists, proceeding...`);
        } else {
          throw new Error(`Failed to create index ${indexName}: ${JSON.stringify(error)}`);
        }
      } else {
        const indexData = await response.json();
        console.log(`Index ${indexName} created successfully`);
        this.indexes.set(indexName, { name: indexName, host: indexData.host });
      }

      // Ensure we have the host
      await this.ensureIndexConfig(indexName);
      await this.sleep(5000);
      return true;
    } catch (error) {
      console.error(`Error configuring index ${indexName}:`, error);
      throw error;
    }
  }

  public async processRecordsBatch(indexName: string, records: any[]): Promise<void> {
    const config = await this.ensureIndexConfig(indexName);

    const ndjsonRecords = records.map(record => JSON.stringify({
      _id: record.id.toString(),
      content: record.content,
      ...record.metadata // Allow flexible metadata
    })).join("\n");

    const response = await fetch(
      `https://${config.host}/records/namespaces/${indexName}/upsert`,
      {
        method: "POST",
        headers: this.getAdminHeaders("application/x-ndjson"),
        body: ndjsonRecords
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to upsert records to ${indexName}: ${JSON.stringify(error)}`);
    }
  }

  public async runIndexingPipeline(indexName: string, records: any[]): Promise<void> {
    try {
      await this.deleteIndex(indexName);
      await this.createOrConfigureIndex(indexName);

      if (!records || records.length === 0) {
        console.log("No records found to process");
        return;
      }

      console.log(`Found ${records.length} records to process`);

      for (let i = 0; i < records.length; i += this.batchSize) {
        const batch = records.slice(i, i + this.batchSize);
        const batchNumber = Math.floor(i / this.batchSize) + 1;
        const totalBatches = Math.ceil(records.length / this.batchSize);

        console.log(`Processing batch ${batchNumber}/${totalBatches} (${batch.length} records)`);

        try {
          await this.processRecordsBatch(indexName, batch);
          console.log(`✓ Completed batch ${batchNumber}/${totalBatches}`);
        } catch (batchError) {
          console.error(`Error processing batch ${batchNumber}:`, batchError);
        }

        if (i + this.batchSize < records.length) {
          console.log(`Waiting ${this.rateLimit}ms before next batch...`);
          await this.sleep(this.rateLimit);
        }
      }

      console.log("\nProcessing complete!");
    } catch (error) {
      console.error("Fatal error:", error);
      throw error;
    }
  }
}