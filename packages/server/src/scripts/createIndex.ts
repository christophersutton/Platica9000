import { PineconeClient } from '../services/pineconeService';

async function createIndex() {
  const indexName = process.argv[2];
  if (!indexName) {
    console.error('Please provide an index name as an argument');
    process.exit(1);
  }

  try {
    const client = PineconeClient.getInstance();
    client.registerIndex(indexName);
    
    await client.createOrConfigureIndex(indexName, {
      // You can customize these options if needed
      cloud: 'aws',
      region: 'us-east-1',
      model: 'pinecone-sparse-english-v0'
    });
    
    console.log(`Index ${indexName} created successfully!`);
  } catch (error) {
    console.error('Failed to create index:', error);
    process.exit(1);
  }
}

createIndex(); 