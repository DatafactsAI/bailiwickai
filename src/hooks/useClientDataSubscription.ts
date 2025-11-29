/**
 * Client data subscription hook (no-op for local storage MVP)
 * 
 * Real-time subscriptions are not needed for local file storage.
 * This hook is kept for API compatibility but does nothing.
 */
export const useClientDataSubscription = () => {
  // No-op: Local storage doesn't support real-time subscriptions
  // Components can manually invalidate queries after mutations
};
