// Supabase integration for client_loans table
import { supabase } from './client';

export type ClientLoan = {
  id?: string;
  client_id: string;
  name: string;
  value: number;
  owner: 'Client 1' | 'Client 2' | 'Joint';
  loan_type: string;
  created_at?: string;
};

export async function fetchClientLoans(clientId: string): Promise<{ loans: ClientLoan[]; error?: string }> {
  try {
    const { data, error } = await (supabase as any)
      .from('client_loans')
      .select('*')
      .eq('client_id', clientId);

    if (error) {
      console.error('Error fetching client loans:', error);
      return { loans: [], error: error.message || 'Unknown error fetching client loans' };
    }

    return {
      loans: (data || []).map((item: any) => ({
        id: item.id,
        client_id: item.client_id,
        name: item.name,
        value: typeof item.value === 'string' ? parseFloat(item.value) : item.value,
        owner: item.owner,
        loan_type: item.loan_type,
        created_at: item.created_at
      })),
    };
  } catch (error: any) {
    console.error('Error fetching client loans:', error);
    return { loans: [], error: error.message || 'Unknown error fetching client loans' };
  }
}

export async function upsertClientLoans(clientId: string, loans: ClientLoan[]): Promise<{ success: boolean; error?: string }> {
  try {
    // Delete existing loans
    const { error: deleteError } = await (supabase as any)
      .from('client_loans')
      .delete()
      .eq('client_id', clientId);
    
    if (deleteError) {
      console.error('Error deleting old client loans:', deleteError);
      return { success: false, error: deleteError.message || 'Error deleting old client loans' };
    }
    
    // Insert new loans if there are any
    if (loans.length > 0) {
      const validLoans = loans
        .filter(loan => loan.name && loan.value)
        .map(loan => ({
          client_id: clientId,
          name: loan.name,
          value: loan.value,
          owner: loan.owner,
          loan_type: loan.loan_type
        }));
      
      if (validLoans.length > 0) {
        const { error: insertError } = await (supabase as any)
          .from('client_loans')
          .insert(validLoans);
        
        if (insertError) {
          console.error('Error inserting client loans:', insertError);
          return { success: false, error: insertError.message || 'Error inserting client loans' };
        }
      }
    }
    
    return { success: true };
  } catch (error: any) {
    console.error('Error upserting client loans:', error);
    return { success: false, error: error.message || 'Unknown error upserting client loans' };
  }
}

export async function updateTotalClientLoans(clientId: string, total: number): Promise<void> {
  try {
    const { error } = await (supabase as any)
      .from('clients_financial_data')
      .update({ total_client_loans: total })
      .eq('id', clientId);
      
    if (error) throw error;
  } catch (error: any) {
    console.error('Error updating total client loans:', error);
    throw error;
  }
}
