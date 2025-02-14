
import { cn } from "@/lib/utils";

interface MessageProps {
  content: string;
  timestamp: string;
  type: "sent" | "received";
}

export function Message({ content, timestamp, type }: MessageProps) {
  // Function to format the content with proper spacing and bullet points
  const formatContent = (text: string) => {
    // Split the text into paragraphs
    const paragraphs = text.split(/\n\n+/);
    
    return paragraphs.map((paragraph, index) => {
      // Check if the paragraph contains bullet points or numbered items
      const hasPoints = /^\d+\.\s/.test(paragraph);
      
      if (hasPoints) {
        // Split into individual points
        const points = paragraph.split(/(?=\d+\.\s)/);
        return (
          <div key={index} className="mb-4">
            {points.map((point, pointIndex) => {
              // Remove ** and replace the number with a bullet point
              const formattedPoint = point
                .replace(/^\d+\.\s/, '• ')
                .replace(/\*\*/g, '');
              return (
                <div key={pointIndex} className="mb-2 pl-4">
                  <div className="leading-relaxed">
                    {formattedPoint}
                  </div>
                </div>
              );
            })}
          </div>
        );
      }
      
      // Regular paragraph
      return (
        <p key={index} className="mb-4 leading-relaxed">
          {paragraph}
        </p>
      );
    });
  };

  return (
    <div className={cn(
      "flex flex-col space-y-1 animate-fade-in max-w-4xl mx-auto",
      type === "received" ? "items-start" : "items-end"
    )}>
      <div className={cn(
        "p-4 rounded-lg max-w-[80%]",
        type === "received" 
          ? "bg-gray-100 text-gray-900" 
          : "bg-[#0284C7] text-white"
      )}>
        {formatContent(content)}
      </div>
      <span className="text-xs text-gray-500">{timestamp}</span>
    </div>
  );
}
