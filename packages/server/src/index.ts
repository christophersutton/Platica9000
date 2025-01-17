import {
  initializeIndexHost,
  INDEX_HOST,
  corsHeaders,
  sseHeaders,
  supabase,
} from "./config";
import { processUpload, queryAttachments } from "./controllers/attachments";
import { handleChatRequest } from "./controllers/chat";

// initializeIndexHost().catch(console.error);

const server = Bun.serve({
  port: process.env.PORT || 3000,
  async fetch(req) {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }

    // Extract and validate auth token
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response("Unauthorized - Missing or invalid token", {
        status: 401,
        headers: corsHeaders,
      });
    }

    // Get the actual token
    const token = authHeader.split(" ")[1];

    try {
      // Verify the JWT token with Supabase
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser(token);

      if (error || !user) {
        return new Response("Unauthorized - Invalid token", {
          status: 401,
          headers: corsHeaders,
        });
      }

      // Add user info to request context
      (req as any).user = user;
    } catch (error) {
      console.error("Auth error:", error);
      return new Response("Internal server error", {
        status: 500,
        headers: corsHeaders,
      });
    }

    // Route: /chat
    const url = new URL(req.url);
    if (url.pathname === "/chat") {
      return handleChatRequest(req);
    }
    // Route: /process-file
    if (url.pathname === "/processFile") {
      return processUpload(req);
    }
    // Route: /query-attachments
    if (url.pathname === "/query-attachments" && req.method === "GET") {
      return queryAttachments(req);
    }

    // Fallback for any other route
    return new Response("Not found", { status: 404 });
  },
});

console.log(`Server listening on http://localhost:${server.port}`);
