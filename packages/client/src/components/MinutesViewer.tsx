"use client";

import React from "react";
import { format } from "date-fns";
import ReactMarkdown from "react-markdown";
import { ScrollArea } from "./ui/scroll-area";
import { Button } from "./ui/button";
import { cn } from "../lib/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./ui/accordion";
import { useSupabase } from "../hooks/use-supabase";

const replaceNewlines = (text: string) => text.replace(/\\\n/g, "\n");

interface Minute {
  id: string;
  content: string;
  time_period_start: string;
  time_period_end: string;
  channel_id: string;
}

interface MinutesViewerProps {
  minuteId?: string;
}

/**
 * Now just a reusable viewer, with no "isOpen"/"onClose" or fixed positioning.
 * It's meant to be placed inside the RightSidebar via openTab().
 */
export function MinutesViewer({ minuteId }: MinutesViewerProps) {
  const [minutes, setMinutes] = React.useState<Minute[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const { supabase } = useSupabase();
  const [expandedIds, setExpandedIds] = React.useState<string[]>([]);

  React.useEffect(() => {
    const fetchMinutes = async () => {
      setIsLoading(true);
      try {
        // Get all minutes from the last month
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data, error } = await supabase
          .from("minutes")
          .select("*")
          .gte("time_period_start", thirtyDaysAgo.toISOString())
          .order("time_period_start", { ascending: false });

        if (error) throw error;
        setMinutes(data || []);

        // If a specific minute was requested, expand it
        if (minuteId) {
          setExpandedIds([minuteId]);
          // Optionally scroll it into view
          setTimeout(() => {
            document
              .getElementById(`minute-${minuteId}`)
              ?.scrollIntoView({ behavior: "smooth", block: "start" });
          }, 100);
        }
      } catch (err) {
        console.error("Error fetching minutes:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMinutes();
  }, [minuteId, supabase]);

  return (
    <div className="w-full h-full flex flex-col">
      <h2 className="text-lg font-semibold mb-2">Meeting Minutes</h2>
      <ScrollArea className="flex-1">
        <div className="divide-y">
          {isLoading ? (
            <div className="text-center text-muted-foreground p-4">
              Loading...
            </div>
          ) : minutes.length === 0 ? (
            <div className="text-center text-muted-foreground p-4">
              No minutes found
            </div>
          ) : (
            <Accordion
              type="multiple"
              value={expandedIds}
              onValueChange={setExpandedIds}
              className="divide-y"
            >
              {minutes.map((minute) => (
                <AccordionItem
                  key={minute.id}
                  value={minute.id}
                  id={`minute-${minute.id}`}
                >
                  <AccordionTrigger className="hover:no-underline py-3">
                    <div className="flex flex-col items-start">
                      <div className="text-sm font-medium">
                        {format(new Date(minute.time_period_start), "MMMM d, yyyy")}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(minute.time_period_start), "h:mm a")}
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="prose prose-sm dark:prose-invert pb-3">
                      <ReactMarkdown>{replaceNewlines(minute.content)}</ReactMarkdown>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}