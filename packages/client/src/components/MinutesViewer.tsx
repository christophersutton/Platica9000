"use client";

import React from "react";
import { format } from "date-fns";
import ReactMarkdown from "react-markdown";
import { ScrollArea } from "./ui/scroll-area";
import { Button } from "./ui/button";
import { X } from "lucide-react";
import { useSupabase } from "../hooks/use-supabase";
import { cn } from "../lib/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./ui/accordion";

const replaceNewlines = (text: string) => text.replace(/\\\n/g, '\n')


interface Minute {
  id: string;
  content: string;
  time_period_start: string;
  time_period_end: string;
  channel_id: string;
}

interface MinutesViewerProps {
  minuteId?: string;  // Optional now since we'll show all minutes
  isOpen: boolean;
  onClose: () => void;
}

export function MinutesViewer({ minuteId, isOpen, onClose }: MinutesViewerProps) {
  const [minutes, setMinutes] = React.useState<Minute[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const { supabase } = useSupabase();
  const [expandedIds, setExpandedIds] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (!isOpen) return;

    const fetchMinutes = async () => {
      setIsLoading(true);
      try {
        // Get all minutes from the last month
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data, error } = await supabase
          .from('minutes')
          .select('*')
          .gte('time_period_start', thirtyDaysAgo.toISOString())
          .order('time_period_start', { ascending: false });

        if (error) throw error;
        setMinutes(data || []);
        
        // If a specific minute was requested, expand it
        if (minuteId) {
          setExpandedIds([minuteId]);
          // Ensure the selected minute is visible by scrolling to it
          setTimeout(() => {
            document.getElementById(`minute-${minuteId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 100);
        }
      } catch (error) {
        console.error('Error fetching minutes:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMinutes();
  }, [isOpen, minuteId, supabase]);

  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-0 h-screen w-[400px] bg-background border-l shadow-lg transform transition-transform duration-200 ease-in-out">
      <div className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
        <h2 className="text-lg font-semibold">Meeting Minutes</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="h-[calc(100vh-64px)]">
        <div className="divide-y">
          {isLoading ? (
            <div className="text-center text-muted-foreground p-4">Loading...</div>
          ) : minutes.length === 0 ? (
            <div className="text-center text-muted-foreground p-4">No minutes found</div>
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
                  className={cn(
                    "px-4 border-0",
                    minuteId === minute.id && "bg-muted"
                  )}
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