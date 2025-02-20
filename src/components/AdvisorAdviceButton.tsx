
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, MessageSquarePlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface AdvisorAdviceButtonProps {
  selectedClientId: string | null;
  onAdviceAdded: () => void;
  webhookUrl?: string;
}

export function AdvisorAdviceButton({ selectedClientId, onAdviceAdded, webhookUrl }: AdvisorAdviceButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [advice, setAdvice] = useState('');
  const { toast } = useToast();

  const handleAddAdvice = async () => {
    if (!selectedClientId) {
      toast({
        title: "Error",
        description: "Please select a client first",
        variant: "destructive",
      });
      return;
    }

    if (!advice.trim()) {
      toast({
        title: "Error",
        description: "Please enter some advice",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Update advice in Supabase
      const { data: updatedClient, error: updateError } = await supabase
        .from('clients_financial_data')
        .update({ advisor_advice: advice })
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
      setAdvice('');
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
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          onClick={(e) => {
            if (!selectedClientId) {
              e.preventDefault();
              toast({
                title: "Error",
                description: "Please select a client first",
                variant: "destructive",
              });
              return;
            }
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
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Advisor Advice</DialogTitle>
          <DialogDescription>
            Enter your advice for the selected client below.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Textarea
            placeholder="Enter your advice here..."
            value={advice}
            onChange={(e) => setAdvice(e.target.value)}
            className="min-h-[200px]"
          />
          <Button
            onClick={handleAddAdvice}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Save Advice
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
