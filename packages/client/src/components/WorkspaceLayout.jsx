import { Outlet } from "react-router-dom";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "../components/ui/resizable";

import { supabase } from "@/lib/supabase";
export const WorkspaceLayout = () => {
  const [channels, setChannels] = useState([]);
  const { supabase, user } = useSupabase();

  useEffect(() => {
    if (!user) return; // Don't fetch if not logged in

    const fetchChannels = async () => {
      const { data } = await supabase.from("channels").select("*");
      setChannels(data ?? []);
    };

    fetchChannels();
  }, [user]);

  return (
    <div className="h-screen w-full">
      <div className="flex h-full">
        <ResizablePanelGroup direction="horizontal" className="w-full">
          {/* Left Sidebar */}
          <ResizablePanel
            defaultSize={20}
            minSize={15}
            maxSize={30}
            className="bg-gray-100"
          >
            <div className="flex flex-col space-between h-full">
              <div>
                <div className="p-4 border-b bg-gray-200">
                  <h2 className="font-semibold">Organization</h2>
                </div>
                <div className="p-4 space-y-2">
                  <div className="space-y-2">
                    {channels.map((channel) => (
                      <div
                        key={channel.id}
                        className="p-3 rounded-lg hover:bg-gray-200 cursor-pointer transition-colors"
                      >
                        <div className="font-medium"># {channel.name}</div>
                        {channel.description && (
                          <div className="text-sm text-gray-600">
                            {channel.description}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-auto">
              <CurrentUser />
            </div>
          </ResizablePanel>

          <ResizableHandle />

          {/* Main Content */}
          <ResizablePanel defaultSize={55}>
            <div className="flex flex-col h-full">
              <div className="p-4 border-b flex justify-between items-center">
                <Messages channelId={channelId} />
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle />

          {/* Right Sidebar */}
          <ResizablePanel
            defaultSize={25}
            minSize={20}
            maxSize={30}
            className="bg-gray-100"
          >
            <div className="p-4">
              <div className="mb-4 flex justify-between items-center">
                <span>New Room +</span>
              </div>
              <div className="space-y-4">
                <div className="p-4 border rounded bg-gray-200">
                  <div className="flex flex-wrap gap-2">
                    <div className="p-2 bg-gray-500 text-white rounded">U3</div>
                    <div className="p-2 bg-gray-500 text-white rounded">U4</div>
                    <div className="ml-2">Room 3</div>
                  </div>
                </div>
                <div className="p-4 border rounded bg-gray-200">
                  <div className="flex flex-wrap gap-2">
                    {["U5", "U6", "U7", "U8", "U9"].map((user) => (
                      <div
                        key={user}
                        className="p-2 bg-gray-500 text-white rounded"
                      >
                        {user}
                      </div>
                    ))}
                    <div className="ml-2">Room 2</div>
                  </div>
                </div>
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
};

export default WorkspaceLayout;
