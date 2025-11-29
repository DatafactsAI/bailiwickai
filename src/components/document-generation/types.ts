/**
 * Type definitions for the template completion feature.
 * Used by DocumentGenerationPanel and VariableMappingDialog components.
 */

/**
 * Confidence level for auto-mapped placeholders.
 */
export type MappingConfidence = "high" | "medium" | "low" | "none";

/**
 * Type of mapping - either a reference to a client data field or a custom value.
 */
export type MappingType = "field_reference" | "custom_value";

/**
 * A single placeholder-to-field mapping entry.
 */
export interface MappingEntry {
  /** Field path (e.g., "clientInfo.client1.name") or null for custom values */
  field: string | null;
  /** Type of mapping */
  type: MappingType;
  /** Whether this is a custom value (not from client data) */
  isCustom: boolean;
  /** Custom value to use if isCustom is true */
  customValue?: string | null;
  /** Confidence level of auto-mapping */
  confidence?: MappingConfidence;
  /** Format hint (e.g., "currency", "date") */
  format?: string | null;
}

/**
 * A placeholder mapping with additional display information.
 * Used in the UI for showing mapping status and previews.
 */
export interface PlaceholderMapping {
  /** The placeholder string (e.g., "<client_name>") */
  placeholder: string;
  /** The mapped field path or null */
  mappedField: string | null;
  /** Preview of the resolved value */
  displayValue: string;
  /** Confidence level of the mapping */
  confidence: MappingConfidence;
  /** Whether this uses a custom value */
  isCustom: boolean;
  /** Custom value if isCustom is true */
  customValue?: string;
  /** Format hint for display */
  format?: string;
}

/**
 * Complete mapping configuration for a template.
 * Saved per-template for reuse.
 */
export interface TemplateMapping {
  /** Template identifier */
  template_id: string;
  /** Human-readable template name */
  template_name: string;
  /** When the mapping was first created */
  created_at: string;
  /** When the mapping was last updated */
  updated_at: string;
  /** Mapping entries keyed by placeholder */
  mappings: Record<string, MappingEntry>;
  /** MD5 hash of placeholders for change detection */
  placeholder_signature: string;
}

/**
 * Result of validating a saved mapping against current placeholders.
 */
export interface ValidationResult {
  /** Whether the mapping is valid and can be used */
  valid: boolean;
  /** Reason for invalidity */
  reason?: "no_mapping" | "template_changed" | "incomplete_mapping";
  /** The saved mapping (if any) */
  saved_mapping?: TemplateMapping;
  /** Placeholders in current template but not in saved mapping */
  missing_placeholders?: string[];
  /** Placeholders in saved mapping but not in current template */
  extra_placeholders?: string[];
}

/**
 * Information about an available client data field.
 * Used to populate dropdown options.
 */
export interface ClientField {
  /** Dot-notation path to the field */
  path: string;
  /** Human-readable label */
  label: string;
  /** Data type for formatting */
  type: "string" | "number" | "date" | "currency";
}

/**
 * Response from the extract-placeholders endpoint.
 */
export interface ExtractPlaceholdersResponse {
  placeholders: string[];
  signature: string;
}

/**
 * Response from the auto-map endpoint.
 */
export interface AutoMapResponse {
  mappings: Record<string, MappingEntry>;
  placeholders: string[];
}

/**
 * Request body for the generate endpoint.
 */
export interface GenerateDocumentRequest {
  client_id: string;
  mappings: Record<string, MappingEntry>;
  save_mapping: boolean;
}

/**
 * Response from the generate endpoint.
 */
export interface GenerateDocumentResponse {
  status: string;
  download_url: string;
  file_path: string;
  generated_at: string;
}

/**
 * Document profile returned from the API.
 */
export interface DocumentProfile {
  document_id: string;
  display_name: string;
  source_filename: string;
  file_extension: string;
  file_size: number;
  word_count: number;
  uploaded_at: string;
  description?: string;
  tags?: string[];
  client_ids?: string[];
  page_count?: number;
  has_mapping?: boolean;
}


