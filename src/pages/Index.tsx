import { ChatInterface } from "@/components/ChatInterface";

const Index = () => {
  return (
    <div className="min-h-screen p-4 bg-gray-50">
      <div className="max-w-2xl mx-auto mb-8">
        <h1 className="text-3xl font-bold text-center mb-2">Chat Interface</h1>
        <p className="text-gray-600 text-center">Send messages to your Zapier workflow</p>
      </div>
      <ChatInterface />
    </div>
  );
};

export default Index;