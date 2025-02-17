
import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ClientData } from './types';
import { formatCurrency } from './utils';

interface ClientTableProps {
  client: ClientData;
}

export function ClientTable({ client }: ClientTableProps) {
  return (
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
        </TableBody>
      </Table>
    </div>
  );
}
