
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ClientData {
  clientId?: string;
  client1_gross_salary?: number;
  client1_super_balance?: number;
  client2_gross_salary?: number;
  client2_super_balance?: number;
}

export function enhanceMessageWithContext(message: string, clientData?: ClientData): string {
  if (clientData?.client1_gross_salary !== undefined && clientData?.client1_super_balance !== undefined) {
    return `Context: Client 1 has a gross salary of $${clientData.client1_gross_salary} and a super balance of $${clientData.client1_super_balance}. 
    
Question: ${message}`;
  }
  return message;
}

export async function verifyAssistant(apiKey: string, assistantId: string) {
  const response = await fetch(`https://api.openai.com/v1/assistants/${assistantId}`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'OpenAI-Beta': 'assistants=v2',
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Assistant verification failed: ${errorText}`);
  }

  return response.json();
}

export async function createThread(headers: Record<string, string>) {
  const response = await fetch('https://api.openai.com/v1/threads', {
    method: 'POST',
    headers,
    body: JSON.stringify({})
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create thread: ${errorText}`);
  }

  return response.json();
}
