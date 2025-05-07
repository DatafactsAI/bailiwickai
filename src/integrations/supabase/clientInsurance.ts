// Supabase integration for client_insurance table
import { supabase } from './client';

export type ClientInsurance = {
  id?: string;
  client_id: string;
  name: string;
  value: number;
  owner: 'Client 1' | 'Client 2' | 'Joint';
  insurance_type: string;
  created_at?: string;
};

export async function fetchClientInsurance(clientId: string): Promise<{ insurance: ClientInsurance[]; error?: string }> {
  try {
    const { data, error } = await (supabase as any)
      .from('client_insurance')
      .select('*')
      .eq('client_id', clientId);

    if (error) {
      console.error('Error fetching client insurance:', error);
      return { insurance: [], error: error.message || 'Unknown error fetching client insurance' };
    }

    return {
      insurance: (data || []).map((item: any) => ({
        id: item.id,
        client_id: item.client_id,
        name: item.name,
        value: typeof item.value === 'string' ? parseFloat(item.value) : item.value,
        owner: item.owner,
        insurance_type: item.insurance_type,
        created_at: item.created_at
      })),
    };
  } catch (error: any) {
    console.error('Error fetching client insurance:', error);
    return { insurance: [], error: error.message || 'Unknown error fetching client insurance' };
  }
}

export async function upsertClientInsurance(clientId: string, insurance: ClientInsurance[]): Promise<{ success: boolean; error?: string }> {
  try {
    // Delete existing insurance
    const { error: deleteError } = await (supabase as any)
      .from('client_insurance')
      .delete()
      .eq('client_id', clientId);
    
    if (deleteError) {
      console.error('Error deleting old client insurance:', deleteError);
      return { success: false, error: deleteError.message || 'Error deleting old client insurance' };
    }
    
    // Insert new insurance if there are any
    if (insurance.length > 0) {
      const validInsurance = insurance
        .filter(ins => ins.name && ins.value)
        .map(ins => ({
          client_id: clientId,
          name: ins.name,
          value: ins.value,
          owner: ins.owner,
          insurance_type: ins.insurance_type
        }));
      
      if (validInsurance.length > 0) {
        const { error: insertError } = await (supabase as any)
          .from('client_insurance')
          .insert(validInsurance);
        
        if (insertError) {
          console.error('Error inserting client insurance:', insertError);
          return { success: false, error: insertError.message || 'Error inserting client insurance' };
        }
      }
    }
    
    return { success: true };
  } catch (error: any) {
    console.error('Error upserting client insurance:', error);
    return { success: false, error: error.message || 'Unknown error upserting client insurance' };
  }
}

export async function updateTotalClientInsurance(clientId: string, total: number): Promise<void> {
  try {
    const { error } = await (supabase as any)
      .from('clients_financial_data')
      .update({ total_client_insurance: total })
      .eq('id', clientId);
      
    if (error) throw error;
  } catch (error: any) {
    console.error('Error updating total client insurance:', error);
    throw error;
  }
}
