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
import { MessageSquare, Save, Plus } from "lucide-react"; 
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { fetchLifestyleAssets, upsertLifestyleAssets, updateTotalLifestyleAssets } from '@/integrations/supabase/lifestyleAssets';
import { fetchInvestmentAssets, upsertInvestmentAssets, updateTotalInvestmentAssets } from '@/integrations/supabase/investmentAssets';
import { fetchSuperannuationAssets, upsertSuperannuationAssets, updateTotalSuperannuationAssets } from '@/integrations/supabase/superannuationAssets';
import { fetchClientLoans, upsertClientLoans, updateTotalClientLoans } from '@/integrations/supabase/clientLoans';
import { fetchClientInsurance, upsertClientInsurance, updateTotalClientInsurance } from '@/integrations/supabase/clientInsurance';
import { fetchAdviceReasons, fetchClientSelectedReasons, updateClientSelectedReasons } from '@/integrations/supabase/adviceReasons';
import { fetchAdviceCoverageAreas, fetchClientSelectedCoverageAreas, updateClientSelectedCoverageAreas } from '@/integrations/supabase/adviceCoverage';
import { fetchAdvisorRecommendations, updateAdvisorRecommendations } from '@/integrations/supabase/advisorRecommendations';
import { fetchClientGoalsObjectives, updateClientGoalsObjectives, ClientGoalObjective, GoalCategory, GoalPriority, GoalTimeframe } from '@/integrations/supabase/clientGoalsObjectives';

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
  const [showLifestyleModal, setShowLifestyleModal] = useState(false);
  const [showInvestmentModal, setShowInvestmentModal] = useState(false);
  const [showSuperannuationModal, setShowSuperannuationModal] = useState(false);
  const [showClientLoansModal, setShowClientLoansModal] = useState(false);
  const [showClientInsuranceModal, setShowClientInsuranceModal] = useState(false);
  const [showAdviceReasonsModal, setShowAdviceReasonsModal] = useState(false);
  const [showAdviceCoverageModal, setShowAdviceCoverageModal] = useState(false);
  const [showRecommendationsModal, setShowRecommendationsModal] = useState(false);
  const [showGoalsObjectivesModal, setShowGoalsObjectivesModal] = useState(false);
  // Asset state: up to 8 assets
  const [lifestyleAssets, setLifestyleAssets] = useState([
    { name: '', value: '', owner: 'Client 1' },
  ]);
  // Investment assets state: up to 8 assets
  const [investmentAssets, setInvestmentAssets] = useState([
    { name: '', value: '', owner: 'Client 1', asset_type: 'Shares' },
  ]);
  const [superannuationAssets, setSuperannuationAssets] = useState([
    { name: '', value: '', owner: 'Client 1', fund_type: 'Industry' },
  ]);
  // Client loans state: up to 8 loans
  const [clientLoans, setClientLoans] = useState([
    { name: '', value: '', owner: 'Client 1', loan_type: 'Mortgage' },
  ]);
  const [clientInsurance, setClientInsurance] = useState([
    { name: '', value: '', owner: 'Client 1', insurance_type: 'Life' },
  ]);
  // Loading states for modals
  const [lifestyleLoading, setLifestyleLoading] = useState(false);
  const [investmentLoading, setInvestmentLoading] = useState(false);
  const [superannuationLoading, setSuperannuationLoading] = useState(false);
  const [clientLoansLoading, setClientLoansLoading] = useState(false);
  const [clientInsuranceLoading, setClientInsuranceLoading] = useState(false);
  const [adviceReasonsLoading, setAdviceReasonsLoading] = useState(false);
  const [adviceCoverageLoading, setAdviceCoverageLoading] = useState(false);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  const [goalsObjectivesLoading, setGoalsObjectivesLoading] = useState(false);
  const [adviceReasons, setAdviceReasons] = useState<Array<{ id: string; reason_text: string; category: string }>>([]);
  const [selectedReasonIds, setSelectedReasonIds] = useState<string[]>([]);
  const [reasonStatements, setReasonStatements] = useState<Record<string, string>>({});
  const [adviceCoverageAreas, setAdviceCoverageAreas] = useState<Array<{ id: string; coverage_text: string; category: string }>>([]);
  const [selectedCoverageAreaIds, setSelectedCoverageAreaIds] = useState<string[]>([]);
  const [coverageAreaStatements, setCoverageAreaStatements] = useState<Record<string, string>>({});
  const [recommendations, setRecommendations] = useState<Array<{ recommendation_text: string }>>([
    { recommendation_text: '' },
    { recommendation_text: '' },
    { recommendation_text: '' },
    { recommendation_text: '' },
    { recommendation_text: '' },
    { recommendation_text: '' },
    { recommendation_text: '' },
    { recommendation_text: '' }
  ]);
  const [goalsObjectives, setGoalsObjectives] = useState<ClientGoalObjective[]>([
    { client_id: client.id, category: 'Retirement', statement: '', priority: 'Medium', amount: 0, timeframe: 'Up to Five Years' },
    { client_id: client.id, category: 'Cash Flow', statement: '', priority: 'Medium', amount: 0, timeframe: 'Up to Five Years' },
    { client_id: client.id, category: 'Reduce Debt', statement: '', priority: 'Medium', amount: 0, timeframe: 'Up to Five Years' }
  ]);
  // Calculate sums
  const lifestyleSum = lifestyleAssets.reduce((sum, asset) => sum + (parseFloat(asset.value) || 0), 0);
  const investmentSum = investmentAssets.reduce((sum, asset) => sum + (parseFloat(asset.value) || 0), 0);
  const superannuationSum = superannuationAssets.reduce((sum, asset) => sum + (parseFloat(asset.value) || 0), 0);
  const clientLoansSum = clientLoans.reduce((sum, loan) => sum + (parseFloat(loan.value) || 0), 0);
  const clientInsuranceSum = clientInsurance.reduce((sum, insurance) => sum + (parseFloat(insurance.value) || 0), 0);
  // Add asset row
  const addAssetRow = () => {
    if (lifestyleAssets.length < 8) {
      setLifestyleAssets([...lifestyleAssets, { name: '', value: '', owner: 'Client 1' }]);
    }
  };
  // Add investment asset row
  const addInvestmentRow = () => {
    if (investmentAssets.length < 8) {
      setInvestmentAssets([...investmentAssets, { name: '', value: '', owner: 'Client 1', asset_type: 'Shares' }]);
    }
  };
  const addSuperannuationRow = () => {
    if (superannuationAssets.length < 8) {
      setSuperannuationAssets([...superannuationAssets, { name: '', value: '', owner: 'Client 1', fund_type: 'Industry' }]);
    }
  };
  const addClientLoansRow = () => {
    if (clientLoans.length < 8) {
      setClientLoans([...clientLoans, { name: '', value: '', owner: 'Client 1', loan_type: 'Mortgage' }]);
    }
  };
  const addClientInsuranceRow = () => {
    if (clientInsurance.length < 8) {
      setClientInsurance([...clientInsurance, { name: '', value: '', owner: 'Client 1', insurance_type: 'Life' }]);
    }
  };
  // Remove asset row
  const removeAssetRow = (idx: number) => {
    if (lifestyleAssets.length > 1) {
      setLifestyleAssets(lifestyleAssets.filter((_, i) => i !== idx));
    }
  };
  // Remove investment asset row
  const removeInvestmentRow = (idx: number) => {
    if (investmentAssets.length > 1) {
      setInvestmentAssets(investmentAssets.filter((_, i) => i !== idx));
    }
  };
  const removeSuperannuationRow = (idx: number) => {
    if (superannuationAssets.length > 1) {
      setSuperannuationAssets(superannuationAssets.filter((_, i) => i !== idx));
    }
  };
  const removeClientLoansRow = (idx: number) => {
    if (clientLoans.length > 1) {
      setClientLoans(clientLoans.filter((_, i) => i !== idx));
    }
  };
  const removeClientInsuranceRow = (idx: number) => {
    if (clientInsurance.length > 1) {
      setClientInsurance(clientInsurance.filter((_, i) => i !== idx));
    }
  };
  // Fetch lifestyle assets on modal open
  useEffect(() => {
    if (showLifestyleModal) {
      setLifestyleLoading(true);
      fetchLifestyleAssets(client.id)
        .then((result) => {
          if (result.error) {
            toast({
              title: 'Error fetching lifestyle assets',
              description: result.error,
              variant: 'destructive',
            });
            setLifestyleAssets([{ name: '', value: '', owner: 'Client 1' }]);
          } else if (result.assets.length > 0) {
            setLifestyleAssets(
              result.assets.map(a => ({ name: a.name, value: a.value.toString(), owner: a.owner }))
            );
          } else {
            setLifestyleAssets([{ name: '', value: '', owner: 'Client 1' }]);
          }
        })
        .finally(() => setLifestyleLoading(false));
    }
  }, [showLifestyleModal, client.id]);

  // Fetch investment assets on modal open
  useEffect(() => {
    if (showInvestmentModal) {
      setInvestmentLoading(true);
      fetchInvestmentAssets(client.id)
        .then((result) => {
          if (result.error) {
            toast({
              title: 'Error fetching investment assets',
              description: result.error,
              variant: 'destructive',
            });
            setInvestmentAssets([{ name: '', value: '', owner: 'Client 1', asset_type: 'Shares' }]);
          } else if (result.assets.length > 0) {
            setInvestmentAssets(
              result.assets.map(a => ({ 
                name: a.name, 
                value: a.value.toString(), 
                owner: a.owner,
                asset_type: a.asset_type
              }))
            );
          } else {
            setInvestmentAssets([{ name: '', value: '', owner: 'Client 1', asset_type: 'Shares' }]);
          }
        })
        .finally(() => setInvestmentLoading(false));
    }
  }, [showInvestmentModal, client.id]);

  useEffect(() => {
    if (showSuperannuationModal) {
      setSuperannuationLoading(true);
      fetchSuperannuationAssets(client.id)
        .then((result) => {
          if (result.error) {
            toast({
              title: 'Error fetching superannuation assets',
              description: result.error,
              variant: 'destructive',
            });
            setSuperannuationAssets([{ name: '', value: '', owner: 'Client 1', fund_type: 'Industry' }]);
          } else if (result.assets.length > 0) {
            setSuperannuationAssets(
              result.assets.map(a => ({ name: a.name, value: a.value.toString(), owner: a.owner, fund_type: a.fund_type }))
            );
          } else {
            setSuperannuationAssets([{ name: '', value: '', owner: 'Client 1', fund_type: 'Industry' }]);
          }
        })
        .finally(() => setSuperannuationLoading(false));
    }
  }, [showSuperannuationModal, client.id]);

  useEffect(() => {
    if (showClientLoansModal) {
      setClientLoansLoading(true);
      fetchClientLoans(client.id)
        .then((result) => {
          if (result.error) {
            toast({
              title: 'Error fetching client loans',
              description: result.error,
              variant: 'destructive',
            });
            setClientLoans([{ name: '', value: '', owner: 'Client 1', loan_type: 'Mortgage' }]);
          } else if (result.loans.length > 0) {
            setClientLoans(
              result.loans.map(a => ({ name: a.name, value: a.value.toString(), owner: a.owner, loan_type: a.loan_type }))
            );
          } else {
            setClientLoans([{ name: '', value: '', owner: 'Client 1', loan_type: 'Mortgage' }]);
          }
        })
        .finally(() => setClientLoansLoading(false));
    }
  }, [showClientLoansModal, client.id]);

  useEffect(() => {
    if (showClientInsuranceModal) {
      setClientInsuranceLoading(true);
      fetchClientInsurance(client.id)
        .then((result) => {
          if (result.error) {
            toast({
              title: 'Error fetching client insurance',
              description: result.error,
              variant: 'destructive',
            });
            setClientInsurance([{ name: '', value: '', owner: 'Client 1', insurance_type: 'Life' }]);
          } else if (result.insurance.length > 0) {
            setClientInsurance(
              result.insurance.map(a => ({ name: a.name, value: a.value.toString(), owner: a.owner, insurance_type: a.insurance_type }))
            );
          } else {
            setClientInsurance([{ name: '', value: '', owner: 'Client 1', insurance_type: 'Life' }]);
          }
        })
        .finally(() => setClientInsuranceLoading(false));
    }
  }, [showClientInsuranceModal, client.id]);

  useEffect(() => {
    if (showAdviceReasonsModal) {
      setAdviceReasonsLoading(true);
      
      // Fetch all available advice reasons
      fetchAdviceReasons()
        .then((result) => {
          if (result.error) {
            toast({
              title: 'Error fetching advice reasons',
              description: result.error,
              variant: 'destructive',
            });
            setAdviceReasons([]);
          } else {
            setAdviceReasons(result.reasons);
            
            // Fetch selected reasons for this client
            return fetchClientSelectedReasons(client.id);
          }
        })
        .then((result) => {
          if (result && !result.error) {
            setSelectedReasonIds(result.selectedReasons);
            setReasonStatements(result.reasonStatements || {});
          }
        })
        .catch((err) => {
          console.error('Error loading advice reasons:', err);
          toast({
            title: 'Failed to load advice reasons',
            description: err.message || 'Unknown error',
            variant: 'destructive',
          });
        })
        .finally(() => setAdviceReasonsLoading(false));
    }
  }, [showAdviceReasonsModal, client.id, toast]);

  useEffect(() => {
    if (showAdviceCoverageModal) {
      setAdviceCoverageLoading(true);
      
      // Fetch all available advice coverage areas
      fetchAdviceCoverageAreas()
        .then((result) => {
          if (result.error) {
            toast({
              title: 'Error fetching advice coverage areas',
              description: result.error,
              variant: 'destructive',
            });
            setAdviceCoverageAreas([]);
          } else {
            setAdviceCoverageAreas(result.coverageAreas);
            
            // Fetch selected coverage areas for this client
            return fetchClientSelectedCoverageAreas(client.id);
          }
        })
        .then((result) => {
          if (result && !result.error) {
            setSelectedCoverageAreaIds(result.selectedCoverageAreaIds);
            setCoverageAreaStatements(result.coverageAreaStatements || {});
          }
        })
        .catch((err) => {
          console.error('Error loading advice coverage areas:', err);
          toast({
            title: 'Failed to load advice coverage areas',
            description: err.message || 'Unknown error',
            variant: 'destructive',
          });
        })
        .finally(() => setAdviceCoverageLoading(false));
    }
  }, [showAdviceCoverageModal, client.id, toast]);

  useEffect(() => {
    if (showRecommendationsModal) {
      setRecommendationsLoading(true);
      fetchAdvisorRecommendations(client.id)
        .then((result) => {
          if (result.error) {
            toast({
              title: 'Error fetching advisor recommendations',
              description: result.error,
              variant: 'destructive',
            });
            setRecommendations([
              { recommendation_text: '' },
              { recommendation_text: '' },
              { recommendation_text: '' },
              { recommendation_text: '' },
              { recommendation_text: '' },
              { recommendation_text: '' },
              { recommendation_text: '' },
              { recommendation_text: '' }
            ]);
          } else {
            // Ensure we always have 8 recommendation slots
            const existingRecommendations = result.recommendations || [];
            const recommendationsArray = Array(8).fill({ recommendation_text: '' });
            
            // Fill in existing recommendations
            existingRecommendations.forEach((rec, index) => {
              if (index < 8) {
                recommendationsArray[index] = rec;
              }
            });
            
            setRecommendations(recommendationsArray);
          }
        })
        .finally(() => setRecommendationsLoading(false));
    }
  }, [showRecommendationsModal, client.id]);

  useEffect(() => {
    if (showGoalsObjectivesModal) {
      setGoalsObjectivesLoading(true);
      fetchClientGoalsObjectives(client.id)
        .then((result) => {
          if (result.error) {
            toast({
              title: 'Error fetching client goals and objectives',
              description: result.error,
              variant: 'destructive',
            });
            setGoalsObjectives([
              { client_id: client.id, category: 'Retirement' as GoalCategory, statement: '', priority: 'Medium' as GoalPriority, amount: 0, timeframe: 'Up to Five Years' as GoalTimeframe },
              { client_id: client.id, category: 'Cash Flow' as GoalCategory, statement: '', priority: 'Medium' as GoalPriority, amount: 0, timeframe: 'Up to Five Years' as GoalTimeframe },
              { client_id: client.id, category: 'Reduce Debt' as GoalCategory, statement: '', priority: 'Medium' as GoalPriority, amount: 0, timeframe: 'Up to Five Years' as GoalTimeframe }
            ]);
          } else if (result.goals.length > 0) {
            setGoalsObjectives(result.goals);
          } else {
            setGoalsObjectives([
              { client_id: client.id, category: 'Retirement' as GoalCategory, statement: '', priority: 'Medium' as GoalPriority, amount: 0, timeframe: 'Up to Five Years' as GoalTimeframe },
              { client_id: client.id, category: 'Cash Flow' as GoalCategory, statement: '', priority: 'Medium' as GoalPriority, amount: 0, timeframe: 'Up to Five Years' as GoalTimeframe },
              { client_id: client.id, category: 'Reduce Debt' as GoalCategory, statement: '', priority: 'Medium' as GoalPriority, amount: 0, timeframe: 'Up to Five Years' as GoalTimeframe }
            ]);
          }
        })
        .finally(() => setGoalsObjectivesLoading(false));
    }
  }, [showGoalsObjectivesModal, client.id]);

  // Save handler
  const handleSaveLifestyleAssets = async () => {
    setLifestyleLoading(true);
    try {
      // Only save non-empty assets
      const filtered = lifestyleAssets.filter(a => a.name.trim() && a.value && !isNaN(parseFloat(a.value)));
      const upsertResult = await upsertLifestyleAssets(client.id, filtered.map(a => ({
        name: a.name.trim(),
        value: parseFloat(a.value),
        owner: a.owner,
        client_id: client.id
      })));
      if (!upsertResult.success) {
        toast({
          title: 'Failed to save lifestyle assets',
          description: upsertResult.error || 'Unknown error',
          variant: 'destructive',
        });
        return;
      }
      await updateTotalLifestyleAssets(client.id, filtered.reduce((sum, a) => sum + parseFloat(a.value), 0));
      setShowLifestyleModal(false);
      
      // Update local state to reflect the changes
      const totalValue = filtered.reduce((sum, a) => sum + parseFloat(a.value), 0);
      setEditableClientData(prev => ({
        ...prev,
        total_lifestyle_assets: totalValue
      }));
      
      // Optionally, refresh parent or local state
      if (onDataSaved) onDataSaved();
      toast({
        title: 'Lifestyle assets saved',
        description: 'Assets have been saved successfully.',
        variant: 'default',
      });
    } catch (err: any) {
      toast({
        title: 'Failed to save lifestyle assets',
        description: err.message || 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setLifestyleLoading(false);
    }
  };

  const handleSaveInvestmentAssets = async () => {
    setInvestmentLoading(true);
    try {
      // Only save non-empty assets
      const filtered = investmentAssets.filter(a => a.name.trim() && a.value && !isNaN(parseFloat(a.value)));
      const upsertResult = await upsertInvestmentAssets(client.id, filtered.map(a => ({
        name: a.name.trim(),
        value: parseFloat(a.value),
        owner: a.owner,
        asset_type: a.asset_type,
        client_id: client.id
      })));
      if (!upsertResult.success) {
        toast({
          title: 'Failed to save investment assets',
          description: upsertResult.error || 'Unknown error',
          variant: 'destructive',
        });
        return;
      }
      await updateTotalInvestmentAssets(client.id, filtered.reduce((sum, a) => sum + parseFloat(a.value), 0));
      setShowInvestmentModal(false);
      
      // Update local state to reflect the changes
      const totalValue = filtered.reduce((sum, a) => sum + parseFloat(a.value), 0);
      setEditableClientData(prev => ({
        ...prev,
        total_investment_assets: totalValue
      }));
      
      // Optionally, refresh parent or local state
      if (onDataSaved) onDataSaved();
      toast({
        title: 'Investment assets saved',
        description: 'Assets have been saved successfully.',
        variant: 'default',
      });
    } catch (err: any) {
      toast({
        title: 'Failed to save investment assets',
        description: err.message || 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setInvestmentLoading(false);
    }
  };

  const handleSaveSuperannuationAssets = async () => {
    setSuperannuationLoading(true);
    try {
      // Only save non-empty assets
      const filtered = superannuationAssets.filter(a => a.name.trim() && a.value && !isNaN(parseFloat(a.value)));
      const upsertResult = await upsertSuperannuationAssets(client.id, filtered.map(a => ({
        name: a.name.trim(),
        value: parseFloat(a.value),
        owner: a.owner,
        fund_type: a.fund_type,
        client_id: client.id
      })));
      if (!upsertResult.success) {
        toast({
          title: 'Failed to save superannuation assets',
          description: upsertResult.error || 'Unknown error',
          variant: 'destructive',
        });
        return;
      }
      await updateTotalSuperannuationAssets(client.id, filtered.reduce((sum, a) => sum + parseFloat(a.value), 0));
      setShowSuperannuationModal(false);
      
      // Update local state to reflect the changes
      const totalValue = filtered.reduce((sum, a) => sum + parseFloat(a.value), 0);
      setEditableClientData(prev => ({
        ...prev,
        total_superannuation_assets: totalValue
      }));
      
      // Optionally, refresh parent or local state
      if (onDataSaved) onDataSaved();
      toast({
        title: 'Superannuation assets saved',
        description: 'Assets have been saved successfully.',
        variant: 'default',
      });
    } catch (err: any) {
      toast({
        title: 'Failed to save superannuation assets',
        description: err.message || 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setSuperannuationLoading(false);
    }
  };

  const handleSaveClientLoans = async () => {
    setClientLoansLoading(true);
    try {
      // Only save non-empty loans
      const filtered = clientLoans.filter(a => a.name.trim() && a.value && !isNaN(parseFloat(a.value)));
      const upsertResult = await upsertClientLoans(client.id, filtered.map(a => ({
        name: a.name.trim(),
        value: parseFloat(a.value),
        owner: a.owner,
        loan_type: a.loan_type,
        client_id: client.id
      })));
      if (!upsertResult.success) {
        toast({
          title: 'Failed to save client loans',
          description: upsertResult.error || 'Unknown error',
          variant: 'destructive',
        });
        return;
      }
      await updateTotalClientLoans(client.id, filtered.reduce((sum, a) => sum + parseFloat(a.value), 0));
      setShowClientLoansModal(false);
      
      // Update local state to reflect the changes
      const totalValue = filtered.reduce((sum, a) => sum + parseFloat(a.value), 0);
      setEditableClientData(prev => ({
        ...prev,
        total_client_loans: totalValue
      }));
      
      // Optionally, refresh parent or local state
      if (onDataSaved) onDataSaved();
      toast({
        title: 'Client loans saved',
        description: 'Loans have been saved successfully.',
        variant: 'default',
      });
    } catch (err: any) {
      toast({
        title: 'Failed to save client loans',
        description: err.message || 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setClientLoansLoading(false);
    }
  };

  const handleSaveClientInsurance = async () => {
    setClientInsuranceLoading(true);
    try {
      // Only save non-empty insurance
      const filtered = clientInsurance.filter(a => a.name.trim() && a.value && !isNaN(parseFloat(a.value)));
      const upsertResult = await upsertClientInsurance(client.id, filtered.map(a => ({
        name: a.name.trim(),
        value: parseFloat(a.value),
        owner: a.owner,
        insurance_type: a.insurance_type,
        client_id: client.id
      })));
      if (!upsertResult.success) {
        toast({
          title: 'Failed to save client insurance',
          description: upsertResult.error || 'Unknown error',
          variant: 'destructive',
        });
        return;
      }
      await updateTotalClientInsurance(client.id, filtered.reduce((sum, a) => sum + parseFloat(a.value), 0));
      setShowClientInsuranceModal(false);
      
      // Update local state to reflect the changes
      const totalValue = filtered.reduce((sum, a) => sum + parseFloat(a.value), 0);
      setEditableClientData(prev => ({
        ...prev,
        total_client_insurance: totalValue
      }));
      
      // Optionally, refresh parent or local state
      if (onDataSaved) onDataSaved();
      toast({
        title: 'Client insurance saved',
        description: 'Insurance has been saved successfully.',
        variant: 'default',
      });
    } catch (err: any) {
      toast({
        title: 'Failed to save client insurance',
        description: err.message || 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setClientInsuranceLoading(false);
    }
  };

  const handleSaveAdviceReasons = async () => {
    setAdviceReasonsLoading(true);
    try {
      const updateResult = await updateClientSelectedReasons(client.id, selectedReasonIds, reasonStatements);
      
      if (!updateResult.success) {
        toast({
          title: 'Failed to save advice reasons',
          description: updateResult.error || 'Unknown error',
          variant: 'destructive',
        });
        return;
      }
      
      setShowAdviceReasonsModal(false);
      
      // Optionally, refresh parent or local state
      if (onDataSaved) {
        onDataSaved();
      }
      
      toast({
        title: 'Advice reasons saved',
        description: 'Selected reasons have been saved successfully.',
        variant: 'default',
      });
    } catch (err: any) {
      toast({
        title: 'Failed to save advice reasons',
        description: err.message || 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setAdviceReasonsLoading(false);
    }
  };

  const handleSaveAdviceCoverage = async () => {
    setAdviceCoverageLoading(true);
    try {
      const updateResult = await updateClientSelectedCoverageAreas(client.id, selectedCoverageAreaIds, coverageAreaStatements);
      
      if (!updateResult.success) {
        toast({
          title: 'Failed to save advice coverage',
          description: updateResult.error || 'Unknown error',
          variant: 'destructive',
        });
        return;
      }
      
      setShowAdviceCoverageModal(false);
      
      // Optionally, refresh parent or local state
      if (onDataSaved) {
        onDataSaved();
      }
      
      toast({
        title: 'Advice coverage saved',
        description: 'Selected coverage areas have been saved successfully.',
        variant: 'default',
      });
    } catch (err: any) {
      toast({
        title: 'Failed to save advice coverage',
        description: err.message || 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setAdviceCoverageLoading(false);
    }
  };

  const handleSaveRecommendations = async () => {
    setRecommendationsLoading(true);
    try {
      const updateResult = await updateAdvisorRecommendations(client.id, recommendations);
      
      if (!updateResult.success) {
        toast({
          title: 'Failed to save advisor recommendations',
          description: updateResult.error || 'Unknown error',
          variant: 'destructive',
        });
        return;
      }
      
      setShowRecommendationsModal(false);
      
      // Optionally, refresh parent or local state
      if (onDataSaved) {
        onDataSaved();
      }
      
      toast({
        title: 'Advisor recommendations saved',
        description: 'Recommendations have been saved successfully.',
        variant: 'default',
      });
    } catch (err: any) {
      toast({
        title: 'Failed to save advisor recommendations',
        description: err.message || 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setRecommendationsLoading(false);
    }
  };

  const handleSaveGoalsObjectives = async () => {
    setGoalsObjectivesLoading(true);
    try {
      const updateResult = await updateClientGoalsObjectives(client.id, goalsObjectives);
      
      if (!updateResult.success) {
        toast({
          title: 'Failed to save goals and objectives',
          description: updateResult.error || 'Unknown error',
          variant: 'destructive',
        });
        return;
      }
      
      setShowGoalsObjectivesModal(false);
      
      // Optionally, refresh parent or local state
      if (onDataSaved) {
        onDataSaved();
      }
      
      toast({
        title: 'Goals and objectives saved',
        description: 'Goals and objectives have been saved successfully.',
        variant: 'default',
      });
    } catch (err: any) {
      toast({
        title: 'Failed to save goals and objectives',
        description: err.message || 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setGoalsObjectivesLoading(false);
    }
  };

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
- Total Superannuation Assets: ${formatCurrency(client.total_superannuation_assets || 0)}
- Total Client Loans: ${formatCurrency(client.total_client_loans || 0)}
- Total Client Insurance: ${formatCurrency(client.total_client_insurance || 0)}

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

    if (type === 'number' || field.includes('salary') || field.includes('balance') || field.includes('tax') || field.includes('received') || field.includes('assets') || field.includes('expenses') || field.includes('loans') || field.includes('insurance')) {
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
    const actualFieldKey = (field === 'total_lifestyle_assets' || field === 'total_living_expenses' || field === 'total_investment_assets' || field === 'total_superannuation_assets' || field === 'total_client_loans' || field === 'total_client_insurance' || field === 'consultation_date' || field === 'advisor_name' || field === 'advisor_advice')
      ? field
      : (clientIndex === 2 ? `client2_${field}` : `client1_${field}`) as keyof ClientData;

    console.log(`Field mapping: ${String(field)} → ${String(actualFieldKey)}`);
    
    if (clientIndex === 2 && !(actualFieldKey in editableClientData)) {
      return null;
    }

    const value = editableClientData[actualFieldKey];
    
    console.log(`Rendering field: ${String(actualFieldKey)}, value:`, value);

    if (field.includes('salary') || field.includes('balance') || field.includes('tax') || field.includes('received') || field.includes('assets') || field.includes('expenses') || field.includes('loans') || field.includes('insurance')) {
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
              <TableCell className="font-medium">Total Superannuation Assets</TableCell>
              <TableCell colSpan={client.client2_name ? 2 : 1}>
                {renderEditableCell('total_superannuation_assets', null)}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Total Client Loans</TableCell>
              <TableCell colSpan={client.client2_name ? 2 : 1}>
                {renderEditableCell('total_client_loans', null)}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Total Client Insurance</TableCell>
              <TableCell colSpan={client.client2_name ? 2 : 1}>
                {renderEditableCell('total_client_insurance', null)}
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
                {renderEditableCell('advisor_name', null)}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium flex items-center gap-2">
                Reasons for seeking advice
                <button
                  type="button"
                  className="ml-2 p-1 rounded hover:bg-gray-100"
                  aria-label="Select reasons for seeking advice"
                  onClick={() => setShowAdviceReasonsModal(true)}
                >
                  <Plus size={16} />
                </button>
              </TableCell>
              <TableCell colSpan={client.client2_name ? 2 : 1}>
                {selectedReasonIds.length > 0 ? (
                  <div className="text-sm text-gray-600">
                    {selectedReasonIds.length} reason{selectedReasonIds.length !== 1 ? 's' : ''} selected
                  </div>
                ) : (
                  <div className="text-sm text-gray-400 italic">No reasons selected</div>
                )}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium flex items-center gap-2">
                Advice Coverage Areas
                <button
                  type="button"
                  className="ml-2 p-1 rounded hover:bg-gray-100"
                  aria-label="Select advice coverage areas"
                  onClick={() => setShowAdviceCoverageModal(true)}
                >
                  <Plus size={16} />
                </button>
              </TableCell>
              <TableCell colSpan={client.client2_name ? 2 : 1}>
                {selectedCoverageAreaIds.length > 0 ? (
                  <div className="text-sm text-gray-600">
                    {selectedCoverageAreaIds.length} area{selectedCoverageAreaIds.length !== 1 ? 's' : ''} selected
                  </div>
                ) : (
                  <div className="text-sm text-gray-400 italic">No areas selected</div>
                )}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium flex items-center gap-2">
                Advisor Recommendations
                <button
                  type="button"
                  className="ml-2 p-1 rounded hover:bg-gray-100"
                  aria-label="Add advisor recommendations"
                  onClick={() => setShowRecommendationsModal(true)}
                >
                  <Plus size={16} />
                </button>
              </TableCell>
              <TableCell colSpan={client.client2_name ? 2 : 1}>
                {recommendations.length > 0 ? (
                  <div className="text-sm text-gray-600">
                    {recommendations.length} recommendation{recommendations.length !== 1 ? 's' : ''}
                  </div>
                ) : (
                  <div className="text-sm text-gray-400 italic">No recommendations</div>
                )}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Other Advisor Comments</TableCell>
              <TableCell colSpan={client.client2_name ? 2 : 1}>
                {renderEditableCell('advisor_advice', null)}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium flex items-center gap-2">
                Goals and Objectives
                <button
                  type="button"
                  className="ml-2 p-1 rounded hover:bg-gray-100"
                  aria-label="Add goals and objectives"
                  onClick={() => setShowGoalsObjectivesModal(true)}
                >
                  <Plus size={16} />
                </button>
              </TableCell>
              <TableCell colSpan={client.client2_name ? 2 : 1}>
                {goalsObjectives.length > 0 ? (
                  <div className="text-sm text-gray-600">
                    {goalsObjectives.length} goal{goalsObjectives.length !== 1 ? 's' : ''}
                  </div>
                ) : (
                  <div className="text-sm text-gray-400 italic">No goals</div>
                )}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
      {/* Lifestyle Assets Modal */}
      <Dialog open={showLifestyleModal} onOpenChange={setShowLifestyleModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Lifestyle Assets</DialogTitle>
            <DialogDescription>
              Add up to eight lifestyle assets. Assign each to Client 1, Client 2, or Joint.
            </DialogDescription>
          </DialogHeader>
          {lifestyleLoading ? (
            <div className="text-center text-gray-500 py-8">Loading...</div>
          ) : (
            <>
              <div className="space-y-4">
                {lifestyleAssets.map((asset, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input
                      type="text"
                      placeholder="Asset name"
                      className="border rounded px-2 py-1 flex-1"
                      value={asset.name}
                      onChange={e => {
                        const updated = [...lifestyleAssets];
                        updated[idx].name = e.target.value;
                        setLifestyleAssets(updated);
                      }}
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Value"
                      className="border rounded px-2 py-1 w-28"
                      value={asset.value}
                      onChange={e => {
                        const updated = [...lifestyleAssets];
                        updated[idx].value = e.target.value;
                        setLifestyleAssets(updated);
                      }}
                    />
                    <select
                      className="border rounded px-2 py-1"
                      value={asset.owner}
                      onChange={e => {
                        const updated = [...lifestyleAssets];
                        updated[idx].owner = e.target.value;
                        setLifestyleAssets(updated);
                      }}
                    >
                      <option value="Client 1">Client 1</option>
                      <option value="Client 2">Client 2</option>
                      <option value="Joint">Joint</option>
                    </select>
                    {lifestyleAssets.length > 1 && (
                      <button
                        type="button"
                        className="ml-1 px-2 py-1 text-red-500 hover:text-red-700"
                        aria-label="Remove asset"
                        onClick={() => removeAssetRow(idx)}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                {lifestyleAssets.length < 8 && (
                  <button
                    type="button"
                    className="mt-2 px-3 py-1 rounded bg-green-100 hover:bg-green-200 text-green-800 border border-green-300"
                    onClick={addAssetRow}
                  >
                    + Add Asset
                  </button>
                )}
              </div>
              <div className="mt-4 font-semibold text-right">
                Total: ${lifestyleSum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  className="px-4 py-2 rounded border bg-gray-100 hover:bg-gray-200"
                  onClick={() => setShowLifestyleModal(false)}
                  disabled={lifestyleLoading}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
                  onClick={handleSaveLifestyleAssets}
                  disabled={lifestyleLoading}
                >
                  Save
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      {/* Investment Assets Modal */}
      <Dialog open={showInvestmentModal} onOpenChange={setShowInvestmentModal}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Investment Assets</DialogTitle>
            <DialogDescription>
              Add up to eight investment assets. Assign each to Client 1, Client 2, or Joint.
            </DialogDescription>
          </DialogHeader>
          {investmentLoading ? (
            <div className="text-center text-gray-500 py-8">Loading...</div>
          ) : (
            <>
              <div className="space-y-4">
                {investmentAssets.map((asset, idx) => (
                  <div key={idx} className="flex gap-2 items-center p-2 border rounded">
                    <input
                      type="text"
                      placeholder="Asset name"
                      className="border rounded px-2 py-1 flex-1"
                      value={asset.name}
                      onChange={e => {
                        const updated = [...investmentAssets];
                        updated[idx].name = e.target.value;
                        setInvestmentAssets(updated);
                      }}
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Value"
                      className="border rounded px-2 py-1 w-28"
                      value={asset.value}
                      onChange={e => {
                        const updated = [...investmentAssets];
                        updated[idx].value = e.target.value;
                        setInvestmentAssets(updated);
                      }}
                    />
                    <select
                      className="border rounded px-2 py-1 w-28"
                      value={asset.owner}
                      onChange={e => {
                        const updated = [...investmentAssets];
                        updated[idx].owner = e.target.value;
                        setInvestmentAssets(updated);
                      }}
                    >
                      <option value="Client 1">Client 1</option>
                      <option value="Client 2">Client 2</option>
                      <option value="Joint">Joint</option>
                    </select>
                    <select
                      className="border rounded px-2 py-1 w-32"
                      value={asset.asset_type}
                      onChange={e => {
                        const updated = [...investmentAssets];
                        updated[idx].asset_type = e.target.value;
                        setInvestmentAssets(updated);
                      }}
                    >
                      <option value="Shares">Shares</option>
                      <option value="Bonds">Bonds</option>
                      <option value="Real Estate">Real Estate</option>
                    </select>
                    {investmentAssets.length > 1 && (
                      <button
                        type="button"
                        className="ml-1 px-2 py-1 text-red-500 hover:text-red-700"
                        aria-label="Remove asset"
                        onClick={() => removeInvestmentRow(idx)}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                {investmentAssets.length < 8 && (
                  <button
                    type="button"
                    className="mt-2 px-3 py-1 rounded bg-green-100 hover:bg-green-200 text-green-800 border border-green-300"
                    onClick={addInvestmentRow}
                  >
                    + Add Asset
                  </button>
                )}
              </div>
              <div className="mt-4 font-semibold text-right">
                Total: ${investmentSum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  className="px-4 py-2 rounded border bg-gray-100 hover:bg-gray-200"
                  onClick={() => setShowInvestmentModal(false)}
                  disabled={investmentLoading}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
                  onClick={handleSaveInvestmentAssets}
                  disabled={investmentLoading}
                >
                  Save
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      {/* Superannuation Assets Modal */}
      <Dialog open={showSuperannuationModal} onOpenChange={setShowSuperannuationModal}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Superannuation Assets</DialogTitle>
            <DialogDescription>
              Add up to eight superannuation assets. Assign each to Client 1, Client 2, or Joint.
            </DialogDescription>
          </DialogHeader>
          {superannuationLoading ? (
            <div className="text-center text-gray-500 py-8">Loading...</div>
          ) : (
            <>
              <div className="space-y-4">
                {superannuationAssets.map((asset, idx) => (
                  <div key={idx} className="flex gap-2 items-center p-2 border rounded">
                    <input
                      type="text"
                      placeholder="Asset name"
                      className="border rounded px-2 py-1 flex-1"
                      value={asset.name}
                      onChange={e => {
                        const updated = [...superannuationAssets];
                        updated[idx].name = e.target.value;
                        setSuperannuationAssets(updated);
                      }}
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Value"
                      className="border rounded px-2 py-1 w-28"
                      value={asset.value}
                      onChange={e => {
                        const updated = [...superannuationAssets];
                        updated[idx].value = e.target.value;
                        setSuperannuationAssets(updated);
                      }}
                    />
                    <select
                      className="border rounded px-2 py-1 w-28"
                      value={asset.owner}
                      onChange={e => {
                        const updated = [...superannuationAssets];
                        updated[idx].owner = e.target.value;
                        setSuperannuationAssets(updated);
                      }}
                    >
                      <option value="Client 1">Client 1</option>
                      <option value="Client 2">Client 2</option>
                      <option value="Joint">Joint</option>
                    </select>
                    <select
                      className="border rounded px-2 py-1 w-32"
                      value={asset.fund_type}
                      onChange={e => {
                        const updated = [...superannuationAssets];
                        updated[idx].fund_type = e.target.value;
                        setSuperannuationAssets(updated);
                      }}
                    >
                      <option value="Industry">Industry</option>
                      <option value="Retail">Retail</option>
                      <option value="SMSF">SMSF</option>
                    </select>
                    {superannuationAssets.length > 1 && (
                      <button
                        type="button"
                        className="ml-1 px-2 py-1 text-red-500 hover:text-red-700"
                        aria-label="Remove asset"
                        onClick={() => removeSuperannuationRow(idx)}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                {superannuationAssets.length < 8 && (
                  <button
                    type="button"
                    className="mt-2 px-3 py-1 rounded bg-green-100 hover:bg-green-200 text-green-800 border border-green-300"
                    onClick={addSuperannuationRow}
                  >
                    + Add Asset
                  </button>
                )}
              </div>
              <div className="mt-4 font-semibold text-right">
                Total: ${superannuationSum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  className="px-4 py-2 rounded border bg-gray-100 hover:bg-gray-200"
                  onClick={() => setShowSuperannuationModal(false)}
                  disabled={superannuationLoading}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
                  onClick={handleSaveSuperannuationAssets}
                  disabled={superannuationLoading}
                >
                  Save
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      {/* Client Loans Modal */}
      <Dialog open={showClientLoansModal} onOpenChange={setShowClientLoansModal}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Client Loans</DialogTitle>
            <DialogDescription>
              Add up to eight client loans. Assign each to Client 1, Client 2, or Joint.
            </DialogDescription>
          </DialogHeader>
          {clientLoansLoading ? (
            <div className="text-center text-gray-500 py-8">Loading...</div>
          ) : (
            <>
              <div className="space-y-4">
                {clientLoans.map((loan, idx) => (
                  <div key={idx} className="flex gap-2 items-center p-2 border rounded">
                    <input
                      type="text"
                      placeholder="Loan name"
                      className="border rounded px-2 py-1 flex-1"
                      value={loan.name}
                      onChange={e => {
                        const updated = [...clientLoans];
                        updated[idx].name = e.target.value;
                        setClientLoans(updated);
                      }}
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Value"
                      className="border rounded px-2 py-1 w-28"
                      value={loan.value}
                      onChange={e => {
                        const updated = [...clientLoans];
                        updated[idx].value = e.target.value;
                        setClientLoans(updated);
                      }}
                    />
                    <select
                      className="border rounded px-2 py-1 w-28"
                      value={loan.owner}
                      onChange={e => {
                        const updated = [...clientLoans];
                        updated[idx].owner = e.target.value;
                        setClientLoans(updated);
                      }}
                    >
                      <option value="Client 1">Client 1</option>
                      <option value="Client 2">Client 2</option>
                      <option value="Joint">Joint</option>
                    </select>
                    <select
                      className="border rounded px-2 py-1 w-32"
                      value={loan.loan_type}
                      onChange={e => {
                        const updated = [...clientLoans];
                        updated[idx].loan_type = e.target.value;
                        setClientLoans(updated);
                      }}
                    >
                      <option value="Mortgage">Mortgage</option>
                      <option value="Personal Loan">Personal Loan</option>
                      <option value="Credit Card">Credit Card</option>
                    </select>
                    {clientLoans.length > 1 && (
                      <button
                        type="button"
                        className="ml-1 px-2 py-1 text-red-500 hover:text-red-700"
                        aria-label="Remove loan"
                        onClick={() => removeClientLoansRow(idx)}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                {clientLoans.length < 8 && (
                  <button
                    type="button"
                    className="mt-2 px-3 py-1 rounded bg-green-100 hover:bg-green-200 text-green-800 border border-green-300"
                    onClick={addClientLoansRow}
                  >
                    + Add Loan
                  </button>
                )}
              </div>
              <div className="mt-4 font-semibold text-right">
                Total: ${clientLoansSum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  className="px-4 py-2 rounded border bg-gray-100 hover:bg-gray-200"
                  onClick={() => setShowClientLoansModal(false)}
                  disabled={clientLoansLoading}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
                  onClick={handleSaveClientLoans}
                  disabled={clientLoansLoading}
                >
                  Save
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      {/* Client Insurance Modal */}
      <Dialog open={showClientInsuranceModal} onOpenChange={setShowClientInsuranceModal}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Client Insurance</DialogTitle>
            <DialogDescription>
              Add up to eight client insurance. Assign each to Client 1, Client 2, or Joint.
            </DialogDescription>
          </DialogHeader>
          {clientInsuranceLoading ? (
            <div className="text-center text-gray-500 py-8">Loading...</div>
          ) : (
            <>
              <div className="space-y-4">
                {clientInsurance.map((insurance, idx) => (
                  <div key={idx} className="flex gap-2 items-center p-2 border rounded">
                    <input
                      type="text"
                      placeholder="Insurance name"
                      className="border rounded px-2 py-1 flex-1"
                      value={insurance.name}
                      onChange={e => {
                        const updated = [...clientInsurance];
                        updated[idx].name = e.target.value;
                        setClientInsurance(updated);
                      }}
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Value"
                      className="border rounded px-2 py-1 w-28"
                      value={insurance.value}
                      onChange={e => {
                        const updated = [...clientInsurance];
                        updated[idx].value = e.target.value;
                        setClientInsurance(updated);
                      }}
                    />
                    <select
                      className="border rounded px-2 py-1 w-28"
                      value={insurance.owner}
                      onChange={e => {
                        const updated = [...clientInsurance];
                        updated[idx].owner = e.target.value;
                        setClientInsurance(updated);
                      }}
                    >
                      <option value="Client 1">Client 1</option>
                      <option value="Client 2">Client 2</option>
                      <option value="Joint">Joint</option>
                    </select>
                    <select
                      className="border rounded px-2 py-1 w-32"
                      value={insurance.insurance_type}
                      onChange={e => {
                        const updated = [...clientInsurance];
                        updated[idx].insurance_type = e.target.value;
                        setClientInsurance(updated);
                      }}
                    >
                      <option value="Life">Life</option>
                      <option value="TPD">TPD</option>
                      <option value="Income Protection">Income Protection</option>
                    </select>
                    {clientInsurance.length > 1 && (
                      <button
                        type="button"
                        className="ml-1 px-2 py-1 text-red-500 hover:text-red-700"
                        aria-label="Remove insurance"
                        onClick={() => removeClientInsuranceRow(idx)}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                {clientInsurance.length < 8 && (
                  <button
                    type="button"
                    className="mt-2 px-3 py-1 rounded bg-green-100 hover:bg-green-200 text-green-800 border border-green-300"
                    onClick={addClientInsuranceRow}
                  >
                    + Add Insurance
                  </button>
                )}
              </div>
              <div className="mt-4 font-semibold text-right">
                Total: ${clientInsuranceSum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  className="px-4 py-2 rounded border bg-gray-100 hover:bg-gray-200"
                  onClick={() => setShowClientInsuranceModal(false)}
                  disabled={clientInsuranceLoading}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
                  onClick={handleSaveClientInsurance}
                  disabled={clientInsuranceLoading}
                >
                  Save
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      {/* Advice Reasons Modal */}
      <Dialog open={showAdviceReasonsModal} onOpenChange={setShowAdviceReasonsModal}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Reasons for Seeking Advice</DialogTitle>
            <DialogDescription>
              Select the reasons why the client is seeking financial advice.
            </DialogDescription>
          </DialogHeader>
          {adviceReasonsLoading ? (
            <div className="text-center text-gray-500 py-8">Loading...</div>
          ) : (
            <>
              <div className="space-y-2">
                {/* Group reasons by category */}
                {Array.from(new Set(adviceReasons.map(reason => reason.category))).map(category => (
                  <div key={category} className="border rounded p-2">
                    <h3 className="font-medium text-md mb-2">{category}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                      {adviceReasons
                        .filter(reason => reason.category === category)
                        .map(reason => (
                          <div key={reason.id} className="flex flex-col space-y-1">
                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id={`reason-${reason.id}`}
                                checked={selectedReasonIds.includes(reason.id)}
                                onChange={e => {
                                  if (e.target.checked) {
                                    setSelectedReasonIds([...selectedReasonIds, reason.id]);
                                  } else {
                                    setSelectedReasonIds(selectedReasonIds.filter(id => id !== reason.id));
                                    // Clear statement when unchecking
                                    const newStatements = { ...reasonStatements };
                                    delete newStatements[reason.id];
                                    setReasonStatements(newStatements);
                                  }
                                }}
                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <label htmlFor={`reason-${reason.id}`} className="text-sm text-gray-700">
                                {reason.reason_text}
                              </label>
                            </div>
                            {selectedReasonIds.includes(reason.id) && (
                              <div className="ml-6 mt-1">
                                <input
                                  type="text"
                                  placeholder="Add statement (optional)"
                                  value={reasonStatements[reason.id] || ''}
                                  onChange={e => {
                                    setReasonStatements({
                                      ...reasonStatements,
                                      [reason.id]: e.target.value
                                    });
                                  }}
                                  className="w-full text-sm p-1 border rounded"
                                />
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  className="px-4 py-2 rounded border bg-gray-100 hover:bg-gray-200"
                  onClick={() => setShowAdviceReasonsModal(false)}
                  disabled={adviceReasonsLoading}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
                  onClick={handleSaveAdviceReasons}
                  disabled={adviceReasonsLoading}
                >
                  Save
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      {/* Advice Coverage Modal */}
      <Dialog open={showAdviceCoverageModal} onOpenChange={setShowAdviceCoverageModal}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Advice Coverage Areas</DialogTitle>
            <DialogDescription>
              Select the areas where the client is seeking financial advice.
            </DialogDescription>
          </DialogHeader>
          {adviceCoverageLoading ? (
            <div className="text-center text-gray-500 py-8">Loading...</div>
          ) : (
            <>
              <div className="space-y-2">
                {/* Group coverage areas by category */}
                {Array.from(new Set(adviceCoverageAreas.map(area => area.category))).map(category => (
                  <div key={category} className="border rounded p-2">
                    <h3 className="font-medium text-md mb-2">{category}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                      {adviceCoverageAreas
                        .filter(area => area.category === category)
                        .map(area => (
                          <div key={area.id} className="flex flex-col space-y-1">
                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id={`area-${area.id}`}
                                checked={selectedCoverageAreaIds.includes(area.id)}
                                onChange={e => {
                                  if (e.target.checked) {
                                    setSelectedCoverageAreaIds([...selectedCoverageAreaIds, area.id]);
                                  } else {
                                    setSelectedCoverageAreaIds(selectedCoverageAreaIds.filter(id => id !== area.id));
                                    // Clear statement when unchecking
                                    const newStatements = { ...coverageAreaStatements };
                                    delete newStatements[area.id];
                                    setCoverageAreaStatements(newStatements);
                                  }
                                }}
                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <label htmlFor={`area-${area.id}`} className="text-sm text-gray-700">
                                {area.coverage_text}
                              </label>
                            </div>
                            {selectedCoverageAreaIds.includes(area.id) && (
                              <div className="ml-6 mt-1">
                                <input
                                  type="text"
                                  placeholder="Add statement (optional)"
                                  value={coverageAreaStatements[area.id] || ''}
                                  onChange={e => {
                                    setCoverageAreaStatements({
                                      ...coverageAreaStatements,
                                      [area.id]: e.target.value
                                    });
                                  }}
                                  className="w-full text-sm p-1 border rounded"
                                />
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  className="px-4 py-2 rounded border bg-gray-100 hover:bg-gray-200"
                  onClick={() => setShowAdviceCoverageModal(false)}
                  disabled={adviceCoverageLoading}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
                  onClick={handleSaveAdviceCoverage}
                  disabled={adviceCoverageLoading}
                >
                  Save
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      {/* Advisor Recommendations Modal */}
      <Dialog open={showRecommendationsModal} onOpenChange={setShowRecommendationsModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Advisor Recommendations</DialogTitle>
            <DialogDescription>
              Add up to eight advisor recommendations. Each recommendation should be no more than two sentences.
            </DialogDescription>
          </DialogHeader>
          {recommendationsLoading ? (
            <div className="text-center text-gray-500 py-8">Loading...</div>
          ) : (
            <>
              <div className="space-y-4">
                {recommendations.map((recommendation, idx) => (
                  <div key={idx} className="flex flex-col space-y-2">
                    <label htmlFor={`recommendation-${idx}`} className="font-medium text-sm">
                      Recommendation {idx + 1}
                    </label>
                    <textarea
                      id={`recommendation-${idx}`}
                      value={recommendation.recommendation_text}
                      onChange={e => {
                        const updated = [...recommendations];
                        updated[idx].recommendation_text = e.target.value;
                        setRecommendations(updated);
                      }}
                      className="w-full text-sm p-2 border rounded min-h-[80px]"
                      placeholder="Enter recommendation (max two sentences)"
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button
                  className="px-4 py-2 rounded border bg-gray-100 hover:bg-gray-200"
                  onClick={() => setShowRecommendationsModal(false)}
                  disabled={recommendationsLoading}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
                  onClick={handleSaveRecommendations}
                  disabled={recommendationsLoading}
                >
                  Save
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      {/* Goals and Objectives Modal */}
      <Dialog open={showGoalsObjectivesModal} onOpenChange={setShowGoalsObjectivesModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Goals and Objectives</DialogTitle>
            <DialogDescription>
              Add up to eight goals and objectives. Each goal should be no more than two sentences.
            </DialogDescription>
          </DialogHeader>
          {goalsObjectivesLoading ? (
            <div className="text-center text-gray-500 py-8">Loading...</div>
          ) : (
            <>
              <div className="space-y-4">
                {goalsObjectives.map((goal, idx) => (
                  <div key={idx} className="flex flex-col space-y-2">
                    <label htmlFor={`goal-category-${idx}`} className="font-medium text-sm">
                      Category
                    </label>
                    <select
                      id={`goal-category-${idx}`}
                      value={goal.category}
                      onChange={e => {
                        const updated = [...goalsObjectives];
                        updated[idx].category = e.target.value as GoalCategory;
                        setGoalsObjectives(updated);
                      }}
                      className="w-full text-sm p-2 border rounded"
                    >
                      <option value="Retirement">Retirement</option>
                      <option value="Cash Flow">Cash Flow</option>
                      <option value="Reduce Debt">Reduce Debt</option>
                    </select>
                    
                    <label htmlFor={`goal-${idx}`} className="font-medium text-sm mt-2">
                      Statement
                    </label>
                    <textarea
                      id={`goal-${idx}`}
                      value={goal.statement}
                      onChange={e => {
                        const updated = [...goalsObjectives];
                        updated[idx].statement = e.target.value;
                        setGoalsObjectives(updated);
                      }}
                      className="w-full text-sm p-2 border rounded min-h-[80px]"
                      placeholder="Enter goal (max two sentences)"
                    />
                    
                    <div className="grid grid-cols-3 gap-4 mt-2">
                      <div className="flex flex-col">
                        <label htmlFor={`goal-priority-${idx}`} className="font-medium text-sm mb-1">
                          Priority
                        </label>
                        <select
                          id={`goal-priority-${idx}`}
                          value={goal.priority}
                          onChange={e => {
                            const updated = [...goalsObjectives];
                            updated[idx].priority = e.target.value as GoalPriority;
                            setGoalsObjectives(updated);
                          }}
                          className="w-full text-sm p-2 border rounded"
                        >
                          <option value="Low">Low</option>
                          <option value="Medium">Medium</option>
                          <option value="High">High</option>
                        </select>
                      </div>
                      
                      <div className="flex flex-col">
                        <label htmlFor={`goal-amount-${idx}`} className="font-medium text-sm mb-1">
                          Amount
                        </label>
                        <input
                          type="number"
                          id={`goal-amount-${idx}`}
                          value={goal.amount}
                          onChange={e => {
                            const updated = [...goalsObjectives];
                            updated[idx].amount = parseFloat(e.target.value);
                            setGoalsObjectives(updated);
                          }}
                          className="w-full text-sm p-2 border rounded"
                          placeholder="Enter amount"
                        />
                      </div>
                      
                      <div className="flex flex-col">
                        <label htmlFor={`goal-timeframe-${idx}`} className="font-medium text-sm mb-1">
                          Timeframe
                        </label>
                        <select
                          id={`goal-timeframe-${idx}`}
                          value={goal.timeframe}
                          onChange={e => {
                            const updated = [...goalsObjectives];
                            updated[idx].timeframe = e.target.value as GoalTimeframe;
                            setGoalsObjectives(updated);
                          }}
                          className="w-full text-sm p-2 border rounded"
                        >
                          <option value="One Year">One Year</option>
                          <option value="Up to Three Years">Up to Three Years</option>
                          <option value="Up to Five Years">Up to Five Years</option>
                          <option value="Longer than Five Years">Longer than Five Years</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button
                  className="px-4 py-2 rounded border bg-gray-100 hover:bg-gray-200"
                  onClick={() => setShowGoalsObjectivesModal(false)}
                  disabled={goalsObjectivesLoading}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
                  onClick={handleSaveGoalsObjectives}
                  disabled={goalsObjectivesLoading}
                >
                  Save
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
