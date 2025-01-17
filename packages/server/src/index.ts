import { initializeIndexHost, INDEX_HOST, corsHeaders, sseHeaders } from "./config";
import { processUpload } from "./controllers/attachments";
import { handleChatRequest } from "./controllers/chat";

// initializeIndexHost().catch(console.error);

const server = Bun.serve({
  port: process.env.PORT || 3000,
  async fetch(req) {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }

    // // Validate index host
    // if (!INDEX_HOST) {
    //   return new Response(
    //     JSON.stringify({ error: "Server not fully initialized" }),
    //     { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    //   );
    // }

    // Route: /chat
    const url = new URL(req.url);
    if (url.pathname === "/chat") {
      return handleChatRequest(req);
    }
    // Route: /process-file
    if (url.pathname === "/processFile") {
      return processUpload(req);
    }

    // Fallback for any other route
    return new Response("Not found", { status: 404 });
  },
});

console.log(`Server listening on http://localhost:${server.port}`);