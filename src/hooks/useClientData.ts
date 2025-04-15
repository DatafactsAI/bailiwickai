
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ClientData } from '@/components/client-data/types';

export const useClientData = () => {
  return useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients_financial_data')
        .select('*')
        .order('consultation_date', { ascending: false });

      if (error) throw error;
      return data as ClientData[];
    },
  });
};
