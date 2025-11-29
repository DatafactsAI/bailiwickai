
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';
import { 
  corsHeaders, 
  enhanceMessageWithContext, 
  verifyAssistant, 
  createThread
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
    
    // NOTE: Chat assistant is read-only for MVP - cannot modify client data
    // All update logic has been removed to enforce read-only behavior

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

    // Search knowledge base if query is relevant
    let kbContext = '';
    try {
      console.log(`[${requestId}] Searching knowledge base for query: ${message}`);
      const kbSearchResponse = await fetch('http://localhost:8000/knowledge-base/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: message, limit: 5 })
      });
      
      if (kbSearchResponse.ok) {
        const kbData = await kbSearchResponse.json();
        if (kbData.results && kbData.results.length > 0) {
          console.log(`[${requestId}] Found ${kbData.results.length} relevant KB chunks`);
          kbContext = '\n\nRelevant Knowledge Base Content:\n' + 
            kbData.results.map((r: any, idx: number) => 
              `[${idx + 1}] ${r.text.substring(0, 500)}${r.text.length > 500 ? '...' : ''}`
            ).join('\n\n');
        }
      }
    } catch (kbError) {
      console.error(`[${requestId}] KB search failed:`, kbError);
      // Continue without KB context if search fails
    }

    // Process message with appropriate context
    console.log(`[${requestId}] Processing chat message with enriched data:`, enrichedClientData);
    const enhancedMessage = enrichedClientData?.clientId 
      ? enhanceMessageWithContext(message, enrichedClientData) + kbContext
      : message + kbContext;

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
