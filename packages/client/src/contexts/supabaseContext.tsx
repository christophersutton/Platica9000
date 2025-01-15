// contexts/SupabaseContext.tsx
import React, { createContext, useEffect, useState } from 'react'
import { createClient, SupabaseClient, type User } from '@supabase/supabase-js'

// Create a single instance of the Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL or anon key is not set");
}

const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
)

type SupabaseContextType = {
  supabase: SupabaseClient
  user: User | null
  loading: boolean
}

export const Context = createContext<SupabaseContextType>({ 
  supabase,
  user: null,
  loading: true 
});

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const syncUser = async (authUser: User) => {
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