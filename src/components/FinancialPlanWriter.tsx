
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PenLine, Loader2 } from "lucide-react";
import { ClientSelector } from './client-data/ClientSelector';
import { useToast } from "@/hooks/use-toast";
import { WebhookInputForm } from './financial-plan/WebhookInputForm';
import { WebhookInstructions } from './financial-plan/WebhookInstructions';
import { useClientData } from '@/hooks/useClientData';
import { useClientDataSubscription } from '@/hooks/useClientDataSubscription';

export function FinancialPlanWriter() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { data: clientsData, isLoading: isLoadingClients } = useClientData();

  // Set up real-time subscription
  useClientDataSubscription();

  const handleGeneratePlan = async () => {
    if (!webhookUrl) {
      toast({
        title: "Error",
        description: "Please enter your Zapier webhook URL",
        variant: "destructive",
      });
      return;
    }

    if (!selectedClientId) {
      toast({
        title: "Error",
        description: "Please select a client first",
        variant: "destructive",
      });
      return;
    }

    const selectedClient = clientsData?.find(client => client.id === selectedClientId);
    if (!selectedClient) return;

    setIsLoading(true);
    console.log("Sending client data to Zapier webhook");

    try {
      await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        mode: "no-cors",
        body: JSON.stringify({
          client1_name: selectedClient.client1_name,
          client1_dob: selectedClient.client1_dob,
          client1_gross_salary: selectedClient.client1_gross_salary,
          client1_super_balance: selectedClient.client1_super_balance,
          client1_health: selectedClient.client1_health,
          client1_work_status: selectedClient.client1_work_status,
          client1_income_tax: selectedClient.client1_income_tax,
          client1_centrelink_received: selectedClient.client1_centrelink_received,
          client2_name: selectedClient.client2_name,
          client2_dob: selectedClient.client2_dob,
          client2_gross_salary: selectedClient.client2_gross_salary,
          client2_super_balance: selectedClient.client2_super_balance,
          client2_health: selectedClient.client2_health,
          client2_work_status: selectedClient.client2_work_status,
          client2_income_tax: selectedClient.client2_income_tax,
          client2_centrelink_received: selectedClient.client2_centrelink_received,
          total_lifestyle_assets: selectedClient.total_lifestyle_assets,
          total_living_expenses: selectedClient.total_living_expenses,
          total_investment_assets: selectedClient.total_investment_assets,
          consultation_date: selectedClient.consultation_date,
          advisor_name: selectedClient.advisor_name,
          advisor_advice: selectedClient.advisor_advice
        }),
      });

      toast({
        title: "Financial Plan Request Sent",
        description: "The client data has been sent to Zapier for processing. Please check your Zap's history.",
      });
      setIsOpen(false);
    } catch (error) {
      console.error("Error sending to webhook:", error);
      toast({
        title: "Error",
        description: "Failed to send data to Zapier. Please check the webhook URL and try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="bg-[#9b87f5] hover:bg-[#8B5CF6]"
      >
        <PenLine className="w-4 h-4 mr-2" />
        Write Financial Plan
      </Button>
    );
  }

  if (isLoadingClients) {
    return (
      <Card className="fixed top-4 right-4 w-[90vw] max-w-3xl p-6 z-50 bg-white shadow-lg">
        <div>Loading...</div>
      </Card>
    );
  }

  return (
    <Card className="fixed top-4 right-4 w-[90vw] max-w-3xl p-6 z-50 bg-white shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Generate Financial Plan</h2>
        <Button variant="outline" onClick={() => setIsOpen(false)}>
          Close
        </Button>
      </div>

      <div className="space-y-6">
        {clientsData && (
          <div>
            <label className="block text-sm font-medium mb-2">
              Select Client
            </label>
            <ClientSelector
              clients={clientsData}
              selectedClientId={selectedClientId}
              onClientSelect={setSelectedClientId}
            />
          </div>
        )}

        <WebhookInputForm 
          webhookUrl={webhookUrl}
          setWebhookUrl={setWebhookUrl}
        />

        <Button
          onClick={handleGeneratePlan}
          disabled={isLoading || !selectedClientId || !webhookUrl}
          className="w-full bg-[#9b87f5] hover:bg-[#8B5CF6]"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating Plan...
            </>
          ) : (
            'Generate Financial Plan'
          )}
        </Button>

        <WebhookInstructions />
      </div>
    </Card>
  );
}
