
import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export const useClientDataSubscription = () => {
  const queryClient = useQueryClient();
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    // Clean up any existing subscription to avoid duplicates
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
    }

    // Create new subscription
    const channel = supabase
      .channel('client-data-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'clients_financial_data'
        },
        (payload) => {
          console.log('Real-time update received for client data:', payload);
          
          // Invalidate relevant queries
          queryClient.invalidateQueries({ queryKey: ['clients'] });
          
          // Notify user of changes
          if (payload.eventType === 'INSERT') {
            toast({
              title: "New client data available",
              description: "Client information has been added to the system.",
            });
          } else if (payload.eventType === 'UPDATE') {
            toast({
              title: "Client data updated",
              description: "Client information has been refreshed.",
            });
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to client data changes');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Error subscribing to client data changes');
        }
      });

    // Store the subscription for cleanup
    subscriptionRef.current = channel;

    return () => {
      if (subscriptionRef.current) {
        console.log('Cleaning up client data subscription');
        supabase.removeChannel(subscriptionRef.current);
      }
    };
  }, [queryClient]);
};
