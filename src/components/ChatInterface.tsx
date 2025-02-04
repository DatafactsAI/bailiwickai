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
      // Add mode: "no-cors" to handle CORS restrictions
      await fetch("https://hooks.zapier.com/hooks/catch/17752322/250wpvr/", {
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

      // Since we're using no-cors, we won't get a proper response
      // Instead, we'll add the message to the UI and show a success toast
      setMessages((prev) => [...prev, { content, timestamp }]);
      
      toast({
        title: "Message Sent",
        description: "Your message was successfully sent to Zapier.",
      });
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
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