import { useSupabasePresence } from "../hooks/use-presence";
import React from "react";
export function GlobalPresence() {
  const { activeUsersWithMetadata, error, loading, leaveChannel } =
    useSupabasePresence({
      channelName: "global",
      // No presenceData or pass { status: 'free' } if you want
    });

  if (loading) return <p>Loading global presence...</p>;
  if (error) return <p>Error: {error.message}</p>;

  return (
    <div>
      <h2>Global Presence</h2>
      <ul>
        {activeUsersWithMetadata.map((user) => (
          <li key={user.id}>{user.full_name}</li>
        ))}
      </ul>
      <button onClick={leaveChannel}>Leave Global</button>
    </div>
  );
}
