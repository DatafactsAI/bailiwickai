import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PenLine, Loader2 } from "lucide-react";
import { ClientSelector } from './client-data/ClientSelector';
import { useToast } from "@/hooks/use-toast";
import { useClientData } from '@/hooks/useClientData';
import { useClientDataSubscription } from '@/hooks/useClientDataSubscription';
import { fetchLifestyleAssets } from '@/integrations/supabase/lifestyleAssets';
import { fetchInvestmentAssets } from '@/integrations/supabase/investmentAssets';
import { fetchSuperannuationAssets } from '@/integrations/supabase/superannuationAssets';
import { fetchClientLoans } from '@/integrations/supabase/clientLoans';
import { fetchClientInsurance } from '@/integrations/supabase/clientInsurance';
import { fetchAdviceReasons, fetchClientSelectedReasons } from '@/integrations/supabase/adviceReasons';
import { fetchAdviceCoverageAreas, fetchClientSelectedCoverageAreas } from '@/integrations/supabase/adviceCoverage';
import { fetchAdvisorRecommendations } from '@/integrations/supabase/advisorRecommendations';
import { fetchClientGoalsObjectives } from '@/integrations/supabase/clientGoalsObjectives';

export function FinancialPlanWriter() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { data: clientsData, isLoading: isLoadingClients } = useClientData();

  // Default webhook URL
  const webhookUrl = 'https://hooks.zapier.com/hooks/catch/17752322/2wrf9gm/';

  // Set up real-time subscription
  useClientDataSubscription();

  const handleGeneratePlan = async () => {
    if (!selectedClientId) {
      toast({
        title: "Error",
        description: "Please select a client first",
        variant: "destructive",
      });
      return;
    }

    const selectedClient = clientsData?.find(client => client.id === selectedClientId);
    if (!selectedClient) return;

    setIsLoading(true);
    console.log("Gathering comprehensive client data for Zapier webhook");

    try {
      // Fetch all additional data in parallel
      const [
        lifestyleAssetsResult,
        investmentAssetsResult,
        superannuationAssetsResult,
        clientLoansResult,
        clientInsuranceResult,
        adviceReasonsResult,
        clientSelectedReasonsResult,
        adviceCoverageAreasResult,
        clientSelectedCoverageAreasResult,
        advisorRecommendationsResult,
        goalsObjectivesResult
      ] = await Promise.all([
        fetchLifestyleAssets(selectedClientId),
        fetchInvestmentAssets(selectedClientId),
        fetchSuperannuationAssets(selectedClientId),
        fetchClientLoans(selectedClientId),
        fetchClientInsurance(selectedClientId),
        fetchAdviceReasons(),
        fetchClientSelectedReasons(selectedClientId),
        fetchAdviceCoverageAreas(),
        fetchClientSelectedCoverageAreas(selectedClientId),
        fetchAdvisorRecommendations(selectedClientId),
        fetchClientGoalsObjectives(selectedClientId)
      ]);

      // Process reasons for seeking advice with statements
      const selectedReasons = clientSelectedReasonsResult.selectedReasons || [];
      const adviceReasons = adviceReasonsResult.reasons || [];
      
      const reasonsWithDetails = selectedReasons.map(selectedReason => {
        const reasonDetails = adviceReasons.find(reason => reason.id === selectedReason.reason_id);
        return {
          reason: reasonDetails?.reason_text || "Unknown reason",
          statement: selectedReason.statement || "",
          category: reasonDetails?.category || ""
        };
      });

      // Process advice coverage areas with statements
      const selectedCoverageAreas = clientSelectedCoverageAreasResult.selectedCoverageAreas || [];
      const coverageAreas = adviceCoverageAreasResult.coverageAreas || [];
      
      const coverageAreasWithDetails = selectedCoverageAreas.map(selectedArea => {
        const areaDetails = coverageAreas.find(area => area.id === selectedArea.coverage_area_id);
        return {
          area: areaDetails?.coverage_text || "Unknown area",
          statement: selectedArea.statement || "",
          category: areaDetails?.category || ""
        };
      });

      // Create a well-structured payload for the AI
      const aiReadyPayload = {
        clientInfo: {
          client1: {
            name: selectedClient.client1_name,
            dob: selectedClient.client1_dob,
            grossSalary: selectedClient.client1_gross_salary,
            superBalance: selectedClient.client1_super_balance,
            health: selectedClient.client1_health,
            workStatus: selectedClient.client1_work_status,
            incomeTax: selectedClient.client1_income_tax,
            centrelinkReceived: selectedClient.client1_centrelink_received
          },
          client2: selectedClient.client2_name ? {
            name: selectedClient.client2_name,
            dob: selectedClient.client2_dob,
            grossSalary: selectedClient.client2_gross_salary,
            superBalance: selectedClient.client2_super_balance,
            health: selectedClient.client2_health,
            workStatus: selectedClient.client2_work_status,
            incomeTax: selectedClient.client2_income_tax,
            centrelinkReceived: selectedClient.client2_centrelink_received
          } : null,
          consultationDate: selectedClient.consultation_date,
          advisorName: selectedClient.advisor_name
        },
        financialSummary: {
          totalLifestyleAssets: selectedClient.total_lifestyle_assets,
          totalLivingExpenses: selectedClient.total_living_expenses,
          totalInvestmentAssets: selectedClient.total_investment_assets,
          totalSuperannuationAssets: selectedClient.total_superannuation_assets,
          totalClientLoans: selectedClient.total_client_loans,
          totalClientInsurance: selectedClient.total_client_insurance
        },
        detailedAssets: {
          lifestyleAssets: lifestyleAssetsResult.assets || [],
          investmentAssets: investmentAssetsResult.assets || [],
          superannuationAssets: superannuationAssetsResult.assets || []
        },
        detailedLiabilities: {
          loans: clientLoansResult.loans || []
        },
        detailedInsurance: {
          insurancePolicies: clientInsuranceResult.insurance || []
        },
        adviceContext: {
          reasonsForSeekingAdvice: reasonsWithDetails,
          adviceCoverageAreas: coverageAreasWithDetails
        },
        advisorInput: {
          recommendations: advisorRecommendationsResult.recommendations || [],
          generalAdvice: selectedClient.advisor_advice || "",
        },
        goalsAndObjectives: goalsObjectivesResult.goals || []
      };

      console.log("Sending comprehensive client data to Zapier webhook");
      
      await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        mode: "no-cors",
        body: JSON.stringify(aiReadyPayload),
      });

      toast({
        title: "Financial Plan Request Sent",
        description: "Comprehensive client data has been sent to Zapier for AI processing. Please check your Zap's history.",
      });
      setIsOpen(false);
    } catch (error) {
      console.error("Error preparing or sending data to webhook:", error);
      toast({
        title: "Error",
        description: "Failed to send data to Zapier. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="bg-[#9b87f5] hover:bg-[#8B5CF6]"
      >
        <PenLine className="w-4 h-4 mr-2" />
        Write Financial Plan
      </Button>
    );
  }

  if (isLoadingClients) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
          <span className="ml-2">Loading clients...</span>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <h2 className="text-lg font-semibold mb-4">Write Financial Plan</h2>
      <div className="space-y-4">
        <ClientSelector
          clients={clientsData || []}
          selectedClientId={selectedClientId}
          onClientSelect={setSelectedClientId}
        />

        <div className="flex justify-end space-x-2">
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleGeneratePlan}
            disabled={!selectedClientId || isLoading}
            className="bg-[#9b87f5] hover:bg-[#8B5CF6]"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              "Generate Plan"
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}
