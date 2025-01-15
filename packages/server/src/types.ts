export interface ChatMessage {
  content: string;
  isUser: boolean;
}

export interface RequestBody {
  query: string;
  history?: ChatMessage[];
  previousDocIds?: string[];
}

export type MessageRole = "system" | "user" | "assistant";

export interface ChatHistoryMessage {
  role: MessageRole;
  content: string;
}

export interface MinuteMetadata {
  time_period_start?: string;
}

export interface SearchResult {
  id: string;
  score: number;
  metadata: Record<string, any>;
  content: string;
}

export interface SourceDocument {
  id: string;
  date: string | null;
  content: string;
  score: number;
} 