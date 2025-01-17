import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSupabase } from '../../hooks/use-supabase';

interface Channel {
  id: string;
  name: string;
  description?: string;
  created_at?: string;
}

type ChannelListProps = {
  onChannelSelect: (channel: { id: string; name: string }) => void;
};

export function ChannelList({ onChannelSelect }: ChannelListProps) {
  const { supabase } = useSupabase();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const navigate = useNavigate();
  const { channelId } = useParams();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase
        .from("channels")
        .insert([{ name: newChannelName }])
        .select()
        .single();

      if (error) {
        throw error;
      }

      setIsAdding(false);
      setNewChannelName("");
    } catch (error: any) {
      console.error("Error adding channel:", error.message);
    }
  };

  useEffect(() => {
    const fetchChannels = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("channels")
        .select("*")
        .order("created_at", { ascending: false });
        
      if (!error) {
        setChannels(data || []);
      } else {
        console.error("Error fetching channels:", error.message);
      }
      setLoading(false);
    };

    fetchChannels();

    // Set up real-time subscription
    const subscription = supabase
      .channel('public:channels')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'channels' 
      }, fetchChannels)
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  if (loading) return <div>Loading channels...</div>;

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Channels</h2>
      
      {/* Channel List with Add Channel */}
      <div className="space-y-0.5">
        <ul className="space-y-0.5">
          {channels.map((channel) => {
            const isActive = channel.id === channelId;
            return (
              <li 
                key={channel.id}
                className={`group px-3 py-2 rounded cursor-pointer transition-all duration-150
                  ${isActive 
                    ? 'bg-gray-700 text-white' 
                    : 'text-gray-300 hover:bg-gray-700/50'
                  }`}
                onClick={() => navigate(`/channels/${channel.id}`)}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">#</span>
                  <div className="flex-1 min-w-0">
                    <p className="truncate">{channel.name}</p>
                    {channel.description && (
                      <p className="text-sm text-gray-500 truncate">{channel.description}</p>
                    )}
                  </div>
                  {isActive && (
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        {/* Add Channel Button/Form */}
        <div className="px-1">
          {isAdding ? (
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                type="text"
                value={newChannelName}
                onChange={(e) => setNewChannelName(e.target.value)}
                placeholder="Channel name..."
                className="flex-1 px-2 py-1.5 text-sm border rounded bg-gray-900 text-white border-gray-700 focus:outline-none focus:border-gray-500"
                autoFocus
              />
              <button
                type="submit"
                className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                Add
              </button>
            </form>
          ) : (
            <button
              onClick={() => setIsAdding(true)}
              className="w-full px-3 py-2 text-sm border border-gray-700 rounded hover:bg-gray-700 transition-colors flex items-center gap-2 text-gray-300"
            >
              <span>+</span> Add Channel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}