import React, { useRef, useState, type MutableRefObject } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { useEphemeralChat } from "../contexts/EphemeralChatContext";
import { useSupabase } from "../hooks/use-supabase";

interface EphemeralChatModalProps {
  channelId: string;
  onClose: () => void;
  messages: {
    from: string;
    content: string;
    timestamp: number;
  }[];
  otherUserId: string; // so we know who we're chatting with
  constraintsRef: MutableRefObject<null>;
}

export function EphemeralChatModal({
  channelId,
  onClose,
  messages,
  otherUserId,
  constraintsRef,
}: EphemeralChatModalProps) {
  const { sendMessage } = useEphemeralChat();
  const { user } = useSupabase();
  const [inputValue, setInputValue] = useState("");

  

  const handleSend = () => {
    if (!inputValue.trim()) return;
    sendMessage(channelId, inputValue.trim());
    setInputValue("");
  };

  return (
    <motion.div
      
      className="fixed top-16 left-16 bg-white shadow-lg border rounded-md w-80 h-96 flex flex-col"
      style={{ zIndex: 9999 }}
      drag
      dragConstraints={constraintsRef}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="flex justify-between items-center p-2 border-b">
        <h2 className="text-sm font-bold">Chat with {otherUserId}</h2>
        <button onClick={onClose}>
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2 text-sm">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`p-2 rounded-md ${
              msg.from === user?.id ? "bg-blue-100 text-right ml-auto" : "bg-gray-100"
            } max-w-[80%] break-words`}
          >
            {msg.content}
          </div>
        ))}
      </div>
      <div className="p-2 border-t flex gap-2">
        <input
          className="flex-1 border rounded px-2 py-1 text-sm"
          placeholder="Say something..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
        />
        <button
          onClick={handleSend}
          className="bg-blue-500 text-white px-3 py-1 rounded text-sm"
        >
          Send
        </button>
      </div>
    </motion.div>
  );
}