import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useRef,
} from "react";
import { useSupabase } from "../hooks/use-supabase";
import type { User } from "@supabase/supabase-js";
import type { RealtimeChannel } from "@supabase/supabase-js";

/**
 * Types
 */
type EphemeralChatMessage = {
  from: string; // userId
  content: string;
  timestamp: number;
};

type EphemeralChatSession = {
  channelId: string; // e.g. ephemeral-dm:userA_userB
  participants: [string, string]; // [userAId, userBId]
  messages: EphemeralChatMessage[];
  isOpen: boolean;
};

interface EphemeralChatContextType {
  chats: EphemeralChatSession[];
  startChat: (myUserId: string, otherUserId: string) => void;
  sendMessage: (channelId: string, content: string) => void;
  closeChat: (channelId: string) => void;
}

/**
 * Context
 */
const EphemeralChatContext = createContext<EphemeralChatContextType | null>(null);

export function EphemeralChatProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { supabase, user } = useSupabase();
  const [chats, setChats] = useState<EphemeralChatSession[]>([]);
  const activeChannels = useRef<Record<string, RealtimeChannel>>({});

  // Clean up all channels on unmount
  useEffect(() => {
    return () => {
      Object.values(activeChannels.current).forEach((channel) => {
        supabase.removeChannel(channel);
      });
      activeChannels.current = {};
    };
  }, [supabase]);

  // 1) Subscribe to "ephemeral-handshake" channel
  useEffect(() => {
    if (!user) return;

    const handshakeChannel = supabase.channel("ephemeral-handshake", {
      config: { broadcast: { self: false } },
    });

    handshakeChannel
      .on("broadcast", { event: "request-chat" }, (payload) => {
        const { from, to } = payload.payload;
        if (!user) return;
        if (to === user.id) {
          // We are the recipient of a handshake
          startChat(to, from);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(handshakeChannel);
    };
  }, [supabase, user]);

  /**
   * Helper to create the ephemeral channel ID (both sides do it the same).
   * Sort the two user IDs so that the channel name is consistent regardless of who initiates.
   */
  const getChannelId = (userA: string, userB: string) => {
    const [low, high] = [userA, userB].sort();
    return `ephemeral-dm:${low}_${high}`;
  };

  /**
   * 2) Start or join a DM chat. Also sets up a broadcast subscription on the ephemeral channel.
   */
  const startChat = useCallback(
    (myUserId: string, otherUserId: string) => {
      const channelId = getChannelId(myUserId, otherUserId);
      
      // Check if we already have this chat
      const existingChat = chats.find((c) => c.channelId === channelId);
      if (existingChat) {
        // Re-open if it was closed
        setChats((prev) =>
          prev.map((chat) =>
            chat.channelId === channelId ? { ...chat, isOpen: true } : chat
          )
        );
        return;
      }

      // Create new chat session in local state
      const newSession: EphemeralChatSession = {
        channelId,
        participants: [myUserId, otherUserId],
        messages: [],
        isOpen: true,
      };
      setChats((prev) => [...prev, newSession]);

      // Check if we already have a channel
      if (activeChannels.current[channelId]) {
        return;
      }

      // Create and store new channel subscription
      const ephemeralChannel = supabase.channel(channelId, {
        config: { broadcast: { self: false } },
      });

      ephemeralChannel
        .on("broadcast", { event: "dm" }, (payload) => {
          const { from, content } = payload.payload;
          setChats((prevChats) =>
            prevChats.map((chat) => {
              if (chat.channelId !== channelId) return chat;
              return {
                ...chat,
                messages: [
                  ...chat.messages,
                  { from, content, timestamp: Date.now() },
                ],
              };
            })
          );
        })
        .subscribe();

      // Store the channel reference
      activeChannels.current[channelId] = ephemeralChannel;
    },
    [chats, supabase]
  );

  /**
   * 3) Initiate chat from local user to another user -> broadcast handshake
   */
  const startChatPublic = useCallback(
    (myUserId: string, otherUserId: string) => {
      if (!myUserId || !otherUserId) return;
      
      // Send handshake
      const handshakeChannel = supabase.channel("ephemeral-handshake");
      handshakeChannel.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          handshakeChannel.send({
            type: "broadcast",
            event: "request-chat",
            payload: { from: myUserId, to: otherUserId },
          });
          // Clean up handshake channel after sending
          supabase.removeChannel(handshakeChannel);
        }
      });
    },
    [supabase]
  );

  // We'll merge the above two steps: broadcast the handshake, then local call `startChat`
  const startChatCombined = useCallback(
    (myUserId: string, otherUserId: string) => {
      startChatPublic(myUserId, otherUserId);
      startChat(myUserId, otherUserId);
    },
    [startChatPublic, startChat]
  );

  /**
   * 4) Send an ephemeral direct message
   */
  const sendMessage = useCallback((channelId: string, content: string) => {
    const from = user?.id;
    if (!from) return;

    // Get existing channel
    const channel = activeChannels.current[channelId];
    if (!channel) {
      console.error('No active channel found for', channelId);
      return;
    }

    // Send message on existing channel
    channel.send({
      type: "broadcast",
      event: "dm",
      payload: { from, content },
    });

    // Local echo
    setChats((prev) =>
      prev.map((chat) => {
        if (chat.channelId !== channelId) return chat;
        return {
          ...chat,
          messages: [
            ...chat.messages,
            { from, content, timestamp: Date.now() },
          ],
        };
      })
    );
  }, [user]);

  /**
   * 5) Close ephemeral chat
   */
  const closeChat = useCallback((channelId: string) => {
    // Remove channel subscription
    const channel = activeChannels.current[channelId];
    if (channel) {
      supabase.removeChannel(channel);
      delete activeChannels.current[channelId];
    }

    setChats((prevChats) =>
      prevChats.map((chat) =>
        chat.channelId === channelId ? { ...chat, isOpen: false } : chat
      )
    );
  }, [supabase]);

  return (
    <EphemeralChatContext.Provider
      value={{
        chats,
        startChat: startChatCombined,
        sendMessage,
        closeChat,
      }}
    >
      {children}
    </EphemeralChatContext.Provider>
  );
}

export function useEphemeralChat() {
  const ctx = useContext(EphemeralChatContext);
  if (!ctx) {
    throw new Error(
      "useEphemeralChat must be used within EphemeralChatProvider"
    );
  }
  return ctx;
}