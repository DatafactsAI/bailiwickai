import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, CheckCircle, AlertCircle, HelpCircle, XCircle, Edit2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  PlaceholderMapping,
  MappingEntry,
  TemplateMapping,
  ValidationResult,
  ClientField,
  MappingConfidence,
} from "./types";

interface VariableMappingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  templateId: string;
  templateName: string;
  clientId: string;
  placeholders: string[];
  autoMappings: Record<string, MappingEntry>;
  savedMapping?: TemplateMapping | null;
  validationWarnings?: ValidationResult | null;
  availableFields: ClientField[];
  clientData: Record<string, unknown>;
  onConfirm: (mappings: Record<string, MappingEntry>, saveMapping: boolean) => void;
  isGenerating?: boolean;
}

/**
 * Dialog for reviewing and editing template variable mappings.
 * Shows auto-mapped placeholders with confidence indicators and allows
 * users to edit mappings or enter custom values.
 */
export function VariableMappingDialog({
  isOpen,
  onClose,
  templateId,
  templateName,
  clientId,
  placeholders,
  autoMappings,
  savedMapping,
  validationWarnings,
  availableFields,
  clientData,
  onConfirm,
  isGenerating = false,
}: VariableMappingDialogProps) {
  const { toast } = useToast();
  
  // State for current mappings (editable copy)
  const [mappings, setMappings] = useState<Record<string, MappingEntry>>({});
  const [saveMapping, setSaveMapping] = useState(true);
  const [editingPlaceholder, setEditingPlaceholder] = useState<string | null>(null);
  
  // Initialize mappings when dialog opens or data changes
  useEffect(() => {
    if (isOpen) {
      // Start with saved mapping if valid, otherwise use auto-mappings
      if (savedMapping && validationWarnings?.valid) {
        setMappings(savedMapping.mappings);
      } else if (savedMapping && !validationWarnings?.valid) {
        // Pre-fill with saved mappings, will need to handle missing ones
        setMappings({ ...savedMapping.mappings, ...autoMappings });
      } else {
        setMappings(autoMappings);
      }
    }
  }, [isOpen, autoMappings, savedMapping, validationWarnings]);
  
  // Convert mappings to display format with resolved values
  const displayMappings: PlaceholderMapping[] = useMemo(() => {
    return placeholders.map((placeholder) => {
      const entry = mappings[placeholder] || {
        field: null,
        type: "custom_value" as const,
        isCustom: true,
        confidence: "none" as MappingConfidence,
      };
      
      // Resolve display value
      let displayValue = "";
      if (entry.isCustom && entry.customValue) {
        displayValue = entry.customValue;
      } else if (entry.field) {
        displayValue = resolveFieldValue(entry.field, clientData);
        // Format if needed
        if (entry.format === "currency" && displayValue) {
          const num = parseFloat(displayValue);
          if (!isNaN(num)) {
            displayValue = `$${num.toLocaleString("en-AU", { minimumFractionDigits: 2 })}`;
          }
        }
      }
      
      return {
        placeholder,
        mappedField: entry.field,
        displayValue: displayValue || "(empty)",
        confidence: entry.confidence || "none",
        isCustom: entry.isCustom,
        customValue: entry.customValue || undefined,
        format: entry.format || undefined,
      };
    });
  }, [placeholders, mappings, clientData]);
  
  // Count mappings by status
  const mappingStats = useMemo(() => {
    return {
      high: displayMappings.filter((m) => m.confidence === "high").length,
      medium: displayMappings.filter((m) => m.confidence === "medium").length,
      low: displayMappings.filter((m) => m.confidence === "low").length,
      none: displayMappings.filter((m) => m.confidence === "none" && !m.isCustom).length,
      custom: displayMappings.filter((m) => m.isCustom && m.customValue).length,
      unmapped: displayMappings.filter(
        (m) => !m.mappedField && !m.customValue
      ).length,
    };
  }, [displayMappings]);
  
  // Resolve a field value from client data using dot notation
  function resolveFieldValue(fieldPath: string, data: Record<string, unknown>): string {
    if (!fieldPath || !data) return "";
    
    const parts = fieldPath.split(".");
    let current: unknown = data;
    
    for (const part of parts) {
      if (current && typeof current === "object" && part in current) {
        current = (current as Record<string, unknown>)[part];
      } else {
        return "";
      }
    }
    
    if (current === null || current === undefined) return "";
    return String(current);
  }
  
  // Handle field selection change
  function handleFieldChange(placeholder: string, fieldPath: string) {
    const field = availableFields.find((f) => f.path === fieldPath);
    
    setMappings((prev) => ({
      ...prev,
      [placeholder]: {
        field: fieldPath || null,
        type: fieldPath ? "field_reference" : "custom_value",
        isCustom: !fieldPath,
        customValue: null,
        confidence: fieldPath ? "high" : "none",
        format: field?.type === "currency" ? "currency" : field?.type === "date" ? "date" : null,
      },
    }));
    
    setEditingPlaceholder(null);
  }
  
  // Handle custom value change
  function handleCustomValueChange(placeholder: string, value: string) {
    setMappings((prev) => ({
      ...prev,
      [placeholder]: {
        field: null,
        type: "custom_value",
        isCustom: true,
        customValue: value || null,
        confidence: "none",
      },
    }));
  }
  
  // Handle confirm/generate
  function handleConfirm() {
    // Check for unmapped placeholders
    const unmapped = displayMappings.filter(
      (m) => !m.mappedField && !m.customValue
    );
    
    if (unmapped.length > 0) {
      toast({
        title: "Unmapped placeholders",
        description: `${unmapped.length} placeholder(s) have no value. They will be left blank in the document.`,
        variant: "destructive",
      });
    }
    
    onConfirm(mappings, saveMapping);
  }
  
  // Get confidence badge
  function getConfidenceBadge(confidence: MappingConfidence, isCustom: boolean, hasValue: boolean) {
    if (isCustom && hasValue) {
      return (
        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
          <Edit2 className="w-3 h-3 mr-1" />
          Custom
        </Badge>
      );
    }
    
    switch (confidence) {
      case "high":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Auto-mapped
          </Badge>
        );
      case "medium":
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            <HelpCircle className="w-3 h-3 mr-1" />
            Review
          </Badge>
        );
      case "low":
        return (
          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
            <AlertCircle className="w-3 h-3 mr-1" />
            Low confidence
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <XCircle className="w-3 h-3 mr-1" />
            Unmapped
          </Badge>
        );
    }
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      {/* !flex !flex-col override the default grid layout from DialogContent */}
      <DialogContent className="!flex !flex-col w-full max-w-[1100px] h-[85vh] p-0 gap-0 overflow-hidden">
        {/* Header section - fixed height, won't shrink */}
        <div className="p-6 pb-4 flex-shrink-0">
          <DialogHeader>
            <DialogTitle>Map Template Variables</DialogTitle>
            <DialogDescription>
              Review and edit how template placeholders map to client data for "{templateName}"
            </DialogDescription>
          </DialogHeader>
        </div>
        
        {/* Stats Bar - fixed height */}
        <div className="flex items-center gap-4 py-3 px-6 bg-slate-50 text-sm flex-shrink-0">
          <span className="text-slate-500">Mapping Status:</span>
          <div className="flex items-center gap-3">
            {mappingStats.high > 0 && (
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircle className="w-4 h-4" />
                {mappingStats.high} auto
              </span>
            )}
            {mappingStats.medium > 0 && (
              <span className="flex items-center gap-1 text-yellow-600">
                <HelpCircle className="w-4 h-4" />
                {mappingStats.medium} review
              </span>
            )}
            {mappingStats.custom > 0 && (
              <span className="flex items-center gap-1 text-purple-600">
                <Edit2 className="w-4 h-4" />
                {mappingStats.custom} custom
              </span>
            )}
            {mappingStats.unmapped > 0 && (
              <span className="flex items-center gap-1 text-red-600">
                <XCircle className="w-4 h-4" />
                {mappingStats.unmapped} unmapped
              </span>
            )}
          </div>
        </div>
        
        {/* Validation Warnings - fixed height when shown */}
        {validationWarnings && !validationWarnings.valid && (
          <div className="mx-6 bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800 flex-shrink-0">
            {validationWarnings.reason === "template_changed" && (
              <p>
                <strong>Template has changed</strong> since the mapping was last saved.
                {validationWarnings.missing_placeholders && validationWarnings.missing_placeholders.length > 0 && (
                  <span> New placeholders: {validationWarnings.missing_placeholders.join(", ")}</span>
                )}
              </p>
            )}
            {validationWarnings.reason === "incomplete_mapping" && (
              <p>
                <strong>Some placeholders need mapping.</strong> Please review the unmapped items below.
              </p>
            )}
          </div>
        )}
        
        {/* Mapping Table - this is the scrollable area */}
        {/* flex-1 takes remaining space, min-h-0 allows shrinking below content height */}
        <div className="flex-1 min-h-0 mx-6 my-4 border rounded-lg overflow-hidden">
          <div className="h-full overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
                <TableRow>
                  <TableHead className="w-1/4">Placeholder</TableHead>
                  <TableHead className="w-1/4">Status</TableHead>
                  <TableHead className="w-1/4">Mapped To</TableHead>
                  <TableHead className="w-1/4">Preview Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayMappings.map((mapping) => (
                  <TableRow 
                    key={mapping.placeholder}
                    className={mapping.confidence === "none" && !mapping.customValue ? "bg-red-50/50" : ""}
                  >
                    <TableCell className="font-mono text-sm">
                      {mapping.placeholder}
                    </TableCell>
                    <TableCell>
                      {getConfidenceBadge(
                        mapping.confidence,
                        mapping.isCustom,
                        !!mapping.customValue
                      )}
                    </TableCell>
                    <TableCell>
                      {editingPlaceholder === mapping.placeholder ? (
                        <div className="space-y-2">
                          <Select
                            value={mapping.mappedField || ""}
                            onValueChange={(value) => handleFieldChange(mapping.placeholder, value)}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select field..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">-- Custom Value --</SelectItem>
                              {availableFields.map((field) => (
                                <SelectItem key={field.path} value={field.path}>
                                  {field.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {!mapping.mappedField && (
                            <Input
                              placeholder="Enter custom value..."
                              value={mapping.customValue || ""}
                              onChange={(e) => handleCustomValueChange(mapping.placeholder, e.target.value)}
                            />
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingPlaceholder(null)}
                          >
                            Done
                          </Button>
                        </div>
                      ) : (
                        <div 
                          className="flex items-center gap-2 cursor-pointer hover:text-blue-600"
                          onClick={() => setEditingPlaceholder(mapping.placeholder)}
                        >
                          <span className="truncate max-w-[200px]">
                            {mapping.isCustom
                              ? mapping.customValue || "(click to set)"
                              : availableFields.find((f) => f.path === mapping.mappedField)?.label || mapping.mappedField || "(click to set)"}
                          </span>
                          <Edit2 className="w-3 h-3 opacity-50" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-slate-600 truncate max-w-[200px]">
                      {mapping.displayValue}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
        
        {/* Footer - fixed height, won't shrink */}
        <DialogFooter className="flex-col sm:flex-row gap-4 p-6 pt-4 flex-shrink-0 border-t">
          <div className="flex items-center space-x-2 flex-1">
            <Checkbox
              id="save-mapping"
              checked={saveMapping}
              onCheckedChange={(checked) => setSaveMapping(checked === true)}
            />
            <label
              htmlFor="save-mapping"
              className="text-sm text-slate-600 cursor-pointer"
            >
              Save this mapping for future use with this template
            </label>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={isGenerating}>
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                "Generate Document"
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


