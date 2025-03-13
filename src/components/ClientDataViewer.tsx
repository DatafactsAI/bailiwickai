
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FileText } from "lucide-react";
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
          
          // Also invalidate messages to ensure chat is updated with latest client data
          queryClient.invalidateQueries({ queryKey: ['messages'] });
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

  const handleClientDetailsPlaced = () => {
    // When client details are placed in chat, close the viewer and invalidate messages
    setIsOpen(false);
    setSelectedClientId(null);
    onClientSelect(null);
    
    // Force refresh of the messages
    queryClient.invalidateQueries({ queryKey: ['messages'] });
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
            onPlaceInChat={handleClientDetailsPlaced}
          />
        )}
      </div>
    </Card>
  );
}
