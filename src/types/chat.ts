
export interface ClientMetadata {
  clientId?: string;
  client1_gross_salary?: number;
  client1_super_balance?: number;
  client2_gross_salary?: number;
  client2_super_balance?: number;
}

export interface ChatMessage {
  id: string;
  content: string;
  timestamp: string;
  type: "sent" | "received";
  metadata?: ClientMetadata;
}
