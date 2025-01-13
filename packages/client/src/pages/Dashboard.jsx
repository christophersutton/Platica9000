import { useState, useEffect, useCallback, memo } from 'react'
import { Messages, MessageInput, MessageReactions } from '../components/Messages'
import { useSupabase } from '../hooks/useSupabase';
import { ChannelList } from '../components/gpt/ChannelList';
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

  const fetchChannels = useCallback(async () => {
    const { data, error } = await supabase.from('channels').select('*')
    if (error) {
      console.error('Error fetching channels:', error)
    } else {
      setChannels(data)
    }
  }, [supabase])

  useEffect(() => {
    fetchChannels()
  }, [fetchChannels])

  const handleChannelSelect = useCallback((channel) => {
    setCurrentChannel(channel)
  }, [])

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="w-64 bg-gray-800 text-white p-4">
        <ChannelList />
      </div>

      {/* Main content */}
      <div className="flex-1">
        {currentChannel ? (
          <Messages channelId={currentChannel.id} />
        ) : (
          <div className="p-4">Select a channel</div>
        )}
      </div>
    </div>
  )
}
