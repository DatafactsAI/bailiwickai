
import React from 'react';
import { Input } from "@/components/ui/input";

interface WebhookInputFormProps {
  webhookUrl: string;
  setWebhookUrl: (url: string) => void;
}

export function WebhookInputForm({ webhookUrl, setWebhookUrl }: WebhookInputFormProps) {
  return (
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
  );
}
