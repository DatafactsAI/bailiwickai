
import { ChatInterface } from "@/components/ChatInterface";
import { ClientDataViewer } from "@/components/ClientDataViewer";
import { Button } from "@/components/ui/button";
import { FileText, PenLine } from "lucide-react";

export default function Index() {
  return (
    <div className="flex flex-col h-screen bg-white">
      <header className="fixed top-0 left-0 right-0 bg-white border-b z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-[#0284C7]">Bailiwick AI</h1>
          <div className="flex gap-3">
            <Button
              className="bg-blue-600 hover:bg-blue-700"
            >
              <FileText className="w-4 h-4 mr-2" />
              View Client Data
            </Button>
            <Button
              className="bg-[#9b87f5] hover:bg-[#8B5CF6]"
            >
              <PenLine className="w-4 h-4 mr-2" />
              Write Financial Plan
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1 container mx-auto px-4 mt-[72px]">
        <ChatInterface />
      </main>
    </div>
  );
}
