import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, Upload, FileText, Search, File, CheckCircle, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { VariableMappingDialog } from "./VariableMappingDialog";
import {
  DocumentProfile,
  MappingEntry,
  TemplateMapping,
  ValidationResult,
  ClientField,
  AutoMapResponse,
  ExtractPlaceholdersResponse,
  GenerateDocumentResponse,
} from "./types";
import { frontendToNestedForMapping } from "@/utils/clientDataTransform";
import { ClientData } from "@/components/client-data/types";

interface DocumentGenerationPanelProps {
  selectedClientId?: string | null;
  clientData?: Record<string, unknown>;
}

export function DocumentGenerationPanel({ 
  selectedClientId,
  clientData 
}: DocumentGenerationPanelProps) {
  const [documents, setDocuments] = useState<DocumentProfile[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<DocumentProfile | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [description, setDescription] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Mapping dialog state
  const [isMappingDialogOpen, setIsMappingDialogOpen] = useState(false);
  const [currentPlaceholders, setCurrentPlaceholders] = useState<string[]>([]);
  const [currentAutoMappings, setCurrentAutoMappings] = useState<Record<string, MappingEntry>>({});
  const [savedMapping, setSavedMapping] = useState<TemplateMapping | null>(null);
  const [validationWarnings, setValidationWarnings] = useState<ValidationResult | null>(null);
  const [availableFields, setAvailableFields] = useState<ClientField[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastGeneratedUrl, setLastGeneratedUrl] = useState<string | null>(null);

  const API_BASE = "http://localhost:8000";

  // Load documents on mount
  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      console.log("Loading documents from:", `${API_BASE}/knowledge-base/documents`);
      const response = await fetch(`${API_BASE}/knowledge-base/templates`);
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to load documents:", response.status, errorText);
        throw new Error(`Failed to load documents: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      console.log("Loaded documents:", data.documents?.length || 0);
      setDocuments(data.documents || []);
    } catch (error) {
      console.error("Failed to load documents:", error);
      // Only show toast on initial load failure, not on refresh
      if (documents.length === 0) {
        toast({
          title: "Failed to load documents",
          description: error instanceof Error ? error.message : "Unknown error",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = () => {
    console.log("Upload button clicked, fileInputRef:", fileInputRef.current);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    } else {
      console.error("File input ref is null!");
      toast({
        title: "Upload error",
        description: "File input not initialized. Please refresh the page.",
        variant: "destructive",
      });
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Only allow .docx files for now (Word templates)
    if (!file.name.toLowerCase().endsWith(".docx")) {
      toast({
        title: "Invalid file type",
        description: "Please upload a Word document (.docx file)",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    if (description.trim()) {
      formData.append("description", description.trim());
    }
    if (selectedClientId) {
      formData.append("client_ids", JSON.stringify([selectedClientId]));
    }

    console.log("Uploading file:", file.name, "Size:", file.size, "Type:", file.type);
    console.log("API endpoint:", `${API_BASE}/knowledge-base/upload`);

    try {
      const response = await fetch(`${API_BASE}/knowledge-base/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        let errorMessage = "Upload failed";
        try {
          const error = await response.json();
          errorMessage = error.detail || error.message || errorMessage;
        } catch {
          try {
            const text = await response.text();
            errorMessage = text || errorMessage;
          } catch {
            errorMessage = `HTTP ${response.status}: ${response.statusText}`;
          }
        }
        console.error("Upload error:", errorMessage);
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log("Upload successful:", result);
      
      // Refresh document list
      await loadDocuments();
      
      // Select the newly uploaded document
      setSelectedDocument(result.document);
      setDescription("");
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      toast({
        title: "Upload successful",
        description: `${file.name} has been uploaded successfully`,
      });
    } catch (error) {
      console.error("Upload error details:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      toast({
        title: "Upload failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Handle Generate Document button click
  const handleGenerateClick = useCallback(async () => {
    if (!selectedDocument || !selectedClientId) {
      toast({
        title: "Cannot generate document",
        description: !selectedClientId 
          ? "Please select a client first" 
          : "Please select a template first",
        variant: "destructive",
      });
      return;
    }

    setLastGeneratedUrl(null);

    try {
      // Step 1: Extract placeholders from template
      const extractResponse = await fetch(
        `${API_BASE}/knowledge-base/templates/${selectedDocument.document_id}/extract-placeholders`,
        { method: "POST" }
      );
      
      if (!extractResponse.ok) {
        throw new Error("Failed to extract placeholders from template");
      }
      
      const extractData: ExtractPlaceholdersResponse = await extractResponse.json();
      setCurrentPlaceholders(extractData.placeholders);
      
      // If no placeholders found, generate directly
      if (extractData.placeholders.length === 0) {
        toast({
          title: "No placeholders found",
          description: "This template has no placeholders. Generating document as-is.",
        });
        await generateDocument({}, false);
        return;
      }

      // Step 2: Check for saved mapping
      let savedMappingData: TemplateMapping | null = null;
      let validation: ValidationResult | null = null;
      
      try {
        const mappingResponse = await fetch(
          `${API_BASE}/knowledge-base/templates/${selectedDocument.document_id}/mapping`
        );
        
        if (mappingResponse.ok) {
          savedMappingData = await mappingResponse.json();
          setSavedMapping(savedMappingData);
          
          // Step 3: Validate the saved mapping
          const validateResponse = await fetch(
            `${API_BASE}/knowledge-base/templates/${selectedDocument.document_id}/validate-mapping`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ placeholders: extractData.placeholders }),
            }
          );
          
          if (validateResponse.ok) {
            validation = await validateResponse.json();
            setValidationWarnings(validation);
            
            // If mapping is valid, auto-generate (skip dialog)
            if (validation?.valid && savedMappingData) {
              toast({
                title: "Using saved mapping",
                description: "Generating document with previously saved variable mappings.",
              });
              await generateDocument(savedMappingData.mappings, false);
              return;
            }
          }
        }
      } catch (error) {
        console.log("No saved mapping found, will use auto-mapping");
      }
      
      // Step 4: Auto-map placeholders for the dialog
      const autoMapResponse = await fetch(
        `${API_BASE}/knowledge-base/templates/${selectedDocument.document_id}/auto-map`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ client_id: selectedClientId }),
        }
      );
      
      if (!autoMapResponse.ok) {
        throw new Error("Failed to auto-map placeholders");
      }
      
      const autoMapData: AutoMapResponse = await autoMapResponse.json();
      setCurrentAutoMappings(autoMapData.mappings);
      
      // Step 5: Load available fields for dropdown
      const fieldsResponse = await fetch(
        `${API_BASE}/knowledge-base/templates/${selectedDocument.document_id}/available-fields`
      );
      
      if (fieldsResponse.ok) {
        const fieldsData = await fieldsResponse.json();
        setAvailableFields(fieldsData.fields || []);
      }
      
      // Step 6: Open the mapping dialog
      setIsMappingDialogOpen(true);
      
    } catch (error) {
      console.error("Error preparing document generation:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to prepare document generation",
        variant: "destructive",
      });
    }
  }, [selectedDocument, selectedClientId, toast]);

  // Generate document with provided mappings
  const generateDocument = async (
    mappings: Record<string, MappingEntry>,
    saveMapping: boolean
  ) => {
    if (!selectedDocument || !selectedClientId) return;

    setIsGenerating(true);
    setIsMappingDialogOpen(false);

    try {
      const response = await fetch(
        `${API_BASE}/knowledge-base/templates/${selectedDocument.document_id}/generate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            client_id: selectedClientId,
            mappings: mappings,
            save_mapping: saveMapping,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: "Generation failed" }));
        throw new Error(error.detail || "Failed to generate document");
      }

      const result: GenerateDocumentResponse = await response.json();
      
      // Store download URL
      setLastGeneratedUrl(`${API_BASE}${result.download_url}`);
      
      // Refresh document list to update has_mapping status
      await loadDocuments();

      toast({
        title: "Document generated successfully",
        description: "Click the download button to get your document.",
      });
    } catch (error) {
      console.error("Error generating document:", error);
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : "Failed to generate document",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle mapping dialog confirm
  const handleMappingConfirm = async (
    mappings: Record<string, MappingEntry>,
    saveMapping: boolean
  ) => {
    await generateDocument(mappings, saveMapping);
  };

  // Download the generated document
  const handleDownload = () => {
    if (lastGeneratedUrl) {
      window.open(lastGeneratedUrl, "_blank");
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
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  // Build client data object for mapping resolution
  // Transform flat ClientData to nested structure that matches backend format
  // so the dialog can resolve field paths like "clientInfo.client1.name"
  const clientDataForMapping = useMemo(() => {
    if (!clientData) return {};
    
    // Check if clientData has the structure of a ClientData object
    // If it does, transform it to nested format for mapping resolution
    if (clientData.id && typeof clientData.client1_name !== 'undefined') {
      try {
        return frontendToNestedForMapping(clientData as ClientData);
      } catch (error) {
        console.error("Failed to transform client data for mapping:", error);
        return clientData;
      }
    }
    
    // If it's already nested or in a different format, use as-is
    return clientData;
  }, [clientData]);

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">Template Library</h2>
          <p className="text-sm text-slate-500">Manage and generate client documentation</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
             <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
             <Input placeholder="Search templates..." className="pl-8 h-9 w-[200px] bg-white" />
          </div>
          <Button 
            onClick={handleFileSelect} 
            disabled={isUploading}
            className="h-9 bg-slate-900 hover:bg-slate-800"
          >
            {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            Upload Template
          </Button>
          {/* Hidden Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".docx"
            onChange={handleFileChange}
            className="hidden"
            id="template-upload-input"
          />
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6 h-[600px]">
        {/* Left Column: Document List */}
        <div className="col-span-7 border rounded-lg bg-white shadow-sm flex flex-col overflow-hidden">
          <div className="p-3 border-b bg-slate-50/50 flex justify-between items-center">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Available Templates ({documents.length})</span>
          </div>
          <ScrollArea className="flex-1">
            {isLoading ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : documents.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                <FileText className="h-10 w-10 mb-2 opacity-20" />
                <p className="text-sm">No templates found</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {documents.map((doc) => (
                  <div
                    key={doc.document_id}
                    className={`group flex items-center justify-between p-3 cursor-pointer transition-all hover:bg-slate-50 ${
                      selectedDocument?.document_id === doc.document_id ? "bg-blue-50/50 border-l-2 border-l-blue-600" : "border-l-2 border-l-transparent"
                    }`}
                    onClick={() => {
                      setSelectedDocument(doc);
                      setLastGeneratedUrl(null);
                    }}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className={`p-2 rounded-md ${selectedDocument?.document_id === doc.document_id ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-500"}`}>
                        <FileText className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className={`text-sm font-medium truncate ${selectedDocument?.document_id === doc.document_id ? "text-blue-900" : "text-slate-700"}`}>
                            {doc.display_name}
                          </h4>
                          {doc.has_mapping && (
                            <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Mapped
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                          <span>{formatFileSize(doc.file_size)}</span>
                          <span>•</span>
                          <span>{formatDate(doc.uploaded_at)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Right Column: Preview & Actions */}
        <div className="col-span-5 flex flex-col gap-4">
          {selectedDocument ? (
            <Card className="flex-1 border-slate-200 shadow-sm">
              <CardHeader className="pb-4 border-b bg-slate-50/50">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg font-semibold text-slate-900">{selectedDocument.display_name}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-white border rounded-sm font-normal text-slate-500">
                        {selectedDocument.file_extension.toUpperCase()}
                      </Badge>
                      {selectedDocument.page_count && (
                        <Badge variant="secondary" className="bg-white border rounded-sm font-normal text-slate-500">
                          {selectedDocument.page_count} PAGES
                        </Badge>
                      )}
                      {selectedDocument.has_mapping && (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Mapping Saved
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="space-y-4">
                  <div>
                    <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Description</h5>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {selectedDocument.description || "No description provided for this template."}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 py-4 border-y border-slate-100">
                    <div>
                      <span className="text-xs text-slate-400 block mb-1">Word Count</span>
                      <span className="text-sm font-medium text-slate-900">{selectedDocument.word_count.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 block mb-1">Uploaded By</span>
                      <span className="text-sm font-medium text-slate-900">System Admin</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 space-y-3">
                  <Button 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-sm" 
                    size="lg"
                    onClick={handleGenerateClick}
                    disabled={isGenerating || !selectedClientId}
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      "Generate Document"
                    )}
                  </Button>
                  
                  {lastGeneratedUrl && (
                    <Button 
                      className="w-full" 
                      variant="outline"
                      size="lg"
                      onClick={handleDownload}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download Generated Document
                    </Button>
                  )}
                  
                  <p className="text-center text-xs text-slate-400">
                    {!selectedClientId 
                      ? "Select a client to enable document generation"
                      : `Uses ${selectedDocument.has_mapping ? "saved mapping" : "auto-mapping"} to populate ${selectedDocument.display_name}`
                    }
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="h-full border border-dashed rounded-lg bg-slate-50/50 flex flex-col items-center justify-center text-slate-400 p-6 text-center">
              <File className="h-12 w-12 mb-4 opacity-20" />
              <h3 className="font-medium text-slate-900">No Template Selected</h3>
              <p className="text-sm mt-1 max-w-xs">Select a template from the library to view details or generate a document.</p>
            </div>
          )}
        </div>
      </div>

      {/* Variable Mapping Dialog */}
      <VariableMappingDialog
        isOpen={isMappingDialogOpen}
        onClose={() => setIsMappingDialogOpen(false)}
        templateId={selectedDocument?.document_id || ""}
        templateName={selectedDocument?.display_name || ""}
        clientId={selectedClientId || ""}
        placeholders={currentPlaceholders}
        autoMappings={currentAutoMappings}
        savedMapping={savedMapping}
        validationWarnings={validationWarnings}
        availableFields={availableFields}
        clientData={clientDataForMapping}
        onConfirm={handleMappingConfirm}
        isGenerating={isGenerating}
      />
    </div>
  );
}
