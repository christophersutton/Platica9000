import { RequestBody, MessageRole } from './types';
import { corsHeaders, sseHeaders, INDEX_HOST, RELEVANCE_THRESHOLD_GPT, initializeIndexHost } from './config';
import { searchPinecone, fetchMinutesContent, prepareSourceDocs, streamChatCompletion } from './services';

// Initialize index host on startup
initializeIndexHost().catch(console.error);

const server = Bun.serve({
  port: process.env.PORT || 3000,
  async fetch(req) {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders });
    }

    // Validate index host
    if (!INDEX_HOST) {
      return new Response(
        JSON.stringify({ error: 'Server not fully initialized' }), 
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
      );
    }

    try {
      // Check if this is a streaming request first
      const isStreamRequest = req.headers.get('Accept') === 'text/event-stream';
      
      // Parse request body
      let body: RequestBody;
      try {
        body = await req.json() as RequestBody;
      } catch (error) {
        return new Response(
          JSON.stringify({ error: 'Invalid request body' }), 
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
        );
      }

      // Validate query parameter
      if (!body.query?.trim()) {
        return new Response(
          JSON.stringify({ error: 'Query parameter is required' }), 
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
        );
      }

      const { query, history = [], previousDocIds = [] } = body;
      
      if (!isStreamRequest) {
        return new Response(
          JSON.stringify({ status: 'ok', query }), 
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
        );
      }

      console.log(`\nProcessing query: "${query}"`);
      console.log('Previous doc IDs:', previousDocIds);

      // Create stream for server-sent events
      const stream = new ReadableStream({
        async start(controller) {
          try {
            // Search using Pinecone
            console.log('\nExecuting Pinecone integrated search...');
            const searchResults = await searchPinecone(query);
            console.log('\nPinecone search results:', JSON.stringify(searchResults, null, 2));

            // Get IDs from search results
            const matchIds = searchResults
              .filter(hit => hit.score >= RELEVANCE_THRESHOLD_GPT)
              .map(hit => hit.id);
            console.log('\nMatched IDs above GPT threshold:', matchIds);

            // Add previous doc IDs if they're not in new results
            const allDocIds = Array.from(new Set([...matchIds, ...previousDocIds]));
            console.log('All doc IDs to fetch:', allDocIds);

            // Fetch content from Supabase
            console.log('\nFetching records from Supabase...');
            const contentMap = await fetchMinutesContent(allDocIds);

            // Combine search results with content
            const results = searchResults.map(result => ({
              ...result,
              content: contentMap[result.id] || ''
            }));

            // Prepare source documents for client
            const sourceDocs = prepareSourceDocs(results);
            controller.enqueue(`event: docs\ndata: ${JSON.stringify({ sourceDocs })}\n\n`);

            // Stream chat completion
            const contextText = results
              .filter(r => r.score >= RELEVANCE_THRESHOLD_GPT)
              .map(r => r.content)
              .filter(Boolean)
              .join('\n\n');

            const conversationHistory = history.map(msg => ({
              role: (msg.isUser ? "user" : "assistant") as MessageRole,
              content: msg.content
            }));

            await streamChatCompletion(
              query,
              contextText,
              conversationHistory,
              (content) => {
                controller.enqueue(`event: message\ndata: ${JSON.stringify({ content })}\n\n`);
              }
            );

            // Send completion event
            controller.enqueue(`event: done\ndata: {}\n\n`);
            controller.close();
          } catch (error) {
            console.error('Streaming error:', error);
            controller.enqueue(`event: error\ndata: ${JSON.stringify({ error: error.message })}\n\n`);
            controller.close();
          }
        }
      });

      return new Response(stream, { headers: sseHeaders });
    } catch (error) {
      console.error('Error:', error);
      return new Response(
        JSON.stringify({ error: error.message }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
      );
    }
  },
});

console.log(`Listening on http://localhost:${server.port}`); 