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
    const requestStartTime = Date.now();
    
    console.log(`[${timestamp}] Sending message to Zapier:`, content);
    
    try {
      // Get the webhook URL from environment
      const webhookUrl = import.meta.env.VITE_ZAPIER_WEBHOOK_URL;
      if (!webhookUrl) {
        throw new Error("Zapier webhook URL not configured");
      }

      const response = await fetch(webhookUrl, {
        method: "POST",
        mode: "no-cors",
        body: JSON.stringify({
          message: content
        }),
      });

      const requestDuration = Date.now() - requestStartTime;
      console.log(`[${timestamp}] Request completed in ${requestDuration}ms`);
      
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
      setMessages((prev) => [...prev, { content, timestamp, type: "sent" }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to handle incoming webhook messages
  const handleWebhookMessage = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setMessages((prev) => [...prev, { content: message, timestamp, type: "received" }]);
    toast({
      title: "New Message",
      description: "Received a new message from Zapier",
    });
  };

  return (
    <div className="flex flex-col h-[600px] max-w-2xl mx-auto border rounded-lg shadow-sm">
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