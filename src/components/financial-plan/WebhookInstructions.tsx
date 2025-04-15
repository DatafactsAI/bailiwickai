
import React from 'react';

export function WebhookInstructions() {
  return (
    <div className="mt-4 text-sm text-gray-600">
      <p>To set up your Zapier webhook:</p>
      <ol className="list-decimal ml-4 mt-2 space-y-2">
        <li>Create a new Zap in Zapier</li>
        <li>Choose "Webhook" as your trigger</li>
        <li>Select "Catch Hook" as the webhook type</li>
        <li>Copy the webhook URL provided by Zapier</li>
        <li>Paste it above and click "Generate Financial Plan"</li>
      </ol>
    </div>
  );
}
