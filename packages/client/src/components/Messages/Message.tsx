{/** FULL UPDATED FILE CONTENT **/}
import React, { useState, memo } from "react";
import { 
  SmilePlusIcon, 
  MessageSquareIcon,
  ThumbsUpIcon,
  HeartIcon,
  LightbulbIcon,
  FlameIcon,
  PartyPopper,
  TrophyIcon,
  HelpCircleIcon,
  EyeIcon,
} from "lucide-react";
import type { ChatMessage, Reaction } from "./types";
import { useSidebar } from "@/components/RightSidebar";
import { cn } from "@/lib/utils";
import Messages from "./Messages";

const REACTION_ICONS = {
  "👍": { icon: ThumbsUpIcon, label: "Agree/Support" },
  "❤️": { icon: HeartIcon, label: "Love it" },
  "💡": { icon: LightbulbIcon, label: "Great idea" },
  "🔥": { icon: FlameIcon, label: "Hot take" },
  "🎉": { icon: PartyPopper, label: "Celebration" },
  "🏆": { icon: TrophyIcon, label: "Big win" },
  "❓": { icon: HelpCircleIcon, label: "Needs clarification" },
  "👀": { icon: EyeIcon, label: "Interesting" },
} as const;

type ReactionKey = keyof typeof REACTION_ICONS;

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
  threadCount: number;
}

export const Message = memo(
  ({ message, currentUser, onAddReaction, onRemoveReaction, threadCount }: MessageProps) => {
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [imageLoadError, setImageLoadError] = useState<{ [key: string]: boolean }>({});
    const { openTab } = useSidebar();

    const openThread = (messageId: string) => {
      openTab({
        title: `Thread`,
        content: <Messages threadId={messageId} />,
        type: "document",
      });
    };



    return (
      <div 
        className={cn(
          "group relative px-4 py-2.5 -mx-4 transition-colors duration-200",
          isHovered && "bg-gray-50/50 dark:bg-gray-800/50"
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="flex items-start space-x-3">
          <img
            src={
              message.users?.avatar_url ||
              `https://api.dicebear.com/7.x/bottts/svg?seed=${message.users?.email}`
            }
            alt={message.users?.full_name || "Anonymous User"}
            className="w-8 h-8 rounded-full"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="font-medium">{message.users?.full_name}</span>
              <span className="text-xs text-gray-500">
                {message.created_at ? new Date(message.created_at).toLocaleTimeString() : ''}
              </span>
            </div>
            
            <div className="mt-1 text-sm">{message.content}</div>

            {/* Attachments */}
            {message.attachments?.map((attachment, index) => (
              <div key={index} className="mt-2">
                {attachment.type === "file" &&
                  (isImageFile(attachment.name) ? (
                    imageLoadError[attachment.url] ? (
                      <div className="text-red-500">Failed to load image: {attachment.name}</div>
                    ) : (
                      <div className="group/image relative">
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
                      className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
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

            {/* New unified action bar */}
            <div className="mt-1.5 flex items-center gap-2 text-gray-500">
              {/* Reactions */}
              <div className="flex gap-1 items-center">
                {message?.reactions?.map((reaction: Reaction) => {
                  const iconInfo = REACTION_ICONS[reaction.emoji as ReactionKey];
                  if (!iconInfo) return null;
                  const Icon = iconInfo.icon;
                  
                  return (
                    <button
                      key={`${message.id}-${reaction.emoji}`}
                      onClick={() =>
                        reaction.hasReacted
                          ? onRemoveReaction(message.id, reaction.emoji)
                          : onAddReaction(message.id, reaction.emoji)
                      }
                      className={cn(
                        "px-2 h-6 rounded-md text-xs transition-colors flex items-center gap-1",
                        reaction.hasReacted 
                          ? "bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400" 
                          : "bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700"
                      )}
                      title={iconInfo.label}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {reaction.count}
                    </button>
                  );
                })}
              </div>

              {/* Divider when both reactions and actions exist */}
              {((message?.reactions?.length ?? 0) > 0) && 
                <div className="w-px h-4 bg-gray-200 dark:bg-gray-700" />
              }

              {/* Action buttons */}
              <div className="flex items-center gap-0.5">
                {!message.parent_id && (
                  <button
                    onClick={() => openThread(message.id)}
                    className={cn(
                      "h-6 px-2 rounded-md text-xs flex items-center gap-1.5 transition-colors",
                      threadCount > 0 
                        ? "text-gray-700 dark:text-gray-300" 
                        : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300",
                      "bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700"
                    )}
                  >
                    <MessageSquareIcon className="w-3.5 h-3.5" />
                    {threadCount > 0 ? `${threadCount} ${threadCount === 1 ? 'reply' : 'replies'}` : 'Reply'}
                  </button>
                )}
                <div className="relative">
                  <button
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="h-6 px-2 rounded-md text-xs flex items-center gap-1.5 transition-colors bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700"
                    title="Add reaction"
                  >
                    <SmilePlusIcon className="w-3.5 h-3.5" />
                    React
                  </button>
                  
                  {/* Reaction picker */}
                  {showEmojiPicker && (
                    <div className="absolute z-10 left-full top-0 ml-2">
                      <div
                        className="fixed inset-0"
                        onClick={() => setShowEmojiPicker(false)}
                      />
                      <div className="relative bg-white dark:bg-gray-800 rounded-md shadow-lg border dark:border-gray-700 p-1.5">
                        <div className="flex gap-1">
                          {(Object.entries(REACTION_ICONS) as [ReactionKey, typeof REACTION_ICONS[ReactionKey]][]).map(([emoji, { icon: Icon, label }]) => (
                            <button
                              key={emoji}
                              onClick={() => {
                                onAddReaction(message.id, emoji);
                                setShowEmojiPicker(false);
                              }}
                              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                              title={label}
                            >
                              <Icon className="w-4 h-4" />
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);