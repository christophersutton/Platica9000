import { useEffect, useState } from 'react'
import { useSupabase } from '../hooks/useSupabase'

export default function ChatList() {
  const { supabase } = useSupabase()
  const [chats, setChats] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchChats = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('chats')
        .select('*')
        .order('created_at', { ascending: false })
      if (!error) {
        setChats(data || [])
      }
      setLoading(false)
    }

    fetchChats()

    // Subscribe to changes in the 'chats' table
    const channel = supabase
      .channel('chats-all')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chats' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setChats((prev) => [payload.new, ...prev])
        }
        else if (payload.eventType === 'UPDATE') {
          setChats((prev) =>
            prev.map((c) => (c.id === payload.new.id ? payload.new : c))
          )
        }
        else if (payload.eventType === 'DELETE') {
          setChats((prev) =>
            prev.filter((c) => c.id !== payload.old.id)
          )
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  if (loading) return <div>Loading chats...</div>

  return (
    <div>
      <h2 className="text-xl font-bold mb-2">Direct Message Chats</h2>
      <ul>
        {chats.map((chat) => (
          <li key={chat.id}>
            Chat ID: {chat.id} (Last Message: {chat.last_message_at || 'N/A'})
          </li>
        ))}
      </ul>
    </div>
  )
}
