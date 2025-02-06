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
    const requestStartTime = Date.now();
    
    console.log(`[${timestamp}] Attempting to send message:`, content);
    
    try {
      const response = await fetch("https://hooks.zapier.com/hooks/catch/17752322/250wpvr/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        mode: "no-cors",
        body: JSON.stringify({
          message: content,
          timestamp: new Date().toISOString(),
        }),
      });

      const requestDuration = Date.now() - requestStartTime;
      console.log(`[${timestamp}] Request completed in ${requestDuration}ms`);
      console.log(`[${timestamp}] Response type:`, response.type);
      console.log(`[${timestamp}] Response status:`, response.status);

      setMessages((prev) => [...prev, { content, timestamp }]);
      
      toast({
        title: "Message Sent",
        description: `Message sent to Zapier (took ${requestDuration}ms)`,
      });
    } catch (error) {
      console.error(`[${timestamp}] Error details:`, {
        error,
        messageContent: content,
        timeElapsed: Date.now() - requestStartTime
      });
      
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