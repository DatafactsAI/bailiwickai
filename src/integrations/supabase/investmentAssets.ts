// Supabase integration for investment_assets table
import { supabase } from './client';

export type InvestmentAsset = {
  id?: string;
  client_id: string;
  name: string;
  value: number;
  owner: 'Client 1' | 'Client 2' | 'Joint';
  asset_type: string;
  created_at?: string;
};

export async function fetchInvestmentAssets(clientId: string): Promise<{ assets: InvestmentAsset[]; error?: string }> {
  try {
    const { data, error } = await (supabase as any)
      .from('investment_assets')
      .select('*')
      .eq('client_id', clientId);

    if (error) {
      console.error('Error fetching investment assets:', error);
      return { assets: [], error: error.message || 'Unknown error fetching investment assets' };
    }

    return {
      assets: (data || []).map((item: any) => ({
        id: item.id,
        client_id: item.client_id,
        name: item.name,
        value: typeof item.value === 'string' ? parseFloat(item.value) : item.value,
        owner: item.owner,
        asset_type: item.asset_type,
        created_at: item.created_at
      })),
    };
  } catch (error: any) {
    console.error('Error fetching investment assets:', error);
    return { assets: [], error: error.message || 'Unknown error fetching investment assets' };
  }
}

export async function upsertInvestmentAssets(clientId: string, assets: InvestmentAsset[]): Promise<{ success: boolean; error?: string }> {
  try {
    // Delete existing assets
    const { error: deleteError } = await (supabase as any)
      .from('investment_assets')
      .delete()
      .eq('client_id', clientId);
    
    if (deleteError) {
      console.error('Error deleting old investment assets:', deleteError);
      return { success: false, error: deleteError.message || 'Error deleting old investment assets' };
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
          asset_type: a.asset_type
        }));
      
      if (validAssets.length > 0) {
        const { error: insertError } = await (supabase as any)
          .from('investment_assets')
          .insert(validAssets);
        
        if (insertError) {
          console.error('Error inserting investment assets:', insertError);
          return { success: false, error: insertError.message || 'Error inserting investment assets' };
        }
      }
    }
    
    return { success: true };
  } catch (error: any) {
    console.error('Error upserting investment assets:', error);
    return { success: false, error: error.message || 'Unknown error upserting investment assets' };
  }
}

export async function updateTotalInvestmentAssets(clientId: string, total: number): Promise<void> {
  try {
    const { error } = await (supabase as any)
      .from('clients_financial_data')
      .update({ total_investment_assets: total })
      .eq('id', clientId);
      
    if (error) throw error;
  } catch (error: any) {
    console.error('Error updating total investment assets:', error);
    throw error;
  }
}
