// Supabase integration for advice_coverage_areas and client_selected_coverage_areas tables
import { supabase } from './client';

export type AdviceCoverageArea = {
  id: string;
  coverage_text: string;
  category: string;
  created_at?: string;
};

export type ClientSelectedCoverageArea = {
  id?: string;
  client_id: string;
  coverage_area_id: string;
  statement?: string;
  created_at?: string;
};

// Fetch all available advice coverage areas
export async function fetchAdviceCoverageAreas(): Promise<{ coverageAreas: AdviceCoverageArea[]; error?: string }> {
  try {
    const { data, error } = await (supabase as any)
      .from('advice_coverage_areas')
      .select('*')
      .order('category', { ascending: true })
      .order('coverage_text', { ascending: true });

    if (error) {
      console.error('Error fetching advice coverage areas:', error);
      return { coverageAreas: [], error: error.message || 'Unknown error fetching advice coverage areas' };
    }

    return {
      coverageAreas: data || [],
    };
  } catch (error: any) {
    console.error('Error fetching advice coverage areas:', error);
    return { coverageAreas: [], error: error.message || 'Unknown error fetching advice coverage areas' };
  }
}

// Fetch selected coverage areas for a specific client
export async function fetchClientSelectedCoverageAreas(clientId: string): Promise<{ 
  selectedCoverageAreaIds: string[]; 
  coverageAreaStatements: Record<string, string>;
  error?: string 
}> {
  try {
    const { data, error } = await (supabase as any)
      .from('client_selected_coverage_areas')
      .select('coverage_area_id, statement')
      .eq('client_id', clientId);

    if (error) {
      console.error('Error fetching client selected coverage areas:', error);
      return { 
        selectedCoverageAreaIds: [], 
        coverageAreaStatements: {},
        error: error.message || 'Unknown error fetching client selected coverage areas' 
      };
    }

    // Create a map of coverage_area_id to statement
    const coverageAreaStatements: Record<string, string> = {};
    (data || []).forEach((item: any) => {
      if (item.statement) {
        coverageAreaStatements[item.coverage_area_id] = item.statement;
      }
    });

    return {
      selectedCoverageAreaIds: (data || []).map((item: any) => item.coverage_area_id),
      coverageAreaStatements
    };
  } catch (error: any) {
    console.error('Error fetching client selected coverage areas:', error);
    return { 
      selectedCoverageAreaIds: [], 
      coverageAreaStatements: {},
      error: error.message || 'Unknown error fetching client selected coverage areas' 
    };
  }
}

// Update selected coverage areas for a client
export async function updateClientSelectedCoverageAreas(
  clientId: string, 
  selectedCoverageAreaIds: string[],
  coverageAreaStatements: Record<string, string> = {}
): Promise<{ success: boolean; error?: string }> {
  try {
    // First delete all existing selections for this client
    const { error: deleteError } = await (supabase as any)
      .from('client_selected_coverage_areas')
      .delete()
      .eq('client_id', clientId);
    
    if (deleteError) {
      console.error('Error deleting old client selected coverage areas:', deleteError);
      return { success: false, error: deleteError.message || 'Error deleting old client selected coverage areas' };
    }
    
    // Insert new selections if there are any
    if (selectedCoverageAreaIds.length > 0) {
      const selections = selectedCoverageAreaIds.map(coverageAreaId => ({
        client_id: clientId,
        coverage_area_id: coverageAreaId,
        statement: coverageAreaStatements[coverageAreaId] || null
      }));
      
      const { error: insertError } = await (supabase as any)
        .from('client_selected_coverage_areas')
        .insert(selections);
      
      if (insertError) {
        console.error('Error inserting client selected coverage areas:', insertError);
        return { success: false, error: insertError.message || 'Error inserting client selected coverage areas' };
      }
    }
    
    return { success: true };
  } catch (error: any) {
    console.error('Error updating client selected coverage areas:', error);
    return { success: false, error: error.message || 'Unknown error updating client selected coverage areas' };
  }
}
