import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ClientTable } from "@/components/client-data/ClientTable";
import { DocumentGenerationPanel } from "@/components/document-generation/DocumentGenerationPanel";
import { AIAnalysis } from "@/components/AIAnalysis";
import { StrategyPanel } from "@/components/strategy/StrategyPanel";
import { useQuery } from "@tanstack/react-query";
import { ClientData } from "@/components/client-data/types";
import { FileText, PenTool, Loader2, Brain, Target } from "lucide-react";
import { backendToFrontend } from "@/utils/clientDataTransform";

const API_BASE = "http://localhost:8000";

interface ContextPanelProps {
  selectedClientId: string | null;
  onClientDetailsPlaced?: () => void;
}

export function ContextPanel({ selectedClientId, onClientDetailsPlaced }: ContextPanelProps) {
  const [activeTab, setActiveTab] = useState("data");

  // Fetch detailed client data
  const { data: selectedClient, isLoading } = useQuery({
    queryKey: ['client-details', selectedClientId],
    queryFn: async () => {
      if (!selectedClientId) return null;
      const response = await fetch(`${API_BASE}/clients/${selectedClientId}`);
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error('Failed to fetch client data');
      }
      const data = await response.json();
      // Backend returns ClientData model with nested structure, convert to frontend flat format
      return backendToFrontend(data);
    },
    enabled: !!selectedClientId
  });

  if (!selectedClientId) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50/50 border-l text-muted-foreground p-6 text-center">
        <div>
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p>Select a client to view details or generate a plan</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white border-l">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col h-full">
        <div className="px-4 py-3 border-b bg-white/50 backdrop-blur-sm sticky top-0 z-10">
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="data" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Client Data
            </TabsTrigger>
            <TabsTrigger value="analysis" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              AI Analysis
            </TabsTrigger>
            <TabsTrigger value="strategy" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Strategy
            </TabsTrigger>
            <TabsTrigger value="plan" className="flex items-center gap-2">
              <PenTool className="h-4 w-4" />
              Plan Writer
            </TabsTrigger>
          </TabsList>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4">
            <TabsContent value="data" className="mt-0 h-full space-y-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                </div>
              ) : selectedClient ? (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <ClientTable 
                    client={selectedClient} 
                    onPlaceInChat={onClientDetailsPlaced}
                  />
                </div>
              ) : null}
            </TabsContent>

            <TabsContent value="analysis" className="mt-0 h-full space-y-4">
              {selectedClientId && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <AIAnalysis clientId={selectedClientId} />
                </div>
              )}
            </TabsContent>

            <TabsContent value="strategy" className="mt-0 h-full">
              {selectedClientId && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <StrategyPanel clientId={selectedClientId} />
                </div>
              )}
            </TabsContent>

            <TabsContent value="plan" className="mt-0 h-full">
              <div className="animate-in fade-in-from-bottom-2 duration-300">
                <DocumentGenerationPanel 
                  selectedClientId={selectedClientId}
                  clientData={selectedClient ? {
                    ...selectedClient,
                    // Add any additional data needed for mapping
                  } : undefined}
                />
              </div>
            </TabsContent>
          </div>
        </ScrollArea>
      </Tabs>
    </div>
  );
}

