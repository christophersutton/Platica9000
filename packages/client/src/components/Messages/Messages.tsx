import React, { useEffect, useState, useRef, useCallback, memo } from "react";
import { useParams } from "react-router-dom";
import { useSupabase } from "../../hooks/use-supabase";
import { ScrollArea } from "../ui/scroll-area";
import { HubPresence } from "../hubs/HubPresence";
import { Message } from "./Message";
import MessageInput from "./MessageInput";
import type { ChatMessage, ReactionMap, Reaction, Attachment } from "./types";

// Database message shape from Supabase
interface DatabaseMessage {
  id: string;
  content: string;
  channel_id: string;
  user_id: string;
  users?: {
    id: string;
    full_name?: string;
    avatar_url?: string;
    email?: string;
  };
  reactions?: {
    emoji: string;
    user_id: string;
  }[];
}

interface MessagesProps {
  threadId?: string; // new optional prop
}

export default function Messages({ threadId }: MessagesProps) {
  const { channelId } = useParams();
  const { supabase, user: currentUser } = useSupabase();

  // For auto-scroll
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const [hasManuallyScrolled, setHasManuallyScrolled] = useState(false);
  const previousMessageCount = useRef(0);
  const lastScrollTop = useRef(0);
  const isInitialFetch = useRef(true);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [channelName, setChannelName] = useState<string>("");

  // -------------------
  // Data fetching
  // -------------------
  const processMessages = useCallback(
    (messagesData: DatabaseMessage[]) =>
      messagesData.map((msg) => {
        const reactionMap: ReactionMap =
          msg.reactions?.reduce((acc: ReactionMap, r) => {
            if (!acc[r.emoji]) {
              acc[r.emoji] = {
                count: 0,
                hasReacted: false,
                userIds: new Set(),
              };
            }
            if (!acc[r.emoji].userIds.has(r.user_id)) {
              acc[r.emoji].count += 1;
              acc[r.emoji].userIds.add(r.user_id);
            }
            if (r.user_id === currentUser?.id) {
              acc[r.emoji].hasReacted = true;
            }
            return acc;
          }, {}) || {};

        const reactionsArray: Reaction[] = Object.entries(reactionMap).map(
          ([emoji, data]) => ({
            emoji,
            count: data.count,
            hasReacted: data.hasReacted,
            userIds: Array.from(data.userIds),
          })
        );

        return {
          ...msg,
          reactions: reactionsArray,
        } as Omit<ChatMessage, 'created_at'>;
      }),
    [currentUser?.id]
  );

  const fetchMessages = useCallback(async () => {
    if (isInitialFetch.current) setInitialLoading(true);

    // Build query based on whether threadId exists
    let query = supabase
      .from("messages")
      .select(`
        *,
        users (
          id,
          full_name,
          avatar_url,
          email
        ),
        reactions (
          emoji,
          user_id
        )
      `)
      .order("created_at", { ascending: true });

    if (threadId) {
      query = query.eq("parent_id", threadId);
    } else {
      query = query.eq("channel_id", channelId);
    }

    const { data, error } = await query;
    if (!error && data) {
      setMessages(processMessages(data as DatabaseMessage[]));
    } else {
      console.error("Error fetching messages:", error);
    }

    if (isInitialFetch.current) {
      setInitialLoading(false);
      isInitialFetch.current = false;
    }
  }, [channelId, threadId, supabase, processMessages]);

  const fetchChannelName = useCallback(async () => {
    // If we're showing a thread, you can skip or adjust how you handle "channel name"
    // For now we only fetch if there's no threadId
    if (threadId) return;

    const { data, error } = await supabase
      .from("channels")
      .select("name")
      .eq("id", channelId)
      .single();

    if (!error && data) {
      setChannelName(data.name);
    } else {
      console.error("Error fetching channel name:", error);
    }
  }, [channelId, supabase, threadId]);

  // -------------------
  // Scroll logic
  // -------------------
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const nearBottomThreshold = 50;
    const isNearBottom =
      scrollHeight - (scrollTop + clientHeight) <= nearBottomThreshold;

    if (scrollTop < lastScrollTop.current && !isNearBottom) {
      setHasManuallyScrolled(true);
    }
    if (isNearBottom) {
      setHasManuallyScrolled(false);
    }
    lastScrollTop.current = scrollTop;
  }, []);

  useEffect(() => {
    const newMessageCount = messages.length;
    const hadMessagesBefore = previousMessageCount.current;
    previousMessageCount.current = newMessageCount;

    if (initialLoading) {
      bottomRef.current?.scrollIntoView({ behavior: "auto" });
      return;
    }

    const hasNewMessages = newMessageCount > hadMessagesBefore;
    if (hasNewMessages && !hasManuallyScrolled) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, initialLoading, hasManuallyScrolled]);

  // -------------------
  // Subscriptions
  // -------------------
  useEffect(() => {
    // Reset for new channel/thread
    isInitialFetch.current = true;
    fetchMessages();
    fetchChannelName();

    // Choose filter condition based on threadId
    const filterField = threadId
      ? `parent_id=eq.${threadId}`
      : `channel_id=eq.${channelId}`;

    const channelKey = threadId || channelId;

    const messagesSub = supabase
      .channel(`messages:${channelKey}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: filterField,
        },
        fetchMessages
      )
      .subscribe();

    const reactionsSub = supabase
      .channel(`reactions:${channelKey}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "reactions",
        },
        fetchMessages
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesSub);
      supabase.removeChannel(reactionsSub);
    };
  }, [channelId, threadId, fetchMessages, fetchChannelName, supabase]);

  // -------------------
  // Sending and reacting
  // -------------------
  const handleSend = async (
    messageContent: string,
    attachments?: Attachment[]
  ) => {
    try {
      const insertData: Record<string, any> = {
        content: messageContent,
        user_id: currentUser?.id,
        channel_id: channelId,
        attachments,
      };
      
      if (threadId) {
        insertData["parent_id"] = threadId;
      }

      const { error } = await supabase.from("messages").insert(insertData);
      if (error) throw error;
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  const addReaction = useCallback(
    async (messageId: string, emoji: string) => {
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id !== messageId) return msg;
          const newReactions = [...(msg.reactions || [])];
          const existing = newReactions.find((r) => r.emoji === emoji);
          if (!currentUser?.id) return msg;

          if (existing) {
            if (!existing.hasReacted) {
              existing.count += 1;
              existing.hasReacted = true;
              existing.userIds.push(currentUser.id);
            }
          } else {
            newReactions.push({
              emoji,
              count: 1,
              hasReacted: true,
              userIds: [currentUser.id],
            });
          }
          return { ...msg, reactions: newReactions };
        })
      );

      try {
        const { error } = await supabase.from("reactions").upsert({
          message_id: messageId,
          user_id: currentUser?.id,
          emoji,
        });
        if (error) throw error;
      } catch (err) {
        console.error("Error adding reaction:", err);
        await fetchMessages();
      }
    },
    [currentUser?.id, supabase, fetchMessages]
  );

  const removeReaction = useCallback(
    async (messageId: string, emoji: string) => {
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id !== messageId) return msg;
          const updatedReactions = (msg.reactions || [])
            .map((r) => {
              if (r.emoji !== emoji) return r;
              if (r.hasReacted) {
                return {
                  ...r,
                  count: r.count - 1,
                  hasReacted: false,
                  userIds: r.userIds.filter((id) => id !== currentUser?.id),
                };
              }
              return r;
            })
            .filter((r) => r.count > 0);
          return { ...msg, reactions: updatedReactions };
        })
      );

      try {
        const { error } = await supabase.from("reactions").delete().match({
          message_id: messageId,
          user_id: currentUser?.id,
          emoji,
        });
        if (error) throw error;
      } catch (err) {
        console.error("Error removing reaction:", err);
        await fetchMessages();
      }
    },
    [currentUser?.id, supabase, fetchMessages]
  );

  // -------------------
  // Render
  // -------------------
  if (initialLoading || !currentUser) {
    return (
      <div className="flex-1 flex items-center justify-center h-full">
        <div
          className="w-8 h-8 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin opacity-0 transition-opacity duration-300 delay-300"
          style={{ opacity: initialLoading ? 1 : 0 }}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* If you want presence scoped to channel vs. thread, adjust accordingly. */}
      <HubPresence hubId={threadId || channelId || ""} />

      <ScrollArea
        ref={messagesContainerRef}
        className="flex-1"
        onScroll={handleScroll}
      >
        <div className="flex flex-col h-full p-4">
          {messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
              {threadId ? (
                <p className="text-lg">No messages in this thread yet</p>
              ) : (
                <p className="text-lg">
                  Be the first to start chatting in #{channelName}
                </p>
              )}
            </div>
          ) : (
            messages
              .filter(message => !threadId ? !message.parent_id : true)
              .map((message) => {
                
                return (
                  <Message
                    key={message.id}
                    message={message}
                    currentUser={currentUser}
                    onAddReaction={addReaction}
                    onRemoveReaction={removeReaction}
                    threadCount={messages.filter(m => m.parent_id === message.id).length}
                  />
                );
              })
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      <MessageInput onSend={handleSend} channelId={channelId || ""} />
    </div>
  );
}