import React, { useCallback } from "react";
import { useSupabase } from "../hooks/use-supabase";
import { Link, Outlet, useNavigate } from "react-router-dom";
import { SignOutButton } from "../components/SignOutButton";
import { ChannelList } from "../components/gpt/ChannelList";
import { OnlineUsersList } from "../components/OnlineUsersList";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { RightSidebar, useSidebar } from "../components/RightSidebar";

export function Dashboard() {
  const { user } = useSupabase();
  const navigate = useNavigate();
  const { isOpen } = useSidebar();

  const handleChannelSelect = useCallback(
    (channel: { id: string; name: string }) => {
      navigate(`/channels/${channel.id}`);
    },
    [navigate]
  );

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <ResizablePanelGroup direction="horizontal" className="h-screen">
      {/* Left Sidebar */}
      <ResizablePanel defaultSize={20} minSize={15} maxSize={25}>
        <div className="h-full bg-gray-800 text-white p-4 flex flex-col justify-between">
          {/* Channels Section */}
          <div className="min-h-0 overflow-y-auto">
            <ChannelList onChannelSelect={handleChannelSelect} />
          </div>
          
          {/* Bottom Section */}
          <div className="mt-4 space-y-4">
            {/* Online Users */}
            <div className="bg-gray-900 rounded-lg p-3">
              <OnlineUsersList />
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <Link
                to="/secretary"
                className="block w-full text-center px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors duration-200 text-white font-medium"
              >
                Ask the Secretary
              </Link>
              <SignOutButton />
            </div>
          </div>
        </div>
      </ResizablePanel>

      <ResizableHandle />

      {/* Main Content */}
      <ResizablePanel defaultSize={isOpen ? 55 : 80} minSize={30}>
        <div className="h-full">
          <Outlet />
        </div>
      </ResizablePanel>

      {/* Right Sidebar Panel - only shown when sidebar is open */}
      {isOpen && (
        <>
          <ResizableHandle />
          <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
            <RightSidebar />
          </ResizablePanel>
        </>
      )}
    </ResizablePanelGroup>
  );
}