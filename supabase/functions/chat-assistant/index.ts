
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';

console.log('Starting function initialization...');

const openAIApiKey = Deno.env.get('OPENAI_API_KEY')!;
const assistantId = 'asst_c5HNQW2CRvNnX95BzkRZFqCZ';
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
    const body = await req.json().catch(error => {
      console.error(`[${requestId}] Failed to parse request body:`, error);
      throw new Error('Invalid JSON in request body');
    });
    
    console.log(`[${requestId}] Request body:`, body);
    const { message } = body;

    if (!message) {
      console.error(`[${requestId}] No message provided in request`);
      throw new Error('Message is required');
    }

    console.log(`[${requestId}] Creating thread with OpenAI Assistant...`);
    
    // Create a thread
    const threadResponse = await fetch('https://api.openai.com/v1/threads', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v1'
      },
      body: JSON.stringify({})
    });

    if (!threadResponse.ok) {
      throw new Error(`Failed to create thread: ${await threadResponse.text()}`);
    }

    const thread = await threadResponse.json();
    console.log(`[${requestId}] Thread created:`, thread.id);

    // Add message to thread
    const messageResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v1'
      },
      body: JSON.stringify({
        role: 'user',
        content: message
      })
    });

    if (!messageResponse.ok) {
      throw new Error(`Failed to add message: ${await messageResponse.text()}`);
    }

    console.log(`[${requestId}] Message added to thread`);

    // Run the assistant
    const runResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v1'
      },
      body: JSON.stringify({
        assistant_id: assistantId
      })
    });

    if (!runResponse.ok) {
      throw new Error(`Failed to run assistant: ${await runResponse.text()}`);
    }

    const run = await runResponse.json();
    console.log(`[${requestId}] Assistant run started:`, run.id);

    // Poll for completion
    let runStatus = run.status;
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds timeout
    
    while (runStatus !== 'completed' && runStatus !== 'failed' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const statusResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs/${run.id}`, {
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'OpenAI-Beta': 'assistants=v1'
        }
      });

      if (!statusResponse.ok) {
        throw new Error(`Failed to check run status: ${await statusResponse.text()}`);
      }

      const statusData = await statusResponse.json();
      runStatus = statusData.status;
      attempts++;
      
      console.log(`[${requestId}] Run status check ${attempts}:`, runStatus);
    }

    if (runStatus !== 'completed') {
      throw new Error(`Assistant run did not complete in time: ${runStatus}`);
    }

    // Get messages
    const messagesResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'OpenAI-Beta': 'assistants=v1'
      }
    });

    if (!messagesResponse.ok) {
      throw new Error(`Failed to get messages: ${await messagesResponse.text()}`);
    }

    const messages = await messagesResponse.json();
    const assistantMessage = messages.data.find((msg: any) => msg.role === 'assistant');
    
    if (!assistantMessage) {
      throw new Error('No assistant response found');
    }

    const aiResponse = assistantMessage.content[0].text.value;
    console.log(`[${requestId}] Assistant response:`, aiResponse);

    // Store in Supabase with retry logic
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
    console.error(`[${requestId}] Error stack trace:`, error.stack);
    
    const endTime = performance.now();
    console.log(`[${requestId}] Request failed in ${endTime - startTime}ms`);

    return new Response(
      JSON.stringify({ 
        error: error.message || 'An unexpected error occurred',
        requestId,
        timestamp: new Date().toISOString(),
        details: {
          name: error.name,
          cause: error.cause
        }
      }), 
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
