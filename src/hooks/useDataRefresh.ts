import { useCallback } from 'react';
import { useAppStore } from '../store';

/**
 * Hook for components to trigger data refreshes and subscribe to data updates
 * This provides a clean interface to the centralized data management system
 */
export function useDataRefresh() {
  const { refreshData, refreshPoolData, refreshTokenData } = useAppStore();

  const refreshAll = useCallback(async () => {
    try {
      await refreshData();
    } catch (error) {
      console.error('Failed to refresh all data:', error);
    }
  }, [refreshData]);

  const refreshPools = useCallback(async () => {
    try {
      await refreshPoolData();
    } catch (error) {
      console.error('Failed to refresh pool data:', error);
    }
  }, [refreshPoolData]);

  const refreshTokens = useCallback(async () => {
    try {
      await refreshTokenData();
    } catch (error) {
      console.error('Failed to refresh token data:', error);
    }
  }, [refreshTokenData]);

  return {
    refreshAll,
    refreshPools,
    refreshTokens
  };
}
