
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY')!;
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function formatResponse(text: string): string {
  // Remove any markdown code blocks
  text = text.replace(/```[a-z]*\n([\s\S]*?)\n```/g, '$1');
  
  // Improve heading formatting
  text = text.replace(/###\s+([^\n]+)/g, '\n$1:\n');
  
  // Format bullet points consistently
  text = text.replace(/[•\-\*]\s+([^\n]+)/g, '\n• $1');
  
  // Add spacing around sections
  text = text.replace(/\n([A-Z][^:]+):/g, '\n\n$1:');
  
  // Clean up excessive new lines
  text = text.replace(/\n{3,}/g, '\n\n');
  
  // Remove any extra whitespace
  text = text.trim();
  
  return text;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('Starting chat-assistant function execution');
    
    const { message } = await req.json();

    if (!message) {
      throw new Error('Message is required');
    }

    console.log('Calling OpenAI API with message:', message);
    
    // Add timeout to the fetch request
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini-2024-07-18',
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
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!openAIResponse.ok) {
        const errorText = await openAIResponse.text();
        console.error('OpenAI API error response:', errorText);
        throw new Error(`OpenAI API error: ${openAIResponse.status} ${errorText}`);
      }

      const data = await openAIResponse.json();
      console.log('OpenAI API response:', data);

      if (!data.choices?.[0]?.message?.content) {
        console.error('Invalid response structure from OpenAI:', data);
        throw new Error('Invalid response from OpenAI');
      }

      const aiResponse = formatResponse(data.choices[0].message.content);
      console.log('Formatted AI response:', aiResponse);

      console.log('Storing response in Supabase');
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
        console.error('Supabase storage error:', dbError);
        throw dbError;
      }
      console.log('Successfully stored response in Supabase');

      return new Response(JSON.stringify({ success: true, response: aiResponse }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (error) {
      clearTimeout(timeout);
      throw error;
    }

  } catch (error) {
    console.error('Error in chat-assistant function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'An unexpected error occurred',
      stack: error.stack 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
