// src/components/Messages/types.ts
//
// Central place for shared message-related interfaces to avoid duplication.

export interface Reaction {
  emoji: string;
  count: number;
  hasReacted: boolean;
  userIds: string[];
}

export interface ReactionMap {
  [emoji: string]: {
    count: number;
    hasReacted: boolean;
    userIds: Set<string>;
  };
}

export interface Attachment {
  type: "file";
  url: string;
  name: string;
}

export interface ChatMessage {
  id: string;
  content: string;
  created_at?: string;
  attachments?: Attachment[];
  users?: {
    avatar_url?: string;
    email?: string;
    full_name?: string;
  };
  reactions?: Reaction[];
  parent_id?: string;
}