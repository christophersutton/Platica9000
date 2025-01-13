import { useEffect, useRef, useState } from 'react'
import { useSupabase } from '../hooks/useSupabase'

/**
 * Pass in tableFilter as an object specifying which column= value,
 * e.g. { channel_id: someChannelId } or { chat_id: someChatId }.
 * 
 * This example focuses on messages from the 'messages' table and 
 * includes child 'reactions' relationship.
 */
export default function MessagesList({ tableFilter }) {
  const { supabase } = useSupabase()
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef(null)

  useEffect(() => {
    if (!tableFilter) return

    const fetchMessages = async () => {
      setLoading(true)
      const query = supabase
        .from('messages')
        .select(`*, reactions(*), users:users(*)
        `)
        .order('created_at', { ascending: true })
        .limit(100)

      // Add where filters from tableFilter
      // For example: .eq('channel_id', channelId)
      Object.keys(tableFilter).forEach((col) => {
        query.eq(col, tableFilter[col])
      })

      const { data, error } = await query
      if (!error) {
        setMessages(data || [])
      }
      setLoading(false)
      scrollToBottom()
    }

    fetchMessages()

    // Subscribe to changes
    const key = Object.entries(tableFilter)
      .map(([k, v]) => `${k}=eq.${v}`)
      .join(',')
    const msgChannel = supabase
      .channel('messages-sub:' + key)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: key
        },
        () => {
          // Re-fetch all messages whenever a message is inserted/updated/deleted
          fetchMessages()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reactions'
        },
        () => {
          // Re-fetch all messages for any reaction changes
          fetchMessages()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(msgChannel)
    }
  }, [supabase, tableFilter])

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  if (loading) return <div>Loading messages...</div>

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto px-4 py-2">
        {messages.map((msg) => (
          <div key={msg.id} className="mb-2">
            <b>{msg.users?.full_name || 'Unknown'}:</b> {msg.content}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
