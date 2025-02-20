
import { ChatInterface } from "@/components/ChatInterface";
import { ClientDataViewer } from "@/components/ClientDataViewer";
import { FinancialPlanWriter } from "@/components/FinancialPlanWriter";
import { AdvisorAdviceButton } from "@/components/AdvisorAdviceButton";
import { useState } from "react";

export default function Index() {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  return (
    <div className="flex flex-col h-screen bg-white">
      <header className="fixed top-0 left-0 right-0 bg-white border-b z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-[#0284C7]">Bailiwick AI</h1>
          <div className="flex gap-3">
            <ClientDataViewer onClientSelect={setSelectedClientId} />
            <AdvisorAdviceButton 
              selectedClientId={selectedClientId}
              onAdviceAdded={() => {
                // Refresh client data
                window.location.reload();
              }}
            />
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
        }} />
      </main>
    </div>
  );
}

