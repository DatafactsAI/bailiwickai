
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ClientData } from '@/components/client-data/types';
import { toast } from '@/hooks/use-toast';

export const useClientData = () => {
  return useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('clients_financial_data')
          .select('*')
          .order('consultation_date', { ascending: false });

        if (error) throw error;
        return data as ClientData[];
      } catch (error) {
        console.error('Error fetching client data:', error);
        toast({
          title: "Error fetching client data",
          description: "There was a problem loading client information. Please try again.",
          variant: "destructive",
        });
        throw error;
      }
    },
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
