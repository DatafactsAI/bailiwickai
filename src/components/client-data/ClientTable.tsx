import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ClientData } from './types';
import { formatCurrency } from './utils';
import { MessageSquare, Save } from "lucide-react"; 
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ClientTableProps {
  client: ClientData;
  onPlaceInChat?: () => void;
  onDataSaved?: () => void; 
}

const parseCurrencyLocal = (value: string | number): number => {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return 0;
  const numericString = value.replace(/[^0-9.-]+/g, '');
  const parsed = parseFloat(numericString);
  return isNaN(parsed) ? 0 : parsed;
};

export function ClientTable({ client, onPlaceInChat, onDataSaved }: ClientTableProps) {
  const { toast } = useToast();
  const [editableClientData, setEditableClientData] = useState<ClientData>(client);
  const [isDirty, setIsDirty] = useState(false); 

  useEffect(() => {
    console.log("Client data received:", client);
    console.log("Editable client data initialized:", editableClientData);
  }, []);

  useEffect(() => {
    console.log("Client prop changed, updating state:", client);
    setEditableClientData(client);
    setIsDirty(false); 
  }, [client]);

  const handlePlaceInChat = async () => {
    const clientDetails = `Client Financial Summary for ${client.client1_name}:
- Date of Birth: ${new Date(client.client1_dob).toLocaleDateString()}
- Gross Salary: ${formatCurrency(client.client1_gross_salary)}
- Super Balance: ${formatCurrency(client.client1_super_balance)}
- Health Status: ${client.client1_health || 'Not specified'}
- Work Status: ${client.client1_work_status || 'Not specified'}
- Income Tax: ${formatCurrency(client.client1_income_tax || 0)}
- Centrelink Received: ${formatCurrency(client.client1_centrelink_received || 0)}
${client.client2_name ? `\nClient 2 (${client.client2_name}) Information:
- Date of Birth: ${client.client2_dob ? new Date(client.client2_dob).toLocaleDateString() : 'Not specified'}
- Gross Salary: ${client.client2_gross_salary ? formatCurrency(client.client2_gross_salary) : 'Not specified'}
- Super Balance: ${client.client2_super_balance ? formatCurrency(client.client2_super_balance) : 'Not specified'}
- Health Status: ${client.client2_health || 'Not specified'}
- Work Status: ${client.client2_work_status || 'Not specified'}
- Income Tax: ${client.client2_income_tax ? formatCurrency(client.client2_income_tax) : 'Not specified'}
- Centrelink Received: ${client.client2_centrelink_received ? formatCurrency(client.client2_centrelink_received) : 'Not specified'}` : ''}

Household Financial Summary:
- Total Lifestyle Assets: ${formatCurrency(client.total_lifestyle_assets || 0)}
- Total Living Expenses: ${formatCurrency(client.total_living_expenses || 0)}
- Total Investment Assets: ${formatCurrency(client.total_investment_assets || 0)}

Consultation Details:
- Date: ${new Date(client.consultation_date).toLocaleDateString()}
- Advisor: ${client.advisor_name}
${client.advisor_advice ? `- Advisor Advice: ${client.advisor_advice}` : ''}`;

    try {
      const { error } = await supabase
        .from('messages')
        .insert([
          { 
            content: clientDetails, 
            type: 'received',
            metadata: { clientId: client.id } 
          }
        ]);

      if (error) throw error;

      toast({
        title: "Client Details Added",
        description: "Complete client details have been added to the chat.",
      });

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

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    field: keyof ClientData
  ) => {
    const { value, type } = e.target;
    let processedValue: string | number | Date | null = value;

    if (type === 'number' || field.includes('salary') || field.includes('balance') || field.includes('tax') || field.includes('received') || field.includes('assets') || field.includes('expenses')) {
      processedValue = parseCurrencyLocal(value);
    } else if (type === 'date' || field.includes('dob')) {
      processedValue = value ? new Date(value) : null;
    }

    setEditableClientData(prevData => ({
      ...prevData,
      [field]: processedValue,
    }));
    setIsDirty(true); 
  };

  const handleSave = async () => {
    if (!isDirty) {
      toast({ 
        title: "No changes to save",
        description: "No changes have been detected in the client data."
      });
      return;
    }

    console.log("Saving changes to client data:", editableClientData);

    try {
      const updateData: Partial<ClientData> = {};
      
      (Object.keys(editableClientData) as Array<keyof ClientData>).forEach(key => {
        if (key === 'id') return;
        
        let originalValue = client[key];
        let currentValue = editableClientData[key];
        
        if ((key === 'client1_dob' || key === 'client2_dob' || key === 'consultation_date') && currentValue) {
          if (currentValue instanceof Date) {
            currentValue = currentValue.toISOString();
          }
          
          if (originalValue && typeof originalValue === 'string') {
            const originalDate = new Date(originalValue);
            if (!isNaN(originalDate.getTime())) {
              originalValue = originalDate.toISOString();
            }
          }
        }
        
        if (currentValue !== originalValue) {
          updateData[key] = currentValue;
        }
      });
      
      if (Object.keys(updateData).length === 0) {
        toast({ 
          title: "No changes detected",
          description: "After comparison, no actual changes were found to save."
        });
        setIsDirty(false);
        return;
      }
      
      console.log("Sending update to Supabase:", updateData);
      
      const { error } = await supabase
        .from('clients_financial_data') 
        .update(updateData)
        .eq('id', client.id);
        
      if (error) throw error;
      
      toast({
        title: "Changes saved successfully",
        description: "The client data has been updated in the database.",
        variant: "default", 
      });
      
      setIsDirty(false); 
      
      if (onDataSaved) {
        onDataSaved();
      }
      
    } catch (error) {
      console.error("Error saving client data:", error);
      toast({
        title: "Error saving changes",
        description: `There was a problem updating the client data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
  };

  const renderEditableCell = (field: keyof ClientData, clientIndex: 1 | 2 | null = 1) => {
    const actualFieldKey = (field === 'total_lifestyle_assets' || field === 'total_living_expenses' || field === 'total_investment_assets' || field === 'consultation_date' || field === 'advisor_name' || field === 'advisor_advice')
      ? field
      : (clientIndex === 2 ? `client2_${field}` : `client1_${field}`) as keyof ClientData;

    console.log(`Field mapping: ${String(field)} → ${String(actualFieldKey)}`);
    
    if (clientIndex === 2 && !(actualFieldKey in editableClientData)) {
      return null;
    }

    const value = editableClientData[actualFieldKey];
    
    console.log(`Rendering field: ${String(actualFieldKey)}, value:`, value);

    if (field.includes('salary') || field.includes('balance') || field.includes('tax') || field.includes('received') || field.includes('assets') || field.includes('expenses')) {
      const numValue = typeof value === 'number' ? value : 0;
      return (
        <Input
          type="text"
          value={formatCurrency(numValue)}
          onChange={(e) => handleInputChange(e, actualFieldKey)}
          className="w-full px-1 py-0.5 border-input"
          onBlur={(e) => {
            const numericValue = parseCurrencyLocal(e.target.value);
            setEditableClientData(prev => ({ ...prev, [actualFieldKey]: numericValue }));
            e.target.value = formatCurrency(numericValue);
          }}
        />
      );
    } else if (field.includes('dob')) {
      let dateValue = '';
      
      if (value) {
        try {
          const date = new Date(value as string);
          if (!isNaN(date.getTime())) {
            dateValue = date.toISOString().split('T')[0];
          }
        } catch (e) {
          console.error(`Error parsing date for ${String(actualFieldKey)}:`, e);
        }
      }
      
      return (
        <Input
          type="date"
          value={dateValue}
          onChange={(e) => handleInputChange(e, actualFieldKey)}
          className="w-full px-1 py-0.5 border-input"
        />
      );
    } else if (field.includes('work_status')) {
      const statusValue = value as string || '';
      return (
        <select
          value={statusValue}
          onChange={(e) => handleInputChange(e, actualFieldKey)}
          className="w-full px-1 py-0.5 border rounded bg-background text-foreground border-input"
          aria-label={`${field} selection`}
          title={`Select ${field}`}
        >
          <option value="">Select...</option>
          <option value="Employed">Employed</option>
          <option value="Self-Employed">Self-Employed</option>
          <option value="Unemployed">Unemployed</option>
          <option value="Retired">Retired</option>
        </select>
      );
    } else if (field.includes('health')) {
      const textValue = value as string || '';
      return (
        <Input
          type="text"
          value={textValue}
          onChange={(e) => handleInputChange(e, actualFieldKey)}
          className="w-full px-1 py-0.5 border-input"
          aria-label={`${field} input`}
          title={field as string}
        />
      );
    } else {
      if (field === 'client1_name' || field === 'client2_name' || field === 'consultation_date' || field === 'advisor_name' || field === 'advisor_advice') {
        if (field === 'consultation_date' && value) {
          try {
            return new Date(value as string).toLocaleDateString();
          } catch (e) {
            return String(value || '');
          }
        }
        return String(value || '');
      }
      return <span>{String(value || '')}</span>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end space-x-2">
        {isDirty && (
          <Button
            onClick={handleSave}
            variant="green"
            className="btn-pulse"
          >
            <Save className="h-4 w-4 mr-1" />
            Save Changes
          </Button>
        )}
        <Button
          onClick={handlePlaceInChat}
          variant="blue"
          className="btn-pulse"
        >
          <MessageSquare className="h-4 w-4 mr-1" />
          Place Details in Chat
        </Button>
      </div>
      <div className="w-full overflow-x-auto">
        <Table className="min-w-full">
          <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
            <TableRow>
              <TableHead className="w-1/3">Field</TableHead>
              <TableHead className="w-1/3">
                {editableClientData.client1_name || 'Client 1'}
              </TableHead>
              {client.client2_name && (
                <TableHead className="w-1/3">
                  {editableClientData.client2_name || 'Client 2'}
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-medium">Name</TableCell>
              <TableCell>{editableClientData.client1_name}</TableCell>
              {client.client2_name && (
                <TableCell>{editableClientData.client2_name}</TableCell>
              )}
            </TableRow>

            <TableRow>
              <TableCell className="font-medium">Date of Birth</TableCell>
              <TableCell>{renderEditableCell('dob', 1)}</TableCell>
              {client.client2_name && (
                <TableCell>{renderEditableCell('dob', 2)}</TableCell>
              )}
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Gross Salary</TableCell>
              <TableCell>{renderEditableCell('gross_salary', 1)}</TableCell>
              {client.client2_name && (
                <TableCell>{renderEditableCell('gross_salary', 2)}</TableCell>
              )}
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Super Balance</TableCell>
              <TableCell>{renderEditableCell('super_balance', 1)}</TableCell>
              {client.client2_name && (
                <TableCell>{renderEditableCell('super_balance', 2)}</TableCell>
              )}
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Health Status</TableCell>
              <TableCell>{renderEditableCell('health', 1)}</TableCell>
              {client.client2_name && (
                <TableCell>{renderEditableCell('health', 2)}</TableCell>
              )}
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Work Status</TableCell>
              <TableCell>{renderEditableCell('work_status', 1)}</TableCell>
              {client.client2_name && (
                <TableCell>{renderEditableCell('work_status', 2)}</TableCell>
              )}
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Income Tax</TableCell>
              <TableCell>{renderEditableCell('income_tax', 1)}</TableCell>
              {client.client2_name && (
                <TableCell>{renderEditableCell('income_tax', 2)}</TableCell>
              )}
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Centrelink Received</TableCell>
              <TableCell>{renderEditableCell('centrelink_received', 1)}</TableCell>
              {client.client2_name && (
                <TableCell>{renderEditableCell('centrelink_received', 2)}</TableCell>
              )}
            </TableRow>

            <TableRow>
              <TableCell className="font-medium">Total Lifestyle Assets</TableCell>
              <TableCell colSpan={client.client2_name ? 2 : 1}>
                {renderEditableCell('total_lifestyle_assets', null)}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Total Living Expenses</TableCell>
              <TableCell colSpan={client.client2_name ? 2 : 1}>
                {renderEditableCell('total_living_expenses', null)}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Total Investment Assets</TableCell>
              <TableCell colSpan={client.client2_name ? 2 : 1}>
                {renderEditableCell('total_investment_assets', null)}
              </TableCell>
            </TableRow>

            <TableRow>
              <TableCell className="font-medium">Consultation Date</TableCell>
              <TableCell colSpan={client.client2_name ? 2 : 1}>
                {new Date(editableClientData.consultation_date).toLocaleDateString()}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Advisor</TableCell>
              <TableCell colSpan={client.client2_name ? 2 : 1}>
                {editableClientData.advisor_name}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Advisor Advice</TableCell>
              <TableCell colSpan={client.client2_name ? 2 : 1}>
                {editableClientData.advisor_advice || 'No advice recorded'}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
