// Supabase integration for client_goals_objectives table
import { supabase } from './client';

export type GoalTimeframe = 'One Year' | 'Up to Three Years' | 'Up to Five Years' | 'Longer than Five Years';
export type GoalPriority = 'High' | 'Medium' | 'Low';
export type GoalCategory = 'Retirement' | 'Cash Flow' | 'Reduce Debt';

export type ClientGoalObjective = {
  id?: string;
  client_id: string;
  category: GoalCategory;
  statement?: string;
  priority?: GoalPriority;
  amount?: number;
  timeframe?: GoalTimeframe;
  created_at?: string;
  updated_at?: string;
};

// Fetch all goals and objectives for a specific client
export async function fetchClientGoalsObjectives(clientId: string): Promise<{ 
  goals: ClientGoalObjective[];
  error?: string 
}> {
  try {
    const { data, error } = await (supabase as any)
      .from('client_goals_objectives')
      .select('*')
      .eq('client_id', clientId)
      .order('category', { ascending: true });

    if (error) {
      console.error('Error fetching client goals and objectives:', error);
      return { 
        goals: [],
        error: error.message || 'Unknown error fetching client goals and objectives' 
      };
    }

    return {
      goals: data || [],
    };
  } catch (error: any) {
    console.error('Error fetching client goals and objectives:', error);
    return { 
      goals: [],
      error: error.message || 'Unknown error fetching client goals and objectives' 
    };
  }
}

// Update goals and objectives for a client
export async function updateClientGoalsObjectives(
  clientId: string, 
  goals: ClientGoalObjective[]
): Promise<{ success: boolean; error?: string }> {
  try {
    // First delete all existing goals for this client
    const { error: deleteError } = await (supabase as any)
      .from('client_goals_objectives')
      .delete()
      .eq('client_id', clientId);
    
    if (deleteError) {
      console.error('Error deleting old client goals and objectives:', deleteError);
      return { 
        success: false, 
        error: deleteError.message || 'Error deleting old client goals and objectives' 
      };
    }
    
    // Insert new goals if there are any
    if (goals.length > 0) {
      const goalsToInsert = goals.map(goal => ({
        client_id: clientId,
        category: goal.category,
        statement: goal.statement || '',
        priority: goal.priority || '',
        amount: goal.amount || 0,
        timeframe: goal.timeframe || '',
        updated_at: new Date().toISOString()
      }));
      
      const { error: insertError } = await (supabase as any)
        .from('client_goals_objectives')
        .insert(goalsToInsert);
      
      if (insertError) {
        console.error('Error inserting client goals and objectives:', insertError);
        return { 
          success: false, 
          error: insertError.message || 'Error inserting client goals and objectives' 
        };
      }
    }
    
    return { success: true };
  } catch (error: any) {
    console.error('Error updating client goals and objectives:', error);
    return { 
      success: false, 
      error: error.message || 'Unknown error updating client goals and objectives' 
    };
  }
}
