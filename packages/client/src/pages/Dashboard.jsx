import { useState, useEffect } from 'react'
import { Messages, MessageInput, MessageReactions } from '../components/Messages'
import { useSupabase } from '../hooks/useSupabase';

export function Dashboard() {
  console.log("Dashboard");
  const [channels, setChannels] = useState([])
  const [currentChannel, setCurrentChannel] = useState(null)
  const { supabase } = useSupabase();

  useEffect(() => {
    // Fetch channels from Supabase
    const fetchChannels = async () => {
      const { data, error } = await supabase.from('channels').select('*')
      if (error) {
        console.error('Error fetching channels:', error)
      } else {
        setChannels(data)
      }
    }
    fetchChannels()
  }, [])

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="w-64 bg-gray-800 text-white p-4">
        <h2 className="text-xl mb-4">Channels</h2>
        <ul>
          {channels.map(channel => (
            <li 
              key={channel.id}
              onClick={() => setCurrentChannel(channel)}
              className={`cursor-pointer p-2 rounded ${
                currentChannel?.id === channel.id ? 'bg-gray-700' : ''
              }`}
            >
              # {channel.name}
            </li>
          ))}
        </ul>
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
