
import { ChatInterface } from "@/components/ChatInterface";
import { ClientDataViewer } from "@/components/ClientDataViewer";

export default function Index() {
  return (
    <div className="flex flex-col h-screen bg-white">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-[#0284C7]">Bailiwick AI</h1>
          <ClientDataViewer />
        </div>
      </header>
      <main className="flex-1 container mx-auto px-4">
        <ChatInterface />
      </main>
    </div>
  );
}
