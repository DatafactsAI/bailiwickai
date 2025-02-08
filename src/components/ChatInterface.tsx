
import { useState } from "react";
import { Message } from "./Message";
import { MessageInput } from "./MessageInput";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ChatMessage {
  id: string;
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
    const timestamp = new Date().toISOString();
    
    try {
      // Store message in Supabase
      const { data, error } = await supabase
        .from('messages')
        .insert([
          {
            content,
            type: 'sent',
            timestamp
          }
        ])
        .select()
        .single();

      if (error) throw error;

      // Add the message to local state
      setMessages((prev) => [...prev, { 
        id: data.id,
        content, 
        timestamp: new Date(timestamp).toLocaleTimeString(), 
        type: "sent" 
      }]);
      
      // Send to Zapier webhook
      await fetch("https://hooks.zapier.com/hooks/catch/17752322/250wpvr/", {
        method: "POST",
        mode: "no-cors",
        body: JSON.stringify({
          message: content
        }),
      });
      
      toast({
        title: "Message Sent",
        description: "Message sent successfully.",
      });
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        {messages.map((msg) => (
          <Message 
            key={msg.id}
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
