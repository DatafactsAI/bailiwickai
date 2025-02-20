
import { useState } from "react";
import { MessageList } from "./chat/MessageList";
import { MessageInput } from "./MessageInput";
import { useToast } from "@/hooks/use-toast";
import { useMessages } from "@/hooks/useMessages";
import { storeMessage, invokeChatAssistant } from "@/utils/supabaseUtils";
import { Button } from "./ui/button";
import { Trash2 } from "lucide-react";

interface ChatInterfaceProps {
  onSendMessage?: (message: string) => void;
}

export function ChatInterface({ onSendMessage }: ChatInterfaceProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { messages, currentClientData, clearMessages } = useMessages();
  const { toast } = useToast();

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

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex justify-end p-2 border-b">
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
      <MessageInput onSend={handleSend} isLoading={isLoading} />
    </div>
  );
}
