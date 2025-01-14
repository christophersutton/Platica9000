import { useState, useEffect, useCallback, memo } from "react";
import { Messages, MessageInput } from "../components/Messages/";
import { useSupabase } from "../hooks/use-supabase";
import { Link, Outlet, useNavigate } from "react-router-dom";
import { SignOutButton } from "../components/SignOutButton";
import React from "react";
import { GlobalPresence } from "../components/GlobalUserPresence";
import { ChannelList } from "../components/gpt/ChannelList";
import { Secretary } from "../components/secretary";
const ChannelItem = memo<{
  channel: { id: string; name: string };
  isActive: boolean;
  onClick: (channel: { id: string; name: string }) => void;
}>(({ channel, isActive, onClick }) => (
  <li
    onClick={() => onClick(channel)}
    className={`cursor-pointer p-2 rounded ${isActive ? "bg-gray-700" : ""}`}
  >
    # {channel.name}
  </li>
));

export function Dashboard() {
  const [channels, setChannels] = useState([]);
  const [currentChannel, setCurrentChannel] = useState(null);
  const { supabase, user } = useSupabase();

  const navigate = useNavigate();

  // const fetchChannels = useCallback(async () => {
  //   const { data, error } = await supabase.from('channels').select('*')
  //   if (error) {
  //     console.error('Error fetching channels:', error)
  //   } else {
  //     setChannels(data)
  //   }
  // }, [supabase])

  // useEffect(() => {
  //   fetchChannels()
  // }, [fetchChannels])

  const handleChannelSelect = useCallback(
    (channel) => {
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
        <div className="flex-1">
          <ChannelList onChannelSelect={handleChannelSelect} />
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
