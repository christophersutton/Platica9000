import { supabase } from "../config";
import { processContent } from "../utils";

export async function fetchMinutesContent(
  docIds: string[]
): Promise<Record<string, string>> {
  if (!docIds.length) return {};

  const { data, error } = await supabase
    .from("minutes")
    .select("*")
    .in("id", docIds);

  if (error) {
    throw new Error(`Supabase error: ${error.message}`);
  }

  return Object.fromEntries(
    (data || []).map((record) => [
      record.id.toString(),
      processContent(record.content),
    ])
  );
}

export async function fetchUploadContent(path: string): Promise<Blob> {
  if (!path) throw new Error("Path is required");
  console.log("Fetching file:", path);

  const { data: fileData, error: downloadError } = await supabase.storage
    .from("attachments")
    .download(path);

  if (downloadError) {
    throw new Error(
      `Failed to download file ${path}: ${downloadError.message}`
    );
  }

  return fileData;
}
