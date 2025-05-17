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

    // Ensure we always have 8 recommendation slots
    const existingRecommendations = data || [];
    const recommendations: AdvisorRecommendation[] = [...existingRecommendations];
    
    // Fill up to 8 slots with empty recommendations
    while (recommendations.length < 8) {
      recommendations.push({
        client_id: clientId,
        recommendation_text: '',
        position: recommendations.length
      });
    }

    return {
      recommendations
    };
  } catch (error: any) {
    console.error('Error fetching advisor recommendations:', error);
    return { 
      recommendations: [],
      error: error.message || 'Unknown error fetching advisor recommendations' 
    };
  }
}

// Save recommendations for a client
export async function saveAdvisorRecommendations(
  recommendations: AdvisorRecommendation[]
): Promise<{ success: boolean; error?: string }> {
  try {
    // Ensure we have a client ID even if all recommendations are empty
    const clientId = recommendations[0]?.client_id;
    
    if (!clientId) {
      console.error('No valid client ID found in recommendations');
      return { success: false, error: 'No valid client ID found' };
    }
    
    // Filter out empty recommendations
    const validRecommendations = recommendations.filter(
      rec => rec.recommendation_text.trim() !== ''
    );

    // First delete all existing recommendations for this client
    const { error: deleteError } = await (supabase as any)
      .from('advisor_recommendations')
      .delete()
      .eq('client_id', clientId);
    
    if (deleteError) {
      console.error('Error deleting old advisor recommendations:', deleteError);
      return { success: false, error: deleteError.message || 'Error deleting old advisor recommendations' };
    }

    // Only insert valid recommendations
    if (validRecommendations.length > 0) {
      // Add positions and timestamps to each recommendation
      const recommendationsWithPositions = validRecommendations.map((rec, index) => ({
        ...rec,
        position: index,
        updated_at: new Date().toISOString()
      }));

      const { error: insertError } = await (supabase as any)
        .from('advisor_recommendations')
        .insert(recommendationsWithPositions);

      if (insertError) {
        console.error('Error inserting advisor recommendations:', insertError);
        return { success: false, error: insertError.message || 'Error inserting advisor recommendations' };
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error saving advisor recommendations:', error);
    return { success: false, error: error.message || 'Unknown error saving advisor recommendations' };
  }
}
