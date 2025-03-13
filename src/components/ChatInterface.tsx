import { useState, useEffect } from "react";
import { MessageList } from "./chat/MessageList";
import { MessageInput } from "./MessageInput";
import { useToast } from "@/hooks/use-toast";
import { useMessages } from "@/hooks/useMessages";
import { storeMessage, invokeChatAssistant } from "@/utils/supabaseUtils";
import { Button } from "./ui/button";
import { Trash2, ChevronDown, User2 } from "lucide-react";
import { ClientMetadata } from "@/types/chat";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ClientData } from "./client-data/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ChatInterfaceProps {
  onSendMessage?: (message: string) => void;
}

export function ChatInterface({ onSendMessage }: ChatInterfaceProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { messages, currentClientData, clearMessages } = useMessages();
  const { toast } = useToast();
  const [selectedFieldToCopy, setSelectedFieldToCopy] = useState<string | null>(null);

  // Fetch client data if we have a client ID
  const { data: clientData } = useQuery({
    queryKey: ['client', currentClientData?.clientId],
    queryFn: async () => {
      if (!currentClientData?.clientId) return null;
      
      const { data, error } = await supabase
        .from('clients_financial_data')
        .select('*')
        .eq('id', currentClientData.clientId)
        .single();
        
      if (error) throw error;
      return data as ClientData;
    },
    enabled: !!currentClientData?.clientId,
  });

  const handleSend = async (content: string) => {
    setIsLoading(true);
    
    try {
      const { error: messageError } = await storeMessage(content, 'sent', currentClientData);

      if (messageError) {
        throw new Error("Failed to store message");
      }
      
      const functionResponse = await invokeChatAssistant(content, currentClientData);

      if (functionResponse.error) {
        throw new Error(functionResponse.error.message || "Failed to get AI response");
      }

      if (!functionResponse.data?.response) {
        throw new Error("Invalid response from AI");
      }

      // Call the onSendMessage prop if it exists
      if (onSendMessage) {
        onSendMessage(content);
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

  const handleClearChat = () => {
    clearMessages();
    toast({
      title: "Chat Cleared",
      description: "All messages have been cleared from the UI.",
    });
  };

  const getFieldDisplayName = (fieldName: string): string => {
    // Convert snake_case to Title Case with spaces
    return fieldName
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const handleInsertClientData = (field: string) => {
    if (!clientData) return;
    
    const fieldValue = clientData[field as keyof ClientData];
    if (fieldValue === null || fieldValue === undefined) return;
    
    // Format currency values
    const formattedValue = typeof fieldValue === 'number' 
      ? `$${fieldValue.toLocaleString()}`
      : String(fieldValue);
    
    const fieldDisplayName = getFieldDisplayName(field);
    setSelectedFieldToCopy(`${fieldDisplayName}: ${formattedValue}`);
    
    toast({
      title: "Client Data Ready",
      description: `"${fieldDisplayName}: ${formattedValue}" is ready to paste in your message.`,
    });
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex justify-between p-2 border-b">
        <div className="flex items-center">
          {currentClientData?.clientId && clientData && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-1">
                  <User2 className="h-4 w-4" />
                  <span className="max-w-[150px] truncate">{clientData.client1_name}</span>
                  <ChevronDown className="h-3 w-3 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-60">
                <DropdownMenuItem onClick={() => handleInsertClientData('client1_name')}>
                  Name
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleInsertClientData('client1_gross_salary')}>
                  Gross Salary
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleInsertClientData('client1_super_balance')}>
                  Super Balance
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleInsertClientData('client1_work_status')}>
                  Work Status
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleInsertClientData('client1_health')}>
                  Health Status
                </DropdownMenuItem>
                {clientData.client2_name && (
                  <>
                    <DropdownMenuItem onClick={() => handleInsertClientData('client2_name')}>
                      Partner Name
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleInsertClientData('client2_gross_salary')}>
                      Partner Gross Salary
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleInsertClientData('client2_super_balance')}>
                      Partner Super Balance
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleClearChat}
          className="text-gray-500 hover:text-gray-700"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Clear Chat
        </Button>
      </div>
      <MessageList messages={messages} />
      <MessageInput 
        onSend={handleSend} 
        isLoading={isLoading} 
        clientDataSnippet={selectedFieldToCopy}
        onClearClientDataSnippet={() => setSelectedFieldToCopy(null)}
      />
    </div>
  );
}
