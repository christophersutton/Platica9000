import React, { useRef, useState, useEffect, type MutableRefObject } from "react";
import { motion, useAnimation } from "framer-motion";
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
    type?: 'user-left';
  }[];
  otherUserId: string;
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
  const [countdown, setCountdown] = useState<number | null>(null);
  const controls = useAnimation();

  // Handle user-left message
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.type === 'user-left') {
      // Vibrate the window
      controls.start({
        x: [0, -10, 10, -10, 10, 0],
        transition: { duration: 0.5 }
      });

      // Start countdown
      setCountdown(10);
    }
  }, [messages, controls]);

  // Handle countdown and auto-close
  useEffect(() => {
    if (countdown === null) return;
    
    if (countdown === 0) {
      // Closing animation sequence
      controls.start({
        scale: [1, 1.1, 0],
        opacity: [1, 1, 0],
        transition: { duration: 0.5 }
      }).then(onClose);
      return;
    }

    const timer = setTimeout(() => {
      setCountdown(countdown - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, controls, onClose]);

  const handleSend = () => {
    if (!inputValue.trim()) return;
    sendMessage(channelId, inputValue.trim());
    setInputValue("");
  };

  return (
    <motion.div
      animate={controls}
      className="fixed top-16 left-16 bg-white shadow-lg border rounded-md w-80 h-96 flex flex-col"
      style={{ zIndex: 9999 }}
      drag
      dragConstraints={constraintsRef}
      initial={{ opacity: 0, scale: 0.8 }}
      exit={{ opacity: 0, scale: 0 }}
    >
      <div className="flex justify-between items-center p-2 border-b">
        <h2 className="text-sm font-bold">Chat with {otherUserId}</h2>
        {countdown !== null && (
          <span className="text-red-500 text-sm">
            Closing in {countdown}s
          </span>
        )}
        <button onClick={onClose} disabled={countdown !== null}>
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2 text-sm">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`p-2 rounded-md ${
              msg.type === 'user-left'
                ? 'bg-yellow-100 text-center w-full'
                : msg.from === user?.id
                ? "bg-blue-100 text-right ml-auto"
                : "bg-gray-100"
            } break-words`}
          >
            {msg.type === 'user-left' 
              ? `${otherUserId} ${msg.content}`
              : msg.content
            }
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
          disabled={countdown !== null}
        />
        <button
          onClick={handleSend}
          className="bg-blue-500 text-white px-3 py-1 rounded text-sm disabled:bg-gray-300"
          disabled={countdown !== null}
        >
          Send
        </button>
      </div>
    </motion.div>
  );
}