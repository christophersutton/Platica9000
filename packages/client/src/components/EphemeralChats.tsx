import React, { type MutableRefObject } from "react";
import { AnimatePresence } from "framer-motion";
import { useEphemeralChat } from "../contexts/EphemeralChatContext";
import { EphemeralChatModal } from "./EphemeralChatModal";



export function EphemeralChats({ constraintsRef }: { constraintsRef: MutableRefObject<null> }) {
  const { chats, closeChat } = useEphemeralChat();

  return (
    <AnimatePresence>
      {chats
        .filter((c) => c.isOpen)
        .map((chat) => {
          const [userA, userB] = chat.participants;
          // The user in participants who is not "me" is the other user
          // but we don't rely on "me" here, it's just for labeling
          return (
            <EphemeralChatModal
              key={chat.channelId}
              channelId={chat.channelId}
              onClose={() => closeChat(chat.channelId)}
              messages={chat.messages}
              otherUserId={userA === userB ? userA : userB}
              constraintsRef={constraintsRef}
            />
          );
        })}
    </AnimatePresence>
  );
}