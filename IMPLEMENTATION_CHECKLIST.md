# Implementation Checklist
## Quick Reference for Development Agent

This is a simplified checklist derived from the comprehensive review. Use this to track progress.

---

## 🔴 Phase 1: Critical Fixes (MUST DO FIRST)

### Task 1.1: Remove Supabase Dependencies
- [ ] `ClientSidebar.tsx` - Replace Supabase query with `fetch('http://localhost:8000/clients')`
- [ ] `ContextPanel.tsx` - Replace Supabase query with `fetch('http://localhost:8000/clients/{id}')`
- [ ] `useClientData.ts` - Replace Supabase with FastAPI calls
- [ ] `ClientTable.tsx` - Replace Supabase save with `POST /clients`
- [ ] Remove `useClientDataSubscription.ts` or make it optional
- [ ] Test: Client list loads from local storage
- [ ] Test: Client data can be viewed and edited

### Task 1.2: Fix Fact Find Upload
- [ ] `advice_processor/main.py:242-317` - Save client data locally after processing
- [ ] Remove or make optional webhook call
- [ ] Test: Upload fact find → Client appears in sidebar

### Task 1.3: Make Chat Read-Only
- [ ] `chat-assistant/index.ts:32-86` - Remove update logic
- [ ] `chat-assistant/utils.ts` - Remove or disable `updateClientData`
- [ ] Update system prompt to clarify read-only
- [ ] Add UI badge/text: "Chat is read-only"
- [ ] Test: Chat cannot modify client data

### Task 1.4: Remove Zapier Dependencies
- [ ] `FinancialPlanWriter.tsx` - Remove Zapier URLs (lines 27-30)
- [ ] Delete `ZapierWebhookForm.tsx`
- [ ] Delete `WebhookInputForm.tsx`
- [ ] Delete `WebhookInstructions.tsx`
- [ ] Update `FinancialPlanWriter.tsx` to use `DocumentGenerationPanel`
- [ ] Test: Document generation works without Zapier

**Phase 1 Complete When:** All checkboxes above are done and all tests pass.

---

## 🟡 Phase 2: High-Priority Features

### Task 2.1: Strategy Tab
- [ ] Create `src/components/strategy/StrategyPanel.tsx`
- [ ] Add "Strategy" tab to `ContextPanel.tsx` (4th tab)
- [ ] Create strategy storage in `local_storage.py`
- [ ] Add endpoints: `GET/POST/DELETE /strategies/{client_id}`
- [ ] Display strategies from AI analysis
- [ ] Allow manual create/edit/delete
- [ ] Test: Strategy tab works end-to-end

### Task 2.2: Knowledge Base Integration
- [ ] Create `embedding_service.py` - Generate embeddings using OpenAI
- [ ] Add endpoint: `POST /knowledge-base/documents/{id}/generate-embeddings`
- [ ] Create `semantic_search.py` - Vector similarity search
- [ ] Add endpoint: `POST /knowledge-base/search`
- [ ] Update `chat-assistant/index.ts` - Call search before OpenAI
- [ ] Inject KB context into prompts
- [ ] Test: Chat responses reference KB documents

**Phase 2 Complete When:** Strategy tab works and KB enhances chat.

---

## 🟢 Phase 3: Enhanced Features

### Task 3.1: Conditional Logic in Templates
- [ ] Define syntax: `{% if condition %}...{% endif %}`
- [ ] Update `placeholder_extractor.py` - Detect conditionals
- [ ] Update `document_generator.py` - Evaluate and include/exclude
- [ ] Test: Conditional sections work

### Task 3.2: AI Prompt Customization
- [ ] Create `prompt_config.py` - Load/save prompts
- [ ] Create `AIPromptSettings.tsx` - UI for editing
- [ ] Update `ai_processor.py` - Use custom prompts
- [ ] Test: Custom prompts work

### Task 3.3: Document Generation Rules
- [ ] Create `generation_config.py`
- [ ] Create `DocumentGenerationSettings.tsx`
- [ ] Integrate rules into generation
- [ ] Test: Rules apply correctly

**Phase 3 Complete When:** All enhanced features work.

---

## 🔵 Phase 4: Code Quality & Testing

### Task 4.1: Code Quality
- [ ] Remove all `any` types
- [ ] Standardize error handling
- [ ] Create `apiConfig.ts` - Centralized API config
- [ ] Add input validation everywhere
- [ ] Optimize data fetching (reduce redundant calls)

### Task 4.2: Testing
- [ ] Backend: Test all API endpoints
- [ ] Frontend: Test critical components
- [ ] Integration: Test full workflows
- [ ] E2E: Test user journeys
- [ ] Coverage: Aim for 80%+

**Phase 4 Complete When:** Code quality improved and tests written.

---

## 📋 Quick Test Checklist

After each phase, verify:

### Basic Functionality
- [ ] App starts without errors
- [ ] Client list loads
- [ ] Client data displays
- [ ] Can edit client data
- [ ] Fact find upload works
- [ ] AI analysis generates
- [ ] Document generation works
- [ ] Chat responds

### No Regressions
- [ ] Previous features still work
- [ ] No console errors
- [ ] No broken UI elements
- [ ] Performance acceptable

---

## 🚨 Critical Issues to Watch For

1. **Supabase still being used** - Check for `supabase.from()` calls
2. **Zapier URLs present** - Search for "zapier" in codebase
3. **Chat can modify data** - Verify read-only enforcement
4. **Fact find not saving** - Verify local storage after upload
5. **Missing error handling** - All API calls should handle errors

---

## 📝 Notes for Next Agent

- Start with Phase 1, Task 1.1
- Test after each task
- Commit frequently
- Update this checklist as you go
- Refer to `CODE_REVIEW_AND_IMPLEMENTATION_PLAN.md` for details

---

**Last Updated:** [Current Date]  
**Status:** Ready for Implementation


