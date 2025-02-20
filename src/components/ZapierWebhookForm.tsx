
import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";

interface ZapierWebhookFormProps {
  webhookUrl: string;
  onWebhookUrlChange: (url: string) => void;
}

export function ZapierWebhookForm({ webhookUrl, onWebhookUrlChange }: ZapierWebhookFormProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const { toast } = useToast();

  const handleTestWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!webhookUrl) {
      toast({
        title: "Error",
        description: "Please enter your Zapier webhook URL",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    console.log("Testing Zapier webhook with sample data");

    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        mode: "no-cors", // Handle CORS for Zapier webhooks
        body: JSON.stringify({
          client1_name: "Test Client",
          consultation_date: new Date().toISOString().split('T')[0],
          advisor_name: "Test Advisor",
          client1_dob: "1980-01-01",
          client1_gross_salary: 75000,
          client1_super_balance: 100000
        }),
      });

      toast({
        title: "Test Sent",
        description: "The test data was sent to Zapier. Please check your Zap's history to confirm it was received.",
      });
    } catch (error) {
      console.error("Error testing webhook:", error);
      toast({
        title: "Error",
        description: "Failed to test the Zapier webhook. Please check the URL and try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold mb-4">Zapier Integration</h2>
      <form onSubmit={handleTestWebhook} className="space-y-4">
        <div>
          <label htmlFor="webhook-url" className="block text-sm font-medium mb-2">
            Zapier Webhook URL
          </label>
          <Input
            id="webhook-url"
            type="url"
            value={webhookUrl}
            onChange={(e) => onWebhookUrlChange(e.target.value)}
            placeholder="Enter your Zapier webhook URL"
            className="w-full"
          />
        </div>
        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Testing Webhook...
            </>
          ) : (
            'Test Webhook'
          )}
        </Button>
      </form>
      <div className="mt-4 text-sm text-gray-600">
        <p>This webhook will receive client advice data when you add new advice.</p>
      </div>
    </Card>
  );
}
