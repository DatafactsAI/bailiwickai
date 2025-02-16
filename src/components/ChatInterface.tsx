
import { useState } from "react";
import { MessageList } from "./chat/MessageList";
import { MessageInput } from "./MessageInput";
import { useToast } from "@/hooks/use-toast";
import { useMessages } from "@/hooks/useMessages";
import { storeMessage, invokeChatAssistant } from "@/utils/supabaseUtils";

export function ChatInterface() {
  const [isLoading, setIsLoading] = useState(false);
  const { messages, currentClientData } = useMessages();
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
      <MessageList messages={messages} />
      <MessageInput onSend={handleSend} isLoading={isLoading} />
    </div>
  );
}
