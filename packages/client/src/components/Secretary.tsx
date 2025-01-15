"use client";

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { Badge } from "./ui/badge";
import { format } from "date-fns";
import { MinutesViewer } from "./MinutesViewer";

// Import the base ChatMessage type from the updated Messages/types
import type { ChatMessage } from "./Messages/types";

interface SourceDocument {
  date: string;
  content: string;
  id: string;  // Added to store the minute ID
}

// Extend ChatMessage so we can include 'isUser' and optional 'sourceDocs'
interface SecretaryMessage extends ChatMessage {
  isUser: boolean;
  sourceDocs?: SourceDocument[];
}

interface CustomEventData extends Event {
  data: string;
}

const MessageDisplay: React.FC<{ message: SecretaryMessage }> = ({
  message,
}) => {
  const [isMinutesOpen, setIsMinutesOpen] = useState(false);
  const [selectedMinuteId, setSelectedMinuteId] = useState<string | undefined>();

  const handleViewMinute = (doc: SourceDocument) => {
    setSelectedMinuteId(doc.id);
    setIsMinutesOpen(true);
  };

  return (
    <div className="message relative mb-4">
      <div className="flex items-start space-x-3">
        <img
          src={
            message.users?.avatar_url ||
            `https://api.dicebear.com/7.x/bottts/svg?seed=${
              message.users?.email || (message.isUser ? "user" : "assistant")
            }`
          }
          alt={
            message.users?.full_name || (message.isUser ? "You" : "Assistant")
          }
          className="w-8 h-8 rounded-full"
        />
        <div className="flex-1">
          <div className="font-medium">
            {message.users?.full_name || (message.isUser ? "You" : "Assistant")}
          </div>
          <div className="prose prose-sm dark:prose-invert mb-2">
            {message.content}
          </div>

          {!message.isUser &&
            message.sourceDocs &&
            message.sourceDocs.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="text-sm text-gray-500">Sources:</span>
                {message.sourceDocs.map((doc, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="cursor-pointer hover:bg-gray-200"
                    onClick={() => handleViewMinute(doc)}
                  >
                    {format(new Date(doc.date), "MMM d, yyyy")}
                  </Badge>
                ))}
              </div>
            )}
        </div>
      </div>

      <MinutesViewer
        minuteId={selectedMinuteId}
        isOpen={isMinutesOpen}
        onClose={() => setIsMinutesOpen(false)}
      />
    </div>
  );
};

export function Secretary() {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<SecretaryMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentStreamingMessage, setCurrentStreamingMessage] = useState<string>("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;

    const userMessage: SecretaryMessage = {
      id: Date.now().toString(),
      content: query,
      isUser: true,
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setCurrentStreamingMessage("");

    const requestBody = {
      query: query.trim(),
      history: messages.map(msg => ({
        content: msg.content,
        isUser: msg.isUser
      })),
      previousDocIds: messages
        .filter(msg => !msg.isUser && msg.sourceDocs)
        .flatMap(msg => msg.sourceDocs?.map(doc => doc.id) || [])
    };

    try {
      const response = await fetch("https://pony-living-lively.ngrok-free.app/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "text/event-stream",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Network response was not ok' }));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      if (!response.body) {
        throw new Error("No response body received");
      }

      let sourceDocs: SourceDocument[] = [];
      let streamedContent = "";

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split("\n\n");
          buffer = events.pop() || "";

          for (const event of events) {
            if (!event.trim()) continue;

            const lines = event.split("\n");
            const eventType = lines[0].replace("event: ", "");
            const data = lines[1]?.replace("data: ", "");

            if (!data) continue;

            try {
              const parsedData = JSON.parse(data);

              switch (eventType) {
                case "message":
                  if (parsedData.content) {
                    streamedContent += parsedData.content;
                    setCurrentStreamingMessage(streamedContent);
                  }
                  break;
                case "docs":
                  if (parsedData.sourceDocs) {
                    sourceDocs = parsedData.sourceDocs;
                  }
                  break;
                case "error":
                  throw new Error(parsedData.error || "Unknown streaming error");
                case "done":
                  const assistantMessage: SecretaryMessage = {
                    id: (Date.now() + 1).toString(),
                    content: streamedContent,
                    isUser: false,
                    sourceDocs,
                  };
                  setMessages((prev) => [...prev, assistantMessage]);
                  setCurrentStreamingMessage("");
                  setQuery("");
                  setIsLoading(false);
                  return;
              }
            } catch (error) {
              console.error("Error parsing event data:", error);
              throw new Error("Failed to parse server response");
            }
          }
        }
      } catch (error) {
        throw error;
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      console.error("Error:", error);
      const errorMessage: SecretaryMessage = {
        id: (Date.now() + 1).toString(),
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
        isUser: false,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1">
        <div className="flex flex-col h-full p-4">
          {messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
              <p className="text-lg">
                Ask me anything about the meeting minutes!
              </p>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <MessageDisplay key={message.id} message={message} />
              ))}
              {currentStreamingMessage && (
                <div className="message relative mb-4">
                  <div className="flex items-start space-x-3">
                    <img
                      src={`https://api.dicebear.com/7.x/bottts/svg?seed=assistant`}
                      alt="Assistant"
                      className="w-8 h-8 rounded-full"
                    />
                    <div className="flex-1">
                      <div className="font-medium">Assistant</div>
                      <div className="prose prose-sm dark:prose-invert mb-2">
                        <ReactMarkdown>{currentStreamingMessage}</ReactMarkdown>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>

      <div className="p-4 border-t">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <Input
            placeholder="Ask a question about past meetings..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" disabled={isLoading || !query.trim()}>
            {isLoading ? "Searching..." : "Ask"}
          </Button>
        </form>
      </div>
    </div>
  );
}
