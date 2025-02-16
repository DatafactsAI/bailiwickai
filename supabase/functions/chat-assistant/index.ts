
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';

console.log('Starting function initialization...');

const openAIApiKey = Deno.env.get('Open_ai_key')!;
const assistantId = 'asst_jY5Xitw2hGUj6sOnPGjUEWUy';
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

console.log('Environment check:', {
  hasOpenAIKey: !!openAIApiKey,
  hasSupabaseUrl: !!supabaseUrl,
  hasSupabaseKey: !!supabaseServiceKey,
  assistantId,
  timestamp: new Date().toISOString()
});

let supabase: ReturnType<typeof createClient>;
try {
  supabase = createClient(supabaseUrl, supabaseServiceKey);
  console.log('Supabase client initialized successfully');
} catch (error) {
  console.error('Failed to initialize Supabase client:', error);
  throw error;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  const requestId = crypto.randomUUID();
  const startTime = performance.now();
  
  console.log(`[${requestId}] New request received at ${new Date().toISOString()}`);
  console.log(`[${requestId}] Request URL:`, req.url);
  console.log(`[${requestId}] Request method:`, req.method);

  if (req.method === 'OPTIONS') {
    console.log(`[${requestId}] Handling OPTIONS request`);
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, clientData } = await req.json();
    console.log(`[${requestId}] Received client data:`, clientData);

    let enhancedMessage = message;
    if (clientData?.client1_gross_salary !== undefined && clientData?.client1_super_balance !== undefined) {
      enhancedMessage = `Context: Client 1 has a gross salary of $${clientData.client1_gross_salary} and a super balance of $${clientData.client1_super_balance}. 
      
Question: ${message}`;
    }

    // First verify that the assistant exists
    console.log(`[${requestId}] Verifying assistant...`);
    const assistantResponse = await fetch(`https://api.openai.com/v1/assistants/${assistantId}`, {
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'OpenAI-Beta': 'assistants=v2',
        'Content-Type': 'application/json'
      }
    });

    if (!assistantResponse.ok) {
      const errorText = await assistantResponse.text();
      console.error(`[${requestId}] Assistant verification failed:`, errorText);
      throw new Error(`Assistant verification failed: ${errorText}`);
    }

    const assistant = await assistantResponse.json();
    console.log(`[${requestId}] Assistant verified:`, assistant.id);

    const headers = {
      'Authorization': `Bearer ${openAIApiKey}`,
      'OpenAI-Beta': 'assistants=v2',
      'Content-Type': 'application/json'
    };

    const threadResponse = await fetch('https://api.openai.com/v1/threads', {
      method: 'POST',
      headers,
      body: JSON.stringify({})
    });

    if (!threadResponse.ok) {
      const errorText = await threadResponse.text();
      console.error(`[${requestId}] Thread creation error:`, errorText);
      throw new Error(`Failed to create thread: ${errorText}`);
    }

    const thread = await threadResponse.json();
    console.log(`[${requestId}] Thread created:`, thread.id);

    const messageResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        role: 'user',
        content: enhancedMessage
      })
    });

    if (!messageResponse.ok) {
      const errorText = await messageResponse.text();
      console.error(`[${requestId}] Message creation error:`, errorText);
      throw new Error(`Failed to add message: ${errorText}`);
    }

    console.log(`[${requestId}] Message added to thread`);

    const runResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        assistant_id: assistantId
      })
    });

    if (!runResponse.ok) {
      const errorText = await runResponse.text();
      console.error(`[${requestId}] Run creation error:`, errorText);
      throw new Error(`Failed to run assistant: ${errorText}`);
    }

    const run = await runResponse.json();
    console.log(`[${requestId}] Assistant run started:`, run.id);

    let runStatus = run.status;
    let attempts = 0;
    const maxAttempts = 60; // Increased timeout to 60 seconds
    
    while (runStatus !== 'completed' && runStatus !== 'failed' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const statusResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs/${run.id}`, {
        headers,
      });

      if (!statusResponse.ok) {
        const errorText = await statusResponse.text();
        console.error(`[${requestId}] Status check error:`, errorText);
        throw new Error(`Failed to check run status: ${errorText}`);
      }

      const statusData = await statusResponse.json();
      runStatus = statusData.status;
      attempts++;
      
      console.log(`[${requestId}] Run status check ${attempts}:`, runStatus);
    }

    if (runStatus !== 'completed') {
      throw new Error(`Assistant run did not complete in time: ${runStatus}`);
    }

    const messagesResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
      headers,
    });

    if (!messagesResponse.ok) {
      const errorText = await messagesResponse.text();
      console.error(`[${requestId}] Messages retrieval error:`, errorText);
      throw new Error(`Failed to get messages: ${errorText}`);
    }

    const messages = await messagesResponse.json();
    const assistantMessage = messages.data.find((msg: any) => msg.role === 'assistant');
    
    if (!assistantMessage) {
      throw new Error('No assistant response found');
    }

    const aiResponse = assistantMessage.content[0].text.value;
    console.log(`[${requestId}] Assistant response:`, aiResponse);

    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      const { error: dbError } = await supabase
        .from('messages')
        .insert([
          {
            content: aiResponse,
            type: 'received',
            timestamp: new Date().toISOString(),
          }
        ]);

      if (!dbError) {
        console.log(`[${requestId}] Successfully stored response in Supabase`);
        break;
      }

      console.error(`[${requestId}] Supabase storage error (attempt ${retryCount + 1}):`, dbError);
      retryCount++;
      
      if (retryCount === maxRetries) {
        throw new Error('Failed to store response after multiple attempts');
      }
      
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
    }

    const endTime = performance.now();
    console.log(`[${requestId}] Request completed in ${endTime - startTime}ms`);

    return new Response(
      JSON.stringify({ success: true, response: aiResponse }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error(`[${requestId}] Error in chat-assistant function:`, error);
    
    const endTime = performance.now();
    console.log(`[${requestId}] Request failed in ${endTime - startTime}ms`);

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
