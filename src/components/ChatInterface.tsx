
import { useEffect, useState } from "react";
import { Message } from "./Message";
import { MessageInput } from "./MessageInput";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";

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

  // Fetch existing messages on component mount
  useEffect(() => {
    const fetchMessages = async () => {
      console.log("Fetching existing messages...");
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .order('timestamp', { ascending: true });

      if (error) {
        console.error("Error fetching messages:", error);
        return;
      }

      if (data) {
        console.log("Fetched messages:", data);
        setMessages(data.map(msg => ({
          id: msg.id,
          content: msg.content,
          timestamp: new Date(msg.timestamp).toLocaleTimeString(),
          type: msg.type as "sent" | "received"
        })));
      }
    };

    fetchMessages();
  }, []);

  // Set up real-time subscription
  useEffect(() => {
    console.log("Setting up real-time subscription...");
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          console.log('Real-time update received:', payload);
          const newMsg = payload.new as { id: string; content: string; timestamp: string; type: string };
          
          if (payload.eventType === 'INSERT') {
            console.log('Processing new message:', newMsg);
            setMessages(prev => {
              // Check if message already exists
              const exists = prev.some(msg => msg.id === newMsg.id);
              if (exists) {
                console.log('Message already exists, skipping:', newMsg.id);
                return prev;
              }
              
              const formattedMessage: ChatMessage = {
                id: newMsg.id,
                content: newMsg.content,
                timestamp: new Date(newMsg.timestamp).toLocaleTimeString(),
                type: newMsg.type as "sent" | "received"
              };
              
              console.log('Adding new message to state:', formattedMessage);
              return [...prev, formattedMessage];
            });
          }
        }
      )
      .subscribe();

    console.log("Real-time subscription initialized");

    return () => {
      console.log("Cleaning up real-time subscription");
      supabase.removeChannel(channel);
    };
  }, []);

  const handleSend = async (content: string) => {
    console.log("Sending new message:", content);
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

      console.log("Message stored successfully:", data);
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
