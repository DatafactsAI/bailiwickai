import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { Search, Users, UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const API_BASE = "http://localhost:8000";

interface ClientSidebarProps {
  selectedClientId: string | null;
  onClientSelect: (clientId: string | null) => void;
}

export function ClientSidebar({ selectedClientId, onClientSelect }: ClientSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: clients, isLoading } = useQuery({
    queryKey: ['clients-list'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/clients`);
      if (!response.ok) {
        throw new Error('Failed to fetch clients');
      }
      const data = await response.json();
      // Backend returns {clients: [...]}, and we need to sort by consultation_date
      const clientsList = data.clients || [];
      // Sort by consultation_date descending (most recent first)
      return clientsList.sort((a: any, b: any) => {
        const dateA = new Date(a.consultation_date || 0).getTime();
        const dateB = new Date(b.consultation_date || 0).getTime();
        return dateB - dateA;
      });
    }
  });

  const filteredClients = clients?.filter(client => {
    const searchLower = searchQuery.toLowerCase();
    const primaryName = client.client1_name?.toLowerCase() || "";
    const partnerName = client.client2_name?.toLowerCase() || "";
    const fallbackId = client.id?.toLowerCase() || "";
    return (
      primaryName.includes(searchLower) ||
      partnerName.includes(searchLower) ||
      fallbackId.includes(searchLower)
    );
  });

  return (
    <div className="flex flex-col h-full bg-gray-50/50 border-r">
      <div className="p-4 border-b bg-white/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-2 mb-4 text-gray-600">
          <Users className="h-4 w-4" />
          <span className="font-semibold text-sm">Clients</span>
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search clients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 bg-white"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Loading clients...
            </div>
          ) : filteredClients?.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No clients found
            </div>
          ) : (
            filteredClients?.map((client) => {
              const primaryName = client.client1_name?.trim();
              const partnerName = client.client2_name?.trim();
              const displayName = primaryName || partnerName
                ? [primaryName, partnerName].filter(Boolean).join(" & ")
                : `Client ${client.id}`;
              const displayDate = client.consultation_date
                ? new Date(client.consultation_date).toLocaleDateString()
                : "Consultation date unknown";
              return (
              <Button
                key={client.id}
                variant="ghost"
                className={cn(
                  "w-full justify-start h-auto py-3 px-3 text-left font-normal transition-all duration-200",
                  selectedClientId === client.id 
                    ? "bg-blue-50 text-blue-700 shadow-sm border-blue-100 border" 
                    : "hover:bg-gray-100 hover:text-gray-900"
                )}
                onClick={() => onClientSelect(client.id)}
              >
                <div className="flex gap-3 items-center w-full">
                  <UserCircle className={cn(
                    "h-8 w-8",
                    selectedClientId === client.id ? "text-blue-500" : "text-gray-400"
                  )} />
                  <div className="flex-1 overflow-hidden">
                    <div className="font-medium truncate">
                      {displayName}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {displayDate}
                    </div>
                  </div>
                </div>
              </Button>
            );})
          )}
        </div>
      </ScrollArea>
    </div>
  );
}



