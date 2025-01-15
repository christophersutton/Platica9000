// src/components/Messages/Message.tsx
import React, { useState, memo } from "react";
import EmojiPicker from "emoji-picker-react";
import { SmilePlusIcon } from "lucide-react";
import type { ChatMessage, Reaction } from "./types";

/**
 * Utility to check if a file name is an image.
 */
const isImageFile = (filename: string) => {
  return /\.(jpg|jpeg|png|gif|webp)$/i.test(filename.toLowerCase());
};

interface MessageProps {
  message: ChatMessage;
  currentUser?: any;
  onAddReaction: (messageId: string, emoji: string) => void;
  onRemoveReaction: (messageId: string, emoji: string) => void;
}

export const Message = memo(
  ({ message, currentUser, onAddReaction, onRemoveReaction }: MessageProps) => {
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [imageLoadError, setImageLoadError] = useState<{ [key: string]: boolean }>({});

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

            {/* Attachments */}
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
                          onError={() => {
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

            {/* Reactions */}
            <div className="flex gap-1 mt-1 items-center">
              {message?.reactions?.map((reaction: Reaction) => (
                <button
                  key={`${message.id}-${reaction.emoji}`}
                  onClick={() =>
                    reaction.hasReacted
                      ? onRemoveReaction(message.id, reaction.emoji)
                      : onAddReaction(message.id, reaction.emoji)
                  }
                  className={`px-2 py-1 rounded text-sm ${reaction.hasReacted ? "bg-blue-100" : "bg-gray-100"}`}
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