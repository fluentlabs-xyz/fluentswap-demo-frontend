import { ethers } from 'ethers';
import { contractService } from './contracts';
import { CONFIG } from '../config/contracts';
import { IMAGE_PATHS } from '../utils/paths';

export interface TokenMetadata {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  logoURI: string;
  totalSupply?: ethers.BigNumber;
  balance?: ethers.BigNumber;
}

export interface TokenMetadataCache {
  [address: string]: {
    metadata: TokenMetadata;
    lastUpdated: number;
    isPermanent: boolean; // Token metadata never changes on-chain
  };
}

class TokenMetadataService {
  private cache: TokenMetadataCache = {};
  private readonly DEFAULT_LOGO_URI = IMAGE_PATHS.DEFAULT_TOKEN();
  private readonly KNOWN_TOKENS = {
    [CONFIG.addresses.tokenA]: {
      name: 'Token A',
      symbol: 'TKA',
      decimals: 18,
      logoURI: IMAGE_PATHS.TOKEN_A()
    },
    [CONFIG.addresses.tokenB]: {
      name: 'Token B', 
      symbol: 'TKB',
      decimals: 18,
      logoURI: IMAGE_PATHS.TOKEN_B()
    }
  };
  
  // Request deduplication - prevent multiple simultaneous requests for the same address
  private activeRequests: Map<string, Promise<TokenMetadata>> = new Map();
  
  constructor() {
    // Initialize with known token addresses
    this.initializeKnownTokens();
  }
  
  private initializeKnownTokens(): void {
    // Pre-populate cache with known addresses for faster initial loading
    Object.entries(this.KNOWN_TOKENS).forEach(([address, metadata]) => {
      this.cache[address] = {
        metadata: {
          address,
          ...metadata
        },
        lastUpdated: Date.now(),
        isPermanent: false // Mark as placeholder until real data is fetched
      };
    });
  }
  
  private isCacheValid(address: string): boolean {
    const cached = this.cache[address];
    if (!cached) return false;
    
    // If it's marked as permanent, it's always valid (real blockchain data)
    if (cached.isPermanent) return true;
    
    // If it's placeholder data, it's not valid - we need real data
    if (cached.metadata.symbol === 'TKA' || cached.metadata.symbol === 'TKB') {
      return false;
    }
    
    // For other tokens, check if we have any cached data
    // Token metadata never changes on-chain, so we keep it forever
    return true;
  }

  async getTokenMetadata(address: string): Promise<TokenMetadata> {
    // Check cache first - token metadata never expires
    if (this.isCacheValid(address)) {
      console.log(`📋 Using cached token metadata for ${address}`);
      return this.cache[address].metadata;
    }
    
    // Check if there's already an active request for this address
    if (this.activeRequests.has(address)) {
      console.log(`🔄 Returning existing request for ${address}`);
      return this.activeRequests.get(address)!;
    }
    
    // Check if we have placeholder data
    const cached = this.cache[address];
    if (cached && (cached.metadata.symbol === 'TKA' || cached.metadata.symbol === 'TKB')) {
      console.log(`🔄 Replacing placeholder data for ${address} with real blockchain data...`);
    }
    
    // Create new request promise
    const requestPromise = this.fetchTokenMetadataFromBlockchain(address);
    this.activeRequests.set(address, requestPromise);
    
    try {
      const result = await requestPromise;
      return result;
    } finally {
      // Clean up the active request
      this.activeRequests.delete(address);
    }
  }
  
  private async fetchTokenMetadataFromBlockchain(address: string): Promise<TokenMetadata> {
    try {
      console.log(`🔄 Fetching token metadata for ${address} from blockchain...`);
      
      // Fetch from blockchain
      const tokenInfo = await contractService.getTokenInfo(address);
      
      // Try to get total supply
      let totalSupply: ethers.BigNumber | undefined;
      try {
        const tokenContract = await contractService.getTokenContract(address);
        totalSupply = await tokenContract.totalSupply();
      } catch (error) {
        console.warn(`Could not fetch total supply for ${address}:`, error);
      }
      
      const metadata: TokenMetadata = {
        address,
        name: tokenInfo.name,
        symbol: tokenInfo.symbol,
        decimals: tokenInfo.decimals,
        logoURI: this.getTokenLogoURI(),
        totalSupply
      };
      
      // Store permanently - token metadata never changes
      this.cache[address] = {
        metadata,
        lastUpdated: Date.now(),
        isPermanent: true
      };
      
      console.log(`✅ Stored permanent token metadata for ${address}:`, {
        name: metadata.name,
        symbol: metadata.symbol,
        decimals: metadata.decimals
      });
      
      return metadata;
    } catch (error) {
      console.error(`Failed to fetch token metadata for ${address}:`, error);
      
      // Return cached data if available, even if expired
      if (this.cache[address]) {
        console.log(`🔄 Using expired cached data for ${address}`);
        return this.cache[address].metadata;
      }
      
      // Return fallback metadata
      return {
        address,
        name: 'Unknown Token',
        symbol: '???',
        decimals: 18,
        logoURI: this.DEFAULT_LOGO_URI
      };
    }
  }
  
  async getTokenMetadataBatch(addresses: string[]): Promise<TokenMetadata[]> {
    const promises = addresses.map(address => this.getTokenMetadata(address));
    return Promise.all(promises);
  }
  
  async getKnownTokens(): Promise<{ tokenA: TokenMetadata; tokenB: TokenMetadata }> {
    console.log('🔄 Getting known tokens...');
    const [tokenA, tokenB] = await Promise.all([
      this.getTokenMetadata(CONFIG.addresses.tokenA),
      this.getTokenMetadata(CONFIG.addresses.tokenB)
    ]);
    
    console.log('✅ Known tokens retrieved:', {
      tokenA: { symbol: tokenA.symbol, name: tokenA.name },
      tokenB: { symbol: tokenB.symbol, name: tokenB.name }
    });
    
    return { tokenA, tokenB };
  }
  
  private getTokenLogoURI(): string {
    // You can implement custom logic here:
    // 1. Use a token logo API (e.g., Trust Wallet, CoinGecko)
    // 2. Map to local assets
    // 3. Generate placeholder logos
    
    // For now, return default logo
    return this.DEFAULT_LOGO_URI;
  }
  
  // Method to refresh cache for a specific token (only for debugging/testing)
  async refreshTokenMetadata(address: string): Promise<TokenMetadata> {
    console.log(`🔄 Force refreshing token metadata for ${address}...`);
    // Remove from cache to force refresh
    delete this.cache[address];
    return this.getTokenMetadata(address);
  }
  
  // Method to refresh all known tokens (only for debugging/testing)
  async refreshAllTokens(): Promise<void> {
    console.log('🔄 Force refreshing all token metadata...');
    const knownAddresses = [CONFIG.addresses.tokenA, CONFIG.addresses.tokenB];
    await Promise.all(knownAddresses.map(address => this.refreshTokenMetadata(address)));
  }
  
  // Get cached metadata without fetching (for UI display while loading)
  getCachedTokenMetadata(address: string): TokenMetadata | null {
    const cached = this.cache[address];
    return cached ? cached.metadata : null;
  }
  
  // Check if token metadata is currently loading
  isTokenLoading(address: string): boolean {
    const cached = this.cache[address];
    if (!cached) return true;
    
    // If we have cached data, it's never loading (token metadata doesn't change)
    return false;
  }
  
  // Get cache status for debugging
  getCacheStatus(): { [address: string]: { hasData: boolean; isPermanent: boolean; lastUpdated: number } } {
    const status: { [address: string]: { hasData: boolean; isPermanent: boolean; lastUpdated: number } } = {};
    
    Object.entries(this.cache).forEach(([address, cached]) => {
      status[address] = {
        hasData: !!cached.metadata,
        isPermanent: cached.isPermanent,
        lastUpdated: cached.lastUpdated
      };
    });
    
    return status;
  }
  
  // Get active requests status for debugging
  getActiveRequestsStatus(): string[] {
    return Array.from(this.activeRequests.keys());
  }
}

// Create singleton instance
export const tokenMetadataService = new TokenMetadataService();

// Utility function to get token metadata with fallback
export async function getTokenMetadataWithFallback(
  address: string, 
  fallback?: Partial<TokenMetadata>
): Promise<TokenMetadata> {
  try {
    return await tokenMetadataService.getTokenMetadata(address);
  } catch (error) {
    console.warn(`Using fallback metadata for ${address}:`, error);
    return {
      address,
      name: fallback?.name || 'Unknown Token',
      symbol: fallback?.symbol || '???',
      decimals: fallback?.decimals || 18,
              logoURI: fallback?.logoURI || IMAGE_PATHS.DEFAULT_TOKEN()
    };
  }
}
