
import { useState, useEffect } from "react";
import { ChatMessage, ClientMetadata } from "@/types/chat";
import { supabase } from "@/integrations/supabase/client";
import { fetchMessages } from "@/utils/supabaseUtils";

export function useMessages() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentClientData, setCurrentClientData] = useState<ClientMetadata | undefined>();

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
          const newMsg = payload.new as { 
            id: string; 
            content: string; 
            timestamp: string; 
            type: string;
            metadata: ClientMetadata;
          };
          
          if (payload.eventType === 'INSERT') {
            setMessages(prev => {
              const exists = prev.some(msg => msg.id === newMsg.id);
              if (exists) return prev;
              
              const formattedMessage: ChatMessage = {
                id: newMsg.id,
                content: newMsg.content,
                timestamp: new Date(newMsg.timestamp).toLocaleTimeString(),
                type: newMsg.type as "sent" | "received",
                metadata: newMsg.metadata
              };
              
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

  return { messages, currentClientData };
}
