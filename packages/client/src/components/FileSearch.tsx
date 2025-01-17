import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useSupabase } from "../hooks/use-supabase";

interface SearchResult {
  id: string;
  score: number;
  originalName: string;
  mimeType: string;
  uploadedAt: string;
}

const SERVER_URL = import.meta.env.VITE_SERVER_URL;

export function FileSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { supabase } = useSupabase();

  const handleSearch = async (searchQuery: string) => {
    setIsLoading(true);
    try {
      // Get the current session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("No active session");
      }

      const response = await fetch(`${SERVER_URL}/query-attachments?query=${encodeURIComponent(searchQuery)}`, {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setResults(data.results || []);
    } catch (error) {
      console.error("Error searching files:", error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() && !isLoading) {
      handleSearch(query.trim());
    }
  };

  return (
    <div className="flex flex-col h-full">
      <form onSubmit={handleSubmit} className="flex items-center gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            type="text"
            placeholder="Search files..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-8"
            disabled={isLoading}
          />
        </div>
        <Button type="submit" size="sm" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Searching...
            </>
          ) : (
            'Search'
          )}
        </Button>
      </form>

      <div className="flex-1 overflow-y-auto">
        {results.map((result) => (
          <div
            key={result.id}
            className="p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
          >
            <div className="font-medium text-sm text-gray-900">
              {result.originalName}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {new Date(result.uploadedAt).toLocaleDateString()} - {result.mimeType}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 