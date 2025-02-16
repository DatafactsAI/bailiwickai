
import { ChatMessage } from "@/types/chat";
import { Message } from "../Message";

interface MessageListProps {
  messages: ChatMessage[];
}

export function MessageList({ messages }: MessageListProps) {
  return (
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
  );
}
