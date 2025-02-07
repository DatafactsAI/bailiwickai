import { useState } from "react";
import { Message } from "./Message";
import { MessageInput } from "./MessageInput";
import { useToast } from "@/hooks/use-toast";

interface ChatMessage {
  content: string;
  timestamp: string;
  type: "sent" | "received";
}

export function ChatInterface() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSend = async (content: string) => {
    setIsLoading(true);
    const timestamp = new Date().toLocaleTimeString();
    
    try {
      const response = await fetch("https://hooks.zapier.com/hooks/catch/17752322/250wpvr/", {
        method: "POST",
        mode: "no-cors",
        body: JSON.stringify({
          message: content
        }),
      });
      
      setMessages((prev) => [...prev, { content, timestamp, type: "sent" }]);
      
      toast({
        title: "Message Sent",
        description: "Message sent to Zapier successfully.",
      });
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message to Zapier.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        {messages.map((msg, index) => (
          <Message 
            key={index} 
            content={msg.content} 
            timestamp={msg.timestamp} 
            type={msg.type}
          />
        ))}
      </div>
      <MessageInput onSend={handleSend} isLoading={isLoading} />
    </div>
  );
}