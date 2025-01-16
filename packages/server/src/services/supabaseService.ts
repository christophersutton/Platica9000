import { supabase } from "../config";
import { processContent } from "../utils";

export async function fetchMinutesContent(docIds: string[]) {
  if (!docIds.length) return {};

  const { data, error } = await supabase
    .from("minutes")
    .select("*")
    .in("id", docIds);

  if (error) {
    throw new Error(`Supabase error: ${error.message}`);
  }
  console.log(data);
  return data;
}

export async function fetchUploadContent(pathname: string) {
  if (!pathname) throw new Error("Pathname is required");

  const { data, error } = await supabase
    .storage
    .from('attachments')
    .download(pathname);

  if (error) {
    throw new Error(`Supabase error: ${error.message}`);
  }

  return data;
}