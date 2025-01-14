import React, { useEffect, useState, useRef, useCallback, memo } from "react";
import { useParams } from "react-router-dom";
import MessageInput from "./MessageInput";
import { useSupabase } from "../../hooks/use-supabase";
import EmojiPicker from "emoji-picker-react";
import { SmilePlusIcon } from "lucide-react";
import { ScrollArea } from "../ui/scroll-area";
import { HubPresence } from "../hubs/HubPresence";
const isImageFile = (filename: string) => {
  return /\.(jpg|jpeg|png|gif|webp)$/i.test(filename.toLowerCase());
};

interface ReactionMap {
  [emoji: string]: {
    count: number;
    hasReacted: boolean;
    userIds: Set<string>;
  };
}

interface Reaction {
  emoji: string;
  count: number;
  hasReacted: boolean;
  userIds: string[];
}

export interface Attachment {
  type: "file";
  url: string;
  name: string;
}

interface Message {
  id: string;
  content: string;
  attachments?: Attachment[];
  users?: {
    avatar_url?: string;
    email?: string;
    full_name?: string;
  };
  reactions?: Reaction[];
}

interface MessageProps {
  message: Message;
  currentUser?: any;
  onAddReaction: (messageId: string, emoji: string) => void;
  onRemoveReaction: (messageId: string, emoji: string) => void;
}

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

// -------------------
// Child component
// -------------------
const Message = memo(
  ({ message, currentUser, onAddReaction, onRemoveReaction }: MessageProps) => {
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [loadingImages, setLoadingImages] = useState<{
      [key: string]: boolean;
    }>({});
    const [imageLoadError, setImageLoadError] = useState<{
      [key: string]: boolean;
    }>({});

    return (
      <div className="message relative">
        <div className="flex items-start space-x-3">
          <img
            src={
              message.users?.avatar_url ||
              `https://api.dicebear.com/7.x/bottts/svg?seed=${message.users?.email}`
            }
            alt={message.users?.full_name || "Anonymous User"}
            className="w-8 h-8 rounded-full"
          />
          <div>
            <div className="font-medium">{message.users?.full_name}</div>
            {message.content && <div>{message.content}</div>}

            {/* Add attachment rendering */}
            {message.attachments?.map((attachment, index) => (
              <div key={index} className="mt-2">
                {attachment.type === "file" &&
                  (isImageFile(attachment.name) ? (
                    imageLoadError[attachment.url] ? (
                      <div className="text-red-500">
                        Failed to load image: {attachment.name}
                      </div>
                    ) : (
                      <div className="group relative">
                        <img
                          src={attachment.url}
                          alt={attachment.name}
                          className="max-w-sm rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                          onClick={() => window.open(attachment.url, "_blank")}
                          onError={(e) => {
                            console.error("Image load error:", attachment.url);
                            setImageLoadError((prev) => ({
                              ...prev,
                              [attachment.url]: true,
                            }));
                          }}
                        />
                      </div>
                    )
                  ) : (
                    <a
                      href={attachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 rounded hover:bg-gray-200"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      {attachment.name}
                    </a>
                  ))}
              </div>
            ))}

            <div className="flex gap-1 mt-1 items-center">
              {/* Reaction buttons */}
              {message?.reactions?.map((reaction) => (
                <button
                  key={`${message.id}-${reaction.emoji}`}
                  onClick={() =>
                    reaction.hasReacted
                      ? onRemoveReaction(message.id, reaction.emoji)
                      : onAddReaction(message.id, reaction.emoji)
                  }
                  className={`px-2 py-1 rounded text-sm ${
                    reaction.hasReacted ? "bg-blue-100" : "bg-gray-100"
                  }`}
                >
                  {reaction.emoji} {reaction.count}
                </button>
              ))}
              {/* Reaction picker toggle */}
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-1 rounded hover:bg-gray-100"
                title="Add reaction"
              >
                <span className="text-lg">
                  <SmilePlusIcon />
                </span>
              </button>
            </div>

            {/* Emoji picker */}
            {showEmojiPicker && (
              <div className="absolute z-10">
                <div
                  className="fixed inset-0"
                  onClick={() => setShowEmojiPicker(false)}
                />
                <div className="relative">
                  <EmojiPicker
                    onEmojiClick={(emojiData) => {
                      onAddReaction(message.id, emojiData.emoji);
                      setShowEmojiPicker(false);
                    }}
                    width={300}
                    height={400}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
);

// -------------------
// Parent component
// -------------------
export default function Messages() {
  const { channelId } = useParams();
  const { supabase, user: currentUser } = useSupabase();

  // For auto-scroll
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Track whether the user has manually scrolled away from the bottom
  const [hasManuallyScrolled, setHasManuallyScrolled] = useState(false);

  // Keep track of number of messages so we know when new ones appear
  const previousMessageCount = useRef(0);
  // Store the last known scrollTop to detect scroll direction
  const lastScrollTop = useRef(0);

  // Use a ref to decide if this is the initial fetch
  const isInitialFetch = useRef(true);

  const [messages, setMessages] = useState<Message[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [channelName, setChannelName] = useState<string>("");

  // -------------------
  // Data fetching
  // -------------------
  const processMessages = useCallback(
    (messagesData: DatabaseMessage[]) =>
      messagesData.map((msg) => {
        // Aggregate reactions by emoji
        const reactionMap: ReactionMap =
          msg.reactions?.reduce((acc: ReactionMap, r) => {
            if (!acc[r.emoji]) {
              acc[r.emoji] = {
                count: 0,
                hasReacted: false,
                userIds: new Set(),
              };
            }
            // Only count unique user per emoji to avoid duplicates
            if (!acc[r.emoji].userIds.has(r.user_id)) {
              acc[r.emoji].count += 1;
              acc[r.emoji].userIds.add(r.user_id);
            }
            // Check if current user has reacted
            if (r.user_id === currentUser?.id) {
              acc[r.emoji].hasReacted = true;
            }
            return acc;
          }, {}) || {};

        const reactionsArray = Object.entries(reactionMap).map(
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
        };
      }),
    [currentUser?.id]
  );

  const fetchMessages = useCallback(async () => {
    if (isInitialFetch.current) setInitialLoading(true);

    const { data, error } = await supabase
      .from("messages")
      .select(
        `
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
        `
      )
      .eq("channel_id", channelId)
      .order("created_at", { ascending: true });

    if (!error && data) {
      setMessages(processMessages(data as DatabaseMessage[]));
    } else {
      console.error("Error fetching messages:", error);
    }

    if (isInitialFetch.current) {
      setInitialLoading(false);
      isInitialFetch.current = false;
    }
  }, [channelId, supabase, processMessages]);

  const fetchChannelName = useCallback(async () => {
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
  }, [channelId, supabase]);

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

    // Check scroll direction: if scrolling up and not near bottom => user intentionally scrolled away
    if (scrollTop < lastScrollTop.current && !isNearBottom) {
      setHasManuallyScrolled(true);
    }

    // If the user is back near the bottom, we re-enable auto-scroll
    if (isNearBottom) {
      setHasManuallyScrolled(false);
    }

    lastScrollTop.current = scrollTop;
  }, []);

  useEffect(() => {
    const newMessageCount = messages.length;
    const hadMessagesBefore = previousMessageCount.current;
    previousMessageCount.current = newMessageCount;

    // If it's our first load, always jump straight to bottom
    if (initialLoading) {
      bottomRef.current?.scrollIntoView({ behavior: "auto" });
      return;
    }

    // If new messages arrived and user hasn't scrolled away, scroll to bottom
    const hasNewMessages = newMessageCount > hadMessagesBefore;
    if (hasNewMessages && !hasManuallyScrolled) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, initialLoading, hasManuallyScrolled]);

  // -------------------
  // Subscriptions
  // -------------------
  useEffect(() => {
    // Reset for new channel
    isInitialFetch.current = true;
    fetchMessages();
    fetchChannelName();

    const messagesSub = supabase
      .channel(`messages:${channelId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `channel_id=eq.${channelId}`,
        },
        fetchMessages
      )
      .subscribe();

    const reactionsSub = supabase
      .channel(`reactions:${channelId}`)
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
  }, [channelId, fetchMessages, fetchChannelName, supabase]);

  // -------------------
  // Sending and reacting
  // -------------------
  const handleSend = async (
    messageContent: string,
    attachments?: Attachment[]
  ) => {
    try {
      const { error } = await supabase.from("messages").insert({
        channel_id: channelId,
        content: messageContent,
        user_id: currentUser?.id,
        attachments: attachments, // Make sure your database table has an attachments column
      });
      if (error) throw error;
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  const addReaction = useCallback(
    async (messageId, emoji) => {
      // Optimistic update
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id !== messageId) return msg;
          const newReactions = [...(msg.reactions || [])];
          const existing = newReactions.find((r) => r.emoji === emoji);
          // Skip if no current user
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

      // Server call
      try {
        const { error } = await supabase.from("reactions").upsert({
          message_id: messageId,
          user_id: currentUser?.id,
          emoji,
        });
        if (error) throw error;
      } catch (err) {
        console.error("Error adding reaction:", err);
        await fetchMessages(); // revert to server state if error
      }
    },
    [currentUser?.id, supabase, fetchMessages]
  );

  const removeReaction = useCallback(
    async (messageId, emoji) => {
      // Optimistic update
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

      // Server call
      try {
        const { error } = await supabase.from("reactions").delete().match({
          message_id: messageId,
          user_id: currentUser?.id,
          emoji,
        });
        if (error) throw error;
      } catch (err) {
        console.error("Error removing reaction:", err);
        await fetchMessages(); // revert to server state if error
      }
    },
    [currentUser?.id, supabase, fetchMessages]
  );

  // -------------------
  // Render
  // -------------------
  if (initialLoading || !currentUser)
    return (
      <div className="flex-1 flex items-center justify-center h-full">
        <div
          className="w-8 h-8 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin opacity-0 transition-opacity duration-300 delay-300"
          style={{ opacity: initialLoading ? 1 : 0 }}
        />
      </div>
    );

  return (
    <div className="flex flex-col h-full">
      <HubPresence hubId={channelId || ""} />
      <ScrollArea
        ref={messagesContainerRef}
        className="flex-1"
        onScroll={(event) => handleScroll()}
      >
        <div className="flex flex-col h-full p-4">
          {messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
              <p className="text-lg">
                Be the first to start chatting in #{channelName}
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <Message
                key={message.id}
                message={message}
                currentUser={currentUser}
                onAddReaction={addReaction}
                onRemoveReaction={removeReaction}
              />
            ))
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      <MessageInput onSend={handleSend} channelId={channelId || ""} />
    </div>
  );
}
