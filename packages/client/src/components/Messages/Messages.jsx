import { useEffect, useState, useRef, useCallback, memo } from "react";
import { useParams } from "react-router-dom";
import MessageInput from "./MessageInput";
import { useSupabase } from "../../hooks/useSupabase";
import EmojiPicker from 'emoji-picker-react';

const Message = memo(
  ({ message, currentUser, onAddReaction, onRemoveReaction }) => {
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

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
            <div>{message.content}</div>
            <div className="flex gap-1 mt-1 items-center">
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
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-1 rounded hover:bg-gray-100"
                title="Add reaction"
              >
                <span className="text-lg">😊</span>
              </button>
            </div>
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

export default function Messages() {
  const { channelId } = useParams();
  const { supabase, user: currentUser } = useSupabase();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);

  const processMessages = useCallback(
    (messagesData) =>
      messagesData.map((msg) => {
        // Aggregate reactions by emoji
        const reactionMap = msg.reactions?.reduce((acc, r) => {
          if (!acc[r.emoji]) {
            acc[r.emoji] = { count: 0, hasReacted: false, userIds: new Set() };
          }
          // Only count unique users
          if (!acc[r.emoji].userIds.has(r.user_id)) {
            acc[r.emoji].count += 1;
            acc[r.emoji].userIds.add(r.user_id);
          }
          if (r.user_id === currentUser.id) {
            acc[r.emoji].hasReacted = true;
          }
          return acc;
        }, {});

        const reactionsArray = reactionMap
          ? Object.entries(reactionMap).map(([emoji, data]) => ({
              emoji,
              count: data.count,
              hasReacted: data.hasReacted,
              userIds: Array.from(data.userIds), // Convert Set to Array for easier state management
            }))
          : [];

        return {
          ...msg,
          reactions: reactionsArray,
        };
      }),
    [currentUser.id]
  );

  const fetchMessages = useCallback(async () => {
    setLoading(true);
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
      setMessages(processMessages(data));
    } else {
      console.error("Error fetching messages:", error);
    }
    setLoading(false);
  }, [channelId, supabase, processMessages]);

  // Subscribe to changes in messages and reactions
  useEffect(() => {
    // 1. Initial fetch
    fetchMessages();

    // 2. Subscribe to messages in this channel
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

    // 3. Subscribe to reactions (we’ll just refetch messages on reaction changes)
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
  }, [channelId, fetchMessages, supabase]);

  const handleSend = async (messageContent) => {
    try {
      const { error } = await supabase.from("messages").insert({
        channel_id: channelId,
        content: messageContent,
        user_id: currentUser.id,
      });
      if (error) throw error;
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  // Provide reaction handlers so children don’t need their own subscription
  const addReaction = useCallback(
    async (messageId, emoji) => {
      // Optimistically update the reaction
      setMessages(prev => prev.map(msg => {
        if (msg.id !== messageId) return msg;
        
        const updatedReactions = [...msg.reactions];
        const existingReaction = updatedReactions.find(r => r.emoji === emoji);
        
        if (existingReaction) {
          // Only increment if user hasn't already reacted
          if (!existingReaction.hasReacted) {
            existingReaction.count += 1;
            existingReaction.hasReacted = true;
            existingReaction.userIds = [...existingReaction.userIds, currentUser.id];
          }
        } else {
          updatedReactions.push({ 
            emoji, 
            count: 1, 
            hasReacted: true,
            userIds: [currentUser.id]
          });
        }
        
        return { ...msg, reactions: updatedReactions };
      }));

      try {
        const { error } = await supabase.from("reactions").upsert({
          message_id: messageId,
          user_id: currentUser.id,
          emoji,
        });
        if (error) throw error;
      } catch (err) {
        console.error("Error adding reaction:", err);
        await fetchMessages();
      }
    },
    [supabase, currentUser.id, fetchMessages]
  );

  const removeReaction = useCallback(
    async (messageId, emoji) => {
      // Optimistically update the reaction
      setMessages(prev => prev.map(msg => {
        if (msg.id !== messageId) return msg;
        
        const updatedReactions = msg.reactions.map(r => {
          if (r.emoji !== emoji) return r;
          // Only decrement if user had actually reacted
          if (r.hasReacted) {
            return {
              ...r,
              count: r.count - 1,
              hasReacted: false,
              userIds: r.userIds.filter(id => id !== currentUser.id)
            };
          }
          return r;
        }).filter(r => r.count > 0);
        
        return { ...msg, reactions: updatedReactions };
      }));

      try {
        const { error } = await supabase.from("reactions").delete().match({
          message_id: messageId,
          user_id: currentUser.id,
          emoji,
        });
        if (error) throw error;
      } catch (err) {
        console.error("Error removing reaction:", err);
        await fetchMessages();
      }
    },
    [supabase, currentUser.id, fetchMessages]
  );

  useEffect(() => {
    // Scroll to bottom whenever messages change
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (loading) return <div>Loading messages...</div>;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4">
        {messages.map((message) => (
          <Message
            key={message.id}
            message={message}
            currentUser={currentUser}
            onAddReaction={addReaction}
            onRemoveReaction={removeReaction}
          />
        ))}
        <div ref={bottomRef} />
      </div>
      <MessageInput onSend={handleSend} />
    </div>
  );
}
