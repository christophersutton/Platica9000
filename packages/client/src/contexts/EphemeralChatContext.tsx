import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useRef,
} from "react";
import { useSupabase } from "../hooks/use-supabase";
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
  channelId: string;
  participants: [string, string];
  messages: EphemeralChatMessage[];
  isOpen: boolean;
  otherUserLeft?: boolean;
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
const EphemeralChatContext = createContext<EphemeralChatContextType | null>(
  null
);

export function EphemeralChatProvider({ children }: { children: React.ReactNode }) {
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
          // We are the recipient
          startChat(to, from);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(handshakeChannel);
    };
  }, [supabase, user]);

  /**
   * Helper to create ephemeral channel ID
   */
  const getChannelId = (userA: string, userB: string) => {
    const [low, high] = [userA, userB].sort();
    return `ephemeral-dm:${low}_${high}`;
  };

  /**
   * 2) Start or join a DM chat. If it already exists, just re-open & remove any countdown
   */
  const startChat = useCallback(
    (myUserId: string, otherUserId: string) => {
      const channelId = getChannelId(myUserId, otherUserId);

      // Check if we already have this chat in local state
      const existingChat = chats.find((c) => c.channelId === channelId);
      if (existingChat) {
        // Re-open the existing chat, reset `otherUserLeft` if it was set
        setChats((prev) =>
          prev.map((chat) =>
            chat.channelId === channelId
              ? { ...chat, isOpen: true, otherUserLeft: false }
              : chat
          )
        );

        // If the channel subscription was removed (e.g. by the leaver), restore it
        if (!activeChannels.current[channelId]) {
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
            .on("broadcast", { event: "user-left" }, (payload) => {
              const { from } = payload.payload;
              if (from !== user?.id) {
                // The other user closed
                setChats((prevChats) =>
                  prevChats.map((chat) => {
                    if (chat.channelId !== channelId) return chat;
                    return {
                      ...chat,
                      otherUserLeft: true,
                    };
                  })
                );
              }
            })
            .subscribe();
          activeChannels.current[channelId] = ephemeralChannel;
        }

        // Return so we don't create a *second* ephemeral chat
        return;
      }

      // Otherwise create a fresh chat session
      const newSession: EphemeralChatSession = {
        channelId,
        participants: [myUserId, otherUserId],
        messages: [],
        isOpen: true,
      };
      setChats((prev) => [...prev, newSession]);

      // Ensure there's no stale subscription
      if (activeChannels.current[channelId]) {
        supabase.removeChannel(activeChannels.current[channelId]);
        delete activeChannels.current[channelId];
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
        .on("broadcast", { event: "user-left" }, (payload) => {
          const { from } = payload.payload;
          if (from !== user?.id) {
            setChats((prevChats) =>
              prevChats.map((chat) => {
                if (chat.channelId !== channelId) return chat;
                return {
                  ...chat,
                  otherUserLeft: true,
                };
              })
            );
          }
        })
        .subscribe();

      activeChannels.current[channelId] = ephemeralChannel;
    },
    [chats, supabase, user?.id]
  );

  /**
   * 3) Public handshake => local startChat
   */
  const startChatPublic = useCallback(
    (myUserId: string, otherUserId: string) => {
      if (!myUserId || !otherUserId) return;
      const handshakeChannel = supabase.channel("ephemeral-handshake");
      handshakeChannel.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          handshakeChannel.send({
            type: "broadcast",
            event: "request-chat",
            payload: { from: myUserId, to: otherUserId },
          });
          supabase.removeChannel(handshakeChannel);
        }
      });
    },
    [supabase]
  );

  // Merge handshake + local
  const startChatCombined = useCallback(
    (myUserId: string, otherUserId: string) => {
      startChatPublic(myUserId, otherUserId);
      startChat(myUserId, otherUserId);
    },
    [startChatPublic, startChat]
  );

  /**
   * 4) Send ephemeral direct message
   */
  const sendMessage = useCallback(
    (channelId: string, content: string) => {
      const from = user?.id;
      if (!from) return;

      const channel = activeChannels.current[channelId];
      if (!channel) {
        console.error("No active channel found for", channelId);
        return;
      }

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
    },
    [user]
  );

  /**
   * 5) Close ephemeral chat => broadcast 'user-left' => remove from local state
   */
  const closeChat = useCallback(
    (channelId: string) => {
      const from = user?.id;
      const channel = activeChannels.current[channelId];

      if (channel && from) {
        channel.send({
          type: "broadcast",
          event: "user-left",
          payload: { from },
        });
      }
      if (channel) {
        supabase.removeChannel(channel);
        delete activeChannels.current[channelId];
      }

      // Remove from state entirely
      setChats((prevChats) =>
        prevChats.filter((chat) => chat.channelId !== channelId)
      );
    },
    [supabase, user?.id]
  );

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