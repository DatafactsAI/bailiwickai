
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ClientData } from './client-data/types';
import { Loader2, MessageSquarePlus } from "lucide-react";

interface AdvisorAdviceButtonProps {
  selectedClientId: string | null;
  onAdviceAdded: () => void;
  webhookUrl?: string;
}

export function AdvisorAdviceButton({ selectedClientId, onAdviceAdded, webhookUrl }: AdvisorAdviceButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleAddAdvice = async (message: string) => {
    if (!selectedClientId) {
      toast({
        title: "Error",
        description: "Please select a client first",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Update advice in Supabase
      const { data: updatedClient, error: updateError } = await supabase
        .from('clients_financial_data')
        .update({ advisor_advice: message })
        .eq('id', selectedClientId)
        .select('*')
        .single();

      if (updateError) throw updateError;

      // Send to Zapier webhook if URL is provided
      if (webhookUrl && updatedClient) {
        try {
          await fetch(webhookUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            mode: "no-cors",
            body: JSON.stringify(updatedClient),
          });

          toast({
            title: "Success",
            description: "Advice has been saved and sent to Zapier",
          });
        } catch (webhookError) {
          console.error("Error sending to webhook:", webhookError);
          toast({
            title: "Partial Success",
            description: "Advice saved but failed to send to Zapier",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Success",
          description: "Advice has been saved",
        });
      }

      onAdviceAdded();
      setIsOpen(false);
    } catch (error) {
      console.error("Error saving advice:", error);
      toast({
        title: "Error",
        description: "Failed to save advice",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={() => {
        if (!selectedClientId) {
          toast({
            title: "Error",
            description: "Please select a client first",
            variant: "destructive",
          });
          return;
        }
        setIsOpen(true);
      }}
      className="bg-[#9b87f5] hover:bg-[#8B5CF6]"
      disabled={isLoading}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <MessageSquarePlus className="h-4 w-4 mr-2" />
      )}
      Add Advisor Advice
    </Button>
  );
}

