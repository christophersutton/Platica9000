import { useEffect, useState, useRef, useCallback, memo } from 'react'
import MessageInput from './MessageInput'
import MessageReactions from './MessageReactions'
import { useSupabase } from '../../hooks/useSupabase'

const Message = memo(({ message, onReaction }) => (
  <div className="message">
    <div className="flex items-start space-x-3">
      <img 
        src={message.users?.avatar_url || '/default-avatar.png'} 
        alt={message.users?.full_name}
        className="w-8 h-8 rounded-full"
      />
      <div>
        <div className="font-medium">{message.users?.full_name}</div>
        <div>{message.content}</div>
        <MessageReactions 
          reactions={message.reactions} 
          onReaction={onReaction} 
          messageId={message.id}
        />
      </div>
    </div>
  </div>
));

export default function Messages({ channelId }) {
  const [messages, setMessages] = useState([])
  const { supabase } = useSupabase();
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef(null)

  const processMessages = useCallback((messagesData) => {
    return messagesData?.map(message => ({
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
    })) || []
  }, [supabase])

  const fetchMessages = useCallback(async () => {
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

    setMessages(processMessages(messagesData))
    setLoading(false)
  }, [channelId, supabase, processMessages])

  useEffect(() => {
    fetchMessages()

    // Subscribe to new messages
    const subscription = supabase
      .channel(`messages:${channelId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'messages',
        filter: `channel_id=eq.${channelId}`
      }, fetchMessages)
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [channelId, fetchMessages])

  const handleReaction = useCallback(async (messageId, emoji) => {
    // Handle reaction logic here
  }, [supabase])

  if (loading) {
    return <div>Loading messages...</div>
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4">
        {messages.map(message => (
          <Message 
            key={message.id} 
            message={message}
            onReaction={handleReaction}
          />
        ))}
        <div ref={bottomRef} />
      </div>
      <MessageInput onSend={handleSend} />
    </div>
  )
}