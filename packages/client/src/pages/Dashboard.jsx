import { useState, useEffect, useCallback, memo } from 'react'
import { Messages, MessageInput } from '../components/Messages'
import { useSupabase } from '../hooks/useSupabase';
import { ChannelList } from '../components/gpt/ChannelList';
import { Outlet, useNavigate } from 'react-router-dom';
import { SignOutButton } from '../components/SignOutButton';

const ChannelItem = memo(({ channel, isActive, onClick }) => (
  <li 
    onClick={() => onClick(channel)}
    className={`cursor-pointer p-2 rounded ${
      isActive ? 'bg-gray-700' : ''
    }`}
  >
    # {channel.name}
  </li>
));

export function Dashboard() {
  const [channels, setChannels] = useState([])
  const [currentChannel, setCurrentChannel] = useState(null)
  const { supabase } = useSupabase();
  
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

  const handleChannelSelect = useCallback((channel) => {
    navigate(`/channels/${channel.id}`);
  }, [navigate]);

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="w-64 bg-gray-800 text-white p-4 flex flex-col">
        <div className="flex-1">
          <ChannelList onChannelSelect={handleChannelSelect} />
        </div>
        <div className="mt-auto">
          <SignOutButton />
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1">
        <Outlet />
      </div>
    </div>
  )
}
