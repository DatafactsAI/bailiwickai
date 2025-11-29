import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Upload, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface UploadResult {
  status: string;
  message: string;
  client1_name?: string;
  client2_name?: string;
  filename?: string;
}

export function FactFindUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const API_BASE = "http://localhost:8000";

  const handleFileSelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Only allow PDF files
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF file (.pdf)",
        variant: "destructive",
      });
      return;
    }

    // Check file size (50MB limit)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "Please upload a PDF file smaller than 50MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadResult(null);
    
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`${API_BASE}/fact-find/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        let errorMessage = "Upload failed";
        try {
          const error = await response.json();
          errorMessage = error.detail || error.message || errorMessage;
        } catch {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const result: UploadResult = await response.json();
      setUploadResult(result);
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      // Invalidate client queries to refresh the client list
      queryClient.invalidateQueries({ queryKey: ['clients-list'] });

      toast({
        title: "Upload successful",
        description: result.message || `${file.name} has been processed successfully`,
      });
    } catch (error) {
      console.error("Upload error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      setUploadResult({
        status: "error",
        message: errorMessage,
      });
      toast({
        title: "Upload failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold">Fact Find Documents</h3>
          <p className="text-sm text-muted-foreground">
            Upload client fact find PDF documents to automatically extract and process client information
          </p>
        </div>
        <div className="flex-shrink-0">
          <Button 
            onClick={handleFileSelect} 
            disabled={isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload Fact Find
              </>
            )}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload Fact Find</CardTitle>
          <CardDescription>
            Upload a PDF fact find document to extract client financial information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isUploading ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-sm text-muted-foreground">
                Processing fact find document...
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                This may take 30-60 seconds
              </p>
            </div>
          ) : uploadResult ? (
            <div className="space-y-3">
              {uploadResult.status === "success" ? (
                <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-green-900">
                      {uploadResult.message}
                    </p>
                    {uploadResult.client1_name && (
                      <div className="mt-2 text-xs text-green-700">
                        <p><strong>Client 1:</strong> {uploadResult.client1_name}</p>
                        {uploadResult.client2_name && (
                          <p><strong>Client 2:</strong> {uploadResult.client2_name}</p>
                        )}
                      </div>
                    )}
                    <p className="text-xs text-green-600 mt-2">
                      The client data has been added to your client list.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-900">
                      Processing failed
                    </p>
                    <p className="text-xs text-red-700 mt-1">
                      {uploadResult.message}
                    </p>
                  </div>
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setUploadResult(null);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                  }
                }}
                className="w-full"
              >
                Upload Another Fact Find
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
              <FileText className="h-12 w-12 mb-2 opacity-20" />
              <p className="text-sm">No fact find uploaded yet</p>
              <p className="text-xs mt-1">Upload a PDF fact find document to get started</p>
              <p className="text-xs mt-2 text-muted-foreground/80">
                Maximum file size: 50MB
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


