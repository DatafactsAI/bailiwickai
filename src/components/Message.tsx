import { cn } from "@/lib/utils";

interface MessageProps {
  content: string;
  timestamp: string;
  type: "sent" | "received";
}

export function Message({ content, timestamp, type }: MessageProps) {
  return (
    <div className={cn(
      "flex flex-col space-y-1 animate-fade-in max-w-4xl mx-auto",
      type === "received" ? "items-start" : "items-end"
    )}>
      <div className={cn(
        "p-3 rounded-lg max-w-[80%] break-words",
        type === "received" 
          ? "bg-gray-100 text-gray-900" 
          : "bg-[#1A1F2C] text-white"
      )}>
        {content}
      </div>
      <span className="text-xs text-gray-500">{timestamp}</span>
    </div>
  );
}