# Critical Issues - Quick Reference
## Specific Code Locations for Immediate Fixes

This document provides exact file paths and line numbers for the most critical issues that must be fixed first.

---

## 🔴 Issue #1: ClientSidebar Uses Supabase (Must Fix First)

**File:** `src/components/layout/ClientSidebar.tsx`  
**Lines:** 18-29

**Current Code:**
```typescript
const { data: clients, isLoading } = useQuery({
  queryKey: ['clients-list'],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('clients_financial_data')  // ❌ WRONG - Supabase table
      .select('id, client1_name, client2_name, consultation_date')
      .order('consultation_date', { ascending: false });
    
    if (error) throw error;
    return data;
  }
});
```

**Fix:**
```typescript
const { data: clients, isLoading } = useQuery({
  queryKey: ['clients-list'],
  queryFn: async () => {
    const response = await fetch('http://localhost:8000/clients');
    if (!response.ok) throw new Error('Failed to fetch clients');
    const data = await response.json();
    return data.clients;  // ✅ Returns array of client objects
  }
});
```

**Also Remove:**
- Line 6: `import { supabase } from "@/integrations/supabase/client";`

---

## 🔴 Issue #2: ContextPanel Uses Supabase

**File:** `src/components/layout/ContextPanel.tsx`  
**Lines:** 22-41

**Current Code:**
```typescript
const { data: selectedClient, isLoading } = useQuery({
  queryKey: ['client-details', selectedClientId],
  queryFn: async () => {
    if (!selectedClientId) return null;
    const { data, error } = await supabase
      .from('clients_financial_data')  // ❌ WRONG
      .select('*')
      .eq('id', selectedClientId)
      .single();

    if (error) throw error;
    return {
      ...data,
      total_superannuation_assets: (data as any).total_superannuation_assets ?? 0,
      total_client_loans: (data as any).total_client_loans ?? 0,
      total_client_insurance: (data as any).total_client_insurance ?? 0,
    } as ClientData;
  },
  enabled: !!selectedClientId
});
```

**Fix:**
```typescript
const { data: selectedClient, isLoading } = useQuery({
  queryKey: ['client-details', selectedClientId],
  queryFn: async () => {
    if (!selectedClientId) return null;
    const response = await fetch(`http://localhost:8000/clients/${selectedClientId}`);
    if (!response.ok) throw new Error('Failed to fetch client');
    const data = await response.json();
    return data as ClientData;  // ✅ Backend returns proper ClientData model
  },
  enabled: !!selectedClientId
});
```

**Also Remove:**
- Line 9: `import { supabase } from "@/integrations/supabase/client";`

---

## 🔴 Issue #3: useClientData Hook Uses Supabase

**File:** `src/hooks/useClientData.ts`  
**Lines:** 8-37

**Current Code:**
```typescript
export const useClientData = () => {
  return useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('clients_financial_data')  // ❌ WRONG
          .select('*')
          .order('consultation_date', { ascending: false });

        if (error) throw error;
        // ... rest of code
      }
    }
  });
};
```

**Fix:**
```typescript
export const useClientData = () => {
  return useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      try {
        const response = await fetch('http://localhost:8000/clients');
        if (!response.ok) throw new Error('Failed to fetch clients');
        const data = await response.json();
        return data.clients as ClientData[];  // ✅
      } catch (error) {
        console.error('Error fetching client data:', error);
        toast({
          title: "Error fetching client data",
          description: "There was a problem loading client information. Please try again.",
          variant: "destructive",
        });
        throw error;
      }
    },
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
  });
};
```

**Also Remove:**
- Line 3: `import { supabase } from '@/integrations/supabase/client';`

---

## 🔴 Issue #4: Fact Find Upload Doesn't Save Locally

**File:** `advice_processor/main.py`  
**Lines:** 242-317 (specifically 279-300)

**Current Code:**
```python
# Process the PDF
payload_dict = process_fact_find_pdf(temp_file)

# Validate with Pydantic
payload = WebhookPayload(**payload_dict)

# Send to webhook  ❌ WRONG - Should save locally
logger.info("Sending processed data to webhook...")
client = WebhookClient()
success = client.send_data(payload)

if success:
    # ... returns success
```

**Fix:**
```python
# Process the PDF
payload_dict = process_fact_find_pdf(temp_file)

# Convert to ClientData model
# Note: You may need to map WebhookPayload to ClientData
client_data = convert_webhook_payload_to_client_data(payload_dict)

# Save locally ✅
storage.save_client(client_data)
logger.info(f"Saved client data for {client_data.id}")

# Optional: Send to webhook (if needed for external systems)
# client = WebhookClient()
# client.send_data(payload)  # Make this optional

return {
    "status": "success",
    "message": f"Fact find processed successfully for {client_data.clientInfo.client1.name}",
    "client_id": client_data.id,
    "client1_name": client_data.clientInfo.client1.name,
    "client2_name": client_data.clientInfo.client2.name if client_data.clientInfo.client2 else None,
    "filename": file.filename
}
```

**Note:** You'll need to create a conversion function from `WebhookPayload` to `ClientData` model.

---

## 🔴 Issue #5: Chat Assistant Can Modify Data

**File:** `supabase/functions/chat-assistant/index.ts`  
**Lines:** 32-86

**Current Code:**
```typescript
// First, check if this is a data update request
if (clientData?.clientId) {
  const analysis = analyzeMessage(message);
  
  if (analysis.action !== 'none' && analysis.targetValue !== null) {
    // ... update logic ❌ WRONG - Should be read-only
    const updatedClient = await updateClientData(supabase, clientData.clientId, updates);
    // ...
  }
}
```

**Fix:**
```typescript
// Remove entire update block (lines 32-86)
// Chat is read-only for MVP

// Just process message with OpenAI Assistant
const enhancedMessage = enrichedClientData?.clientId 
  ? enhanceMessageWithContext(message, enrichedClientData)
  : message;

// Continue with OpenAI Assistant processing...
```

**Also Update:**
- `supabase/functions/chat-assistant/utils.ts` line 58 - Remove update instruction from context:
  - Remove: `"You can update client data when asked..."`
  - Add: `"You are a read-only assistant. You can analyze and provide advice but cannot modify client data."`

---

## 🔴 Issue #6: Zapier URLs in FinancialPlanWriter

**File:** `src/components/FinancialPlanWriter.tsx`  
**Lines:** 27-30

**Current Code:**
```typescript
// Zapier webhook URLs  ❌ REMOVE
const primaryWebhookUrl = 'https://hooks.zapier.com/hooks/catch/17752322/2wrf9gm/';
const secondaryWebhookUrl = 'https://hooks.zapier.com/hooks/catch/17752322/2wxnady/';
const tertiaryWebhookUrl = 'https://hooks.zapier.com/hooks/catch/17752322/uoxkcaj/';
```

**Fix:**
- Delete lines 27-30
- Remove all webhook-related code (lines 49-214)
- Replace with document generation using `DocumentGenerationPanel` component

**Also Delete These Files:**
- `src/components/ZapierWebhookForm.tsx` (entire file)
- `src/components/financial-plan/WebhookInputForm.tsx` (entire file)
- `src/components/financial-plan/WebhookInstructions.tsx` (entire file)

---

## 🔴 Issue #7: ClientTable Saves to Supabase

**File:** `src/components/client-data/ClientTable.tsx`  
**Lines:** 2017-2107 (handleSave function)

**Current Code:**
```typescript
const handleSave = async () => {
  // ... validation ...
  
  try {
    // Likely uses supabase.update() ❌
    // Need to check exact implementation
  }
}
```

**Fix:**
```typescript
const handleSave = async () => {
  if (!isDirty) {
    toast({ 
      title: "No changes to save",
      description: "No changes have been detected in the client data."
    });
    return;
  }

  try {
    const response = await fetch(`http://localhost:8000/clients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editableClientData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to save client data');
    }

    toast({
      title: "Success",
      description: "Client data saved successfully"
    });
    
    setIsDirty(false);
    onDataSaved?.();
  } catch (error) {
    toast({
      title: "Error",
      description: error instanceof Error ? error.message : "Failed to save client data",
      variant: "destructive"
    });
  }
};
```

---

## 🔴 Issue #8: Real-Time Subscriptions Not Needed

**File:** `src/hooks/useClientDataSubscription.ts`  
**Status:** Entire file can be removed or made optional

**Current Code:**
```typescript
// Sets up Supabase real-time subscription
// Not needed for local storage MVP
```

**Fix:**
- Option 1: Delete the file entirely
- Option 2: Make it a no-op (empty function)
- Remove imports of this hook from other files

**Files Using This Hook:**
- `src/components/ClientDataViewer.tsx` (line 33)
- `src/components/FinancialPlanWriter.tsx` (line 33)

**Fix:** Remove the `useClientDataSubscription()` call from these files.

---

## 🟡 Issue #9: Missing Strategy Tab

**File:** `src/components/layout/ContextPanel.tsx`  
**Lines:** 56-72 (TabsList)

**Current Code:**
```typescript
<TabsList className="w-full grid grid-cols-3">  // ❌ Only 3 tabs
  <TabsTrigger value="data">Client Data</TabsTrigger>
  <TabsTrigger value="analysis">AI Analysis</TabsTrigger>
  <TabsTrigger value="plan">Plan Writer</TabsTrigger>
</TabsList>
```

**Fix:**
```typescript
<TabsList className="w-full grid grid-cols-4">  // ✅ 4 tabs
  <TabsTrigger value="data">Client Data</TabsTrigger>
  <TabsTrigger value="analysis">AI Analysis</TabsTrigger>
  <TabsTrigger value="strategy">Strategy</TabsTrigger>  // ✅ Add this
  <TabsTrigger value="plan">Plan Writer</TabsTrigger>
</TabsList>

// Add TabsContent for strategy
<TabsContent value="strategy" className="mt-0 h-full">
  <StrategyPanel clientId={selectedClientId} />
</TabsContent>
```

**Also Create:**
- `src/components/strategy/StrategyPanel.tsx` (new file)

---

## 🟡 Issue #10: Knowledge Base Not Integrated with Chat

**File:** `supabase/functions/chat-assistant/index.ts`  
**Lines:** 125-129 (Message processing)

**Current Code:**
```typescript
// Process message with appropriate context
const enhancedMessage = enrichedClientData?.clientId 
  ? enhanceMessageWithContext(message, enrichedClientData)
  : message;

// Directly sends to OpenAI ❌ No KB search
```

**Fix:**
```typescript
// Step 1: Search knowledge base if query is relevant
let kbContext = '';
if (enrichedClientData?.clientId) {
  try {
    const kbResponse = await fetch('http://localhost:8000/knowledge-base/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: message, limit: 5 })
    });
    
    if (kbResponse.ok) {
      const kbData = await kbResponse.json();
      if (kbData.chunks && kbData.chunks.length > 0) {
        kbContext = '\n\nRelevant Knowledge Base Content:\n' + 
          kbData.chunks.map((c: any) => `- ${c.content}`).join('\n');
      }
    }
  } catch (error) {
    console.error('KB search failed:', error);
    // Continue without KB context
  }
}

// Step 2: Enhance message with client data + KB context
const enhancedMessage = enrichedClientData?.clientId 
  ? enhanceMessageWithContext(message, enrichedClientData) + kbContext
  : message + kbContext;
```

**Note:** Requires KB search endpoint to be implemented first (Phase 2).

---

## Summary of Files to Modify

### High Priority (Fix First)
1. `src/components/layout/ClientSidebar.tsx` - Lines 6, 18-29
2. `src/components/layout/ContextPanel.tsx` - Lines 9, 22-41
3. `src/hooks/useClientData.ts` - Lines 3, 8-37
4. `advice_processor/main.py` - Lines 279-300
5. `supabase/functions/chat-assistant/index.ts` - Lines 32-86, 125-129
6. `src/components/FinancialPlanWriter.tsx` - Lines 27-30, 49-214

### Medium Priority
7. `src/components/client-data/ClientTable.tsx` - handleSave function
8. `src/hooks/useClientDataSubscription.ts` - Entire file
9. `src/components/layout/ContextPanel.tsx` - Add Strategy tab

### Files to Delete
- `src/components/ZapierWebhookForm.tsx`
- `src/components/financial-plan/WebhookInputForm.tsx`
- `src/components/financial-plan/WebhookInstructions.tsx`

---

## Testing After Each Fix

After fixing each issue:
1. **Start backend:** `cd advice_processor && python main.py`
2. **Start frontend:** `npm run dev`
3. **Test the specific feature:**
   - Issue #1: Check client list loads
   - Issue #2: Check client details load
   - Issue #4: Upload fact find, verify client appears
   - Issue #5: Try to modify data via chat (should fail)
   - Issue #6: Generate document (should work without Zapier)

---

**Last Updated:** [Current Date]  
**Use With:** `CODE_REVIEW_AND_IMPLEMENTATION_PLAN.md` for full context


