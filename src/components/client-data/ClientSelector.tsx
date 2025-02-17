
import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ClientData } from './types';

interface ClientSelectorProps {
  clients: ClientData[];
  selectedClientId: string | null;
  onClientSelect: (clientId: string) => void;
}

export function ClientSelector({ 
  clients, 
  selectedClientId, 
  onClientSelect 
}: ClientSelectorProps) {
  return (
    <div className="mb-6">
      <Select value={selectedClientId || ''} onValueChange={onClientSelect}>
        <SelectTrigger>
          <SelectValue placeholder="Select a client to view" />
        </SelectTrigger>
        <SelectContent>
          {clients?.map((client) => (
            <SelectItem key={client.id} value={client.id}>
              {client.client1_name} - {new Date(client.consultation_date).toLocaleDateString()}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
