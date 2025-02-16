
import { supabase } from "@/integrations/supabase/client";
import { ClientMetadata } from "@/types/chat";

export async function storeMessage(content: string, type: 'sent' | 'received', metadata?: ClientMetadata) {
  const timestamp = new Date().toISOString();
  return await supabase
    .from('messages')
    .insert([{ content, type, timestamp, metadata }])
    .select()
    .single();
}

export async function fetchMessages() {
  return await supabase
    .from('messages')
    .select('*')
    .order('timestamp', { ascending: true });
}

export async function invokeChatAssistant(message: string, clientData?: ClientMetadata) {
  return await supabase.functions.invoke('chat-assistant', {
    body: { message, clientData }
  });
}
