import React from "react";
import { useSupabasePresence } from "../hooks/use-presence";
import { useSupabase } from "../hooks/use-supabase";
import { useEphemeralChat } from "../contexts/EphemeralChatContext";

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

  const handleUserClick = (otherUserId: string) => {
    if (!user?.id) return;
    startChat(user.id, otherUserId);
  };

  return (
    <div>
      <h2 className="font-bold mb-2">Online Users</h2>
      {activeUsersWithMetadata.map((u) => {
        if (!u.id || u.id === user?.id) return null; // skip self
        return (
          <div
            key={u.id}
            className="cursor-pointer mb-1 hover:bg-gray-200 p-2 rounded"
            onClick={() => handleUserClick(u.id)}
          >
            {u.full_name || u.email || u.id}
          </div>
        );
      })}
    </div>
  );
}