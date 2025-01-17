import React, { useState, useEffect } from "react";
import { useSupabasePresence } from "../hooks/use-presence";
import { useSupabase } from "../hooks/use-supabase";
import { useEphemeralChat } from "../contexts/EphemeralChatContext";
import { Badge } from "./ui/badge";
import { cn } from "@/lib/utils";

/**
 * A simple global presence-based user list
 * We assume everyone is in "global" presence channel.
 */
export function OnlineUsersList() {
  const { activeUsersWithMetadata } = useSupabasePresence({
    channelName: "global"
  });
  const { user } = useSupabase();
  const { startChat } = useEphemeralChat();
  const [isCountUpdated, setIsCountUpdated] = useState(false);

  // Filter out current user before counting
  const otherUsers = activeUsersWithMetadata.filter(u => u.id !== user?.id);

  // Effect to handle count changes
  useEffect(() => {
    setIsCountUpdated(true);
    const timer = setTimeout(() => {
      setIsCountUpdated(false);
    }, 6000); // Animation duration

    return () => clearTimeout(timer);
  }, [otherUsers.length]);

  const handleUserClick = (otherUserId: string) => {
    if (!user?.id) return;
    startChat(user.id, otherUserId);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="font-bold">Online Users</h2>
        <Badge 
          variant="secondary" 
          className={cn(
            "bg-green-100 text-green-800 border-green-200",
            isCountUpdated && "animate-pulse"
          )}
        >
          {otherUsers.length} online
        </Badge>
      </div>
      
      <div className="space-y-2">
        {otherUsers.map((u) => (
          <div
            key={u.id}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-800 transition-colors cursor-pointer group"
            onClick={() => handleUserClick(u.id)}
          >
            <div className="relative">
              <img
                src={u.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.email || u.id}`}
                alt={u.full_name || "User avatar"}
                className="w-10 h-10 rounded-full bg-gray-200"
              />
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">
                {u.full_name || u.email || "Anonymous User"}
              </div>
              <div className="text-xs text-gray-500 truncate">
                Click to chat
              </div>
            </div>
            
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
              <svg 
                className="w-4 h-4 text-gray-400"
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 20 20" 
                fill="currentColor"
              >
                <path 
                  fillRule="evenodd" 
                  d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" 
                  clipRule="evenodd" 
                />
              </svg>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}