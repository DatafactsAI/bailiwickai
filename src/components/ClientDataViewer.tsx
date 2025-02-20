
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FileText } from "lucide-react";
import { ClientTable } from './client-data/ClientTable';
import { ClientSelector } from './client-data/ClientSelector';
import { ClientData } from './client-data/types';

interface ClientDataViewerProps {
  onClientSelect: (clientId: string | null) => void;
}

export function ClientDataViewer({ onClientSelect }: ClientDataViewerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Set up real-time subscription to clients_financial_data
  React.useEffect(() => {
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'clients_financial_data'
        },
        () => {
          // Invalidate and refetch queries when data changes
          queryClient.invalidateQueries({ queryKey: ['clients'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const { data: clientsData, isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients_financial_data')
        .select('*')
        .order('consultation_date', { ascending: false });

      if (error) throw error;
      return data as ClientData[];
    },
  });

  const selectedClient = clientsData?.find(client => client.id === selectedClientId);

  const handleClientSelect = async (clientId: string) => {
    setSelectedClientId(clientId);
    onClientSelect(clientId);
    const client = clientsData?.find(c => c.id === clientId);
    
    if (client) {
      const clientSummary = `Selected Client Information:
      
Client 1: ${client.client1_name}
Date of Birth: ${new Date(client.client1_dob).toLocaleDateString()}
Gross Salary: ${client.client1_gross_salary}
Super Balance: ${client.client1_super_balance}
${client.client2_name ? `\nClient 2: ${client.client2_name}
Date of Birth: ${client.client2_dob ? new Date(client.client2_dob).toLocaleDateString() : 'N/A'}
Gross Salary: ${client.client2_gross_salary || 'N/A'}
Super Balance: ${client.client2_super_balance || 'N/A'}` : ''}

Consultation Date: ${new Date(client.consultation_date).toLocaleDateString()}
Advisor: ${client.advisor_name}

You can now ask questions about this client's financial situation.`;

      await supabase
        .from('messages')
        .insert({
          content: clientSummary,
          type: 'received',
          timestamp: new Date().toISOString(),
          metadata: {
            clientId: client.id,
            client1_gross_salary: client.client1_gross_salary,
            client1_super_balance: client.client1_super_balance,
            client2_gross_salary: client.client2_gross_salary,
            client2_super_balance: client.client2_super_balance
          }
        });
    }
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="bg-blue-600 hover:bg-blue-700"
      >
        <FileText className="w-4 h-4 mr-2" />
        View Client Data
      </Button>
    );
  }

  if (isLoading) {
    return (
      <Card className="fixed top-4 right-4 w-[90vw] max-w-3xl p-6 z-50 bg-white shadow-lg">
        <div>Loading...</div>
      </Card>
    );
  }

  return (
    <Card className="fixed top-4 right-4 w-[90vw] max-w-3xl p-6 z-50 bg-white shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Client Financial Data</h2>
        <Button variant="outline" onClick={() => {
          setIsOpen(false);
          setSelectedClientId(null);
          onClientSelect(null);
        }}>
          Close
        </Button>
      </div>

      {clientsData && (
        <ClientSelector
          clients={clientsData}
          selectedClientId={selectedClientId}
          onClientSelect={handleClientSelect}
        />
      )}

      {selectedClient && <ClientTable client={selectedClient} />}
    </Card>
  );
}
