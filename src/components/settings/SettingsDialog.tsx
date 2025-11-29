import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KnowledgeBaseUpload } from "./KnowledgeBaseUpload";
import { DocumentGenerationPanel } from "@/components/document-generation/DocumentGenerationPanel";
import { FactFindUpload } from "./FactFindUpload";
import { FileText, Upload, Settings, FileSearch } from "lucide-react";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <div className="px-6 pt-6 pb-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Settings
            </DialogTitle>
            <DialogDescription>
              Manage knowledge base documents, document templates, and fact find uploads
            </DialogDescription>
          </DialogHeader>
        </div>
        
        <Tabs defaultValue="fact-find" className="flex-1 flex flex-col overflow-hidden px-6 pb-6">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="fact-find" className="flex items-center gap-2">
              <FileSearch className="h-4 w-4" />
              Fact Find
            </TabsTrigger>
            <TabsTrigger value="knowledge-base" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Knowledge Base
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Document Templates
            </TabsTrigger>
          </TabsList>
          
          <div className="flex-1 overflow-auto min-h-0">
            <TabsContent value="fact-find" className="mt-0">
              <FactFindUpload />
            </TabsContent>
            
            <TabsContent value="knowledge-base" className="mt-0">
              <KnowledgeBaseUpload />
            </TabsContent>
            
            <TabsContent value="templates" className="mt-0">
              <DocumentGenerationPanel />
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

