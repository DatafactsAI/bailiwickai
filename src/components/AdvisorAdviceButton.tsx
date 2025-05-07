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
}

export function AdvisorAdviceButton({ selectedClientId, onAdviceAdded }: AdvisorAdviceButtonProps) {
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

      toast({
        title: "Success",
        description: "Advice has been saved",
      });

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
          variant="purple" 
          size="sm"
        >
          <MessageSquarePlus className="w-4 h-4 mr-1" />
          Add Advisor Comments
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[65%] w-full">
        <DialogHeader>
          <DialogTitle>Add Advisor Comments</DialogTitle>
          <DialogDescription>
            Enter professional advice for this client. This will be stored with their financial data.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <Textarea
            placeholder="Enter your professional advice here..."
            value={advice}
            onChange={(e) => setAdvice(e.target.value)}
            className="min-h-[300px]"
          />
        </div>
        <div className="flex justify-end gap-3">
          <Button 
            variant="outline" 
            onClick={() => {
              setIsOpen(false);
              setAdvice('');
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleAddAdvice} 
            disabled={isLoading || !advice.trim()}
            variant="green"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
                Saving...
              </>
            ) : (
              'Save Advice'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
