
import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FileText } from "lucide-react";

type ClientData = {
  id: string;
  client1_name: string;
  consultation_date: string;
  advisor_name: string;
  client1_dob: string;
  client1_gross_salary: number;
  client1_super_balance: number;
  client2_name: string | null;
  client2_dob: string | null;
  client2_gross_salary: number | null;
  client2_super_balance: number | null;
};

export function ClientDataViewer() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  const { data: clientsData, isLoading } = useQuery({
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

  const selectedClient = clientsData?.find(client => client.id === selectedClientId);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
    }).format(amount);
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed top-4 right-4 z-50 bg-blue-600 hover:bg-blue-700"
      >
        <FileText className="w-4 h-4 mr-2" />
        View Client Data
      </Button>
    );
  }

  return (
    <Card className="fixed top-4 right-4 w-[90vw] max-w-3xl p-6 z-50 bg-white shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Client Financial Data</h2>
        <Button variant="outline" onClick={() => setIsOpen(false)}>
          Close
        </Button>
      </div>

      <div className="mb-6">
        <Select value={selectedClientId || ''} onValueChange={setSelectedClientId}>
          <SelectTrigger>
            <SelectValue placeholder="Select a client to view" />
          </SelectTrigger>
          <SelectContent>
            {clientsData?.map((client) => (
              <SelectItem key={client.id} value={client.id}>
                {client.client1_name} - {new Date(client.consultation_date).toLocaleDateString()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedClient && (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Field</TableHead>
                <TableHead>Client 1</TableHead>
                {selectedClient.client2_name && <TableHead>Client 2</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">Name</TableCell>
                <TableCell>{selectedClient.client1_name}</TableCell>
                {selectedClient.client2_name && (
                  <TableCell>{selectedClient.client2_name}</TableCell>
                )}
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Date of Birth</TableCell>
                <TableCell>{new Date(selectedClient.client1_dob).toLocaleDateString()}</TableCell>
                {selectedClient.client2_name && (
                  <TableCell>
                    {selectedClient.client2_dob && 
                      new Date(selectedClient.client2_dob).toLocaleDateString()}
                  </TableCell>
                )}
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Gross Salary</TableCell>
                <TableCell>{formatCurrency(selectedClient.client1_gross_salary)}</TableCell>
                {selectedClient.client2_name && (
                  <TableCell>
                    {selectedClient.client2_gross_salary && 
                      formatCurrency(selectedClient.client2_gross_salary)}
                  </TableCell>
                )}
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Super Balance</TableCell>
                <TableCell>{formatCurrency(selectedClient.client1_super_balance)}</TableCell>
                {selectedClient.client2_name && (
                  <TableCell>
                    {selectedClient.client2_super_balance && 
                      formatCurrency(selectedClient.client2_super_balance)}
                  </TableCell>
                )}
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Consultation Date</TableCell>
                <TableCell colSpan={selectedClient.client2_name ? 2 : 1}>
                  {new Date(selectedClient.consultation_date).toLocaleDateString()}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Advisor</TableCell>
                <TableCell colSpan={selectedClient.client2_name ? 2 : 1}>
                  {selectedClient.advisor_name}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  );
}
