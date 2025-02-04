import { useState } from "react";
import { Message } from "./Message";
import { MessageInput } from "./MessageInput";
import { useToast } from "@/hooks/use-toast";

interface ChatMessage {
  content: string;
  timestamp: string;
}

export function ChatInterface() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSend = async (content: string) => {
    setIsLoading(true);
    const timestamp = new Date().toLocaleTimeString();
    
    try {
      await fetch("https://hooks.zapier.com/hooks/catch/17752322/2auhtr4/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        mode: "no-cors", // This will prevent CORS errors but also means we won't get response details
        body: JSON.stringify({
          message: content,
          timestamp: new Date().toISOString(),
        }),
      });

      // Since we're using no-cors, we'll assume success if no error is thrown
      setMessages((prev) => [...prev, { content, timestamp }]);
      
      toast({
        title: "Message Sent",
        description: "Your message was successfully sent to Zapier.",
      });
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message. Please check if your Zapier webhook is active and try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[600px] max-w-2xl mx-auto border rounded-lg shadow-sm">
      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        {messages.map((msg, index) => (
          <Message key={index} content={msg.content} timestamp={msg.timestamp} />
        ))}
      </div>
      <MessageInput onSend={handleSend} isLoading={isLoading} />
    </div>
  );
}