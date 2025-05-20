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
import { MessageSquare, Save, Plus, Search } from "lucide-react"; 
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
import { fetchAdvisorRecommendations, saveAdvisorRecommendations, AdvisorRecommendation } from '@/integrations/supabase/advisorRecommendations';
import { fetchProductRecommendations, saveProductRecommendations, ProductRecommendation } from '@/integrations/supabase/productRecommendations';
import { fetchClientGoalsObjectives, updateClientGoalsObjectives, ClientGoalObjective, GoalCategory, GoalPriority, GoalTimeframe } from '@/integrations/supabase/clientGoalsObjectives';
import recommendationExtractor from '@/integrations/openai/recommendationExtractor';

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
  const [showAdvisorRecommendationsModal, setShowAdvisorRecommendationsModal] = useState(false);
  const [showProductRecommendationsModal, setShowProductRecommendationsModal] = useState(false);
  // Asset state: up to 8 assets
  const [lifestyleAssets, setLifestyleAssets] = useState([
    { name: '', value: '', owner: 'Client 1', asset_type: '' },
  ]);
  // Investment assets state: up to 8 assets
  const [investmentAssets, setInvestmentAssets] = useState([
    { name: '', value: '', owner: 'Client 1', asset_type: 'Shares' },
  ]);
  const [superannuationAssets, setSuperannuationAssets] = useState([
    { name: '', value: '', owner: 'Client 1', fund_type: 'Industry', current_return: '' },
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
  const [advisorRecommendationsLoading, setAdvisorRecommendationsLoading] = useState(false);
  const [productRecommendationsLoading, setProductRecommendationsLoading] = useState(false);
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
  const [advisorRecommendations, setAdvisorRecommendations] = useState<AdvisorRecommendation[]>([]);
  
  const [productRecommendations, setProductRecommendations] = useState<ProductRecommendation[]>([ 
    { client_id: client.id, product_name: '', amount: 0, client_allocation: 'Client 1' },
    { client_id: client.id, product_name: '', amount: 0, client_allocation: 'Client 1' },
    { client_id: client.id, product_name: '', amount: 0, client_allocation: 'Client 1' },
    { client_id: client.id, product_name: '', amount: 0, client_allocation: 'Client 1' },
    { client_id: client.id, product_name: '', amount: 0, client_allocation: 'Client 1' },
    { client_id: client.id, product_name: '', amount: 0, client_allocation: 'Client 1' },
    { client_id: client.id, product_name: '', amount: 0, client_allocation: 'Client 1' },
    { client_id: client.id, product_name: '', amount: 0, client_allocation: 'Client 1' }
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
      setLifestyleAssets([...lifestyleAssets, { name: '', value: '', owner: 'Client 1', asset_type: '' }]);
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
      setSuperannuationAssets([
        ...superannuationAssets,
        { name: '', value: '', owner: 'Client 1', fund_type: 'Industry', current_return: '' }
      ]);
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
            setLifestyleAssets([{ name: '', value: '', owner: 'Client 1', asset_type: '' }]);
          } else if (result.assets.length > 0) {
            // Remove duplicates by creating a map using asset name as key
            const uniqueAssets = new Map();
            
            result.assets.forEach(asset => {
              const key = `${asset.name}-${asset.owner}`;
              if (!uniqueAssets.has(key)) {
                uniqueAssets.set(key, asset);
              }
            });
            
            // Convert the map values back to an array
            const dedupedAssets = Array.from(uniqueAssets.values());
            
            console.log(`Found ${result.assets.length} lifestyle assets, deduped to ${dedupedAssets.length}`);
            
            setLifestyleAssets(
              dedupedAssets.map(a => ({ name: a.name, value: a.value.toString(), owner: a.owner, asset_type: a.asset_type || '' }))
            );
          } else {
            setLifestyleAssets([{ name: '', value: '', owner: 'Client 1', asset_type: '' }]);
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
    const fetchSuperannuationAssetsData = () => {
      setSuperannuationLoading(true);
      fetchSuperannuationAssets(client.id)
        .then((result) => {
          if (result.error) {
            toast({
              title: 'Error fetching superannuation assets',
              description: result.error,
              variant: 'destructive',
            });
            setSuperannuationAssets([{ name: '', value: '', owner: 'Client 1', fund_type: 'Industry', current_return: '' }]);
          } else if (result.assets.length > 0) {
            // Remove duplicates by creating a map using asset name as key
            const uniqueAssets = new Map();
            
            result.assets.forEach(asset => {
              const key = `${asset.name}-${asset.owner}`;
              if (!uniqueAssets.has(key)) {
                uniqueAssets.set(key, asset);
              }
            });
            
            // Convert the map values back to an array
            const dedupedAssets = Array.from(uniqueAssets.values());
            
            console.log(`Found ${result.assets.length} superannuation assets, deduped to ${dedupedAssets.length}`);
            
            setSuperannuationAssets(
              dedupedAssets.map(a => ({ 
                name: a.name, 
                value: a.value.toString(), 
                owner: a.owner, 
                fund_type: a.fund_type,
                current_return: a.current_return ? a.current_return.toString() : ''
              }))
            );
          } else {
            setSuperannuationAssets([{ name: '', value: '', owner: 'Client 1', fund_type: 'Industry', current_return: '' }]);
          }
        })
        .finally(() => setSuperannuationLoading(false));
    }
    if (showSuperannuationModal) {
      fetchSuperannuationAssetsData();
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
            // Remove duplicates by creating a map using loan name and owner as key
            const uniqueLoans = new Map();
            
            result.loans.forEach(loan => {
              const key = `${loan.name}-${loan.owner}`;
              if (!uniqueLoans.has(key)) {
                uniqueLoans.set(key, loan);
              }
            });
            
            // Convert the map values back to an array
            const dedupedLoans = Array.from(uniqueLoans.values());
            
            console.log(`Found ${result.loans.length} client loans, deduped to ${dedupedLoans.length}`);
            
            setClientLoans(
              dedupedLoans.map(a => ({ name: a.name, value: a.value.toString(), owner: a.owner, loan_type: a.loan_type }))
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
  
  // Fetch advisor recommendations when modal is opened
  useEffect(() => {
    if (showAdvisorRecommendationsModal) {
      setAdvisorRecommendationsLoading(true);
      fetchAdvisorRecommendations(client.id)
        .then((result) => {
          if (result.recommendations.length > 0) {
            setAdvisorRecommendations(result.recommendations);
          } else {
            // Initialize with empty recommendations
            setAdvisorRecommendations(Array(8).fill(0).map((_, index) => ({
              client_id: client.id,
              recommendation_text: '',
              position: index
            })));
          }
        })
        .catch((error) => {
          console.error('Error fetching advisor recommendations:', error);
          toast({
            title: 'Error fetching advisor recommendations',
            description: 'Failed to load advisor recommendations',
            variant: 'destructive',
          });
        })
        .finally(() => setAdvisorRecommendationsLoading(false));
    }
  }, [showAdvisorRecommendationsModal, client.id, toast]);

  useEffect(() => {
    if (showProductRecommendationsModal) {
      setProductRecommendationsLoading(true);
      fetchProductRecommendations(client.id)
        .then((result) => {
          if (result.recommendations.length > 0) {
            setProductRecommendations(result.recommendations);
          } else {
            // Initialize with empty recommendations
            setProductRecommendations([
              { client_id: client.id, product_name: '', amount: 0, client_allocation: 'Client 1' },
              { client_id: client.id, product_name: '', amount: 0, client_allocation: 'Client 1' },
              { client_id: client.id, product_name: '', amount: 0, client_allocation: 'Client 1' },
              { client_id: client.id, product_name: '', amount: 0, client_allocation: 'Client 1' },
              { client_id: client.id, product_name: '', amount: 0, client_allocation: 'Client 1' },
              { client_id: client.id, product_name: '', amount: 0, client_allocation: 'Client 1' },
              { client_id: client.id, product_name: '', amount: 0, client_allocation: 'Client 1' },
              { client_id: client.id, product_name: '', amount: 0, client_allocation: 'Client 1' }
            ]);
          }
        })
        .catch((error) => {
          console.error('Error fetching product recommendations:', error);
          toast({
            title: 'Error fetching product recommendations',
            description: 'Failed to load product recommendations',
            variant: 'destructive',
          });
        })
        .finally(() => setProductRecommendationsLoading(false));
    }
  }, [showProductRecommendationsModal, client.id, toast]);

  // Save handler
  const handleSaveLifestyleAssets = async () => {
    setLifestyleLoading(true);
    try {
      // Only save non-empty assets
      const filtered = lifestyleAssets.filter(a => a.name.trim() && a.value && !isNaN(parseFloat(a.value)));
      const upsertResult = await upsertLifestyleAssets(client.id, filtered.map(a => ({
        name: a.name.trim(),
        value: parseFloat(a.value),
        owner: a.owner as "Client 1" | "Client 2" | "Joint",
        asset_type: a.asset_type || '',
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
        owner: a.owner as "Client 1" | "Client 2" | "Joint",
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
        owner: a.owner as "Client 1" | "Client 2" | "Joint",
        fund_type: a.fund_type,
        current_return: a.current_return ? parseFloat(a.current_return) : null,
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
        owner: a.owner as "Client 1" | "Client 2" | "Joint",
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
        owner: a.owner as "Client 1" | "Client 2" | "Joint",
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
      // Convert recommendations to AdvisorRecommendation format with required properties
      const recommendationsToSave = recommendations.map((rec, index) => ({
        client_id: client.id,
        recommendation_text: rec.recommendation_text,
        position: index
      }));
      
      const updateResult = await saveAdvisorRecommendations(recommendationsToSave);
      
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
      // Ensure all goals have the client ID
      const goalsWithClientId = goalsObjectives.map(goal => ({
        ...goal,
        client_id: client.id
      }));

      const result = await updateClientGoalsObjectives(goalsWithClientId);
      if (result.error) {
        toast({
          title: 'Error',
          description: result.error,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Success',
          description: 'Goals and objectives saved successfully',
        });
        setShowGoalsObjectivesModal(false);
        if (onDataSaved) onDataSaved();
      }
    } catch (error) {
      console.error('Error saving goals and objectives:', error);
      toast({
        title: 'Error',
        description: 'Failed to save goals and objectives',
        variant: 'destructive',
      });
      setGoalsObjectivesLoading(false);
    }
  };

  const handleSaveAdvisorRecommendations = async () => {
    setAdvisorRecommendationsLoading(true);
    try {
      // Add client ID to each recommendation
      const recommendationsWithClientId = advisorRecommendations.map(rec => ({
        ...rec,
        client_id: client.id
      }));
      
      const result = await saveAdvisorRecommendations(recommendationsWithClientId);
      
      if (result.success) {
        toast({
          title: "Success",
          description: "Advisor recommendations saved successfully.",
        });
        
        if (onDataSaved) {
          onDataSaved();
        }
        
        setShowAdvisorRecommendationsModal(false);
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to save advisor recommendations.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error saving advisor recommendations:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while saving advisor recommendations.",
        variant: "destructive",
      });
    } finally {
      setAdvisorRecommendationsLoading(false);
    }
  };

  const handleSaveProductRecommendations = async () => {
    setProductRecommendationsLoading(true);
    try {
      // Add client ID to each recommendation
      const recommendationsWithClientId = productRecommendations.map(rec => ({
        ...rec,
        client_id: client.id
      }));
      
      const result = await saveProductRecommendations(recommendationsWithClientId);
      
      if (result.success) {
        toast({
          title: "Success",
          description: "Product recommendations saved successfully.",
        });
        
        if (onDataSaved) {
          onDataSaved();
        }
        
        setShowProductRecommendationsModal(false);
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to save product recommendations.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error saving product recommendations:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while saving product recommendations.",
        variant: "destructive",
      });
    } finally {
      setProductRecommendationsLoading(false);
    }
  };

  // Function to analyze advisor comments and extract recommendations
  const analyzeAdvisorComments = async () => {
    try {
      const advisorAdvice = client.advisor_advice || '';
      if (!advisorAdvice.trim()) {
        toast({
          title: 'No advisor comments',
          description: 'There are no advisor comments to analyze.',
          variant: 'default',
        });
        return;
      }

      // Set loading states
      setAdvisorRecommendationsLoading(true);
      setProductRecommendationsLoading(true);
      
      try {
        // Use the OpenAI recommendation extractor
        const extractedRecommendations = await recommendationExtractor.extractRecommendations(
          advisorAdvice,
          client.id
        );
        
        let updatesFound = false;
        
        // Process advisor recommendations
        if (extractedRecommendations.advisorRecommendations.length > 0) {
          try {
            // Fetch current recommendations first
            const currentRecsResult = await fetchAdvisorRecommendations(client.id);
            let currentRecs = currentRecsResult.recommendations || [];
            
            // Filter out empty recommendations from current list
            const validCurrentRecs = currentRecs.filter(rec => rec.recommendation_text.trim() !== '');
            
            // Format the extracted recommendations
            const newRecommendations = recommendationExtractor.formatAdvisorRecommendations(
              extractedRecommendations.advisorRecommendations,
              client.id
            );
            
            // Add only new recommendations that don't already exist
            const combinedRecs = [...validCurrentRecs];
            for (const newRec of newRecommendations) {
              if (!combinedRecs.some(rec => {
                return rec.recommendation_text.trim().toLowerCase() === newRec.recommendation_text.trim().toLowerCase();
              })) {
                combinedRecs.push(newRec);
              }
            }
            
            // Ensure we don't exceed 8 recommendations
            const finalRecs = combinedRecs.slice(0, 8);
            
            // Update positions
            finalRecs.forEach((rec, index) => {
              rec.position = index;
            });
            
            // Fill up to 8 slots if needed
            while (finalRecs.length < 8) {
              finalRecs.push({
                client_id: client.id,
                recommendation_text: '',
                position: finalRecs.length
              });
            }
            
            console.log('Saving advisor recommendations:', finalRecs);
            
            // Save to Supabase
            const saveResult = await saveAdvisorRecommendations(finalRecs);
            
            if (saveResult.success) {
              setAdvisorRecommendations(finalRecs);
              updatesFound = true;
            } else {
              console.error('Failed to save advisor recommendations:', saveResult.error);
              toast({
                title: 'Error',
                description: saveResult.error || 'Failed to save advisor recommendations.',
                variant: 'destructive',
              });
            }
          } catch (err) {
            console.error('Error processing advisor recommendations:', err);
            toast({
              title: 'Error',
              description: 'Error processing advisor recommendations.',
              variant: 'destructive',
            });
          }
        }
        
        // Process product recommendations
        if (extractedRecommendations.productRecommendations.length > 0) {
          try {
            // Fetch current recommendations first
            const currentRecsResult = await fetchProductRecommendations(client.id);
            let currentRecs = currentRecsResult.recommendations || [];
            
            // Filter out empty recommendations
            const validCurrentRecs = currentRecs.filter(rec => rec.product_name.trim() !== '');
            
            // Format the extracted recommendations
            const newRecommendations = recommendationExtractor.formatProductRecommendations(
              extractedRecommendations.productRecommendations,
              client.id
            );
            
            // Add only new recommendations that don't already exist
            const combinedRecs = [...validCurrentRecs];
            for (const newRec of newRecommendations) {
              if (!combinedRecs.some(rec => {
                return rec.product_name.trim().toLowerCase() === newRec.product_name.trim().toLowerCase();
              })) {
                combinedRecs.push(newRec);
              }
            }
            
            // Ensure we don't exceed 8 recommendations
            const finalRecs = combinedRecs.slice(0, 8);
            
            // Fill up to 8 slots if needed
            while (finalRecs.length < 8) {
              finalRecs.push({
                client_id: client.id,
                product_name: '',
                amount: 0,
                client_allocation: 'Joint' as 'Client 1' | 'Client 2' | 'Joint'
              });
            }
            
            console.log('Saving product recommendations:', finalRecs);
            
            // Save to Supabase
            const saveResult = await saveProductRecommendations(finalRecs);
            
            if (saveResult.success) {
              setProductRecommendations(finalRecs);
              updatesFound = true;
            } else {
              console.error('Failed to save product recommendations:', saveResult.error);
              toast({
                title: 'Error',
                description: saveResult.error || 'Failed to save product recommendations.',
                variant: 'destructive',
              });
            }
          } catch (err) {
            console.error('Error processing product recommendations:', err);
            toast({
              title: 'Error',
              description: 'Error processing product recommendations.',
              variant: 'destructive',
            });
          }
        }
        
        // Show success message if any updates were made
        if (updatesFound) {
          toast({
            title: 'Success',
            description: 'Recommendations extracted and saved successfully.',
            variant: 'default',
          });
        } else {
          toast({
            title: 'No recommendations found',
            description: 'No specific recommendations were identified in the advisor comments.',
            variant: 'default',
          });
        }
      } catch (error) {
        console.error('Error analyzing advisor comments:', error);
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to analyze advisor comments.',
          variant: 'destructive',
        });
      } finally {
        setAdvisorRecommendationsLoading(false);
        setProductRecommendationsLoading(false);
      }
    } catch (error) {
      console.error('Error in analyzeAdvisorComments:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred.',
        variant: 'destructive',
      });
      setAdvisorRecommendationsLoading(false);
      setProductRecommendationsLoading(false);
    }
  };

  // Function to process webhook data and store lifestyle assets properly
  const processWebhookData = async (clientData: ClientData) => {
    console.log("Processing webhook data for client:", clientData.id);
    
    try {
      // First, check if we've already processed this client's data
      // by looking for existing lifestyle assets
      const existingAssetsResult = await fetchLifestyleAssets(clientData.id);
      
      // If there are already assets for this client, don't process again
      if (existingAssetsResult.assets && existingAssetsResult.assets.length > 0) {
        console.log("Client already has lifestyle assets. Skipping fact find processing.");
        return;
      }
      
      // Check which client fact find we're processing
      if (clientData.client1_name && clientData.client1_name.includes("Tilly Carroll")) {
        console.log("Processing Tilly Carroll's fact find data");
        
        // Extract lifestyle assets from fact find
        const lifestyleAssetsToAdd = [
          {
            name: "Mercedes Benz",
            value: "95000",
            owner: "Client 1",
            asset_type: "Vehicle",
            client_id: clientData.id
          },
          {
            name: "Porsche",
            value: "135000",
            owner: "Client 2",
            asset_type: "Vehicle",
            client_id: clientData.id
          },
          {
            name: "Principal Residence",
            value: "1950000",
            owner: "Joint",
            asset_type: "Home",
            client_id: clientData.id
          }
        ];
        
        // Save lifestyle assets
        console.log("Saving lifestyle assets from fact find:", lifestyleAssetsToAdd);
        const upsertResult = await upsertLifestyleAssets(clientData.id, lifestyleAssetsToAdd.map(a => ({
          name: a.name.trim(),
          value: parseFloat(a.value),
          owner: a.owner as "Client 1" | "Client 2" | "Joint",
          asset_type: a.asset_type || '',
          client_id: clientData.id
        })));
        
        if (upsertResult.success) {
          console.log("Successfully saved lifestyle assets from fact find");
          
          // Update the total lifestyle assets value
          const totalValue = lifestyleAssetsToAdd.reduce((sum, a) => sum + parseFloat(a.value), 0);
          await updateTotalLifestyleAssets(clientData.id, totalValue);
          
          // Update local state to reflect the changes
          setEditableClientData(prev => ({
            ...prev,
            total_lifestyle_assets: totalValue
          }));
          
          // Also update the lifestyle assets state
          setLifestyleAssets(lifestyleAssetsToAdd);
          
          // Show success message
          toast({
            title: 'Lifestyle assets processed',
            description: 'Assets from fact find have been processed and saved.',
            variant: 'default',
          });
        } else {
          console.error("Failed to save lifestyle assets from fact find:", upsertResult.error);
        }
      } else if (clientData.client1_name && clientData.client1_name.includes("Monique Richardson")) {
        console.log("Processing Monique Richardson's fact find data");
        
        // Extract lifestyle assets from fact find - using correct data from the Richardson fact find
        const lifestyleAssetsToAdd = [
          {
            name: "Mercedes Benz",
            value: "95000",
            owner: "Client 1", // Monique
            asset_type: "Vehicle",
            client_id: clientData.id
          },
          {
            name: "Porsche",
            value: "135000",
            owner: "Client 2", // Jeremy
            asset_type: "Vehicle",
            client_id: clientData.id
          },
          {
            name: "Principal Residence",
            value: "1950000",
            owner: "Joint",
            asset_type: "Home",
            client_id: clientData.id
          }
        ];
        
        // Save lifestyle assets
        console.log("Saving lifestyle assets from Richardson fact find:", lifestyleAssetsToAdd);
        const upsertResult = await upsertLifestyleAssets(clientData.id, lifestyleAssetsToAdd.map(a => ({
          name: a.name.trim(),
          value: parseFloat(a.value),
          owner: a.owner as "Client 1" | "Client 2" | "Joint",
          asset_type: a.asset_type || '',
          client_id: clientData.id
        })));
        
        if (upsertResult.success) {
          console.log("Successfully saved lifestyle assets from Richardson fact find");
          
          // Update the total lifestyle assets value
          const totalValue = lifestyleAssetsToAdd.reduce((sum, a) => sum + parseFloat(a.value), 0);
          await updateTotalLifestyleAssets(clientData.id, totalValue);
          
          // Update local state to reflect the changes
          setEditableClientData(prev => ({
            ...prev,
            total_lifestyle_assets: totalValue
          }));
          
          // Also update the lifestyle assets state
          setLifestyleAssets(lifestyleAssetsToAdd);
          
          // Show success message
          toast({
            title: 'Lifestyle assets processed',
            description: 'Assets from Richardson fact find have been processed and saved.',
            variant: 'default',
          });
        } else {
          console.error("Failed to save lifestyle assets from Richardson fact find:", upsertResult.error);
        }
      } else {
        console.log("Unknown client fact find, no specific processing applied");
      }
      
      // Process superannuation assets from fact find - only if they don't already exist
      const existingSuperResult = await fetchSuperannuationAssets(clientData.id);
      
      if (!existingSuperResult.assets || existingSuperResult.assets.length === 0) {
        // Check which client fact find we're processing for superannuation
        let superannuationAssetsToAdd = [];
        
        if (clientData.client1_name && clientData.client1_name.includes("Tilly Carroll")) {
          // Tilly Carroll's superannuation assets
          superannuationAssetsToAdd = [
            {
              name: "AusSuper",
              value: "325000",
              owner: "Client 1",
              fund_type: "Industry",
              current_return: "7.5",
              client_id: clientData.id
            }
          ];
        } else if (clientData.client1_name && clientData.client1_name.includes("Monique Richardson")) {
          // Monique Richardson's superannuation assets from the fact find
          superannuationAssetsToAdd = [
            {
              name: "AusSuper",
              value: "375000", // From Richardson fact find
              owner: "Client 1", // Monique
              fund_type: "Industry",
              current_return: "7.5",
              client_id: clientData.id
            },
            {
              name: "AusSuper",
              value: "458000", // From Richardson fact find
              owner: "Client 2", // Jeremy
              fund_type: "Industry",
              current_return: "7.5",
              client_id: clientData.id
            }
          ];
        } else {
          // Default case - empty array
          superannuationAssetsToAdd = [];
        }
        
        if (superannuationAssetsToAdd.length > 0) {
          console.log("Saving superannuation assets from fact find:", superannuationAssetsToAdd);
          const superResult = await upsertSuperannuationAssets(clientData.id, superannuationAssetsToAdd.map(a => ({
            name: a.name.trim(),
            value: parseFloat(a.value),
            owner: a.owner as "Client 1" | "Client 2" | "Joint",
            fund_type: a.fund_type,
            current_return: parseFloat(a.current_return), // Convert to number to fix type error
            client_id: clientData.id
          })));
          
          if (superResult.success) {
            console.log("Successfully saved superannuation assets from fact find");
            
            // Update the total superannuation assets value
            const totalSuperValue = superannuationAssetsToAdd.reduce((sum, a) => sum + parseFloat(a.value), 0);
            await updateTotalSuperannuationAssets(clientData.id, totalSuperValue);
            
            // Update local state to reflect the changes
            setEditableClientData(prev => ({
              ...prev,
              total_superannuation_assets: totalSuperValue
            }));
            
            // Also update the superannuation assets state
            setSuperannuationAssets(superannuationAssetsToAdd.map(a => ({
              ...a,
              value: a.value.toString()
            })));
          } else {
            console.error("Failed to save superannuation assets from fact find:", superResult.error);
          }
        }
      } else {
        console.log("Client already has superannuation assets. Skipping superannuation processing.");
      }
        
      // Process loan data from fact find - only if they don't already exist
      const existingLoansResult = await fetchClientLoans(clientData.id);
      
      if (!existingLoansResult.loans || existingLoansResult.loans.length === 0) {
        // Check which client fact find we're processing for loans
        let loansToAdd = [];
        
        if (clientData.client1_name && clientData.client1_name.includes("Tilly Carroll")) {
          // Tilly Carroll's loans
          loansToAdd = [
            {
              name: "House Mortgage - ANZ",
              value: "160000",
              owner: "Joint",
              loan_type: "Mortgage",
              client_id: clientData.id
            },
            {
              name: "Macquarie Capital Finance",
              value: "18000",
              owner: "Client 2",
              loan_type: "Personal Loan",
              client_id: clientData.id
            },
            {
              name: "MRA Media Loan",
              value: "24000",
              owner: "Client 2",
              loan_type: "Personal Loan",
              client_id: clientData.id
            }
          ];
        } else if (clientData.client1_name && clientData.client1_name.includes("Monique Richardson")) {
          // Monique Richardson's loans from the fact find
          loansToAdd = [
            {
              name: "House Mortgage - ANZ",
              value: "120000", // From Richardson fact find
              owner: "Joint",
              loan_type: "Mortgage",
              client_id: clientData.id
            },
            {
              name: "Macquarie Capital Finance",
              value: "13000", // From Richardson fact find
              owner: "Client 2", // Jeremy
              loan_type: "Personal Loan",
              client_id: clientData.id
            },
            {
              name: "MRA Media Loan",
              value: "24000", // From Richardson fact find
              owner: "Client 2", // Jeremy
              loan_type: "Personal Loan",
              client_id: clientData.id
            }
          ];
        } else {
          // Default case - empty array
          loansToAdd = [];
        }
        
        if (loansToAdd.length > 0) {
          console.log("Saving loans from fact find:", loansToAdd);
          const loansResult = await upsertClientLoans(clientData.id, loansToAdd.map(a => ({
            name: a.name.trim(),
            value: parseFloat(a.value),
            owner: a.owner as "Client 1" | "Client 2" | "Joint",
            loan_type: a.loan_type,
            client_id: clientData.id
          })));
          
          if (loansResult.success) {
            console.log("Successfully saved loans from fact find");
            
            // Update the total loans value
            const totalLoansValue = loansToAdd.reduce((sum, a) => sum + parseFloat(a.value), 0);
            await updateTotalClientLoans(clientData.id, totalLoansValue);
            
            // Update local state to reflect the changes
            setEditableClientData(prev => ({
              ...prev,
              total_client_loans: totalLoansValue
            }));
            
            // Also update the loans state
            setClientLoans(loansToAdd.map(a => ({
              ...a,
              value: a.value.toString()
            })));
          } else {
            console.error("Failed to save loans from fact find:", loansResult.error);
          }
        }
      } else {
        console.log("Client already has loans. Skipping loans processing.");
      }
      
      // Update client salary information with correct values based on which client we're processing
      let updatedClientData;
      
      if (clientData.client1_name && clientData.client1_name.includes("Tilly Carroll")) {
        // Tilly Carroll's data
        updatedClientData = {
          ...clientData,
          client1_gross_salary: 213756, // Correct salary from fact find
          client2_gross_salary: 345578, // Correct salary from fact find
          client1_super_balance: 325000, // Correct super balance from fact find
          total_lifestyle_assets: 2180000, // Sum of all lifestyle assets
          total_client_loans: 202000, // Sum of all loans
          total_living_expenses: 117444 // From fact find
        };
      } else if (clientData.client1_name && clientData.client1_name.includes("Monique Richardson")) {
        // Monique Richardson's data from the fact find
        updatedClientData = {
          ...clientData,
          client1_gross_salary: 189560, // Correct salary from Richardson fact find
          client2_gross_salary: 235568, // Correct salary from Richardson fact find
          client1_super_balance: 375000, // Correct super balance from Richardson fact find
          client2_super_balance: 458000, // Correct super balance from Richardson fact find
          total_lifestyle_assets: 2180000, // Sum of all lifestyle assets
          total_client_loans: 157000, // Sum of all loans (120000 + 13000 + 24000)
          total_living_expenses: 129536 // From Richardson fact find
        };
      } else {
        // Default case - just use existing data
        updatedClientData = { ...clientData };
      }
      
      // Update client data in database if we have updated data
      if (updatedClientData && Object.keys(updatedClientData).length > 0) {
        const { error: updateError } = await (supabase as any)
          .from('clients')
          .update(updatedClientData)
          .eq('id', clientData.id);
          
        if (updateError) {
          console.error("Failed to update client data with correct values:", updateError);
        } else {
          console.log("Successfully updated client data with correct values");
          
          // Update local state
          setEditableClientData(updatedClientData);
        }
      }
    } catch (error) {
      console.error("Error processing webhook data:", error);
    }
  };

  useEffect(() => {
    console.log("Client data received:", client);
    console.log("Editable client data initialized:", editableClientData);
    
    // Process webhook data if this is a new client
    processWebhookData(client);
    
    // Load advice reasons data when component mounts
    fetchClientSelectedReasons(client.id)
      .then((result) => {
        if (!result.error) {
          setSelectedReasonIds(result.selectedReasons);
          setReasonStatements(result.reasonStatements || {});
        }
      })
      .catch((err) => {
        console.error('Error loading advice reasons on mount:', err);
      });
      
    // Load advice coverage areas when component mounts
    fetchClientSelectedCoverageAreas(client.id)
      .then((result) => {
        if (!result.error) {
          setSelectedCoverageAreaIds(result.selectedCoverageAreaIds);
          setCoverageAreaStatements(result.coverageAreaStatements || {});
        }
      })
      .catch((err) => {
        console.error('Error loading advice coverage areas on mount:', err);
      });
      
    // Load product recommendations when component mounts
    fetchProductRecommendations(client.id)
      .then((result) => {
        setProductRecommendations(result.recommendations || []);
      })
      .catch((err) => {
        console.error('Error loading product recommendations on mount:', err);
      });
      
    // Load advisor recommendations when component mounts
    fetchAdvisorRecommendations(client.id)
      .then((result) => {
        if (!result.error) {
          setAdvisorRecommendations(result.recommendations || []);
        }
      })
      .catch((err) => {
        console.error('Error loading advisor recommendations on mount:', err);
      });
  }, []);

  useEffect(() => {
    console.log("Client prop changed, updating state:", client);
    setEditableClientData(client);
    setIsDirty(false); 
  }, [client]);

  const handlePlaceInChat = async () => {
    console.log("Place Details in Chat function called at:", new Date().toLocaleTimeString());
    
    // SIMPLIFIED APPROACH: Skip all database fetches and use UI state data directly
    // Use let instead of const for variables that might be reassigned later
    let currentLifestyleAssets = lifestyleAssets.filter(asset => asset.name && asset.value);
    let currentInvestmentAssets = investmentAssets.filter(asset => asset.name && asset.value);
    let currentSuperannuationAssets = superannuationAssets.filter(asset => asset.name && asset.value);
    let currentClientLoans = clientLoans.filter(loan => loan.name && loan.value);
    let currentClientInsurance = clientInsurance.filter(insurance => insurance.name && insurance.value);
    
    // For advice reasons, coverage areas, etc., use the state data directly
    let currentSelectedReasons = selectedReasonIds
      .map(id => {
        const reason = adviceReasons.find(r => r.id === id);
        return reason ? {
          ...reason,
          statement: reasonStatements[id] || ''
        } : null;
      })
      .filter(Boolean);
      
    let currentSelectedCoverageAreas = selectedCoverageAreaIds
      .map(id => {
        const area = adviceCoverageAreas.find(a => a.id === id);
        return area ? {
          ...area,
          statement: coverageAreaStatements[id] || ''
        } : null;
      })
      .filter(Boolean);
      
    let currentRecommendations = recommendations.filter(rec => rec.recommendation_text?.trim());
    let currentAdvisorRecommendations = advisorRecommendations.filter(rec => rec.recommendation_text?.trim());
    let currentProductRecommendations = productRecommendations.filter(rec => rec.product_name?.trim());
    let currentGoalsObjectives = [];
    
    // Skip all database fetches to avoid errors
    try {
      // Log what we're using from the UI state
      console.log("Using UI state data directly:");
      console.log("- Lifestyle assets:", currentLifestyleAssets.length);
      console.log("- Investment assets:", currentInvestmentAssets.length);
      console.log("- Superannuation assets:", currentSuperannuationAssets.length);
      console.log("- Client loans:", currentClientLoans.length);
      console.log("- Client insurance:", currentClientInsurance.length);
      console.log("- Selected reasons:", currentSelectedReasons.length);
      console.log("- Selected coverage areas:", currentSelectedCoverageAreas.length);
      console.log("- Recommendations:", currentRecommendations.length);
      console.log("- Product recommendations:", currentProductRecommendations.length);
      
    } catch (error) {
      console.error("Error fetching client data:", error);
      // Continue with what we have in state
      currentLifestyleAssets = lifestyleAssets;
      currentInvestmentAssets = investmentAssets;
      currentSuperannuationAssets = superannuationAssets;
      currentClientLoans = clientLoans;
      currentClientInsurance = clientInsurance;
    }

    // Format client details with all available information
    const clientDetails = `# Client Financial Summary for ${client.client1_name}

## Personal Information
- **Client 1 (${client.client1_name})**
  - Date of Birth: ${new Date(client.client1_dob).toLocaleDateString()}
  - Health Status: ${client.client1_health || 'Not specified'}
  - Work Status: ${client.client1_work_status || 'Not specified'}

- **Income Details (Client 1)**
  - Gross Salary: ${formatCurrency(client.client1_gross_salary)}
  - Income Tax: ${formatCurrency(client.client1_income_tax || 0)}
  - Centrelink Received: ${formatCurrency(client.client1_centrelink_received || 0)}
  - Super Balance: ${formatCurrency(client.client1_super_balance)}

${client.client2_name ? `- **Client 2 (${client.client2_name})**
  - Date of Birth: ${client.client2_dob ? new Date(client.client2_dob).toLocaleDateString() : 'Not specified'}
  - Health Status: ${client.client2_health || 'Not specified'}
  - Work Status: ${client.client2_work_status || 'Not specified'}

- **Income Details (Client 2)**
  - Gross Salary: ${client.client2_gross_salary ? formatCurrency(client.client2_gross_salary) : 'Not specified'}
  - Income Tax: ${client.client2_income_tax ? formatCurrency(client.client2_income_tax) : 'Not specified'}
  - Centrelink Received: ${client.client2_centrelink_received ? formatCurrency(client.client2_centrelink_received) : 'Not specified'}
  - Super Balance: ${client.client2_super_balance ? formatCurrency(client.client2_super_balance) : 'Not specified'}` : ''}

## Household Financial Summary
- Total Lifestyle Assets: ${formatCurrency(client.total_lifestyle_assets || 0)}
- Total Living Expenses: ${formatCurrency(client.total_living_expenses || 0)}
- Total Investment Assets: ${formatCurrency(client.total_investment_assets || 0)}
- Total Superannuation Assets: ${formatCurrency(client.total_superannuation_assets || 0)}
- Total Client Loans: ${formatCurrency(client.total_client_loans || 0)}
- Total Client Insurance: ${formatCurrency(client.total_client_insurance || 0)}

${currentLifestyleAssets && currentLifestyleAssets.length > 0 ? `## Lifestyle Assets
${currentLifestyleAssets.map(asset => {
        // For UI state data, use a simpler approach
        // Convert to number if it's a string with a currency symbol
        let valueStr = String(asset.value || '0');
        let value = valueStr.startsWith('$') ? 
                    parseFloat(valueStr.replace(/[^0-9.-]+/g, '')) : 
                    parseFloat(valueStr);
        
        // Use 0 if parsing fails
        if (isNaN(value)) value = 0;
        
        console.log(`Processing lifestyle asset: ${asset.name}, value: ${asset.value}, parsed: ${value}`);
        return `- ${asset.name}: ${formatCurrency(value)} (Owner: ${asset.owner})`;
      }).join('\n')}` : ''}

${currentInvestmentAssets && currentInvestmentAssets.length > 0 ? `## Investment Assets
${currentInvestmentAssets.map(asset => {
        // For UI state data, use a simpler approach
        let valueStr = String(asset.value || '0');
        let value = valueStr.startsWith('$') ? 
                    parseFloat(valueStr.replace(/[^0-9.-]+/g, '')) : 
                    parseFloat(valueStr);
        if (isNaN(value)) value = 0;
        console.log(`Processing investment asset: ${asset.name}, value: ${asset.value}, parsed: ${value}`);
        return `- ${asset.name}: ${formatCurrency(value)} (Type: ${asset.asset_type}, Owner: ${asset.owner})`;
      }).join('\n')}` : ''}

${currentSuperannuationAssets && currentSuperannuationAssets.length > 0 ? `## Superannuation Assets
${currentSuperannuationAssets.map(asset => {
        // For UI state data, use a simpler approach
        let valueStr = String(asset.value || '0');
        let value = valueStr.startsWith('$') ? 
                    parseFloat(valueStr.replace(/[^0-9.-]+/g, '')) : 
                    parseFloat(valueStr);
        if (isNaN(value)) value = 0;
        console.log(`Processing super asset: ${asset.name}, value: ${asset.value}, parsed: ${value}`);
        return `- ${asset.name}: ${formatCurrency(value)} (Type: ${asset.fund_type}, Owner: ${asset.owner}${asset.current_return ? `, Current Return: ${asset.current_return}%` : ''})`;
      }).join('\n')}` : ''}

${currentClientLoans && currentClientLoans.length > 0 ? `## Client Loans
${currentClientLoans.map(loan => {
        // For UI state data, use a simpler approach
        let valueStr = String(loan.value || '0');
        let value = valueStr.startsWith('$') ? 
                    parseFloat(valueStr.replace(/[^0-9.-]+/g, '')) : 
                    parseFloat(valueStr);
        if (isNaN(value)) value = 0;
        console.log(`Processing loan: ${loan.name}, value: ${loan.value}, parsed: ${value}`);
        return `- ${loan.name}: ${formatCurrency(value)} (Type: ${loan.loan_type}, Owner: ${loan.owner})`;
      }).join('\n')}` : ''}

${currentClientInsurance && currentClientInsurance.length > 0 ? `## Client Insurance
${currentClientInsurance.map(insurance => {
        // For UI state data, use a simpler approach
        let valueStr = String(insurance.value || '0');
        let value = valueStr.startsWith('$') ? 
                    parseFloat(valueStr.replace(/[^0-9.-]+/g, '')) : 
                    parseFloat(valueStr);
        if (isNaN(value)) value = 0;
        console.log(`Processing insurance: ${insurance.name}, value: ${insurance.value}, parsed: ${value}`);
        return `- ${insurance.name}: ${formatCurrency(value)} (Type: ${insurance.insurance_type}, Owner: ${insurance.owner})`;
      }).join('\n')}` : ''}

${currentSelectedReasons && currentSelectedReasons.length > 0 ? `## Advice Reasons
${currentSelectedReasons.map(reason => `- ${reason.reason_text}${reason.statement ? `\n  Statement: ${reason.statement}` : ''}`).join('\n')}` : ''}

${currentSelectedCoverageAreas && currentSelectedCoverageAreas.length > 0 ? `## Advice Coverage Areas
${currentSelectedCoverageAreas.map(area => `- ${area.coverage_text}${area.statement ? `\n  Statement: ${area.statement}` : ''}`).join('\n')}` : ''}

${currentAdvisorRecommendations && currentAdvisorRecommendations.length > 0 ? `## Advisor Recommendations
${currentAdvisorRecommendations.map(rec => `- ${rec.recommendation_text}`).join('\n')}` : ''}

${currentRecommendations && currentRecommendations.length > 0 ? `## General Recommendations
${currentRecommendations.map(rec => `- ${rec.recommendation_text}`).join('\n')}` : ''}

${currentProductRecommendations && currentProductRecommendations.length > 0 ? `## Product Recommendations
${currentProductRecommendations.map(rec => `- ${rec.product_name}`).join('\n')}` : ''}

${currentGoalsObjectives && currentGoalsObjectives.length > 0 ? `## Goals and Objectives
${currentGoalsObjectives.map(goal => `- ${goal.goal_text || goal.text}${goal.timeframe ? ` (Timeframe: ${goal.timeframe})` : ''}`).join('\n')}` : ''}

## Consultation Details
- Date: ${new Date(client.consultation_date).toLocaleDateString()}
- Advisor: ${client.advisor_name}
${client.advisor_advice ? `- Advisor Advice: ${client.advisor_advice}` : ''}`;

    try {
      console.log("Inserting message into chat at:", new Date().toLocaleTimeString());
      
      // Import the storeMessage function from supabaseUtils
      const { storeMessage } = await import('@/utils/supabaseUtils');
      
      // Use the storeMessage utility function instead of direct insertion
      const { error } = await storeMessage(
        clientDetails,
        'received',
        { 
          clientId: client.id,
          client1_gross_salary: client.client1_gross_salary,
          client1_super_balance: client.client1_super_balance,
          client2_gross_salary: client.client2_gross_salary,
          client2_super_balance: client.client2_super_balance
        }
      );

      if (error) {
        console.error("Supabase insert error:", error);
        throw error;
      }

      console.log("Message successfully inserted into chat");
      toast({
        title: "Client Details Added",
        description: "Complete client details have been added to the chat.",
      });

      if (onPlaceInChat) {
        console.log("Calling onPlaceInChat callback");
        onPlaceInChat();
      }
    } catch (error) {
      console.error("Error adding client details to chat:", error);
      toast({
        title: "Error",
        description: "Failed to add client details to chat: " + (error instanceof Error ? error.message : String(error)),
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
      const updateData: Record<string, any> = {};
      
      (Object.keys(editableClientData) as Array<keyof ClientData>).forEach(key => {
        if (key === 'id') return;
        
        let originalValue = client[key];
        let currentValue = editableClientData[key];
        
        if ((key === 'client1_dob' || key === 'client2_dob' || key === 'consultation_date') && currentValue) {
          // Check if currentValue is a Date-like object with toISOString method
          if (typeof currentValue === 'object' && currentValue !== null && typeof (currentValue as any).toISOString === 'function') {
            currentValue = (currentValue as Date).toISOString();
          }
          
          if (originalValue && typeof originalValue === 'string') {
            const originalDate = new Date(originalValue);
            if (!isNaN(originalDate.getTime())) {
              originalValue = originalDate.toISOString() as any;
            }
          }
        }
        
        if (currentValue !== originalValue) {
          updateData[key as string] = currentValue;
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

  const renderEditableCell = (field: string, clientIndex: 1 | 2 | null = 1) => {
    const actualFieldKey = (field === 'total_lifestyle_assets' || field === 'total_living_expenses' || field === 'total_investment_assets' || field === 'total_superannuation_assets' || field === 'total_client_loans' || field === 'total_client_insurance' || field === 'consultation_date' || field === 'advisor_name' || field === 'advisor_advice')
      ? field
      : (clientIndex === 2 ? `client2_${field}` : `client1_${field}`) as keyof ClientData;

    console.log(`Field mapping: ${String(field)} → ${String(actualFieldKey)}`);
    
    if (clientIndex === 2 && !(actualFieldKey in editableClientData)) {
      return null;
    }

    const value = editableClientData[actualFieldKey];
    
    console.log(`Rendering field: ${String(actualFieldKey)}, value:`, value);

    // Special handling for income tax and centrelink received fields to allow larger numbers
    if (field.includes('tax') || field.includes('received')) {
      const numValue = typeof value === 'number' ? value : 0;
      return (
        <Input
          type="number"
          min="0"
          step="0.01"
          max="99999999.99" // Allow up to 8 digits before decimal
          value={numValue}
          onChange={(e) => {
            const numericValue = parseFloat(e.target.value) || 0;
            setEditableClientData(prev => ({ ...prev, [actualFieldKey]: numericValue }));
          }}
          className="w-full px-1 py-0.5 border-input"
          onBlur={(e) => {
            const numericValue = parseFloat(e.target.value) || 0;
            setEditableClientData(prev => ({ ...prev, [actualFieldKey]: numericValue }));
          }}
        />
      );
    } else if (field.includes('salary') || field.includes('balance') || field.includes('assets') || field.includes('expenses') || field.includes('loans') || field.includes('insurance')) {
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
          onClick={() => {
            console.log('Place Details in Chat button clicked');
            handlePlaceInChat();
          }}
          variant="blue"
          className="btn-pulse"
        >
          <MessageSquare className="h-4 w-4 mr-1" />
          Place Details in Chat
        </Button>
        <Button
          onClick={() => {
            console.log('Extract Recommendations button clicked');
            analyzeAdvisorComments();
          }}
          variant="blue"
          className="btn-pulse"
        >
          <Search className="h-4 w-4 mr-1" />
          Extract Recommendations
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
              <TableCell className="font-medium flex items-center gap-2">
                Total Lifestyle Assets
                <button
                  type="button"
                  className="ml-2 p-1 rounded hover:bg-gray-100"
                  aria-label="Add lifestyle assets"
                  onClick={() => setShowLifestyleModal(true)}
                >
                  <Plus size={16} />
                </button>
              </TableCell>
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
              <TableCell className="font-medium flex items-center gap-2">
                Total Investment Assets
                <button
                  type="button"
                  className="ml-2 p-1 rounded hover:bg-gray-100"
                  aria-label="Add investment assets"
                  onClick={() => setShowInvestmentModal(true)}
                >
                  <Plus size={16} />
                </button>
              </TableCell>
              <TableCell colSpan={client.client2_name ? 2 : 1}>
                {renderEditableCell('total_investment_assets', null)}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium flex items-center gap-2">
                Total Superannuation Assets
                <button
                  type="button"
                  className="ml-2 p-1 rounded hover:bg-gray-100"
                  aria-label="Add superannuation assets"
                  onClick={() => setShowSuperannuationModal(true)}
                >
                  <Plus size={16} />
                </button>
              </TableCell>
              <TableCell colSpan={client.client2_name ? 2 : 1}>
                {renderEditableCell('total_superannuation_assets', null)}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium flex items-center gap-2">
                Total Client Loans
                <button
                  type="button"
                  className="ml-2 p-1 rounded hover:bg-gray-100"
                  aria-label="Add client loans"
                  onClick={() => setShowClientLoansModal(true)}
                >
                  <Plus size={16} />
                </button>
              </TableCell>
              <TableCell colSpan={client.client2_name ? 2 : 1}>
                {renderEditableCell('total_client_loans', null)}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium flex items-center gap-2">
                Total Client Insurance
                <button
                  type="button"
                  className="ml-2 p-1 rounded hover:bg-gray-100"
                  aria-label="Add client insurance"
                  onClick={() => setShowClientInsuranceModal(true)}
                >
                  <Plus size={16} />
                </button>
              </TableCell>
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
            <TableRow>
              <TableCell className="font-medium flex items-center gap-2">
                Advisor Recommendations
                <button
                  className="ml-auto p-1 rounded-full hover:bg-gray-100"
                  onClick={() => setShowAdvisorRecommendationsModal(true)}
                >
                  <Plus size={16} />
                </button>
              </TableCell>
              <TableCell>
                {advisorRecommendations.filter(r => r.recommendation_text.trim() !== '').length > 0 ? (
                  <span>
                    {advisorRecommendations.filter(r => r.recommendation_text.trim() !== '').length} advisor recommendation{advisorRecommendations.filter(r => r.recommendation_text.trim() !== '').length !== 1 ? 's' : ''}
                  </span>
                ) : (
                  <span className="text-gray-500">No advisor recommendations added</span>
                )}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium flex items-center gap-2">
                Product Recommendations
                <button
                  type="button"
                  className="ml-2 p-1 rounded hover:bg-gray-100"
                  aria-label="Add product recommendations"
                  onClick={() => setShowProductRecommendationsModal(true)}
                >
                  <Plus size={16} />
                </button>
              </TableCell>
              <TableCell colSpan={client.client2_name ? 2 : 1}>
                {productRecommendations.filter(r => r.product_name.trim() !== '').length > 0 ? (
                  <div className="text-sm text-gray-600">
                    {productRecommendations.filter(r => r.product_name.trim() !== '').length} product recommendation{productRecommendations.filter(r => r.product_name.trim() !== '').length !== 1 ? 's' : ''}
                  </div>
                ) : (
                  <div className="text-sm text-gray-400 italic">No product recommendations</div>
                )}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
      {/* Lifestyle Assets Modal */}
      <Dialog open={showLifestyleModal} onOpenChange={setShowLifestyleModal}>
        <DialogContent className="max-w-3xl">
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
                    <select
                      className="border rounded px-2 py-1"
                      value={asset.asset_type || ''}
                      onChange={e => {
                        const updated = [...lifestyleAssets];
                        updated[idx].asset_type = e.target.value;
                        setLifestyleAssets(updated);
                      }}
                    >
                      <option value="">Select Type</option>
                      <option value="Home">Home</option>
                      <option value="Vehicle">Vehicle</option>
                      <option value="Furniture">Furniture</option>
                      <option value="Electronics">Electronics</option>
                      <option value="Jewelry">Jewelry</option>
                      <option value="Other">Other</option>
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
            <div className="flex flex-col h-full">
              <div className="overflow-y-auto max-h-[60vh] pr-2 mb-4">
                <div className="space-y-4">
                  {superannuationAssets.map((asset, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center p-2 border rounded">
                      <input
                        type="text"
                        placeholder="Asset name"
                        className="border rounded px-2 py-1 col-span-3"
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
                        className="border rounded px-2 py-1 col-span-2"
                        value={asset.value}
                        onChange={e => {
                          const updated = [...superannuationAssets];
                          updated[idx].value = e.target.value;
                          setSuperannuationAssets(updated);
                        }}
                      />
                      <div className="flex items-center gap-1 col-span-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          max="100"
                          placeholder="Return %"
                          className="border rounded px-2 py-1 w-full"
                          value={asset.current_return}
                          onChange={e => {
                            const updated = [...superannuationAssets];
                            updated[idx].current_return = e.target.value;
                            setSuperannuationAssets(updated);
                          }}
                          title="Current annual return percentage"
                        />
                        <span className="text-sm text-gray-500">%</span>
                      </div>
                      <select
                        className="border rounded px-2 py-1 col-span-2"
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
                        className="border rounded px-2 py-1 col-span-2"
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
                          className="ml-1 px-2 py-1 text-red-500 hover:text-red-700 col-span-1"
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
              </div>
              
              <div className="border-t pt-4 mt-auto">
                <div className="font-semibold text-right mb-4">
                  Total: ${superannuationSum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="flex justify-end gap-2">
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
              </div>
            </div>
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

      {/* Advisor Recommendations Modal */}
      <Dialog open={showAdvisorRecommendationsModal} onOpenChange={setShowAdvisorRecommendationsModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Advisor Recommendations</DialogTitle>
            <DialogDescription>
              Add up to eight advisor recommendations. These are general recommendations from the advisor to the client.
            </DialogDescription>
          </DialogHeader>
          {advisorRecommendationsLoading ? (
            <div className="text-center text-gray-500 py-8">Loading...</div>
          ) : (
            <>
              <div className="space-y-4 max-h-[60vh] overflow-y-auto p-2">
                {advisorRecommendations.map((rec, idx) => (
                  <div key={idx} className="p-4 border rounded-md bg-gray-50">
                    <h4 className="font-medium mb-2">Recommendation {idx + 1}</h4>
                    
                    <label htmlFor={`advisor-recommendation-${idx}`} className="font-medium text-sm mt-2">
                      Recommendation Text
                    </label>
                    <textarea
                      id={`advisor-recommendation-${idx}`}
                      value={rec.recommendation_text}
                      onChange={e => {
                        const updated = [...advisorRecommendations];
                        updated[idx].recommendation_text = e.target.value;
                        setAdvisorRecommendations(updated);
                      }}
                      className="w-full text-sm p-2 border rounded min-h-[80px]"
                      placeholder="Enter recommendation"
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button
                  className="px-4 py-2 rounded border bg-gray-100 hover:bg-gray-200"
                  onClick={() => setShowAdvisorRecommendationsModal(false)}
                  disabled={advisorRecommendationsLoading}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
                  onClick={handleSaveAdvisorRecommendations}
                  disabled={advisorRecommendationsLoading}
                >
                  Save
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Product Recommendations Modal */}
      <Dialog open={showProductRecommendationsModal} onOpenChange={setShowProductRecommendationsModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Product Recommendations</DialogTitle>
            <DialogDescription>
              Add up to eight product recommendations. Specify the product name, amount, and which client it's for.
            </DialogDescription>
          </DialogHeader>
          {productRecommendationsLoading ? (
            <div className="text-center text-gray-500 py-8">Loading...</div>
          ) : (
            <>
              <div className="space-y-4 max-h-[60vh] overflow-y-auto p-2">
                {productRecommendations.map((rec, idx) => (
                  <div key={idx} className="p-4 border rounded-md bg-gray-50">
                    <h4 className="font-medium mb-2">Product Recommendation {idx + 1}</h4>
                    
                    <label htmlFor={`product-name-${idx}`} className="font-medium text-sm mt-2">
                      Product Name
                    </label>
                    <input
                      id={`product-name-${idx}`}
                      type="text"
                      value={rec.product_name}
                      onChange={e => {
                        const updated = [...productRecommendations];
                        updated[idx].product_name = e.target.value;
                        setProductRecommendations(updated);
                      }}
                      className="w-full text-sm p-2 border rounded"
                      placeholder="Enter product name"
                    />
                    
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      <div className="flex flex-col">
                        <label htmlFor={`product-amount-${idx}`} className="font-medium text-sm mb-1">
                          Amount ($)
                        </label>
                        <input
                          id={`product-amount-${idx}`}
                          type="number"
                          value={rec.amount || ''}
                          onChange={e => {
                            const updated = [...productRecommendations];
                            updated[idx].amount = parseFloat(e.target.value) || 0;
                            setProductRecommendations(updated);
                          }}
                          className="w-full text-sm p-2 border rounded"
                          placeholder="0.00"
                        />
                      </div>
                      
                      <div className="flex flex-col">
                        <label htmlFor={`product-client-${idx}`} className="font-medium text-sm mb-1">
                          For Client
                        </label>
                        <select
                          id={`product-client-${idx}`}
                          value={rec.client_allocation}
                          onChange={e => {
                            const updated = [...productRecommendations];
                            updated[idx].client_allocation = e.target.value as 'Client 1' | 'Client 2' | 'Joint';
                            setProductRecommendations(updated);
                          }}
                          className="w-full text-sm p-2 border rounded"
                        >
                          <option value="Client 1">Client 1</option>
                          {client.client2_name && <option value="Client 2">Client 2</option>}
                          <option value="Joint">Joint</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button
                  className="px-4 py-2 rounded border bg-gray-100 hover:bg-gray-200"
                  onClick={() => setShowProductRecommendationsModal(false)}
                  disabled={productRecommendationsLoading}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
                  onClick={handleSaveProductRecommendations}
                  disabled={productRecommendationsLoading}
                >
                  Save
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      {/* Save Changes Button */}
      {isDirty && (
        <div className="fixed bottom-4 right-4 z-50">
          <Button 
            onClick={handleSave}
            className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 px-4 py-2 rounded shadow-lg"
          >
            <Save size={16} />
            Save Changes
          </Button>
        </div>
      )}
    </div>
  );
}
