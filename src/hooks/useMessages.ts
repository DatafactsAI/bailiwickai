
import { useState, useEffect } from "react";
import { ChatMessage, ClientMetadata } from "@/types/chat";
import { supabase } from "@/integrations/supabase/client";
import { fetchMessages } from "@/utils/supabaseUtils";

export function useMessages() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentClientData, setCurrentClientData] = useState<ClientMetadata | undefined>();

  // Initial load of messages
  useEffect(() => {
    const loadMessages = async () => {
      const { data, error } = await fetchMessages();

      if (error) {
        console.error("Error fetching messages:", error);
        return;
      }

      if (data) {
        const formattedMessages: ChatMessage[] = data.map(msg => ({
          id: msg.id,
          content: msg.content,
          timestamp: new Date(msg.timestamp).toLocaleTimeString(),
          type: msg.type as "sent" | "received",
          metadata: msg.metadata as ClientMetadata
        }));
        setMessages(formattedMessages);
        
        const lastMessageWithClientData = [...formattedMessages]
          .reverse()
          .find(msg => msg.metadata?.clientId);
        if (lastMessageWithClientData?.metadata) {
          setCurrentClientData(lastMessageWithClientData.metadata);
        }
      }
    };

    loadMessages();
  }, []);

  // Real-time subscription to message changes
  useEffect(() => {
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
          console.log("Realtime update received:", payload);
          
          if (payload.eventType === 'INSERT') {
            const newMsg = payload.new as { 
              id: string; 
              content: string; 
              timestamp: string; 
              type: string;
              metadata: ClientMetadata;
            };
            
            setMessages(prev => {
              // Check if message already exists to avoid duplicates
              const exists = prev.some(msg => msg.id === newMsg.id);
              if (exists) return prev;
              
              const formattedMessage: ChatMessage = {
                id: newMsg.id,
                content: newMsg.content,
                timestamp: new Date(newMsg.timestamp).toLocaleTimeString(),
                type: newMsg.type as "sent" | "received",
                metadata: newMsg.metadata
              };
              
              // If message has client metadata, update current client data
              if (newMsg.metadata?.clientId) {
                setCurrentClientData(newMsg.metadata);
              }
              
              return [...prev, formattedMessage];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const clearMessages = () => {
    setMessages([]);
  };

  return { messages, currentClientData, clearMessages };
}
