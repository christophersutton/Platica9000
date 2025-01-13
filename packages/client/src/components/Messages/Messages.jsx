import { useEffect, useState, useRef } from 'react'
import MessageInput from './MessageInput'
import MessageReactions from './MessageReactions'

export default function Messages({ channelId }) {
  const [messages, setMessages] = useState([])
  const { supabase } = useSupabase();
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef(null)

  useEffect(() => {
    const fetchMessages = async () => {
      setLoading(true)
      const { data: messagesData } = await supabase
        .from('messages')
        .select(`
          *,
          users (
            id,
            full_name,
            avatar_url
          ),
          reactions (
            emoji,
            user_id
          )
        `)
        .eq('channel_id', channelId)
        .order('created_at', { ascending: false })
        .limit(50)

      // Process reactions for display
      const processedMessages = messagesData?.map(message => ({
        ...message,
        reactions: Object.entries(
          message.reactions?.reduce((acc, r) => {
            acc[r.emoji] = (acc[r.emoji] || 0) + 1
            return acc
          }, {}) || {}
        ).map(([emoji, count]) => ({
          emoji,
          count,
          hasReacted: message.reactions?.some(
            r => r.emoji === emoji && r.user_id === supabase.auth.user()?.id
          )
        }))
      }))

      setMessages(processedMessages || [])
      setLoading(false)
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    fetchMessages()

    // Subscribe to new messages and reactions
    const channel = supabase
      .channel(`messages:${channelId}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'messages',
          filter: `channel_id=eq.${channelId}`
        }, 
        (payload) => {
          fetchMessages() // Refetch to get all related data
        }
      )
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reactions'
        },
        (payload) => {
          fetchMessages() // Refetch to get updated reactions
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [channelId])

  const handleSend = async (content, attachments = []) => {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        channel_id: channelId,
        content,
        user_id: supabase.auth.user()?.id,
        attachments
      })
      .select()

    if (error) console.error('Error sending message:', error)
    return data
  }

  if (loading) {
    return <div className="p-4">Loading messages...</div>
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4">
        {messages.map(message => (
          <div key={message.id} className="mb-4">
            <div className="flex items-start gap-2">
              {message.users?.avatar_url ? (
                <img 
                  src={message.users.avatar_url} 
                  alt=""
                  className="w-8 h-8 rounded-full"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gray-300" />
              )}
              
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="font-medium">
                    {message.users?.full_name}
                  </span>
                  <span className="text-sm text-gray-500">
                    {new Date(message.created_at).toLocaleTimeString()}
                  </span>
                </div>
                
                <div className="mt-1">{message.content}</div>
                
                {message.attachments?.map((attachment, i) => (
                  <div key={i} className="mt-2">
                    {attachment.type === 'file' && (
                      <a 
                        href={attachment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline"
                      >
                        {attachment.name}
                      </a>
                    )}
                  </div>
                ))}
                
                <div className="mt-2">
                  <MessageReactions 
                    message={message}
                    currentUser={supabase.auth.user()}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <MessageInput channelId={channelId} onSend={handleSend} />
    </div>
  )
}