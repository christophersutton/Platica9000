import { RELEVANCE_THRESHOLD_CLIENT } from "./config";
import { SearchResult, SourceDocument } from "./types";

export function processContent(content: string | null): string {
  if (!content) return "";
  return content
    .replace(/\\n/g, "\n")
    .replace(/\n\s*\n\s*\n/g, "\n\n")
    .trim();
}

export function prepareSourceDocs(results: SearchResult[]): SourceDocument[] {
  return results
    .filter(result => result.score >= RELEVANCE_THRESHOLD_CLIENT && result.content)
    .map(result => {
      const metadata = result.metadata as { time_period_start?: string };
      const date = metadata?.time_period_start
        ? new Date(metadata.time_period_start).toISOString().split("T")[0]
        : null;

      return {
        id: result.id,
        date,
        content: result.content,
        score: result.score
      };
    })
    .sort((a, b) => {
      if (!a.date) return 1;
      if (!b.date) return -1;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
}