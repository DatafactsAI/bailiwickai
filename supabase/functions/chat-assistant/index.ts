
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';

console.log('Starting function initialization...');

const openAIApiKey = Deno.env.get('OPENAI_API_KEY')!;
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

console.log('Environment variables loaded:', {
  hasOpenAIKey: !!openAIApiKey,
  hasSupabaseUrl: !!supabaseUrl,
  hasSupabaseKey: !!supabaseServiceKey
});

const supabase = createClient(supabaseUrl, supabaseServiceKey);
console.log('Supabase client initialized');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  const requestId = crypto.randomUUID();
  console.log(`==== New Request ${requestId} Received ====`);
  console.log('Request URL:', req.url);
  console.log('Request method:', req.method);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log(`Starting chat-assistant function execution for request ${requestId}`);
    console.log('Request headers:', Object.fromEntries(req.headers.entries()));
    
    const body = await req.json();
    console.log('Request body:', body);
    
    const { message } = body;
    console.log('Extracted message:', message);

    if (!message) {
      console.error('No message provided in request');
      throw new Error('Message is required');
    }

    console.log(`[${requestId}] Calling OpenAI API...`);
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
    console.log(`[${requestId}] OpenAI Request payload:`, openAIPayload);
    
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(openAIPayload),
    });
    
    console.log(`[${requestId}] OpenAI API response status:`, openAIResponse.status);
    
    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error(`[${requestId}] OpenAI API error response:`, errorText);
      return new Response(
        JSON.stringify({ error: `OpenAI API error: ${openAIResponse.status} ${errorText}` }),
        { 
          status: openAIResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const data = await openAIResponse.json();
    console.log(`[${requestId}] OpenAI API response data:`, data);

    if (!data.choices?.[0]?.message?.content) {
      console.error(`[${requestId}] Invalid response structure from OpenAI:`, data);
      return new Response(
        JSON.stringify({ error: 'Invalid response from OpenAI' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const aiResponse = data.choices[0].message.content;
    console.log(`[${requestId}] AI response content:`, aiResponse);

    console.log(`[${requestId}] Storing response in Supabase...`);
    const { error: dbError } = await supabase
      .from('messages')
      .insert([
        {
          content: aiResponse,
          type: 'received',
          timestamp: new Date().toISOString(),
        }
      ]);

    if (dbError) {
      console.error(`[${requestId}] Supabase storage error:`, dbError);
      return new Response(
        JSON.stringify({ error: 'Failed to store response' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`[${requestId}] Successfully stored response in Supabase`);
    return new Response(
      JSON.stringify({ success: true, response: aiResponse }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in chat-assistant function:', error);
    console.error('Error stack trace:', error.stack);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      cause: error.cause
    });
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An unexpected error occurred',
        stack: error.stack,
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
