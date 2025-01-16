import React, { useCallback } from "react";
import { useSupabase } from "../hooks/use-supabase";
import { Link, Outlet, useNavigate } from "react-router-dom";
import { SignOutButton } from "../components/SignOutButton";
import { ChannelList } from "../components/gpt/ChannelList";
import { OnlineUsersList } from "../components/OnlineUsersList";

export function Dashboard() {
  const { user } = useSupabase();
  const navigate = useNavigate();

  const handleChannelSelect = useCallback(
    (channel: { id: string; name: string }) => {
      navigate(`/channels/${channel.id}`);
    },
    [navigate]
  );

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="w-64 bg-gray-800 text-white p-4 flex flex-col">
        <div className="flex-1 space-y-4">
          <ChannelList onChannelSelect={handleChannelSelect} />
          <div className="bg-white text-black p-2 rounded">
            <OnlineUsersList />
          </div>
        </div>
        <div className="mt-auto">
          <Link
            to="/secretary"
            className="block w-full text-center mb-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors duration-200 text-white font-medium"
          >
            Ask the Secretary
          </Link>
          <SignOutButton />
        </div>
      </div>
      {/* Main content */}
      <div className="flex-1">
        <Outlet />
      </div>
    </div>
  );
}