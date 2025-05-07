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
  total_superannuation_assets: number;
  total_client_loans: number;
  total_client_insurance: number;
  advisor_advice?: string;
};

export type Owner = "Client 1" | "Client 2" | "Joint";

export type LifestyleAsset = {
  id?: string;
  name: string;
  value: string | number;
  owner: Owner;
  client_id: string;
};

export type InvestmentAsset = {
  id?: string;
  name: string;
  value: string | number;
  owner: Owner;
  asset_type: string;
  client_id: string;
};

export type SuperannuationAsset = {
  id?: string;
  name: string;
  value: string | number;
  owner: Owner;
  fund_type: string;
  client_id: string;
};

export type ClientLoan = {
  id?: string;
  name: string;
  value: string | number;
  owner: Owner;
  loan_type: string;
  client_id: string;
};

export type ClientInsurance = {
  id?: string;
  name: string;
  value: number;
  owner: "Client 1" | "Client 2" | "Joint";
  insurance_type: string;
  client_id: string;
  created_at?: string;
};

export type AdviceReason = {
  id: string;
  reason_text: string;
  category?: string;
  created_at?: string;
};

export type ClientSelectedReason = {
  id?: string;
  client_id: string;
  reason_id: string;
  statement?: string;
  created_at?: string;
};

export type AdviceCoverageArea = {
  id: string;
  coverage_text: string;
  category?: string;
  created_at?: string;
};

export type ClientSelectedCoverageArea = {
  id?: string;
  client_id: string;
  coverage_area_id: string;
  statement?: string;
  created_at?: string;
};

export type AdvisorRecommendation = {
  id?: string;
  client_id: string;
  recommendation_text: string;
  position: number;
  created_at?: string;
  updated_at?: string;
};
