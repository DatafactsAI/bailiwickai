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
  if (clientData?.clientId) {
    let context = `Context: You are a financial assistant. `;
    if (clientData.client1_gross_salary !== undefined) {
      context += `Client 1 has a gross salary of $${clientData.client1_gross_salary}. `;
    }
    if (clientData.client1_super_balance !== undefined) {
      context += `Client 1's super balance is $${clientData.client1_super_balance}. `;
    }
    context += `\n\nYou can update client data when asked. For example, if someone asks to "change super balance to $100,000", you should update the database.\n\n`;
    context += `Question: ${message}`;
    return context;
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

export async function updateClientData(supabase: any, clientId: string, updates: Partial<{
  client1_gross_salary: number;
  client1_super_balance: number;
  client2_gross_salary: number;
  client2_super_balance: number;
}>) {
  const { data, error } = await supabase
    .from('clients_financial_data')
    .update(updates)
    .eq('id', clientId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export function extractNumberFromText(text: string): number | null {
  const matches = text.match(/\$?([\d,]+)/);
  if (matches) {
    return Number(matches[1].replace(/,/g, ''));
  }
  return null;
}

export function analyzeMessage(message: string): { 
  action: 'update_super' | 'update_salary' | 'none';
  targetValue: number | null;
  clientNumber: 1 | 2 | null;
} {
  const lowercaseMessage = message.toLowerCase();
  
  let action: 'update_super' | 'update_salary' | 'none' = 'none';
  let clientNumber: 1 | 2 | null = null;
  
  if (lowercaseMessage.includes('super') || lowercaseMessage.includes('superannuation')) {
    action = 'update_super';
  } else if (lowercaseMessage.includes('salary') || lowercaseMessage.includes('income')) {
    action = 'update_salary';
  }

  if (lowercaseMessage.includes('client 2')) {
    clientNumber = 2;
  } else {
    clientNumber = 1; // Default to client 1 if not specified
  }

  return {
    action,
    targetValue: extractNumberFromText(message),
    clientNumber
  };
}
