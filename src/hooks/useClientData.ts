import { useQuery } from '@tanstack/react-query';
import { ClientData } from '@/components/client-data/types';
import { toast } from '@/hooks/use-toast';
import { backendToFrontend } from '@/utils/clientDataTransform';

const API_BASE = "http://localhost:8000";

export const useClientData = () => {
  return useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      try {
        const response = await fetch(`${API_BASE}/clients`);
        if (!response.ok) {
          throw new Error('Failed to fetch clients');
        }
        const data = await response.json();
        const clientsList = data.clients || [];
        // Transform each client from backend format to frontend format
        return clientsList.map(backendToFrontend) as ClientData[];
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
