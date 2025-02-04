import { cn } from "@/lib/utils";

interface MessageProps {
  content: string;
  timestamp: string;
}

export function Message({ content, timestamp }: MessageProps) {
  return (
    <div className="flex flex-col space-y-1 animate-fade-in">
      <div className="bg-blue-500 text-white p-3 rounded-lg max-w-[80%] self-end break-words">
        {content}
      </div>
      <span className="text-xs text-gray-500 self-end">{timestamp}</span>
    </div>
  );
}