import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useSupabase } from "../hooks/use-supabase";
import type { User } from "@supabase/supabase-js";

/**
 * Types
 */
type EphemeralChatMessage = {
  from: string;     // userId
  content: string;
  timestamp: number; 
};

type EphemeralChatSession = {
  channelId: string;                // e.g. ephemeral-dm:userA_userB
  participants: [string, string];   // [userAId, userBId]
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

export function EphemeralChatProvider({ children }: { children: React.ReactNode }) {
  const { supabase, user } = useSupabase();
  const [chats, setChats] = useState<EphemeralChatSession[]>([]);
  
  // 1) Subscribe to "ephemeral-handshake" channel
  useEffect(() => {
    if (!user) return;

    const handshakeChannel = supabase.channel("ephemeral-handshake", {
      config: { broadcast: { self: false } }
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
  const startChat = useCallback((myUserId: string, otherUserId: string) => {
    const channelId = getChannelId(myUserId, otherUserId);
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

    // Subscribe to ephemeral channel
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
  }, [chats, supabase]);

  /**
   * 3) Initiate chat from local user to another user -> broadcast handshake
   */
  const startChatPublic = useCallback((myUserId: string, otherUserId: string) => {
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
      }
    });
  }, [supabase]);

  // We'll merge the above two steps: broadcast the handshake, then local call `startChat`
  const startChatCombined = useCallback((myUserId: string, otherUserId: string) => {
    startChatPublic(myUserId, otherUserId);
    startChat(myUserId, otherUserId);
  }, [startChatPublic, startChat]);

  /**
   * 4) Send an ephemeral direct message
   */
  const sendMessage = (channelId: string, content: string) => {
    const from = user?.id;
    if (!from) return;
    const ephemeralChannel = supabase.channel(channelId);
    ephemeralChannel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        ephemeralChannel.send({
          type: "broadcast",
          event: "dm",
          payload: { from, content },
        });
      }
    });
    // Also do local echo
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
  };

  /**
   * 5) Close ephemeral chat
   */
  const closeChat = (channelId: string) => {
    setChats((prevChats) =>
      prevChats.map((chat) =>
        chat.channelId === channelId ? { ...chat, isOpen: false } : chat
      )
    );
  };

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
    throw new Error("useEphemeralChat must be used within EphemeralChatProvider");
  }
  return ctx;
}