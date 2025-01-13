import { useEffect, useState } from 'react'
import { useSupabase } from '../hooks/useSupabase'

export default function RoomsList() {
  const { supabase } = useSupabase()
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchRooms = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .order('created_at', { ascending: false })
      if (!error) {
        setRooms(data || [])
      }
      setLoading(false)
    }

    fetchRooms()

    // Subscribe to changes in the 'rooms' table
    const channel = supabase
      .channel('rooms-all')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setRooms((prev) => [payload.new, ...prev])
        }
        else if (payload.eventType === 'UPDATE') {
          setRooms((prev) =>
            prev.map((r) => (r.id === payload.new.id ? payload.new : r))
          )
        }
        else if (payload.eventType === 'DELETE') {
          setRooms((prev) =>
            prev.filter((r) => r.id !== payload.old.id)
          )
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  if (loading) return <div>Loading rooms...</div>

  return (
    <div>
      <h2 className="text-xl font-bold mb-2">Rooms</h2>
      <ul>
        {rooms.map((room) => (
          <li key={room.id}>
            {room.name} {room.ended_at ? '(ended)' : ''}
          </li>
        ))}
      </ul>
    </div>
  )
}
