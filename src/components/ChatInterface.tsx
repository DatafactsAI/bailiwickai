
import { useEffect, useState } from "react";
import { Message } from "./Message";
import { MessageInput } from "./MessageInput";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ClientMetadata {
  clientId?: string;
  client1_gross_salary?: number;
  client1_super_balance?: number;
  client2_gross_salary?: number;
  client2_super_balance?: number;
}

interface ChatMessage {
  id: string;
  content: string;
  timestamp: string;
  type: "sent" | "received";
  metadata?: ClientMetadata;
}

export function ChatInterface() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentClientData, setCurrentClientData] = useState<ClientMetadata | undefined>();
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
        const formattedMessages: ChatMessage[] = data.map(msg => ({
          id: msg.id,
          content: msg.content,
          timestamp: new Date(msg.timestamp).toLocaleTimeString(),
          type: msg.type as "sent" | "received",
          metadata: msg.metadata as ClientMetadata
        }));
        setMessages(formattedMessages);
        
        // Set current client data from the most recent message that has client data
        const lastMessageWithClientData = [...formattedMessages]
          .reverse()
          .find(msg => msg.metadata?.clientId);
        if (lastMessageWithClientData?.metadata) {
          setCurrentClientData(lastMessageWithClientData.metadata);
        }
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
          const newMsg = payload.new as { 
            id: string; 
            content: string; 
            timestamp: string; 
            type: string;
            metadata: ClientMetadata;
          };
          
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
                type: newMsg.type as "sent" | "received",
                metadata: newMsg.metadata
              };
              
              // Update current client data if this message contains client information
              if (newMsg.metadata?.clientId) {
                setCurrentClientData(newMsg.metadata);
              }
              
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
    console.log("Starting handleSend with content:", content);
    console.log("Current client data:", currentClientData);
    setIsLoading(true);
    const timestamp = new Date().toISOString();
    
    try {
      console.log("Storing user message in Supabase...");
      // Store user message in Supabase with current client context
      const { data: messageData, error: messageError } = await supabase
        .from('messages')
        .insert([
          {
            content,
            type: 'sent',
            timestamp,
            metadata: currentClientData
          }
        ])
        .select()
        .single();

      if (messageError) {
        console.error("Error storing message:", messageError);
        throw new Error("Failed to store message");
      }

      console.log("Message stored successfully:", messageData);
      
      console.log("Calling chat-assistant edge function...");
      // Call Edge Function to get AI response
      const functionResponse = await supabase.functions.invoke('chat-assistant', {
        body: { 
          message: content,
          clientData: currentClientData
        }
      }).catch(error => {
        console.error("Error invoking function:", error);
        throw error;
      });

      console.log("Edge function response received:", functionResponse);

      if (functionResponse.error) {
        console.error("Edge function error:", functionResponse.error);
        throw new Error(functionResponse.error.message || "Failed to get AI response");
      }

      if (!functionResponse.data?.response) {
        console.error("Invalid response from AI:", functionResponse.data);
        throw new Error("Invalid response from AI");
      }

      toast({
        title: "Message Sent",
        description: "Message sent successfully.",
      });
    } catch (error) {
      console.error("Error in handleSend:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to send message.",
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
