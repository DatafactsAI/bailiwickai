
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';
import { 
  corsHeaders, 
  enhanceMessageWithContext, 
  verifyAssistant, 
  createThread,
  updateClientData,
  analyzeMessage
} from './utils.ts';

const openAIApiKey = Deno.env.get('Open_ai_key')!;
const assistantId = 'asst_jY5Xitw2hGUj6sOnPGjUEWUy';
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  const requestId = crypto.randomUUID();
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, clientData } = await req.json();
    console.log(`[${requestId}] Processing request:`, { message, clientData });
    
    // First, check if this is a data update request when client data is present
    if (clientData?.clientId) {
      console.log(`[${requestId}] Client data present, analyzing message`);
      const analysis = analyzeMessage(message);
      console.log(`[${requestId}] Message analysis result:`, analysis);
      
      if (analysis.action !== 'none' && analysis.targetValue !== null) {
        console.log(`[${requestId}] Update action detected:`, { action: analysis.action, value: analysis.targetValue });
        const updates: Record<string, number> = {};
        const clientPrefix = `client${analysis.clientNumber}_`;
        
        if (analysis.action === 'update_super') {
          updates[`${clientPrefix}super_balance`] = analysis.targetValue;
        } else if (analysis.action === 'update_salary') {
          updates[`${clientPrefix}gross_salary`] = analysis.targetValue;
        }
        
        console.log(`[${requestId}] Prepared updates:`, updates);
        
        if (Object.keys(updates).length > 0) {
          try {
            console.log(`[${requestId}] Attempting to update client data`);
            const updatedClient = await updateClientData(supabase, clientData.clientId, updates);
            console.log(`[${requestId}] Client data updated successfully:`, updatedClient);
            
            const successMessage = `I've updated the client's data. The new values are:\n${
              Object.entries(updates).map(([key, value]) => 
                `${key.replace(/_/g, ' ')}: $${value.toLocaleString()}`
              ).join('\n')
            }`;
            
            await supabase
              .from('messages')
              .insert([{
                content: successMessage,
                type: 'received',
                timestamp: new Date().toISOString(),
                metadata: {
                  ...clientData,
                  ...updates
                }
              }]);

            console.log(`[${requestId}] Success response prepared`);
            return new Response(
              JSON.stringify({ success: true, response: successMessage }), 
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          } catch (error) {
            console.error(`[${requestId}] Update error:`, error);
            throw error;
          }
        }
      }
    }

    // Before processing with OpenAI, get the latest client data for this conversation
    let enrichedClientData = clientData;
    if (clientData?.clientId) {
      try {
        console.log(`[${requestId}] Fetching latest client data for ID: ${clientData.clientId}`);
        const { data: latestClientData, error } = await supabase
          .from('clients_financial_data')
          .select('*')
          .eq('id', clientData.clientId)
          .single();
          
        if (error) {
          console.error(`[${requestId}] Error fetching client data:`, error);
        } else if (latestClientData) {
          console.log(`[${requestId}] Using latest client data for context enrichment`);
          // Combine the current metadata with the latest data from the database
          enrichedClientData = {
            ...clientData,
            client1_name: latestClientData.client1_name,
            client1_gross_salary: latestClientData.client1_gross_salary,
            client1_super_balance: latestClientData.client1_super_balance,
            client1_health: latestClientData.client1_health,
            client1_work_status: latestClientData.client1_work_status,
            total_lifestyle_assets: latestClientData.total_lifestyle_assets,
            total_investment_assets: latestClientData.total_investment_assets,
          };
          
          if (latestClientData.client2_name) {
            enrichedClientData.client2_gross_salary = latestClientData.client2_gross_salary;
            enrichedClientData.client2_super_balance = latestClientData.client2_super_balance;
          }
        }
      } catch (fetchError) {
        console.error(`[${requestId}] Error in client data fetch:`, fetchError);
      }
    }

    // Process message with appropriate context
    console.log(`[${requestId}] Processing chat message with enriched data:`, enrichedClientData);
    const enhancedMessage = enrichedClientData?.clientId 
      ? enhanceMessageWithContext(message, enrichedClientData)
      : message;

    const headers = {
      'Authorization': `Bearer ${openAIApiKey}`,
      'OpenAI-Beta': 'assistants=v2',
      'Content-Type': 'application/json'
    };

    await verifyAssistant(openAIApiKey, assistantId);
    const thread = await createThread(headers);

    const messageResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        role: 'user',
        content: enhancedMessage
      })
    });

    if (!messageResponse.ok) {
      throw new Error('Failed to add message to thread');
    }

    const run = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        assistant_id: assistantId
      })
    }).then(res => res.json());

    let runStatus = run.status;
    let attempts = 0;
    const maxAttempts = 60;
    
    while (runStatus !== 'completed' && runStatus !== 'failed' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const statusData = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs/${run.id}`, {
        headers,
      }).then(res => res.json());

      runStatus = statusData.status;
      attempts++;
    }

    if (runStatus !== 'completed') {
      throw new Error(`Assistant run did not complete in time: ${runStatus}`);
    }

    const messages = await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
      headers,
    }).then(res => res.json());

    const assistantMessage = messages.data.find((msg: any) => msg.role === 'assistant');
    
    if (!assistantMessage) {
      throw new Error('No assistant response found');
    }

    const aiResponse = assistantMessage.content[0].text.value;

    await supabase
      .from('messages')
      .insert([{
        content: aiResponse,
        type: 'received',
        timestamp: new Date().toISOString(),
        metadata: enrichedClientData || {}
      }]);

    console.log(`[${requestId}] Chat response prepared`);
    return new Response(
      JSON.stringify({ success: true, response: aiResponse }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error(`[${requestId}] Error:`, error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An unexpected error occurred',
        requestId,
        timestamp: new Date().toISOString()
      }), 
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
