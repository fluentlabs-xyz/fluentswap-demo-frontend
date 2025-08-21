import { useState, useEffect, useCallback } from 'react';
import { tokenMetadataService } from '../services/tokenMetadata';
import type { TokenMetadata } from '../services/tokenMetadata';

interface UseTokenMetadataReturn {
  tokenA: TokenMetadata | null;
  tokenB: TokenMetadata | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useTokenMetadata(): UseTokenMetadataReturn {
  const [tokenA, setTokenA] = useState<TokenMetadata | null>(null);
  const [tokenB, setTokenB] = useState<TokenMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTokens = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const tokens = await tokenMetadataService.getKnownTokens();
      setTokenA(tokens.tokenA);
      setTokenB(tokens.tokenB);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch token metadata');
      console.error('Error fetching token metadata:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    await fetchTokens();
  }, [fetchTokens]);

  useEffect(() => {
    fetchTokens();
  }, [fetchTokens]);

  return {
    tokenA,
    tokenB,
    isLoading,
    error,
    refresh
  };
}

// Hook for a single token
export function useSingleTokenMetadata(address: string): {
  metadata: TokenMetadata | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
} {
  const [metadata, setMetadata] = useState<TokenMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetadata = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const tokenMetadata = await tokenMetadataService.getTokenMetadata(address);
      setMetadata(tokenMetadata);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch token metadata');
      console.error(`Error fetching token metadata for ${address}:`, err);
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  const refresh = useCallback(async () => {
    await fetchMetadata();
  }, [fetchMetadata]);

  useEffect(() => {
    fetchMetadata();
  }, [fetchMetadata]);

  return {
    metadata,
    isLoading,
    error,
    refresh
  };
}

// Hook for multiple tokens by address
export function useMultipleTokenMetadata(addresses: string[]): {
  tokens: { [address: string]: TokenMetadata | null };
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
} {
  const [tokens, setTokens] = useState<{ [address: string]: TokenMetadata | null }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTokens = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const tokenMetadataArray = await tokenMetadataService.getTokenMetadataBatch(addresses);
      const tokensMap: { [address: string]: TokenMetadata | null } = {};
      
      addresses.forEach((address, index) => {
        tokensMap[address] = tokenMetadataArray[index] || null;
      });
      
      setTokens(tokensMap);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch token metadata');
      console.error('Error fetching multiple token metadata:', err);
    } finally {
      setIsLoading(false);
    }
  }, [addresses]);

  const refresh = useCallback(async () => {
    await fetchTokens();
  }, [fetchTokens]);

  useEffect(() => {
    fetchTokens();
  }, [fetchTokens]);

  return {
    tokens,
    isLoading,
    error,
    refresh
  };
}

// Utility hook for getting token by symbol
export function useTokenBySymbol(symbol: string): {
  token: TokenMetadata | null;
  isLoading: boolean;
  error: string | null;
} {
  const { tokenA, tokenB, isLoading, error } = useTokenMetadata();
  
  const token = tokenA?.symbol === symbol ? tokenA : 
                tokenB?.symbol === symbol ? tokenB : null;

  return {
    token,
    isLoading,
    error
  };
}
