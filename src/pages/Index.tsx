import { useState } from "react";
import { ChatInterface } from "@/components/ChatInterface";
import { ClientSidebar } from "@/components/layout/ClientSidebar";
import { ContextPanel } from "@/components/layout/ContextPanel";
import { SettingsDialog } from "@/components/settings/SettingsDialog";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

export default function Index() {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const queryClient = useQueryClient();

  const handleClientSelect = (clientId: string | null) => {
    setSelectedClientId(clientId);
    
    if (clientId) {
      queryClient.invalidateQueries({ queryKey: ['client', clientId] });
    }
  };

  const handleClientDetailsPlaced = () => {
    queryClient.invalidateQueries({ queryKey: ['messages'] });
    queryClient.invalidateQueries({ queryKey: ['client', selectedClientId] });
  };

  return (
    <div className="h-screen w-full overflow-hidden bg-background">
      <header className="h-14 border-b bg-white/80 backdrop-blur-md flex items-center justify-between px-6 fixed top-0 w-full z-50 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-200">
            B
          </div>
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-cyan-600">
            Bailiwick AI
          </h1>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSettingsOpen(true)}
          className="h-9 w-9"
        >
          <Settings className="h-4 w-4" />
          <span className="sr-only">Settings</span>
        </Button>
      </header>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />

      <div className="h-full pt-14">
        <ResizablePanelGroup direction="horizontal" className="h-full w-full">
          {/* Left Sidebar: Client List */}
          <ResizablePanel defaultSize={20} minSize={15} maxSize={30} className="bg-gray-50/50">
            <ClientSidebar 
              selectedClientId={selectedClientId} 
              onClientSelect={handleClientSelect} 
            />
          </ResizablePanel>
          
          <ResizableHandle withHandle className="bg-gray-100" />

          {/* Center: Chat Interface */}
          <ResizablePanel defaultSize={50} minSize={30}>
            <div className="h-full bg-white">
              <ChatInterface onSendMessage={(message) => {
                if (selectedClientId) {
                  // Trigger logic if needed, potentially via context/hooks instead of DOM query
                  const advisorAdviceBtn = document.querySelector('[data-advisor-advice-button]');
                  if (advisorAdviceBtn) {
                    (advisorAdviceBtn as HTMLButtonElement).click();
                  }
                }
                queryClient.invalidateQueries({ queryKey: ['messages'] });
              }} />
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle className="bg-gray-100" />

          {/* Right Sidebar: Context (Data/Plan) */}
          <ResizablePanel defaultSize={30} minSize={25} maxSize={45} className="bg-white shadow-xl shadow-gray-100 z-10">
            <ContextPanel 
              selectedClientId={selectedClientId}
              onClientDetailsPlaced={handleClientDetailsPlaced}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
