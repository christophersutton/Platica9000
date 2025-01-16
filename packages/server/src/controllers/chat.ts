import { corsHeaders, sseHeaders, RELEVANCE_THRESHOLD_GPT } from "../config";
import { RequestBody, MessageRole } from "../types";
import { searchPinecone, fetchMinutesContent, streamChatCompletion } from "../services";
import { prepareSourceDocs } from "../utils";


export async function handleChatRequest(req: Request) {
  try {
    const isStreamRequest = req.headers.get("Accept") === "text/event-stream";

    // Parse request body
    let body: RequestBody;
    try {
      body = await req.json() as RequestBody;
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid request body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate query parameter
    if (!body.query?.trim()) {
      return new Response(
        JSON.stringify({ error: "Query parameter is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { query, history = [], previousDocIds = [] } = body;

    // If not requesting SSE stream, just return a simple JSON response
    if (!isStreamRequest) {
      return new Response(
        JSON.stringify({ status: "ok", query }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`\nProcessing query: "${query}"`);
    console.log("Previous doc IDs:", previousDocIds);

    // Create stream for server-sent events
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Search using Pinecone
          console.log("\nExecuting Pinecone integrated search...");
          const searchResults = await searchPinecone(query);
          console.log("\nPinecone search results:", JSON.stringify(searchResults, null, 2));

          // Filter by GPT threshold
          const matchIds = searchResults
            .filter(hit => hit.score >= RELEVANCE_THRESHOLD_GPT)
            .map(hit => hit.id);

          console.log("\nMatched IDs above GPT threshold:", matchIds);

          // Combine with previous doc IDs
          const allDocIds = Array.from(new Set([...matchIds, ...previousDocIds]));
          console.log("All doc IDs to fetch:", allDocIds);

          // Fetch content from Supabase
          console.log("\nFetching records from Supabase...");
          const contentMap = await fetchMinutesContent(allDocIds);

          // Attach content to results
          const results = searchResults.map(result => ({
            ...result,
            content: contentMap[result.id] || ""
          }));

          // Prepare source documents for client
          const sourceDocs = prepareSourceDocs(results);
          controller.enqueue(`event: docs\ndata: ${JSON.stringify({ sourceDocs })}\n\n`);

          // Create context
          const contextText = results
            .filter(r => r.score >= RELEVANCE_THRESHOLD_GPT)
            .map(r => r.content)
            .filter(Boolean)
            .join("\n\n");

          // Convert conversation history to OpenAI format
          const conversationHistory = history.map(msg => ({
            role: (msg.isUser ? "user" : "assistant") as MessageRole,
            content: msg.content
          }));

          // Stream chat completion
          await streamChatCompletion(
            query,
            contextText,
            conversationHistory,
            (contentChunk) => {
              controller.enqueue(`event: message\ndata: ${JSON.stringify({ content: contentChunk })}\n\n`);
            }
          );

          // Send completion event
          controller.enqueue(`event: done\ndata: {}\n\n`);
          controller.close();
        } catch (error) {
          console.error("Streaming error:", error);
          controller.enqueue(`event: error\ndata: ${JSON.stringify({ error: error.message })}\n\n`);
          controller.close();
        }
      }
    });

    return new Response(stream, { headers: sseHeaders });

  } catch (error: any) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}