import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { BigNumber } from 'ethers';
import type { WalletState, TokenBalance, PoolInfo, Transaction, UserSettings, LoadingState, ErrorState, AMMType } from '../types';
import { CONFIG } from '../config/contracts';
import { AMMType as AMMTypeValues } from '../config/contracts';
import { web3Service } from '../services/web3';
import { contractService, formatUnits } from '../services/contracts';
import { tokenMetadataService } from '../services/tokenMetadata';

// App State Interface
interface AppState {
  // Wallet State
  wallet: WalletState;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  updateWalletState: () => Promise<void>;
  
  // Token State
  tokenBalances: TokenBalance[];
  updateTokenBalance: (tokenAddress: string) => Promise<void>;
  updateAllTokenBalances: () => Promise<void>;
  
  // Pool State
  selectedAMM: typeof AMMType[keyof typeof AMMType];
  pools: Record<typeof AMMType[keyof typeof AMMType], PoolInfo | null>;
  setSelectedAMM: (ammType: typeof AMMType[keyof typeof AMMType]) => void;
  updatePoolInfo: (ammType: typeof AMMType[keyof typeof AMMType]) => Promise<void>;
  updateAllPools: () => Promise<void>;
  
  // Transaction State
  transactions: Transaction[];
  addTransaction: (transaction: Omit<Transaction, 'timestamp'>) => void;
  updateTransaction: (hash: string, updates: Partial<Transaction>) => void;
  
  // UI State
  loading: LoadingState;
  error: ErrorState;
  notifications: Array<{
    id: string;
    type: 'success' | 'error' | 'info';
    title: string;
    message: string;
    transactionHash?: string;
    timestamp: number;
  }>;
  setLoading: (loading: LoadingState) => void;
  setError: (error: ErrorState) => void;
  clearError: () => void;
  addNotification: (notification: Omit<{
    id: string;
    type: 'success' | 'error' | 'info';
    title: string;
    message: string;
    transactionHash?: string;
    timestamp: number;
  }, 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  
  // Settings
  settings: UserSettings;
  updateSettings: (settings: Partial<UserSettings>) => void;
  
  // Data Management
  refreshData: () => Promise<void>;
  refreshPoolData: () => Promise<void>;
  refreshTokenData: () => Promise<void>;
  
  // Initialization
  initialize: () => Promise<void>;
}

// Simple request deduplication
class SimpleDataManager {
  private activeRequests: Map<string, Promise<any>> = new Map();
  private lastRefresh: Map<string, number> = new Map();
  private readonly MIN_REFRESH_INTERVAL = 5000; // 5 seconds minimum between refreshes

  async deduplicateRequest<T>(
    key: string, 
    requestFn: () => Promise<T>
  ): Promise<T> {
    const now = Date.now();
    const lastRefreshTime = this.lastRefresh.get(key) || 0;
    
    console.log(`🔍 Deduplication check for ${key}:`, {
      now,
      lastRefreshTime,
      timeSinceLastRefresh: now - lastRefreshTime,
      minInterval: this.MIN_REFRESH_INTERVAL
    });
    
    // If we refreshed recently, wait a bit
    if (now - lastRefreshTime < this.MIN_REFRESH_INTERVAL) {
      const waitTime = this.MIN_REFRESH_INTERVAL - (now - lastRefreshTime);
      console.log(`⏳ Waiting ${waitTime}ms before next refresh for ${key}`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    // If there's already an active request, return it
    if (this.activeRequests.has(key)) {
      console.log(`🔄 Returning existing request for ${key}`);
      return this.activeRequests.get(key)!;
    }
    
    console.log(`🚀 Creating new request for ${key}`);
    
    // Create new request
    const promise = requestFn().finally(() => {
      console.log(`✅ Request completed for ${key}, cleaning up`);
      this.activeRequests.delete(key);
      this.lastRefresh.set(key, Date.now());
    });
    
    this.activeRequests.set(key, promise);
    return promise;
  }

  clearCache(): void {
    this.activeRequests.clear();
    this.lastRefresh.clear();
  }
}

// Create data manager instance
const dataManager = new SimpleDataManager();

// Default states
const defaultWalletState: WalletState = {
  isConnected: false,
  address: null,
  chainId: null,
  provider: null,
  signer: null
};

const defaultSettings: UserSettings = {
  slippageTolerance: 0.5,
  transactionDeadline: 20,
  autoRefreshInterval: 10,
  preferredAMM: AMMTypeValues.BASIC
};

// Create the store
export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial State
      wallet: defaultWalletState,
      tokenBalances: [],
      selectedAMM: AMMTypeValues.BASIC,
      pools: {
        [AMMTypeValues.BASIC]: null,
        [AMMTypeValues.ENHANCED]: null
      },
      transactions: [],
      loading: { isLoading: false },
      error: { hasError: false },
      notifications: [],
      settings: defaultSettings,

      // Wallet Actions
      connectWallet: async () => {
        try {
          set({ loading: { isLoading: true, message: 'Connecting wallet...' } });
          
          const walletState = await web3Service.connectWallet();
          set({ wallet: walletState });
          
          if (walletState.isConnected && walletState.address) {
            // Set up event listeners
            web3Service.onAccountsChanged(async (accounts: string[]) => {
              if (accounts.length === 0) {
                get().disconnectWallet();
              } else {
                await get().updateWalletState();
              }
            });
            
            web3Service.onChainChanged(async () => {
              await get().updateWalletState();
            });
            
            // Refresh data after connection
            await get().refreshData();
          }
          
          set({ loading: { isLoading: false } });
        } catch (error: any) {
          set({
            loading: { isLoading: false },
            error: { hasError: true, message: error.message }
          });
          throw error;
        }
      },
      
      disconnectWallet: () => {
        const walletState = web3Service.disconnect();
        web3Service.removeAllListeners();
        set({ 
          wallet: walletState,
          tokenBalances: [],
          pools: {
            [AMMTypeValues.BASIC]: null,
            [AMMTypeValues.ENHANCED]: null
          }
        });
        // Clear cache when disconnecting
        dataManager.clearCache();
      },
      
      updateWalletState: async () => {
        try {
          const walletState = await web3Service.getWalletState();
          set({ wallet: walletState });
          
          if (walletState.isConnected && walletState.address) {
            await get().refreshData();
          }
        } catch (error: any) {
          set({ error: { hasError: true, message: error.message } });
        }
      },
      
      // Token Actions  
      updateTokenBalance: async (tokenAddress: string) => {
        const { wallet } = get();
        if (!wallet.isConnected || !wallet.address) return;
        
        try {
          const balance = await contractService.getTokenBalance(tokenAddress, wallet.address);
          const tokenInfo = await tokenMetadataService.getTokenMetadata(tokenAddress);
          
          if (tokenInfo) {
            const tokenBalance: TokenBalance = {
              token: tokenInfo,
              balance,
              formatted: formatUnits(balance, tokenInfo.decimals)
            };
            
            set(state => ({
              tokenBalances: [
                ...state.tokenBalances.filter(tb => tb.token.address.toLowerCase() !== tokenAddress.toLowerCase()),
                tokenBalance
              ]
            }));
          }
        } catch (error: any) {
          console.error('Failed to update token balance:', error);
        }
      },
      
      updateAllTokenBalances: async () => {
        const { wallet } = get();
        if (!wallet.isConnected || !wallet.address) return;
        
        try {
          const { tokenA, tokenB } = await tokenMetadataService.getKnownTokens();
          const tokenAddresses = [tokenA.address, tokenB.address];
          await Promise.all(tokenAddresses.map(address => get().updateTokenBalance(address)));
        } catch (error: any) {
          console.error('Failed to update all token balances:', error);
        }
      },
      
      // Pool Actions
      setSelectedAMM: (ammType: typeof AMMType[keyof typeof AMMType]) => {
        set({ selectedAMM: ammType });
      },
      
      updatePoolInfo: async (ammType: typeof AMMType[keyof typeof AMMType]) => {
        const { wallet } = get();
        
        try {
          console.log(`🔄 Updating ${ammType} pool info...`);
          console.log(`📍 AMM Type: ${ammType}`);
          console.log(`🔗 Wallet connected: ${wallet.isConnected}`);
          console.log(`📱 Wallet address: ${wallet.address}`);
          
          const reserves = await contractService.getPoolReserves(ammType);
          console.log(`📊 Got reserves for ${ammType}:`, {
            reserve0: reserves.reserve0.toString(),
            reserve1: reserves.reserve1.toString(),
            totalSupply: reserves.totalSupply.toString()
          });
          
          const lpTokenBalance = wallet.address 
            ? await contractService.getLPTokenBalance(ammType, wallet.address)
            : BigNumber.from(0);
          console.log(`💰 LP token balance for ${ammType}:`, lpTokenBalance.toString());
          
          // Get token metadata for the pool
          const { tokenA, tokenB } = await tokenMetadataService.getKnownTokens();
          console.log(`🪙 Got token metadata:`, { tokenA: tokenA.symbol, tokenB: tokenB.symbol });
          
          // Calculate user pool share
          const userPoolShare = reserves.totalSupply.gt(0) 
            ? lpTokenBalance.mul(10000).div(reserves.totalSupply).toNumber() / 100
            : 0;
          
          const poolInfo: PoolInfo = {
            address: ammType === AMMTypeValues.BASIC ? CONFIG.addresses.basicAMM : CONFIG.addresses.enhancedAMM,
            token0: tokenA,
            token1: tokenB,
            reserves,
            lpTokenBalance,
            userPoolShare: userPoolShare.toFixed(4)
          };
          
          console.log(`✅ Setting pool info for ${ammType}:`, poolInfo);
          
          set(state => ({
            pools: {
              ...state.pools,
              [ammType]: poolInfo
            }
          }));
          
        } catch (error: any) {
          console.error(`❌ Failed to update ${ammType} pool info:`, error);
          console.error(`❌ Error details:`, {
            message: error.message,
            stack: error.stack,
            code: error.code
          });
        }
      },
      
      updateAllPools: async () => {
        await Promise.all([
          get().updatePoolInfo(AMMTypeValues.BASIC),
          get().updatePoolInfo(AMMTypeValues.ENHANCED)
        ]);
      },
      
      // Transaction Actions
      addTransaction: (transaction) => {
        const newTransaction: Transaction = {
          ...transaction,
          timestamp: Date.now()
        };
        
        set(state => ({
          transactions: [newTransaction, ...state.transactions]
        }));
        
        // Auto-refresh data after adding transaction
        // This ensures pool info is updated after all operations
        if (transaction.type === 'add-liquidity' || transaction.type === 'remove-liquidity') {
          // Queue refresh to avoid blocking UI
          setTimeout(() => {
            get().refreshPoolData();
          }, 2000); // Wait 2 seconds for transaction to be mined
        } else if (transaction.type === 'swap') {
          // For swaps, refresh both pool data and token balances
          setTimeout(() => {
            get().refreshData();
          }, 2000); // Wait 2 seconds for transaction to be mined
        }
      },
      
      updateTransaction: (hash, updates) => {
        set(state => ({
          transactions: state.transactions.map(tx => 
            tx.hash === hash ? { ...tx, ...updates } : tx
          )
        }));
        
        // Add success notification when transaction completes
        if (updates.status === 'confirmed') {
          const transaction = get().transactions.find(tx => tx.hash === hash);
          if (transaction) {
            get().addNotification({
              id: `success-${hash}`,
              type: 'success',
              title: 'Transaction Successful!',
              message: `${transaction.type.replace('-', ' ')} completed successfully`,
              transactionHash: hash
            });
          }
        } else if (updates.status === 'failed') {
          const transaction = get().transactions.find(tx => tx.hash === hash);
          if (transaction) {
            get().addNotification({
              id: `error-${hash}`,
              type: 'error',
              title: 'Transaction Failed',
              message: `${transaction.type.replace('-', ' ')} failed to complete`,
              transactionHash: hash
            });
          }
        }
        
        // Refresh data when transaction completes
        if (updates.status === 'confirmed' || updates.status === 'failed') {
          setTimeout(() => {
            get().refreshData();
          }, 3000); // Wait 3 seconds for blockchain state to update
        }
      },
      
      // UI Actions
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      clearError: () => set({ error: { hasError: false } }),
      addNotification: (notification) => {
        const newNotification = {
          ...notification,
          timestamp: Date.now()
        };
        set(state => ({
          notifications: [newNotification, ...state.notifications]
        }));
      },
      removeNotification: (id) => {
        set(state => ({
          notifications: state.notifications.filter(n => n.id !== id)
        }));
      },
      
      // Settings Actions
      updateSettings: (newSettings) => {
        set(state => ({
          settings: { ...state.settings, ...newSettings }
        }));
      },
      
      // Data Management Actions
      refreshData: async () => {
        try {
          console.log('🔄 Refreshing all data...');
          await Promise.all([
            get().refreshPoolData(),
            get().refreshTokenData()
          ]);
          console.log('✅ All data refreshed');
        } catch (error) {
          console.error('❌ Failed to refresh all data:', error);
        }
      },
      
      refreshPoolData: async () => {
        try {
          console.log('🔄 Refreshing pool data...');
          await dataManager.deduplicateRequest('refresh-pools', async () => {
            console.log('📊 Deduplicated pool refresh request');
            await get().updateAllPools();
          });
          console.log('✅ Pool data refreshed');
        } catch (error) {
          console.error('❌ Failed to refresh pool data:', error);
        }
      },
      
      refreshTokenData: async () => {
        try {
          console.log('🔄 Refreshing token data...');
          await dataManager.deduplicateRequest('refresh-tokens', async () => {
            console.log('💰 Deduplicated token refresh request');
            await get().updateAllTokenBalances();
          });
          console.log('✅ Token data refreshed');
        } catch (error) {
          console.error('❌ Failed to refresh token data:', error);
        }
      },
      
      // Initialization
      initialize: async () => {
        try {
          console.log('🚀 Initializing app...');
          set({ loading: { isLoading: true, message: 'Initializing app...' } });
          
          // Check if wallet was previously connected
          if (window.ethereum && window.ethereum.selectedAddress) {
            console.log('🔗 Wallet previously connected, connecting...');
            await get().connectWallet();
          } else {
            console.log('📊 No wallet connected, skipping pool info load...');
            // Don't try to load pool info without wallet - it will fail
            // Pool info will be loaded when wallet connects
          }
          
          console.log('✅ App initialization complete');
          set({ loading: { isLoading: false } });
        } catch (error: any) {
          console.error('❌ Failed to initialize app:', error);
          set({ 
            loading: { isLoading: false },
            error: { hasError: true, message: 'Failed to initialize app' }
          });
        }
      }
    }),
    {
      name: 'fluentswap-store',
      partialize: (state) => ({
        settings: state.settings,
        selectedAMM: state.selectedAMM,
        transactions: state.transactions.slice(0, 50) // Keep only recent transactions
      }),
    }
  )
);