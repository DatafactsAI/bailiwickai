
import React from 'react';
import { Card } from "@/components/ui/card";
import { ExternalLink } from "lucide-react";

export function WebhookInstructions() {
  return (
    <Card className="mt-4 p-4 border border-gray-200 bg-gray-50">
      <h3 className="font-medium text-gray-900 mb-2">Setting up your Zapier webhook:</h3>
      <ol className="list-decimal ml-4 mt-2 space-y-3 text-sm text-gray-600">
        <li>Create a new Zap in Zapier</li>
        <li>Choose "Webhook" as your trigger</li>
        <li>Select "Catch Hook" as the webhook type</li>
        <li>Copy the webhook URL provided by Zapier</li>
        <li>Paste it above and click "Generate Financial Plan"</li>
      </ol>
      <div className="mt-4 flex items-center text-xs text-blue-600">
        <ExternalLink className="w-3 h-3 mr-1" />
        <a 
          href="https://zapier.com/help/create/code-webhooks/trigger-zaps-from-webhooks" 
          target="_blank" 
          rel="noopener noreferrer"
          className="hover:underline"
        >
          Learn more about Zapier webhooks
        </a>
      </div>
    </Card>
  );
}
