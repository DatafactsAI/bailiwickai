
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
      // Check if the paragraph contains numbered points or bullet points
      const hasPoints = /^\d+\.\s|\*\*[\w\s]+\*\*:/.test(paragraph);
      
      if (hasPoints) {
        // Split into individual points and format them
        const points = paragraph.split(/(?=\d+\.|(?:\*\*[\w\s]+\*\*:))/);
        return (
          <div key={index} className="mb-4">
            {points.map((point, pointIndex) => {
              // Format the point title (bolded text)
              const formattedPoint = point.replace(/\*\*(.*?)\*\*/, '<strong>$1</strong>');
              return (
                <div key={pointIndex} className="mb-2 pl-4">
                  {/* Use dangerouslySetInnerHTML only for the bold formatting we control */}
                  <div 
                    dangerouslySetInnerHTML={{ __html: formattedPoint }}
                    className="leading-relaxed"
                  />
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
