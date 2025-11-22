import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Brain, TrendingUp, DollarSign, Target, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AIAnalysisProps {
  clientId: string;
}

export function AIAnalysis({ clientId }: AIAnalysisProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const { toast } = useToast();

  const runAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const response = await fetch(`http://localhost:8000/analyze/${clientId}`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Analysis failed');
      }

      const result = await response.json();
      
      // Fetch the analysis results
      const analysisResponse = await fetch(`http://localhost:8000/analysis/${clientId}`);
      const analysisData = await analysisResponse.json();
      
      setAnalysis(analysisData);
      
      toast({
        title: "Analysis Complete",
        description: `Processed in ${result.processing_time_ms.toFixed(0)}ms`,
      });
    } catch (error) {
      toast({
        title: "Analysis Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const loadExistingAnalysis = async () => {
    try {
      const response = await fetch(`http://localhost:8000/analysis/${clientId}`);
      if (response.ok) {
        const data = await response.json();
        setAnalysis(data);
      }
    } catch (error) {
      console.error("Failed to load analysis:", error);
    }
  };

  // Load existing analysis on mount
  useState(() => {
    loadExistingAnalysis();
  });

  if (!analysis) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-500" />
            AI Financial Analysis
          </CardTitle>
          <CardDescription>
            Generate comprehensive AI-powered analysis of this client's financial situation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={runAnalysis} 
            disabled={isAnalyzing}
            className="w-full"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Brain className="mr-2 h-4 w-4" />
                Generate AI Analysis
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-purple-500" />
                AI Financial Analysis
              </CardTitle>
              <CardDescription>
                Last updated: {new Date(analysis.processedAt).toLocaleString()}
              </CardDescription>
            </div>
            <Button 
              onClick={runAnalysis} 
              disabled={isAnalyzing}
              variant="outline"
              size="sm"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Refresh Analysis"
              )}
            </Button>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="retirement">Retirement</TabsTrigger>
          <TabsTrigger value="cashflow">Cashflow</TabsTrigger>
          <TabsTrigger value="strategies">Strategies</TabsTrigger>
          <TabsTrigger value="risk">Risk Profile</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Client Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold mb-2">{analysis.clientNamesSummary}</p>
              
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="space-y-2">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Shield className="h-4 w-4 text-blue-500" />
                    Coverage Status
                  </h4>
                  <ul className="text-sm space-y-1">
                    <li>Investment: {analysis.coverageGaps.investmentCovered ? "✓ Covered" : "⚠ Gap"}</li>
                    <li>Superannuation: {analysis.coverageGaps.superannuationCovered ? "✓ Covered" : "⚠ Gap"}</li>
                    <li>Cashflow: {analysis.coverageGaps.cashflowCovered ? "✓ Covered" : "⚠ Gap"}</li>
                    <li>Debt: {analysis.coverageGaps.debtCovered ? "✓ Covered" : "⚠ Gap"}</li>
                  </ul>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Target className="h-4 w-4 text-green-500" />
                    Objectives
                  </h4>
                  <ul className="text-sm space-y-1">
                    {analysis.objectives.map((obj: any, i: number) => (
                      <li key={i}>
                        {obj.name} - <span className="text-muted-foreground">{obj.progress}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="retirement" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                Retirement Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Summary</h4>
                <p className="text-sm text-muted-foreground">
                  {analysis.retirementAnalysis.summaryParagraph}
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-sm">Priority Level</h4>
                  <p className="text-2xl font-bold text-green-600">
                    {analysis.retirementAnalysis.retirementPriority}/10
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-sm">Timeline</h4>
                  <p className="text-2xl font-bold text-blue-600">
                    {analysis.retirementAnalysis.retirementTimeline} years
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cashflow" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-blue-500" />
                Cashflow & Debt Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Cashflow Summary</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  {analysis.cashflowAnalysis.summaryParagraph}
                </p>
                <p className="text-sm">
                  <span className="font-semibold">Priority:</span> {analysis.cashflowAnalysis.cashflowPriority}/10
                </p>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Debt Management</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  {analysis.debtAnalysis.summaryParagraph}
                </p>
                <p className="text-sm">
                  <span className="font-semibold">Priority:</span> {analysis.debtAnalysis.debtRepaymentPriority}/10
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="strategies" className="space-y-4">
          <ScrollArea className="h-[500px]">
            <div className="space-y-3">
              {analysis.strategies.map((strategy: any, i: number) => (
                <Card key={i}>
                  <CardHeader>
                    <CardTitle className="text-base">{strategy.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{strategy.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="risk" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Investment Risk Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold text-sm mb-2">Profile</h4>
                <p className="text-2xl font-bold text-purple-600">
                  {analysis.riskProfile.profile}
                </p>
              </div>
              
              <div>
                <h4 className="font-semibold text-sm mb-2">Rationale</h4>
                <p className="text-sm text-muted-foreground">
                  {analysis.riskProfile.rationale}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

