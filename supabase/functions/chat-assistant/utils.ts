
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
  // Add any other client data fields that might be present in the metadata
  client1_name?: string;
  client1_health?: string;
  client1_work_status?: string;
  total_lifestyle_assets?: number;
  total_investment_assets?: number;
}

export function enhanceMessageWithContext(message: string, clientData?: ClientData): string {
  if (clientData?.clientId) {
    let context = `Context: You are a financial advisor assistant. `;
    
    // Add Client's name if available
    if (clientData.client1_name) {
      context += `The client's name is ${clientData.client1_name}. `;
    }
    
    // Add Client 1's information
    if (clientData.client1_gross_salary !== undefined) {
      context += `Client's gross salary is $${clientData.client1_gross_salary}. `;
    }
    if (clientData.client1_super_balance !== undefined) {
      context += `Client's super balance is $${clientData.client1_super_balance}. `;
    }
    if (clientData.client1_health !== undefined) {
      context += `Client's health status is ${clientData.client1_health}. `;
    }
    if (clientData.client1_work_status !== undefined) {
      context += `Client's work status is ${clientData.client1_work_status}. `;
    }
    if (clientData.total_lifestyle_assets !== undefined) {
      context += `Client's total lifestyle assets are $${clientData.total_lifestyle_assets}. `;
    }
    if (clientData.total_investment_assets !== undefined) {
      context += `Client's total investment assets are $${clientData.total_investment_assets}. `;
    }
    
    // Add Client 2's information
    if (clientData.client2_gross_salary !== undefined) {
      context += `Client 2's gross salary is $${clientData.client2_gross_salary}. `;
    }
    if (clientData.client2_super_balance !== undefined) {
      context += `Client 2's super balance is $${clientData.client2_super_balance}. `;
    }
    
    context += `\n\nIMPORTANT: You are a READ-ONLY assistant. You can analyze and provide advice based on client data, but you CANNOT modify or update client data. If asked to change values, politely explain that you can only provide analysis and recommendations, and that data changes must be made through the client data interface.\n\n`;
    context += `Question: ${message}`;
    
    console.log("Enhanced context:", context);
    return context;
  }
  return `You are a knowledgeable financial advisor assistant. Please provide helpful advice based on this question: ${message}`;
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
  
  // Only look for update actions if the message explicitly mentions updating or changing values
  const isUpdateRequest = lowercaseMessage.includes('update') || 
                         lowercaseMessage.includes('change') || 
                         lowercaseMessage.includes('set') || 
                         lowercaseMessage.includes('modify');

  if (isUpdateRequest) {
    if (lowercaseMessage.includes('super') || lowercaseMessage.includes('superannuation')) {
      action = 'update_super';
    } else if (lowercaseMessage.includes('salary') || lowercaseMessage.includes('income')) {
      action = 'update_salary';
    }
  }

  // Determine which client to update
  if (lowercaseMessage.includes('client 2')) {
    clientNumber = 2;
  } else if (lowercaseMessage.includes('client 1')) {
    clientNumber = 1;
  }

  // Extract the numeric value only if this is an update request
  const targetValue = isUpdateRequest ? extractNumberFromText(message) : null;
  
  console.log('Analyzed message:', { 
    action, 
    targetValue, 
    clientNumber,
    isUpdateRequest,
    message,
    lowercaseMessage 
  });

  return {
    action,
    targetValue,
    clientNumber
  };
}
