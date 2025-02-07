import { ChatInterface } from "@/components/ChatInterface";

const Index = () => {
  return (
    <div className="flex flex-col h-screen bg-white">
      <header className="bg-[#33C3F0] text-white p-4">
        <h1 className="text-xl font-bold text-left">Financial Planning Assistant</h1>
      </header>
      <main className="flex-1 p-4">
        <ChatInterface />
      </main>
    </div>
  );
};

export default Index;