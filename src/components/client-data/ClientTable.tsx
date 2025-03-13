
import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ClientData } from './types';
import { formatCurrency } from './utils';
import { MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ClientTableProps {
  client: ClientData;
  onPlaceInChat?: () => void;
}

export function ClientTable({ client, onPlaceInChat }: ClientTableProps) {
  const { toast } = useToast();

  const handlePlaceInChat = async () => {
    // Create a formatted string with client details
    const clientSummary = `Client Financial Summary for ${client.client1_name}:
- Gross Salary: ${formatCurrency(client.client1_gross_salary)}
- Super Balance: ${formatCurrency(client.client1_super_balance)}
- Health Status: ${client.client1_health || 'Not specified'}
- Work Status: ${client.client1_work_status || 'Not specified'}
- Total Lifestyle Assets: ${formatCurrency(client.total_lifestyle_assets)}
- Total Investment Assets: ${formatCurrency(client.total_investment_assets)}`;

    try {
      // Add the message directly to the database
      const { error } = await supabase
        .from('messages')
        .insert([
          { 
            content: clientSummary, 
            type: 'received',
            metadata: { clientId: client.id } 
          }
        ]);

      if (error) throw error;

      // Show success toast
      toast({
        title: "Client Details Added",
        description: "Client details have been added to the chat.",
      });

      // Explicitly trigger a refresh of the messages via the callback
      if (onPlaceInChat) {
        onPlaceInChat();
      }
    } catch (error) {
      console.error("Error adding client details to chat:", error);
      toast({
        title: "Error",
        description: "Failed to add client details to chat.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button 
          onClick={handlePlaceInChat}
          className="bg-[#0284C7] hover:bg-[#0369A1]"
        >
          <MessageSquare className="h-4 w-4 mr-2" />
          Place Details in Chat
        </Button>
      </div>
      
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Field</TableHead>
              <TableHead>Client 1</TableHead>
              {client.client2_name && <TableHead>Client 2</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-medium">Name</TableCell>
              <TableCell>{client.client1_name}</TableCell>
              {client.client2_name && (
                <TableCell>{client.client2_name}</TableCell>
              )}
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Date of Birth</TableCell>
              <TableCell>{new Date(client.client1_dob).toLocaleDateString()}</TableCell>
              {client.client2_name && (
                <TableCell>
                  {client.client2_dob && 
                    new Date(client.client2_dob).toLocaleDateString()}
                </TableCell>
              )}
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Gross Salary</TableCell>
              <TableCell>{formatCurrency(client.client1_gross_salary)}</TableCell>
              {client.client2_name && (
                <TableCell>
                  {client.client2_gross_salary && 
                    formatCurrency(client.client2_gross_salary)}
                </TableCell>
              )}
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Super Balance</TableCell>
              <TableCell>{formatCurrency(client.client1_super_balance)}</TableCell>
              {client.client2_name && (
                <TableCell>
                  {client.client2_super_balance && 
                    formatCurrency(client.client2_super_balance)}
                </TableCell>
              )}
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Health Status</TableCell>
              <TableCell>{client.client1_health}</TableCell>
              {client.client2_name && (
                <TableCell>{client.client2_health}</TableCell>
              )}
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Work Status</TableCell>
              <TableCell>{client.client1_work_status}</TableCell>
              {client.client2_name && (
                <TableCell>{client.client2_work_status}</TableCell>
              )}
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Income Tax</TableCell>
              <TableCell>{formatCurrency(client.client1_income_tax)}</TableCell>
              {client.client2_name && (
                <TableCell>
                  {client.client2_income_tax && 
                    formatCurrency(client.client2_income_tax)}
                </TableCell>
              )}
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Centrelink Received</TableCell>
              <TableCell>{formatCurrency(client.client1_centrelink_received)}</TableCell>
              {client.client2_name && (
                <TableCell>
                  {client.client2_centrelink_received && 
                    formatCurrency(client.client2_centrelink_received)}
                </TableCell>
              )}
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Total Lifestyle Assets</TableCell>
              <TableCell colSpan={client.client2_name ? 2 : 1}>
                {formatCurrency(client.total_lifestyle_assets)}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Total Living Expenses</TableCell>
              <TableCell colSpan={client.client2_name ? 2 : 1}>
                {formatCurrency(client.total_living_expenses)}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Total Investment Assets</TableCell>
              <TableCell colSpan={client.client2_name ? 2 : 1}>
                {formatCurrency(client.total_investment_assets)}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Consultation Date</TableCell>
              <TableCell colSpan={client.client2_name ? 2 : 1}>
                {new Date(client.consultation_date).toLocaleDateString()}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Advisor</TableCell>
              <TableCell colSpan={client.client2_name ? 2 : 1}>
                {client.advisor_name}
              </TableCell>
            </TableRow>
            {client.advisor_advice && (
              <TableRow>
                <TableCell className="font-medium">Advisor Advice</TableCell>
                <TableCell colSpan={client.client2_name ? 2 : 1}>
                  {client.advisor_advice}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
