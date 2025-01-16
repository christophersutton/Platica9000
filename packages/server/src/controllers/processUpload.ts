import { corsHeaders } from "../config";
import { uploadSummary } from "../services/";
import { fetchUploadContent } from "../services/supabaseService";
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
    const contentBuffer = Buffer.from(await content.arrayBuffer());
    // console.log(contentBuffer);
    // Skip processing for images

    // Process document based on file type

    const processedContent = await processDocument(content, mimeType);
    console.log(processedContent);
    const summary = await uploadSummary(processedContent);
    console.log(summary);
    // Split the processed content into chunks using LlamaIndex text splitter
    const doc = new Document({ text: processedContent });
    const nodeParser = new SentenceSplitter();

    const textChunks = await nodeParser.splitText(processedContent);
    console.log(`Split content into ${textChunks.length} chunks`);
    for (const chunk of textChunks) {
      console.log(chunk);
    }

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

async function processDocument(content: Blob, mimeType: string): Promise<string> {
  try {
    console.log('Processing document of type:', mimeType);
    
    switch (mimeType) {
      case "application/pdf": {
        const reader = new PDFReader();
        const arrayBuffer = await content.arrayBuffer();
        const documents = await reader.loadDataAsContent(new Uint8Array(arrayBuffer));
        const text = documents.map(doc => doc.text).join('\n\n');
        return text;
      }
        
      case "application/docx": {
        const reader = new DocxReader();
        const arrayBuffer = await content.arrayBuffer();
        const text = await reader.loadDataAsContent(new Uint8Array(arrayBuffer));
        if (typeof text !== 'string') {
          throw new Error('Unexpected response from DocxReader');
        }
        return text;
      }
        
      default:
        throw new Error(`Unsupported file type: ${mimeType}`);
    }
  } catch (error) {
    console.error('Error processing document:', error);
    throw new Error(`Failed to process ${mimeType} document: ${error.message}`);
  }
}
