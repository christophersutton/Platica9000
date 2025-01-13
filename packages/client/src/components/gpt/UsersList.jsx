import { useEffect, useState } from 'react'
import { useSupabase } from '../hooks/useSupabase'

export default function UsersList() {
  const { supabase } = useSupabase()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: true })
      if (!error) {
        setUsers(data || [])
      }
      setLoading(false)
    }

    fetchUsers()

    // Subscribe to changes in the 'users' table
    const channel = supabase
      .channel('users-all')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setUsers((prev) => [...prev, payload.new])
        }
        else if (payload.eventType === 'UPDATE') {
          setUsers((prev) =>
            prev.map((u) => (u.id === payload.new.id ? payload.new : u))
          )
        }
        else if (payload.eventType === 'DELETE') {
          setUsers((prev) =>
            prev.filter((u) => u.id !== payload.old.id)
          )
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  if (loading) return <div>Loading users...</div>

  return (
    <div>
      <h2 className="text-xl font-bold mb-2">All Users</h2>
      <ul>
        {users.map((user) => (
          <li key={user.id}>
            {user.full_name} (<i>{user.email}</i>)
          </li>
        ))}
      </ul>
    </div>
  )
}
