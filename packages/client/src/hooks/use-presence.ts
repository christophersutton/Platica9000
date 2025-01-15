import { useEffect, useRef, useState } from 'react'
import {
  RealtimeChannel,
  type RealtimeChannelSendResponse
} from '@supabase/supabase-js'
import { useSupabase } from './use-supabase'

interface UseSupabasePresenceOptions {
  channelName: string
  /** 
   * Optional presence data object that you want to track.
   * For example, { status: 'busy' } or { status: 'free', someOtherField: '...' }
   */
  initialPresenceData?: Record<string, any>
  onJoin?: (newPresences: any[]) => void
  onLeave?: (leftPresences: any[]) => void
}

interface UseSupabasePresenceReturn {
  activeUsersWithMetadata: UserMetadata[]
  updatePresence: (newData: Record<string, any>) => Promise<void>
  leaveChannel: () => Promise<void>
  error: Error | null
  loading: boolean
}

interface UserMetadata {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
}

export function useSupabasePresence({
  channelName,
  initialPresenceData,
  onJoin,
  onLeave
}: UseSupabasePresenceOptions): UseSupabasePresenceReturn {
  const { supabase, user } = useSupabase()
  const [activeUsers, setActiveUsers] = useState<any[]>([])
  const [error, setError] = useState<Error | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const channelRef = useRef<RealtimeChannel | null>(null)

  const [presenceData, setPresenceData] = useState<Record<string, any>>(
    initialPresenceData ?? {}
  )

  const [usersMetadata, setUsersMetadata] = useState<Record<string, UserMetadata>>({});

  useEffect(() => {
    // If there's no user or channel, do nothing
    if (!user || !channelName) return

    setLoading(true)
    setError(null)

    // Create the channel
    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: user.id 
        }
      }
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        try {
          const state = channel.presenceState()
          // presenceState() -> { someKey: [{...}], anotherKey: [{...}] }
          const newActiveUsers = Object.values(state).flat()
          setActiveUsers(newActiveUsers)
        } catch (err) {
          if (err instanceof Error) setError(err)
        }
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        onJoin?.(newPresences)
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        onLeave?.(leftPresences)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          try {
            // Track user presence. Merge in whatever presenceData is passed
            const trackPayload = {
              user: user.id,
              ...presenceData
            }

            const result: RealtimeChannelSendResponse = await channel.track(trackPayload)
            if (result !== 'ok') {
              throw new Error(`track() returned non-OK response: ${result}`)
            }
            setLoading(false)
          } catch (err) {
            if (err instanceof Error) setError(err)
            setLoading(false)
          }
        } else if (status === 'TIMED_OUT' || status === 'CLOSED') {
          setLoading(false)
          setError(new Error(`Channel subscription status: ${status}`))
        }
      })

    channelRef.current = channel

    // Cleanup
    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe()
        channelRef.current = null
      }
    }
  }, [supabase, user, channelName, presenceData, onJoin, onLeave])

  const updatePresence = async (newData: Record<string, any>) => {
    setPresenceData((prev) => ({ ...prev, ...newData }))

    if (channelRef.current) {
      try {
        const result: RealtimeChannelSendResponse = await channelRef.current.track({
          user: user?.id,
          ...presenceData,
          ...newData
        })
        if (result !== 'ok') {
          throw new Error(`track() returned non-OK: ${result}`)
        }
      } catch (err) {
        if (err instanceof Error) setError(err)
      }
    }
  }

  const leaveChannel = async () => {
    if (channelRef.current) {
      try {
        const untrackRes: RealtimeChannelSendResponse = await channelRef.current.untrack()
        if (untrackRes !== 'ok') {
          throw new Error(`untrack() returned non-OK: ${untrackRes}`)
        }
      } catch (err) {
        if (err instanceof Error) setError(err)
      } finally {
        channelRef.current.unsubscribe()
        channelRef.current = null
      }
    }
  }

  useEffect(() => {
    const fetchUsersMetadata = async () => {
      if (!activeUsers.length) return;

      const userIds = activeUsers.map(user => user.user).filter(Boolean);
      if (!userIds.length) return;

      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, full_name, avatar_url, email')
          .in('id', userIds);

        if (error) throw error;

        // Create a map of user metadata keyed by user id
        const metadataMap = (data || []).reduce((acc, user) => ({
          ...acc,
          [user.id]: user
        }), {});

        setUsersMetadata(metadataMap);
      } catch (err) {
        if (err instanceof Error) setError(err);
      }
    };

    fetchUsersMetadata();
  }, [activeUsers, supabase]);

  // Combine presence data with user metadata
  const activeUsersWithMetadata = activeUsers.map(presence => ({
    ...presence, ...usersMetadata[presence.user] || null
  }));

  return { activeUsersWithMetadata, updatePresence, leaveChannel, error, loading }
}