import React, { type MutableRefObject, useState, useEffect, useCallback, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEphemeralChat } from "../contexts/EphemeralChatContext";
import { useSupabase } from "../hooks/use-supabase";
import { useSupabasePresence } from "@/hooks/use-presence";

export function EphemeralChats({
  constraintsRef,
}: {
  constraintsRef: MutableRefObject<null>;
}) {
  const { chats, closeChat } = useEphemeralChat();

  return (
    <AnimatePresence>
      {chats
        .filter((c) => c.isOpen)
        .map((chat) => {
          const [userA, userB] = chat.participants;
          // The "other user" from my perspective is whichever participant isn't me.
          // For labeling we often just show the second one, but it doesn't matter here.
          return (
            <EphemeralChatModal
              key={chat.channelId}
              channelId={chat.channelId}
              onClose={() => closeChat(chat.channelId)}
              messages={chat.messages}
              otherUserId={userA === userB ? userA : userB}
              constraintsRef={constraintsRef}
              otherUserLeft={chat.otherUserLeft ?? false}
            />
          );
        })}
    </AnimatePresence>
  );
}

interface EphemeralChatModalProps {
  channelId: string;
  onClose: () => void;
  messages: {
    from: string;
    content: string;
    timestamp: number;
  }[];
  otherUserId: string;
  constraintsRef: MutableRefObject<null>;
  otherUserLeft: boolean;
}

export function EphemeralChatModal({
  channelId,
  onClose,
  messages,
  otherUserId,
  constraintsRef,
  otherUserLeft,
}: EphemeralChatModalProps) {
  const { sendMessage } = useEphemeralChat();
  const { user } = useSupabase();
  const [inputValue, setInputValue] = useState("");
  const [countdown, setCountdown] = useState<number | null>(null);
  const [shake, setShake] = useState(false);
  const { activeUsersWithMetadata } = useSupabasePresence({
    channelName: 'global'
  });


  // When we detect the other user has left, start a 6-second countdown
  useEffect(() => {
    if (otherUserLeft) {
      setShake(true);
      setCountdown(6);
    } else {
      setShake(false);
      setCountdown(null);
    }

  }, [otherUserLeft]);

  // Decrement the countdown every second, and close when it hits zero
  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      onClose();
      return;
    }
    const timer = setTimeout(() => {
      setCountdown(countdown - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [countdown, onClose]);

  // Reset shake after animation completes
  useEffect(() => {
    if (shake) {
      const timer = setTimeout(() => {
        setShake(false);
      }, 500); // Duration should match the shake animation
      return () => clearTimeout(timer);
    }
  }, [shake]);

  const handleSend = () => {
    if (!inputValue.trim()) return;
    sendMessage(channelId, inputValue.trim());
    setInputValue("");
  };

  const otherUserName = useMemo(() => {
    return activeUsersWithMetadata.find(u => u.id === otherUserId)?.full_name || otherUserId;
  }, [activeUsersWithMetadata, otherUserId]);

  const variants = {
    initial: { opacity: 0, scale: 0.8 },
    animate: {
      opacity: 1,
      scale: 1,
      rotate: shake ? [0, -3, 3, -3, 3, -1, 1, 0] : 0, // Subtle rotation shake instead of translation
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 20,
        rotate: {
          type: "tween",
          duration: 0.5,
          ease: "easeInOut",
        }
      },
    },
    exit: {
      scale: [1, 1.05, 0],
      transition: { duration: 0.4 },
    },
  };

  return (
    <motion.div
      className="fixed top-16 left-16 bg-white shadow-lg border rounded-md w-80 h-96 flex flex-col"
      style={{ zIndex: 9999 }}
      drag
      dragConstraints={constraintsRef}
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <div className="flex justify-between items-center p-2 border-b">
        <h2 className="text-sm font-bold">
          { otherUserLeft ? "User Disconnected" : `Chat with ${otherUserName}`}
        </h2>
        <button onClick={onClose}>
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-2 text-sm">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.from === user?.id ? "justify-end" : ""}`}
          >
            <div
              className={`p-2 rounded-md ${
                msg.from === user?.id
                  ? "bg-blue-100"
                  : "bg-gray-100"
              } max-w-[80%] break-words`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {otherUserLeft && countdown !== null && (
          <div className="mt-2 p-2 text-sm text-red-600 bg-red-100 rounded-md">
            The other user left. This chat will self-destruct in{" "}
            {countdown} second{countdown === 1 ? "" : "s"}.
          </div>
        )}
      </div>

      <div className="p-2 border-t flex gap-2">
        <input
          className="flex-1 border rounded px-2 py-1 text-sm"
          placeholder="Say something..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          disabled={!!otherUserLeft} // disable sending once user has left
        />
        <button
          onClick={handleSend}
          className={`bg-blue-500 text-white px-3 py-1 rounded text-sm ${
            otherUserLeft ? "opacity-50 cursor-not-allowed" : ""
          }`}
          disabled={!!otherUserLeft}
        >
          Send
        </button>
      </div>
    </motion.div>
  );
}