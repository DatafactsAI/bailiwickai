/**
 * Utility functions to convert between frontend ClientData format (flat)
 * and backend ClientData format (nested)
 */

import { ClientData } from '@/components/client-data/types';

// Backend ClientData structure (from advice_processor/models/data_models.py)
interface BackendClientData {
  id: string;
  clientInfo: {
    client1: {
      name: string;
      dob: string;
      grossSalary: number;
      superBalance: number;
      health: string;
      workStatus: string;
      incomeTax: number;
      centrelinkReceived: number;
    };
    client2?: {
      name: string;
      dob: string;
      grossSalary: number;
      superBalance: number;
      health: string;
      workStatus: string;
      incomeTax: number;
      centrelinkReceived: number;
    } | null;
    consultationDate: string;
    advisorName: string;
  };
  financialSummary: {
    totalLifestyleAssets: number;
    totalLivingExpenses: number;
    totalInvestmentAssets: number;
    totalSuperannuationAssets: number;
    totalClientLoans: number;
    totalClientInsurance: number;
  };
  detailedAssets: {
    lifestyleAssets: any[];
    investmentAssets: any[];
    superannuationAssets: any[];
  };
  detailedLiabilities: {
    loans: any[];
  };
  detailedInsurance: {
    policies: any[];
  };
  adviceContext: {
    reasonsForAdvice: string;
    currentSituation: string;
    concerns: string;
  };
  advisorInput: {
    analysis: string;
    recommendations: string;
    strategies: string;
    nextSteps: string;
  };
}

/**
 * Convert backend ClientData (nested) to frontend ClientData (flat)
 */
export function backendToFrontend(backend: BackendClientData): ClientData {
  return {
    id: backend.id,
    client1_name: backend.clientInfo.client1.name,
    client2_name: backend.clientInfo.client2?.name || null,
    consultation_date: backend.clientInfo.consultationDate,
    advisor_name: backend.clientInfo.advisorName,
    client1_dob: backend.clientInfo.client1.dob,
    client1_gross_salary: backend.clientInfo.client1.grossSalary,
    client1_super_balance: backend.clientInfo.client1.superBalance,
    client1_health: backend.clientInfo.client1.health,
    client1_work_status: backend.clientInfo.client1.workStatus,
    client1_income_tax: backend.clientInfo.client1.incomeTax,
    client1_centrelink_received: backend.clientInfo.client1.centrelinkReceived,
    client2_dob: backend.clientInfo.client2?.dob || null,
    client2_gross_salary: backend.clientInfo.client2?.grossSalary || null,
    client2_super_balance: backend.clientInfo.client2?.superBalance || null,
    client2_health: backend.clientInfo.client2?.health || null,
    client2_work_status: backend.clientInfo.client2?.workStatus || null,
    client2_income_tax: backend.clientInfo.client2?.incomeTax || null,
    client2_centrelink_received: backend.clientInfo.client2?.centrelinkReceived || null,
    total_lifestyle_assets: backend.financialSummary.totalLifestyleAssets,
    total_living_expenses: backend.financialSummary.totalLivingExpenses,
    total_investment_assets: backend.financialSummary.totalInvestmentAssets,
    total_superannuation_assets: backend.financialSummary.totalSuperannuationAssets,
    total_client_loans: backend.financialSummary.totalClientLoans,
    total_client_insurance: backend.financialSummary.totalClientInsurance,
    advisor_advice: backend.advisorInput.analysis || undefined,
  };
}

/**
 * Convert frontend ClientData (flat) to backend ClientData (nested)
 * Used when saving/updating client data
 */
export function frontendToBackend(
  frontend: ClientData,
  existingBackend?: BackendClientData
): BackendClientData {
  // If we have existing backend data, merge with it to preserve nested structures
  const existing = existingBackend || {
    id: frontend.id,
    clientInfo: {
      client1: {
        name: frontend.client1_name,
        dob: frontend.client1_dob,
        grossSalary: frontend.client1_gross_salary,
        superBalance: frontend.client1_super_balance,
        health: frontend.client1_health,
        workStatus: frontend.client1_work_status,
        incomeTax: frontend.client1_income_tax,
        centrelinkReceived: frontend.client1_centrelink_received,
      },
      client2: frontend.client2_name ? {
        name: frontend.client2_name,
        dob: frontend.client2_dob || '',
        grossSalary: frontend.client2_gross_salary || 0,
        superBalance: frontend.client2_super_balance || 0,
        health: frontend.client2_health || '',
        workStatus: frontend.client2_work_status || '',
        incomeTax: frontend.client2_income_tax || 0,
        centrelinkReceived: frontend.client2_centrelink_received || 0,
      } : null,
      consultationDate: frontend.consultation_date,
      advisorName: frontend.advisor_name,
    },
    financialSummary: {
      totalLifestyleAssets: frontend.total_lifestyle_assets,
      totalLivingExpenses: frontend.total_living_expenses,
      totalInvestmentAssets: frontend.total_investment_assets,
      totalSuperannuationAssets: frontend.total_superannuation_assets,
      totalClientLoans: frontend.total_client_loans,
      totalClientInsurance: frontend.total_client_insurance,
    },
    detailedAssets: {
      lifestyleAssets: [],
      investmentAssets: [],
      superannuationAssets: [],
    },
    detailedLiabilities: {
      loans: [],
    },
    detailedInsurance: {
      policies: [],
    },
    adviceContext: {
      reasonsForAdvice: '',
      currentSituation: '',
      concerns: '',
    },
    advisorInput: {
      analysis: frontend.advisor_advice || '',
      recommendations: '',
      strategies: '',
      nextSteps: '',
    },
  };

  // Update with frontend values
  return {
    ...existing,
    id: frontend.id,
    clientInfo: {
      ...existing.clientInfo,
      client1: {
        ...existing.clientInfo.client1,
        name: frontend.client1_name,
        dob: frontend.client1_dob,
        grossSalary: frontend.client1_gross_salary,
        superBalance: frontend.client1_super_balance,
        health: frontend.client1_health,
        workStatus: frontend.client1_work_status,
        incomeTax: frontend.client1_income_tax,
        centrelinkReceived: frontend.client1_centrelink_received,
      },
      client2: frontend.client2_name ? {
        name: frontend.client2_name,
        dob: frontend.client2_dob || '',
        grossSalary: frontend.client2_gross_salary || 0,
        superBalance: frontend.client2_super_balance || 0,
        health: frontend.client2_health || '',
        workStatus: frontend.client2_work_status || '',
        incomeTax: frontend.client2_income_tax || 0,
        centrelinkReceived: frontend.client2_centrelink_received || 0,
      } : null,
      consultationDate: frontend.consultation_date,
      advisorName: frontend.advisor_name,
    },
    financialSummary: {
      ...existing.financialSummary,
      totalLifestyleAssets: frontend.total_lifestyle_assets,
      totalLivingExpenses: frontend.total_living_expenses,
      totalInvestmentAssets: frontend.total_investment_assets,
      totalSuperannuationAssets: frontend.total_superannuation_assets,
      totalClientLoans: frontend.total_client_loans,
      totalClientInsurance: frontend.total_client_insurance,
    },
    advisorInput: {
      ...existing.advisorInput,
      analysis: frontend.advisor_advice || existing.advisorInput.analysis,
    },
  };
}

/**
 * Convert frontend ClientData (flat) to nested structure for mapping resolution.
 * This creates a simplified nested structure that matches what the mapping engine expects.
 * Used specifically for the VariableMappingDialog to resolve field paths like "clientInfo.client1.name".
 */
export function frontendToNestedForMapping(
  frontend: ClientData
): Record<string, unknown> {
  return {
    id: frontend.id,
    clientInfo: {
      client1: {
        name: frontend.client1_name || "",
        dob: frontend.client1_dob || "",
        grossSalary: frontend.client1_gross_salary || 0,
        superBalance: frontend.client1_super_balance || 0,
        health: frontend.client1_health || "",
        workStatus: frontend.client1_work_status || "",
        incomeTax: frontend.client1_income_tax || 0,
        centrelinkReceived: frontend.client1_centrelink_received || 0,
      },
      client2: frontend.client2_name
        ? {
            name: frontend.client2_name,
            dob: frontend.client2_dob || "",
            grossSalary: frontend.client2_gross_salary || 0,
            superBalance: frontend.client2_super_balance || 0,
            health: frontend.client2_health || "",
            workStatus: frontend.client2_work_status || "",
            incomeTax: frontend.client2_income_tax || 0,
            centrelinkReceived: frontend.client2_centrelink_received || 0,
          }
        : null,
      consultationDate: frontend.consultation_date || "",
      advisorName: frontend.advisor_name || "",
    },
    financialSummary: {
      totalLifestyleAssets: frontend.total_lifestyle_assets || 0,
      totalLivingExpenses: frontend.total_living_expenses || 0,
      totalInvestmentAssets: frontend.total_investment_assets || 0,
      totalSuperannuationAssets: frontend.total_superannuation_assets || 0,
      totalClientLoans: frontend.total_client_loans || 0,
      totalClientInsurance: frontend.total_client_insurance || 0,
    },
  };
}

