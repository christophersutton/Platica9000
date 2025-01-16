import React from "react";
import { useSupabasePresence } from "../../hooks/use-presence";
type HubProps = {
  hubId: string;
};
export function HubPresence({ hubId }: HubProps) {
  const { activeUsersWithMetadata, error } = useSupabasePresence({
    channelName: `hub_${hubId}`,
  });

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center space-x-2">
        <h3 className="font-semibold">{`${activeUsersWithMetadata.length} Active Now`}</h3>
        {/* {activeUsersWithMetadata.map((user) => (
          <div key={user.id} className="flex items-center space-x-2">
            <img
              src={
                user.avatar_url ||
                `https://api.dicebear.com/7.x/bottts/svg?seed=${user.email}`
              }
              alt={user.full_name || ""}
              className="w-8 h-8 rounded-full"
            />
            <span>{user.full_name}</span>
          </div>
        ))} */}
      </div>
    </div>
  );
}
