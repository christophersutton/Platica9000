import { useEffect, useState } from "react";
import { useSupabase } from "../../hooks/useSupabase";

export function ChannelList() {
  const { supabase } = useSupabase();
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  
  const handleSubmit = (channelName) => {
    console.log(channelName);
    try {
      const { data, error } = supabase
        .from("channels")
        .insert([{ name: channelName }])
        .select()
        .single();

      console.log(data);

      if (error) {
        throw error;
      }

      // No need to manually update state since subscription will handle it
      return data;
    } catch (error) {
      console.error("Error adding channel:", error.message);
      throw error;
    }
  };

  useEffect(() => {
    let subscription;

    const fetchChannels = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("channels")
        .select("*")
        .order("created_at", { ascending: false });
      console.log(data);
      if (!error) {
        setChannels(data || []);
      }
      setLoading(false);
    };

    fetchChannels();

    // Subscribe to changes in the 'channels' table
    const channel = supabase
      .channel("channels-all")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "channels" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setChannels((prev) => [payload.new, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            setChannels((prev) =>
              prev.map((ch) => (ch.id === payload.new.id ? payload.new : ch))
            );
          } else if (payload.eventType === "DELETE") {
            setChannels((prev) =>
              prev.filter((ch) => ch.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  if (loading) return <div>Loading channels...</div>;

  return (
    <div>
      <h2 className="text-xl font-bold mb-2">FOO</h2>
      <div className="mb-4">
        {isAdding ? (
          <form
            onSubmit={handleSubmit}
            className="flex gap-2"
          >
            <input
              type="text"
              value={newChannelName}
              onChange={(e) => setNewChannelName(e.target.value)}
              placeholder="Channel name..."
              className="flex-1 px-2 py-1 text-sm border rounded text-black"
              autoFocus
              onBlur={() => setIsAdding(false)}
            />
            <button
              type="submit"
              className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-60 hover:text-blue-900"
            >
              Add
            </button>
          </form>
        ) : (
          <button
            onClick={() => setIsAdding(true)}
            className="w-full px-3 py-1 text-sm border rounded hover:bg-gray-100 flex items-center gap-2"
          >
            <span>+</span> Add Channel
          </button>
        )}
      </div>
      <ul>
        {channels.map((channel) => (
          <li key={channel.id}>
            #{channel.name} ({channel.description})
          </li>
        ))}
      </ul>
    </div>
  );
}
