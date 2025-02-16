
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
  console.log('Updating client data:', { clientId, updates });
  const { data, error } = await supabase
    .from('clients_financial_data')
    .update(updates)
    .eq('id', clientId)
    .select()
    .single();

  if (error) {
    console.error('Error updating client data:', error);
    throw error;
  }
  console.log('Updated client data:', data);
  return data;
}

export function extractNumberFromText(text: string): number | null {
  // First, remove spaces between numbers
  let cleanText = text.replace(/(\d)\s+(?=\d)/g, '$1');
  
  // Then look for the last number in the text (which is typically the target value)
  // This regex looks for:
  // - Optional dollar sign
  // - Numbers that may contain commas
  // - Handles both "1000" and "1,000" formats
  const matches = cleanText.match(/\$?([\d,]+)(?!.*\d)/);
  
  if (matches) {
    // Remove commas and convert to number
    const number = Number(matches[1].replace(/,/g, ''));
    console.log('Extracted number:', { 
      original: text, 
      cleaned: cleanText, 
      match: matches[1],
      extracted: number 
    });
    return number;
  }
  
  console.log('No number found in text:', text);
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
  
  // Check for keywords indicating what to update
  if (lowercaseMessage.includes('super') || lowercaseMessage.includes('superannuation')) {
    action = 'update_super';
  } else if (lowercaseMessage.includes('salary') || lowercaseMessage.includes('income')) {
    action = 'update_salary';
  }

  // Determine which client to update
  if (lowercaseMessage.includes('client 2')) {
    clientNumber = 2;
  } else if (lowercaseMessage.includes('client 1') || true) {
    clientNumber = 1; // Default to client 1 if not specified
  }

  // Extract the numeric value
  const targetValue = extractNumberFromText(message);
  
  console.log('Analyzed message:', { 
    action, 
    targetValue, 
    clientNumber, 
    message,
    lowercaseMessage 
  });

  return {
    action,
    targetValue,
    clientNumber
  };
}
