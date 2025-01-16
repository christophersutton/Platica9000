import { supabase } from "../config";
import { processContent } from "../utils";

export async function fetchMinutesContent(docIds: string[]): Promise<Record<string, string>> {
  if (!docIds.length) return {};

  const { data, error } = await supabase
    .from("minutes")
    .select("*")
    .in("id", docIds);

  if (error) {
    throw new Error(`Supabase error: ${error.message}`);
  }

  return Object.fromEntries(
    (data || []).map(record => [record.id.toString(), processContent(record.content)])
  );
}

export async function fetchUploadContent(docIds: string[]): Promise<Record<string, string>> {
  if (!docIds.length) return {};

  const { data, error } = await supabase
    .from("uploads")
    .select("*")
    .in("id", docIds);

  if (error) {
    throw new Error(`Supabase error: ${error.message}`);
  }

  return Object.fromEntries(
    (data || []).map(record => [record.id.toString(), processContent(record.content)])
  );
}