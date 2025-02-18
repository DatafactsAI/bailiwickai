
export type ClientData = {
  id: string;
  client1_name: string;
  consultation_date: string;
  advisor_name: string;
  client1_dob: string;
  client1_gross_salary: number;
  client1_super_balance: number;
  client1_health: string;
  client1_work_status: string;
  client1_income_tax: number;
  client1_centrelink_received: number;
  client2_name: string | null;
  client2_dob: string | null;
  client2_gross_salary: number | null;
  client2_super_balance: number | null;
  client2_health: string | null;
  client2_work_status: string | null;
  client2_income_tax: number | null;
  client2_centrelink_received: number | null;
  total_lifestyle_assets: number;
  total_living_expenses: number;
  total_investment_assets: number;
};
