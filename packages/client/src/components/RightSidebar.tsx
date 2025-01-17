import React, { createContext, useContext, useState } from "react";
import { X } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

// Types
type Tab = {
  id: string;
  title: string;
  content: React.ReactNode;
  type: "thread" | "document";
};

type SidebarContextType = {
  isOpen: boolean;
  tabs: Tab[];
  activeTabId: string | null;
  openTab: (tab: Omit<Tab, "id">) => void;
  closeTab: (id: string) => void;
  setActiveTabId: (id: string) => void;
  closeSidebar: () => void;
};

// Context
const SidebarContext = createContext<SidebarContextType | null>(null);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(true);
  const [tabs, setTabs] = useState<Tab[]>([
    {
      id: "minutes",
      title: "Minutes",
      content: <div>Minutes</div>,
      type: "document",
    },
  ]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  const openTab = (newTab: Omit<Tab, "id">) => {
    const id = Math.random().toString(36).substr(2, 9);
    const tab = { ...newTab, id };

    setTabs((prev) => [...prev, tab]);
    setActiveTabId(tab.id);
    setIsOpen(true);
  };

  const closeTab = (id: string) => {
    setTabs((prev) => {
      const newTabs = prev.filter((tab) => tab.id !== id);
      if (activeTabId === id && newTabs.length > 0) {
        setActiveTabId(newTabs[newTabs.length - 1].id);
      }
      if (newTabs.length === 0) {
        setIsOpen(false);
        setActiveTabId(null);
      }
      return newTabs;
    });
  };

  const closeSidebar = () => {
    setIsOpen(false);
  };

  return (
    <SidebarContext.Provider
      value={{
        isOpen,
        tabs,
        activeTabId,
        openTab,
        closeTab,
        setActiveTabId,
        closeSidebar,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

// Hook
export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within SidebarProvider");
  }
  return context;
}

// Simple Right Sidebar container
// (You can place this near the root so that it's always rendered.)
export function RightSidebar() {
  const { isOpen, tabs, activeTabId, setActiveTabId, closeSidebar, closeTab } =
    useSidebar();

  return (
    <div
      className={`
        fixed right-0 top-0 h-screen
        border-l border-gray-200 bg-white
        transition-all duration-300 ease-in-out
        ${isOpen ? "w-96" : "w-0 overflow-hidden"}
      `}
      style={{ zIndex: 1000 }}
    >
      {isOpen && tabs.length > 0 && (
        <Tabs
          value={activeTabId || undefined}
          onValueChange={setActiveTabId}
          className="h-full flex flex-col"
        >
          <div className="relative">
            <div className="absolute bottom-0 left-0 right-0 border-b border-gray-200" />
            <TabsList className="relative h-12 bg-transparent p-0 mx-4">
              {tabs.map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="
                    flex-1
                    relative
                    border-gray-200
                    bg-gray-50
                    data-[state=active]:bg-white
                    border
                    rounded-t-md
                    mr-1
                    last:mr-0
                    px-4
                    py-2
                    -mb-3
                    rounded-b-none
                    hover:bg-gray-100
                    data-[state=active]:hover:bg-white
                    data-[state=active]:border-b-white
                    data-[state=active]:z-10
                    shadow-none
                    data-[state=active]:shadow-none
                    ring-0
                    data-[state=active]:ring-0
                    focus-visible:ring-0
                    focus:ring-0
                  "
                >
                  <div className="flex items-center gap-2 max-w-[180px]">
                    <span className="truncate">{tab.title}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        closeTab(tab.id);
                      }}
                      className="p-0.5 hover:bg-gray-100 rounded"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </TabsTrigger>
              ))}
              
              
            </TabsList>
          </div>

          {tabs.map((tab) => (
            <TabsContent
              key={tab.id}
              value={tab.id}
              className="flex-1 overflow-y-auto p-4 bg-white relative"
            >
              {tab.content}
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}