import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, Target, Plus, Edit, Trash2, Save, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const API_BASE = "http://localhost:8000";

interface Strategy {
  id?: string;
  name: string;
  description: string;
  source?: "ai_analysis" | "knowledge_base" | "manual";
  createdAt?: string;
}

interface StrategyPanelProps {
  clientId: string | null;
}

export function StrategyPanel({ clientId }: StrategyPanelProps) {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingStrategy, setEditingStrategy] = useState<Strategy | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newStrategy, setNewStrategy] = useState<Strategy>({ name: "", description: "", source: "manual" });
  const { toast } = useToast();

  // Load strategies from AI analysis and saved strategies
  const loadStrategies = async () => {
    if (!clientId) {
      setStrategies([]);
      return;
    }

    setIsLoading(true);
    try {
      // Load AI analysis strategies
      const analysisResponse = await fetch(`${API_BASE}/analysis/${clientId}`);
      if (analysisResponse.ok) {
        const analysis = await analysisResponse.json();
        const aiStrategies: Strategy[] = (analysis.strategies || []).map((s: any) => ({
          id: `ai_${s.name}`,
          name: s.name || "Unnamed Strategy",
          description: s.description || "",
          source: "ai_analysis" as const,
        }));
        setStrategies(aiStrategies);
      }

      // TODO: Load saved strategies from backend when endpoint is available
      // For now, we'll just use AI analysis strategies
    } catch (error) {
      console.error("Failed to load strategies:", error);
      toast({
        title: "Error",
        description: "Failed to load strategies",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStrategies();
  }, [clientId]);

  const handleEdit = (strategy: Strategy) => {
    setEditingId(strategy.id || null);
    setEditingStrategy({ ...strategy });
  };

  const handleSaveEdit = async () => {
    if (!editingStrategy || !clientId) return;

    try {
      // TODO: Save to backend when endpoint is available
      // For now, update local state
      setStrategies(strategies.map(s => 
        s.id === editingId ? { ...editingStrategy, source: "manual" as const } : s
      ));
      
      setEditingId(null);
      setEditingStrategy(null);
      
      toast({
        title: "Strategy updated",
        description: "Strategy has been saved",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save strategy",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (strategyId: string) => {
    if (!clientId) return;

    try {
      // TODO: Delete from backend when endpoint is available
      // For now, update local state
      setStrategies(strategies.filter(s => s.id !== strategyId));
      
      toast({
        title: "Strategy deleted",
        description: "Strategy has been removed",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete strategy",
        variant: "destructive",
      });
    }
  };

  const handleCreate = async () => {
    if (!clientId || !newStrategy.name.trim()) {
      toast({
        title: "Error",
        description: "Please provide a strategy name",
        variant: "destructive",
      });
      return;
    }

    try {
      // TODO: Save to backend when endpoint is available
      // For now, update local state
      const strategy: Strategy = {
        ...newStrategy,
        id: `manual_${Date.now()}`,
        source: "manual",
      };
      setStrategies([...strategies, strategy]);
      setNewStrategy({ name: "", description: "", source: "manual" });
      setIsCreating(false);
      
      toast({
        title: "Strategy created",
        description: "New strategy has been added",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create strategy",
        variant: "destructive",
      });
    }
  };

  if (!clientId) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground p-6 text-center">
        <div>
          <Target className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p>Select a client to view strategies</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Strategies</h2>
          <p className="text-sm text-muted-foreground">
            View and manage financial strategies for this client
          </p>
        </div>
        <Button
          onClick={() => setIsCreating(true)}
          size="sm"
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Strategy
        </Button>
      </div>

      {isCreating && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Strategy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Strategy name"
              value={newStrategy.name}
              onChange={(e) => setNewStrategy({ ...newStrategy, name: e.target.value })}
            />
            <Textarea
              placeholder="Strategy description"
              value={newStrategy.description}
              onChange={(e) => setNewStrategy({ ...newStrategy, description: e.target.value })}
              rows={4}
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => {
                setIsCreating(false);
                setNewStrategy({ name: "", description: "", source: "manual" });
              }}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleCreate}>
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
          </div>
        ) : strategies.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Target className="h-12 w-12 mb-4 opacity-20" />
            <p>No strategies found</p>
            <p className="text-sm mt-2">Generate AI analysis or create a strategy manually</p>
          </div>
        ) : (
          <div className="space-y-4">
            {strategies.map((strategy) => (
              <Card key={strategy.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {editingId === strategy.id && editingStrategy ? (
                        <div className="space-y-2">
                          <Input
                            value={editingStrategy.name}
                            onChange={(e) => setEditingStrategy({ ...editingStrategy, name: e.target.value })}
                          />
                          <Textarea
                            value={editingStrategy.description}
                            onChange={(e) => setEditingStrategy({ ...editingStrategy, description: e.target.value })}
                            rows={3}
                          />
                        </div>
                      ) : (
                        <>
                          <CardTitle className="text-lg">{strategy.name}</CardTitle>
                          <CardDescription className="mt-2">
                            {strategy.description}
                          </CardDescription>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Badge variant="outline">
                        {strategy.source === "ai_analysis" ? "AI Generated" : 
                         strategy.source === "knowledge_base" ? "Knowledge Base" : 
                         "Manual"}
                      </Badge>
                      {editingId === strategy.id ? (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingId(null);
                              setEditingStrategy(null);
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleSaveEdit}
                          >
                            <Save className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(strategy)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => strategy.id && handleDelete(strategy.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}


