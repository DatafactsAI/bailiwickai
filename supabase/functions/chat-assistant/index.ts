
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
    
    // First, check if this is a data update request
    if (clientData?.clientId) {
      const analysis = analyzeMessage(message);
      
      if (analysis.action !== 'none' && analysis.targetValue !== null) {
        const updates: Record<string, number> = {};
        const clientPrefix = `client${analysis.clientNumber}_`;
        
        if (analysis.action === 'update_super') {
          updates[`${clientPrefix}super_balance`] = analysis.targetValue;
        } else if (analysis.action === 'update_salary') {
          updates[`${clientPrefix}gross_salary`] = analysis.targetValue;
        }
        
        if (Object.keys(updates).length > 0) {
          try {
            const updatedClient = await updateClientData(supabase, clientData.clientId, updates);
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

            return new Response(
              JSON.stringify({ success: true, response: successMessage }), 
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          } catch (error) {
            console.error(`[${requestId}] Update error:`, error);
            throw new Error('Failed to update client data');
          }
        }
      }
    }

    // If not a data update request or update not needed, proceed with normal chat
    const enhancedMessage = enhanceMessageWithContext(message, clientData);

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
        metadata: clientData
      }]);

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
