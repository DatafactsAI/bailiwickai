// Supabase integration for advisor_recommendations table
import { supabase } from './client';

export type AdvisorRecommendation = {
  id?: string;
  client_id: string;
  recommendation_text: string;
  position: number;
  created_at?: string;
  updated_at?: string;
};

// Fetch all recommendations for a specific client
export async function fetchAdvisorRecommendations(clientId: string): Promise<{ 
  recommendations: AdvisorRecommendation[];
  error?: string 
}> {
  try {
    const { data, error } = await (supabase as any)
      .from('advisor_recommendations')
      .select('*')
      .eq('client_id', clientId)
      .order('position', { ascending: true });

    if (error) {
      console.error('Error fetching advisor recommendations:', error);
      return { 
        recommendations: [],
        error: error.message || 'Unknown error fetching advisor recommendations' 
      };
    }

    return {
      recommendations: data || [],
    };
  } catch (error: any) {
    console.error('Error fetching advisor recommendations:', error);
    return { 
      recommendations: [],
      error: error.message || 'Unknown error fetching advisor recommendations' 
    };
  }
}

// Update recommendations for a client
export async function updateAdvisorRecommendations(
  clientId: string, 
  recommendations: { recommendation_text: string }[]
): Promise<{ success: boolean; error?: string }> {
  try {
    // First delete all existing recommendations for this client
    const { error: deleteError } = await (supabase as any)
      .from('advisor_recommendations')
      .delete()
      .eq('client_id', clientId);
    
    if (deleteError) {
      console.error('Error deleting old advisor recommendations:', deleteError);
      return { success: false, error: deleteError.message || 'Error deleting old advisor recommendations' };
    }
    
    // Insert new recommendations if there are any
    if (recommendations.length > 0) {
      const recommendationsToInsert = recommendations
        .filter(rec => rec.recommendation_text.trim()) // Only insert non-empty recommendations
        .map((rec, index) => ({
          client_id: clientId,
          recommendation_text: rec.recommendation_text.trim(),
          position: index,
          updated_at: new Date().toISOString()
        }));
      
      if (recommendationsToInsert.length === 0) {
        return { success: true }; // No recommendations to insert
      }
      
      const { error: insertError } = await (supabase as any)
        .from('advisor_recommendations')
        .insert(recommendationsToInsert);
      
      if (insertError) {
        console.error('Error inserting advisor recommendations:', insertError);
        return { success: false, error: insertError.message || 'Error inserting advisor recommendations' };
      }
    }
    
    return { success: true };
  } catch (error: any) {
    console.error('Error updating advisor recommendations:', error);
    return { success: false, error: error.message || 'Unknown error updating advisor recommendations' };
  }
}
