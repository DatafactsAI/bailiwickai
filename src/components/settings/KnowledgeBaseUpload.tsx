import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, Upload, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface KnowledgeBaseDocument {
  document_id: string;
  source_filename?: string;
  filename?: string;
  file_type?: string;
  file_size: number;
  uploaded_at: string;
  description?: string;
  has_embeddings?: boolean;
}

export function KnowledgeBaseUpload() {
  const [documents, setDocuments] = useState<KnowledgeBaseDocument[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const API_BASE = "http://localhost:8000";

  // Load documents on mount
  const loadDocuments = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/knowledge-base/documents`);
      if (!response.ok) {
        throw new Error(`Failed to load documents: ${response.status}`);
      }
      const data = await response.json();
      setDocuments(data.documents || []);
    } catch (error) {
      console.error("Failed to load documents:", error);
      // If endpoint doesn't exist yet, just show empty state
      setDocuments([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const handleFileSelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Allow PDF, text files, and Word documents for knowledge base
    const allowedTypes = ['.pdf', '.txt', '.md', '.docx'];
    const fileNameParts = file.name.split('.');
    const fileExtension = fileNameParts.length > 1 
      ? '.' + fileNameParts.pop()?.toLowerCase() 
      : '';
    
    if (!fileExtension || !allowedTypes.includes(fileExtension)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF, TXT, MD, or DOCX file",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`${API_BASE}/knowledge-base/documents/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: "Upload failed" }));
        throw new Error(error.detail || "Upload failed");
      }

      const result = await response.json();
      await loadDocuments();
      
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      toast({
        title: "Upload successful",
        description: `${file.name} has been uploaded to the knowledge base`,
      });
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
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

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-AU", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold">Knowledge Base Documents</h3>
          <p className="text-sm text-muted-foreground">
            Upload documents (PDF, TXT, MD, or DOCX) that the AI agent can reference when answering queries
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
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload Document
              </>
            )}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt,.md,.docx"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Uploaded Documents</CardTitle>
          <CardDescription>
            Documents available for the AI agent to reference
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
              <FileText className="h-12 w-12 mb-2 opacity-20" />
              <p className="text-sm">No documents uploaded yet</p>
              <p className="text-xs mt-1">Upload PDF, TXT, MD, or DOCX files for the agent to use</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div
                    key={doc.document_id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{doc.source_filename || doc.document_id}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          <span>{formatFileSize(doc.file_size)}</span>
                          <span>•</span>
                          <span>{formatDate(doc.uploaded_at)}</span>
                          {doc.file_type && (
                            <>
                              <span>•</span>
                              <Badge variant="secondary" className="text-xs">
                                {doc.file_type.toUpperCase()}
                              </Badge>
                            </>
                          )}
                          {doc.has_embeddings && (
                            <>
                              <span>•</span>
                              <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                                Indexed
                              </Badge>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!doc.has_embeddings && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            try {
                              const response = await fetch(
                                `${API_BASE}/knowledge-base/documents/${doc.document_id}/generate-embeddings`,
                                { method: 'POST' }
                              );
                              if (response.ok) {
                                toast({
                                  title: "Embeddings generated",
                                  description: "Document is now searchable",
                                });
                                loadDocuments();
                              } else {
                                throw new Error("Failed to generate embeddings");
                              }
                            } catch (error) {
                              toast({
                                title: "Error",
                                description: "Failed to generate embeddings",
                                variant: "destructive",
                              });
                            }
                          }}
                        >
                          Generate Embeddings
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

