import { corsHeaders } from "../config";
import { textDocumentSummary } from "../services/";
import { fetchUploadContent } from "../services/supabaseService";
import { PineconeClient } from "../services/pineconeService";
import { Document, SentenceSplitter } from "llamaindex";
import { PDFReader, DocxReader } from "llamaindex";

export const processUpload = async (req: Request) => {
  try {
    const request = await req.json();
    console.log("request", request);
    const mimeType = request.record.metadata.mimetype;
    if (!mimeType) {
      return new Response(
        JSON.stringify({ error: "Missing required field: mimetype" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (isImageFile(mimeType)) {
      return new Response(
        JSON.stringify({ message: "Image processing not supported yet" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const content = await fetchUploadContent(request.record.name);

    const processedContent = await processDocument(content, mimeType);
    console.log(processedContent);
    const summary = await textDocumentSummary(processedContent);
    // Create a unique ID for the document
    const documentId = `doc_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Prepare record for Pinecone
    const record = {
      id: documentId,
      content: summary,
      metadata: {
        originalName: request.record.name,
        mimeType: mimeType,
        uploadedAt: new Date().toISOString(),
        type: 'attachment'
      }
    };

    // Process the record through Pinecone
    const pinecone = PineconeClient.getInstance();
    pinecone.registerIndex("attachments");
    await pinecone.processRecordsBatch("attachments", [record]);

    console.log("Record processed successfully");

    return new Response(
      JSON.stringify({ message: "Upload processed successfully" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    // Log the error for debugging (consider using a proper logger)
    console.error("Error processing upload:", error);

    return new Response(JSON.stringify({ error: "Server Error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

function isImageFile(mimeType: string): boolean {
  const imageMimeTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  return imageMimeTypes.includes(mimeType);
}

async function processDocument(
  content: Blob,
  mimeType: string
): Promise<string> {
  try {
    console.log("Processing document of type:", mimeType);

    switch (mimeType) {
      case "application/pdf": {
        const reader = new PDFReader();
        const arrayBuffer = await content.arrayBuffer();
        const documents = await reader.loadDataAsContent(
          new Uint8Array(arrayBuffer)
        );
        const text = documents.map((doc) => doc.text).join("\n\n");
        return text;
      }

      case "application/docx": {
        const reader = new DocxReader();
        const arrayBuffer = await content.arrayBuffer();
        const text = await reader.loadDataAsContent(
          new Uint8Array(arrayBuffer)
        );
        if (typeof text !== "string") {
          throw new Error("Unexpected response from DocxReader");
        }
        return text;
      }

      default:
        throw new Error(`Unsupported file type: ${mimeType}`);
    }
  } catch (error) {
    console.error("Error processing document:", error);
    throw new Error(`Failed to process ${mimeType} document: ${error.message}`);
  }
}
