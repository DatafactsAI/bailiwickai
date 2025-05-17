import { supabase } from './client';
import { v4 as uuidv4 } from 'uuid';

export interface ProductRecommendation {
  id?: string;
  client_id: string;
  product_name: string;
  amount: number;
  client_allocation: 'Client 1' | 'Client 2' | 'Joint';
  created_at?: string;
  updated_at?: string;
}

export const fetchProductRecommendations = async (clientId: string) => {
  try {
    const { data, error } = await (supabase as any)
      .from('product_recommendations')
      .select('*')
      .eq('client_id', clientId)
      .order('id', { ascending: true });

    if (error) {
      console.error('Error fetching product recommendations:', error);
      return { recommendations: [], error: error.message };
    }

    // Ensure we always have 8 recommendation slots
    const existingRecommendations = data || [];
    const recommendations: ProductRecommendation[] = [...existingRecommendations];
    
    // Fill up to 8 slots with empty recommendations
    while (recommendations.length < 8) {
      recommendations.push({
        client_id: clientId,
        product_name: '',
        amount: 0,
        client_allocation: 'Client 1'
      });
    }

    return { recommendations };
  } catch (error) {
    console.error('Exception fetching product recommendations:', error);
    return { recommendations: [] };
  }
};

export const saveProductRecommendations = async (recommendations: ProductRecommendation[]) => {
  try {
    if (!recommendations || recommendations.length === 0) {
      return { success: true };
    }

    // Filter out empty recommendations
    const validRecommendations = recommendations.filter(
      rec => rec.product_name.trim() !== '' || rec.amount > 0
    );

    // Get the client ID from the first recommendation (they should all have the same client_id)
    const clientId = validRecommendations.length > 0 ? validRecommendations[0].client_id : null;

    if (!clientId) {
      console.error('No valid client ID found in recommendations');
      return { success: false, error: 'No valid client ID found' };
    }

    // Delete existing recommendations for this client
    const { error: deleteError } = await (supabase as any)
      .from('product_recommendations')
      .delete()
      .eq('client_id', clientId);

    if (deleteError) {
      console.error('Error deleting existing product recommendations:', deleteError);
      return { success: false, error: deleteError.message };
    }

    // Only insert valid recommendations
    if (validRecommendations.length > 0) {
      // Add UUIDs to each recommendation
      const recommendationsWithIds = validRecommendations.map(rec => ({
        ...rec,
        id: rec.id || uuidv4(),
        updated_at: new Date().toISOString()
      }));

      const { error: insertError } = await (supabase as any)
        .from('product_recommendations')
        .insert(recommendationsWithIds);

      if (insertError) {
        console.error('Error inserting product recommendations:', insertError);
        return { success: false, error: insertError.message };
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Exception saving product recommendations:', error);
    return { success: false, error: String(error) };
  }
};
