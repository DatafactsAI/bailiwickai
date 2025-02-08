
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
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .order('timestamp', { ascending: true });

      if (error) {
        console.error("Error fetching messages:", error);
        return;
      }

      if (data) {
        setMessages(data.map(msg => ({
          ...msg,
          timestamp: new Date(msg.timestamp).toLocaleTimeString()
        })));
      }
    };

    fetchMessages();
  }, []);

  // Set up real-time subscription
  useEffect(() => {
    let channel: RealtimeChannel;

    const setupSubscription = async () => {
      // Enable real-time for the messages table
      await supabase.from('messages').update({ id: messages[0]?.id }).eq('id', messages[0]?.id || '');

      channel = supabase
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
            const { new: newMessage } = payload;
            if (newMessage) {
              setMessages(prev => {
                // Check if message already exists
                const exists = prev.some(msg => msg.id === newMessage.id);
                if (exists) return prev;
                
                return [...prev, {
                  ...newMessage,
                  timestamp: new Date(newMessage.timestamp).toLocaleTimeString()
                }];
              });
            }
          }
        )
        .subscribe();
    };

    setupSubscription();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

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
