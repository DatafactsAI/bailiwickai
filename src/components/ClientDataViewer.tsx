
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FileText, MessageSquare } from "lucide-react";
import { ClientTable } from './client-data/ClientTable';
import { ClientSelector } from './client-data/ClientSelector';
import { ClientData } from './client-data/types';
import { AdvisorAdviceButton } from './AdvisorAdviceButton';
import { ZapierWebhookForm } from './ZapierWebhookForm';

interface ClientDataViewerProps {
  onClientSelect: (clientId: string | null) => void;
}

export function ClientDataViewer({ onClientSelect }: ClientDataViewerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [webhookUrl, setWebhookUrl] = useState<string>('');
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
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Client Financial Data</h2>
          <div className="flex gap-2">
            {selectedClientId && (
              <AdvisorAdviceButton
                selectedClientId={selectedClientId}
                onAdviceAdded={() => {
                  queryClient.invalidateQueries({ queryKey: ['clients'] });
                }}
                webhookUrl={webhookUrl}
              />
            )}
            <Button variant="outline" onClick={() => {
              setIsOpen(false);
              setSelectedClientId(null);
              onClientSelect(null);
            }}>
              Close
            </Button>
          </div>
        </div>

        <ZapierWebhookForm
          webhookUrl={webhookUrl}
          onWebhookUrlChange={setWebhookUrl}
        />

        {clientsData && (
          <ClientSelector
            clients={clientsData}
            selectedClientId={selectedClientId}
            onClientSelect={handleClientSelect}
          />
        )}

        {selectedClient && (
          <ClientTable 
            client={selectedClient} 
            onPlaceInChat={() => {
              // Create a formatted string with client details
              const clientSummary = `Client Financial Summary for ${selectedClient.client1_name}:
- Gross Salary: ${new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(selectedClient.client1_gross_salary)}
- Super Balance: ${new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(selectedClient.client1_super_balance)}
- Health Status: ${selectedClient.client1_health || 'Not specified'}
- Work Status: ${selectedClient.client1_work_status || 'Not specified'}
- Total Lifestyle Assets: ${new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(selectedClient.total_lifestyle_assets)}
- Total Investment Assets: ${new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(selectedClient.total_investment_assets)}`;

              // Store this summary in local storage for the chat component to pick up
              localStorage.setItem('clientDetailsForChat', clientSummary);
              
              // Close the client data viewer
              setIsOpen(false);
            }}
          />
        )}
      </div>
    </Card>
  );
}
