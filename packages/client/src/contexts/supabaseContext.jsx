// contexts/SupabaseContext.tsx
import { createContext, useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

// Create a single instance of the Supabase client
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

export const Context = createContext()

export function SupabaseProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const syncUser = async (authUser) => {
    if (!authUser) return null

    // Try to get the user from our database
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single()

    if (!existingUser) {
      // If the user doesn't exist in our database, create them
      const { error } = await supabase
        .from('users')
        .insert({
          id: authUser.id,
          email: authUser.email,
          full_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0],
          avatar_url: authUser.user_metadata?.avatar_url
        })
      
      if (error) {
        console.error('Error creating user in database:', error)
      }
    }

    return authUser
  }

  useEffect(() => {
    // Check active sessions and subscribe to auth changes
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        syncUser(session.user).then(user => {
          setUser(user)
          setLoading(false)
        })
      } else {
        setUser(null)
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (session?.user) {
        syncUser(session.user).then(user => setUser(user))
      } else {
        setUser(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <Context.Provider value={{ supabase, user, loading }}>
      {children}
    </Context.Provider>
  )
}