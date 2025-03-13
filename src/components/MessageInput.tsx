
import { useState, FormEvent, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Clipboard } from "lucide-react";

interface MessageInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
  clientDataSnippet?: string | null;
  onClearClientDataSnippet?: () => void;
}

export function MessageInput({ 
  onSend, 
  isLoading, 
  clientDataSnippet = null,
  onClearClientDataSnippet
}: MessageInputProps) {
  const [message, setMessage] = useState("");

  useEffect(() => {
    // Auto-focus input when component mounts
    const inputElement = document.getElementById('message-input');
    if (inputElement) {
      inputElement.focus();
    }
  }, []);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      onSend(message.trim());
      setMessage("");
      if (clientDataSnippet && onClearClientDataSnippet) {
        onClearClientDataSnippet();
      }
    }
  };

  const insertClientData = () => {
    if (clientDataSnippet) {
      setMessage(prev => {
        if (prev.length > 0 && !prev.endsWith(' ')) {
          return `${prev} ${clientDataSnippet}`;
        }
        return `${prev}${clientDataSnippet}`;
      });
      if (onClearClientDataSnippet) {
        onClearClientDataSnippet();
      }
      
      // Focus input after inserting
      setTimeout(() => {
        const inputElement = document.getElementById('message-input');
        if (inputElement) {
          inputElement.focus();
        }
      }, 0);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border-t p-4 bg-white">
      <div className="flex gap-2 max-w-4xl mx-auto">
        {clientDataSnippet && (
          <Button 
            type="button" 
            variant="outline"
            onClick={insertClientData}
            className="flex items-center gap-1"
            title="Insert client data"
          >
            <Clipboard className="h-4 w-4" />
          </Button>
        )}
        <Input
          id="message-input"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={clientDataSnippet ? "Click the clipboard to insert client data" : "Type your message..."}
          className="flex-1"
          disabled={isLoading}
        />
        <Button 
          type="submit" 
          disabled={isLoading || !message.trim()}
          className="bg-[#0284C7] hover:bg-[#0369A1]"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </form>
  );
}
