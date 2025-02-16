
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";

export function ZapierWebhookForm() {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
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
    <Card className="p-6 max-w-2xl mx-auto my-8">
      <h2 className="text-2xl font-bold mb-4">Zapier Webhook Configuration</h2>
      <form onSubmit={handleTestWebhook} className="space-y-4">
        <div>
          <label htmlFor="webhook-url" className="block text-sm font-medium mb-2">
            Zapier Webhook URL
          </label>
          <Input
            id="webhook-url"
            type="url"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
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
        <p>To set up your Zapier webhook:</p>
        <ol className="list-decimal ml-4 mt-2 space-y-2">
          <li>Create a new Zap in Zapier</li>
          <li>Choose "Webhook" as your trigger</li>
          <li>Select "Catch Hook" as the webhook type</li>
          <li>Copy the webhook URL provided by Zapier</li>
          <li>Paste it above and click "Test Webhook"</li>
          <li>Check your Zap to confirm the test data was received</li>
        </ol>
      </div>
    </Card>
  );
}
