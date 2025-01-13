import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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

  const handleSubmit = async (e) => {
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
    } catch (error) {
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
      <h2 className="text-xl font-bold mb-2">Channels</h2>
      <div className="mb-4">
        {isAdding ? (
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={newChannelName}
              onChange={(e) => setNewChannelName(e.target.value)}
              placeholder="Channel name..."
              className="flex-1 px-2 py-1 text-sm border rounded text-black"
              autoFocus
            />
            <button
              type="submit"
              className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Add
            </button>
          </form>
        ) : (
          <button
            onClick={() => setIsAdding(true)}
            className="w-full px-3 py-1 text-sm border rounded hover:bg-gray-700 flex items-center gap-2"
          >
            <span>+</span> Add Channel
          </button>
        )}
      </div>
      <ul>
        {channels.map((channel) => (
          <li 
            key={channel.id}
            className="px-3 py-2 hover:bg-gray-700 rounded cursor-pointer transition-colors duration-150 mb-1"
            onClick={() => navigate(`/channels/${channel.id}`)}
          >
            <p className="text-gray-300">#{channel.name}</p>
            {channel.description && (
              <span className="text-gray-500 text-sm ml-2">({channel.description})</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}