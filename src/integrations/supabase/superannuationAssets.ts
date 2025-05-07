// Supabase integration for superannuation_assets table
import { supabase } from './client';

export type SuperannuationAsset = {
  id?: string;
  client_id: string;
  name: string;
  value: number;
  owner: 'Client 1' | 'Client 2' | 'Joint';
  fund_type: string;
  created_at?: string;
};

export async function fetchSuperannuationAssets(clientId: string): Promise<{ assets: SuperannuationAsset[]; error?: string }> {
  try {
    const { data, error } = await (supabase as any)
      .from('superannuation_assets')
      .select('*')
      .eq('client_id', clientId);

    if (error) {
      console.error('Error fetching superannuation assets:', error);
      return { assets: [], error: error.message || 'Unknown error fetching superannuation assets' };
    }

    return {
      assets: (data || []).map((item: any) => ({
        id: item.id,
        client_id: item.client_id,
        name: item.name,
        value: typeof item.value === 'string' ? parseFloat(item.value) : item.value,
        owner: item.owner,
        fund_type: item.fund_type,
        created_at: item.created_at
      })),
    };
  } catch (error: any) {
    console.error('Error fetching superannuation assets:', error);
    return { assets: [], error: error.message || 'Unknown error fetching superannuation assets' };
  }
}

export async function upsertSuperannuationAssets(clientId: string, assets: SuperannuationAsset[]): Promise<{ success: boolean; error?: string }> {
  try {
    // Delete existing assets
    const { error: deleteError } = await (supabase as any)
      .from('superannuation_assets')
      .delete()
      .eq('client_id', clientId);
    
    if (deleteError) {
      console.error('Error deleting old superannuation assets:', deleteError);
      return { success: false, error: deleteError.message || 'Error deleting old superannuation assets' };
    }
    
    // Insert new assets if there are any
    if (assets.length > 0) {
      const validAssets = assets
        .filter(a => a.name && a.value)
        .map(a => ({
          client_id: clientId,
          name: a.name,
          value: a.value,
          owner: a.owner,
          fund_type: a.fund_type
        }));
      
      if (validAssets.length > 0) {
        const { error: insertError } = await (supabase as any)
          .from('superannuation_assets')
          .insert(validAssets);
        
        if (insertError) {
          console.error('Error inserting superannuation assets:', insertError);
          return { success: false, error: insertError.message || 'Error inserting superannuation assets' };
        }
      }
    }
    
    return { success: true };
  } catch (error: any) {
    console.error('Error upserting superannuation assets:', error);
    return { success: false, error: error.message || 'Unknown error upserting superannuation assets' };
  }
}

export async function updateTotalSuperannuationAssets(clientId: string, total: number): Promise<void> {
  try {
    const { error } = await (supabase as any)
      .from('clients_financial_data')
      .update({ total_superannuation_assets: total })
      .eq('id', clientId);
      
    if (error) throw error;
  } catch (error: any) {
    console.error('Error updating total superannuation assets:', error);
    throw error;
  }
}
