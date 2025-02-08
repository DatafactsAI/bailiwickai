
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';

console.log('Starting function initialization...');

const openAIApiKey = Deno.env.get('OPENAI_API_KEY')!;
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

console.log('Environment check:', {
  hasOpenAIKey: !!openAIApiKey,
  hasSupabaseUrl: !!supabaseUrl,
  hasSupabaseKey: !!supabaseServiceKey,
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
  console.log(`[${requestId}] Request headers:`, Object.fromEntries(req.headers.entries()));

  // Handle CORS preflight requests
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

    // OpenAI API call with timeout and error handling
    console.log(`[${requestId}] Preparing OpenAI API call...`);
    const openAIPayload = {
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are a helpful assistant. Format your responses clearly and professionally:
          - Use proper spacing between sections
          - Start each major section with a clear heading
          - Use bullet points (•) for lists
          - Keep paragraphs short and focused
          - Add a brief introduction before diving into details
          - Use clear language and avoid jargon
          - Separate different topics with line breaks`
        },
        { role: 'user', content: message }
      ],
      temperature: 0.7,
      max_tokens: 500
    };

    console.log(`[${requestId}] OpenAI request payload:`, openAIPayload);
    
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
      console.error(`[${requestId}] OpenAI API call timed out after 10s`);
    }, 10000);

    try {
      const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(openAIPayload),
        signal: controller.signal,
      });
      
      clearTimeout(timeout);
      
      console.log(`[${requestId}] OpenAI API response status:`, openAIResponse.status);
      console.log(`[${requestId}] OpenAI API response headers:`, Object.fromEntries(openAIResponse.headers.entries()));

      if (!openAIResponse.ok) {
        const errorText = await openAIResponse.text();
        console.error(`[${requestId}] OpenAI API error:`, {
          status: openAIResponse.status,
          statusText: openAIResponse.statusText,
          error: errorText
        });
        throw new Error(`OpenAI API error: ${openAIResponse.status} ${errorText}`);
      }

      const data = await openAIResponse.json();
      console.log(`[${requestId}] OpenAI API response data:`, data);

      if (!data.choices?.[0]?.message?.content) {
        console.error(`[${requestId}] Invalid response structure from OpenAI:`, data);
        throw new Error('Invalid response from OpenAI');
      }

      const aiResponse = data.choices[0].message.content;
      console.log(`[${requestId}] AI response content:`, aiResponse);

      // Store in Supabase with retry logic
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        console.log(`[${requestId}] Attempting to store response in Supabase (attempt ${retryCount + 1}/${maxRetries})`);
        
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
        
        // Wait before retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
      }

      const endTime = performance.now();
      console.log(`[${requestId}] Request completed in ${endTime - startTime}ms`);

      return new Response(
        JSON.stringify({ success: true, response: aiResponse }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (error) {
      clearTimeout(timeout);
      throw error;
    }

  } catch (error) {
    console.error(`[${requestId}] Error in chat-assistant function:`, error);
    console.error(`[${requestId}] Error stack trace:`, error.stack);
    console.error(`[${requestId}] Error details:`, {
      name: error.name,
      message: error.message,
      cause: error.cause
    });
    
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
