import { useState, useEffect } from 'react'
import { Smile } from 'lucide-react'
import { useSupabase } from '../../hooks/useSupabase';

const COMMON_EMOJIS = ['👍', '❤️', '😂', '🎉', '🔥', '👀']

export default function MessageReactions({ message, currentUser }) {
  const [showPicker, setShowPicker] = useState(false);
  const { supabase } = useSupabase();

  const addReaction = async (emoji) => {
    await supabase
      .from('reactions')
      .upsert({
        message_id: message.id,
        user_id: currentUser.id,
        emoji
      })
    setShowPicker(false)
  }

  const removeReaction = async (emoji) => {
    await supabase
      .from('reactions')
      .delete()
      .match({
        message_id: message.id,
        user_id: currentUser.id,
        emoji
      })
  }

  useEffect(() => {
    if (!message) return;

    
    // Subscribe to reactions changes for this specific message
    const subscription = supabase
      .channel(`reactions:${message.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reactions',
          filter: `message_id=eq.${message.id}`
        },
        (payload) => {
          console.log('Reactions changed:', payload);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [message.id, supabase]);
   
  

  return (
    <div className="relative">
      <div className="flex gap-1">
        {message?.reactions?.map(reaction => (
          <button
            key={`${reaction.emoji}-${reaction.count}`}
            onClick={() => reaction.hasReacted ? 
              removeReaction(reaction.emoji) : 
              addReaction(reaction.emoji)
            }
            className={`px-2 py-1 rounded text-sm ${
              reaction.hasReacted ? 'bg-blue-100' : 'bg-gray-100'
            }`}
          >
            {reaction.emoji} {reaction.count}
          </button>
        ))}
        
        <button 
          onClick={() => setShowPicker(!showPicker)}
          className="p-1 rounded hover:bg-gray-100"
        >
          <Smile className="w-4 h-4" />
        </button>
      </div>

      {showPicker && (
        <div className="absolute bottom-full mb-2 bg-white shadow-lg rounded p-2">
          <div className="flex gap-2">
            {COMMON_EMOJIS.map(emoji => (
              <button
                key={emoji}
                onClick={() => addReaction(emoji)}
                className="hover:bg-gray-100 p-1 rounded"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}