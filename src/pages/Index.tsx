
import { ChatInterface } from "@/components/ChatInterface";
import { ClientDataViewer } from "@/components/ClientDataViewer";
import { FinancialPlanWriter } from "@/components/FinancialPlanWriter";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export default function Index() {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const handleClientSelect = (clientId: string | null) => {
    setSelectedClientId(clientId);
    
    // When a client is selected, invalidate the relevant queries
    if (clientId) {
      queryClient.invalidateQueries({ queryKey: ['client', clientId] });
    }
  };

  const handleClientDetailsPlaced = () => {
    // Invalidate queries when client details are placed in chat
    queryClient.invalidateQueries({ queryKey: ['messages'] });
  };

  return (
    <div className="flex flex-col h-screen bg-white">
      <header className="fixed top-0 left-0 right-0 bg-white border-b z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-[#0284C7]">Bailiwick AI</h1>
          <div className="flex gap-3">
            <ClientDataViewer onClientSelect={handleClientSelect} />
            <FinancialPlanWriter />
          </div>
        </div>
      </header>
      <main className="flex-1 container mx-auto px-4 mt-[72px]">
        <ChatInterface onSendMessage={(message) => {
          if (selectedClientId) {
            const advisorAdviceBtn = document.querySelector('[data-advisor-advice-button]');
            if (advisorAdviceBtn) {
              (advisorAdviceBtn as HTMLButtonElement).click();
            }
          }
          
          // Force data refresh after sending a message
          queryClient.invalidateQueries({ queryKey: ['messages'] });
        }} />
      </main>
    </div>
  );
}
