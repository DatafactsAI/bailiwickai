// Supabase integration for lifestyle_assets table
import { supabase } from './client';

export type LifestyleAsset = {
  id?: string;
  client_id: string;
  name: string;
  value: number;
  owner: 'Client 1' | 'Client 2' | 'Joint';
  created_at?: string;
};

export async function fetchLifestyleAssets(clientId: string): Promise<{ assets: LifestyleAsset[]; error?: string }> {
  try {
    const { data, error } = await (supabase as any)
      .from('lifestyle_assets')
      .select('*')
      .eq('client_id', clientId);

    if (error) {
      console.error('Error fetching lifestyle assets:', error);
      return { assets: [], error: error.message || 'Unknown error fetching lifestyle assets' };
    }

    return {
      assets: (data || []).map((item: any) => ({
        id: item.id,
        client_id: item.client_id,
        name: item.name,
        value: typeof item.value === 'string' ? parseFloat(item.value) : item.value,
        owner: item.owner,
        created_at: item.created_at
      })),
    };
  } catch (error: any) {
    console.error('Error fetching lifestyle assets:', error);
    return { assets: [], error: error.message || 'Unknown error fetching lifestyle assets' };
  }
}

export async function upsertLifestyleAssets(clientId: string, assets: LifestyleAsset[]): Promise<{ success: boolean; error?: string }> {
  try {
    // Delete existing assets
    const { error: deleteError } = await (supabase as any)
      .from('lifestyle_assets')
      .delete()
      .eq('client_id', clientId);
    if (deleteError) {
      console.error('Error deleting old lifestyle assets:', deleteError);
      return { success: false, error: deleteError.message || 'Error deleting old lifestyle assets' };
    }
    // Insert new assets if there are any
    if (assets.length > 0) {
      const validAssets = assets
        .filter(a => a.name && a.value)
        .map(a => ({
          client_id: clientId,
          name: a.name,
          value: a.value,
          owner: a.owner
        }));
      if (validAssets.length > 0) {
        const { error: insertError } = await (supabase as any)
          .from('lifestyle_assets')
          .insert(validAssets);
        if (insertError) {
          console.error('Error inserting lifestyle assets:', insertError);
          return { success: false, error: insertError.message || 'Error inserting lifestyle assets' };
        }
      }
    }
    return { success: true };
  } catch (error: any) {
    console.error('Error upserting lifestyle assets:', error);
    return { success: false, error: error.message || 'Unknown error upserting lifestyle assets' };
  }
}

export async function updateTotalLifestyleAssets(clientId: string, total: number): Promise<void> {
  try {
    const { error } = await supabase
      .from('clients_financial_data')
      .update({ total_lifestyle_assets: total })
      .eq('id', clientId);
      
    if (error) throw error;
  } catch (error: any) {
    console.error('Error updating total lifestyle assets:', error);
    throw error;
  }
}
