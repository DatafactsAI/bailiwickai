import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ClientTable } from "@/components/client-data/ClientTable";
import { FinancialPlanWriter } from "@/components/FinancialPlanWriter";
import { AIAnalysis } from "@/components/AIAnalysis";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ClientData } from "@/components/client-data/types";
import { FileText, PenTool, Loader2, Brain } from "lucide-react";

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
      const { data, error } = await supabase
        .from('clients_financial_data')
        .select('*')
        .eq('id', selectedClientId)
        .single();

      if (error) throw error;
      return {
        ...data,
        total_superannuation_assets: (data as any).total_superannuation_assets ?? 0,
        total_client_loans: (data as any).total_client_loans ?? 0,
        total_client_insurance: (data as any).total_client_insurance ?? 0,
      } as ClientData;
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
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="data" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Client Data
            </TabsTrigger>
            <TabsTrigger value="analysis" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              AI Analysis
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

            <TabsContent value="plan" className="mt-0 h-full">
              <div className="animate-in fade-in-from-bottom-2 duration-300">
                {/* Reuse logic from FinancialPlanWriter but adapted for panel context */}
                {/* Note: FinancialPlanWriter might need prop updates to accept external client ID */}
                <FinancialPlanWriter />
              </div>
            </TabsContent>
          </div>
        </ScrollArea>
      </Tabs>
    </div>
  );
}

