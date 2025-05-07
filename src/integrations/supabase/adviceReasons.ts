// Supabase integration for advice_reasons and client_selected_reasons tables
import { supabase } from './client';

export type AdviceReason = {
  id: string;
  reason_text: string;
  category: string;
  created_at?: string;
};

export type ClientSelectedReason = {
  id?: string;
  client_id: string;
  reason_id: string;
  statement?: string;
  created_at?: string;
};

// Fetch all available advice reasons
export async function fetchAdviceReasons(): Promise<{ reasons: AdviceReason[]; error?: string }> {
  try {
    const { data, error } = await (supabase as any)
      .from('advice_reasons')
      .select('*')
      .order('category', { ascending: true })
      .order('reason_text', { ascending: true });

    if (error) {
      console.error('Error fetching advice reasons:', error);
      return { reasons: [], error: error.message || 'Unknown error fetching advice reasons' };
    }

    return {
      reasons: data || [],
    };
  } catch (error: any) {
    console.error('Error fetching advice reasons:', error);
    return { reasons: [], error: error.message || 'Unknown error fetching advice reasons' };
  }
}

// Fetch selected reasons for a specific client
export async function fetchClientSelectedReasons(clientId: string): Promise<{ 
  selectedReasons: string[]; 
  reasonStatements: Record<string, string>;
  error?: string 
}> {
  try {
    const { data, error } = await (supabase as any)
      .from('client_selected_reasons')
      .select('reason_id, statement')
      .eq('client_id', clientId);

    if (error) {
      console.error('Error fetching client selected reasons:', error);
      return { 
        selectedReasons: [], 
        reasonStatements: {},
        error: error.message || 'Unknown error fetching client selected reasons' 
      };
    }

    // Create a map of reason_id to statement
    const reasonStatements: Record<string, string> = {};
    (data || []).forEach((item: any) => {
      if (item.statement) {
        reasonStatements[item.reason_id] = item.statement;
      }
    });

    return {
      selectedReasons: (data || []).map((item: any) => item.reason_id),
      reasonStatements
    };
  } catch (error: any) {
    console.error('Error fetching client selected reasons:', error);
    return { 
      selectedReasons: [], 
      reasonStatements: {},
      error: error.message || 'Unknown error fetching client selected reasons' 
    };
  }
}

// Update selected reasons for a client
export async function updateClientSelectedReasons(
  clientId: string, 
  selectedReasonIds: string[],
  reasonStatements: Record<string, string> = {}
): Promise<{ success: boolean; error?: string }> {
  try {
    // First delete all existing selections for this client
    const { error: deleteError } = await (supabase as any)
      .from('client_selected_reasons')
      .delete()
      .eq('client_id', clientId);
    
    if (deleteError) {
      console.error('Error deleting old client selected reasons:', deleteError);
      return { success: false, error: deleteError.message || 'Error deleting old client selected reasons' };
    }
    
    // Insert new selections if there are any
    if (selectedReasonIds.length > 0) {
      const selections = selectedReasonIds.map(reasonId => ({
        client_id: clientId,
        reason_id: reasonId,
        statement: reasonStatements[reasonId] || null
      }));
      
      const { error: insertError } = await (supabase as any)
        .from('client_selected_reasons')
        .insert(selections);
      
      if (insertError) {
        console.error('Error inserting client selected reasons:', insertError);
        return { success: false, error: insertError.message || 'Error inserting client selected reasons' };
      }
    }
    
    return { success: true };
  } catch (error: any) {
    console.error('Error updating client selected reasons:', error);
    return { success: false, error: error.message || 'Unknown error updating client selected reasons' };
  }
}
