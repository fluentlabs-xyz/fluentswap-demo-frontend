import { BigNumber } from 'ethers';

// Wallet Types
export interface WalletState {
  isConnected: boolean;
  address: string | null;
  chainId: number | null;
  provider: any | null; // ethers provider
  signer: any | null; // ethers signer
}

// Token Types
export interface Token {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  logoURI?: string;
}

// Extended token metadata with additional blockchain data
export interface TokenMetadata extends Token {
  totalSupply?: BigNumber;
  balance?: BigNumber;
}

export interface TokenBalance {
  token: Token;
  balance: BigNumber;
  formatted: string;
}

// Pool Types  
export interface PoolReserves {
  reserve0: BigNumber;
  reserve1: BigNumber;
  totalSupply: BigNumber;
  lastUpdated: number;
}

export interface PoolInfo {
  address: string;
  token0: Token;
  token1: Token;
  reserves: PoolReserves;
  lpTokenBalance: BigNumber;
  userPoolShare: string; // percentage
  fees24h?: BigNumber;
  volume24h?: BigNumber;
}

// Swap Types
export interface SwapParams {
  tokenIn: Token;
  tokenOut: Token;
  amountIn: BigNumber;
  amountOutMin: BigNumber;
  to: string;
  deadline?: number;
}

export interface SwapQuote {
  amountOut: BigNumber;
  priceImpact: number; // percentage
  minimumAmountOut: BigNumber;
  route: Token[];
  gasEstimate?: BigNumber;
}

// Liquidity Types
export interface AddLiquidityParams {
  tokenA: Token;
  tokenB: Token;
  amountADesired: BigNumber;
  amountBDesired: BigNumber;
  amountAMin: BigNumber;
  amountBMin: BigNumber;
  to: string;
  deadline?: number;
}

export interface RemoveLiquidityParams {
  tokenA: Token;
  tokenB: Token;
  liquidity: BigNumber;
  amountAMin: BigNumber;
  amountBMin: BigNumber;
  to: string;
  deadline?: number;
}

export interface LiquidityQuote {
  tokenAAmount: BigNumber;
  tokenBAmount: BigNumber;
  lpTokensReceived: BigNumber;
  poolShare: string; // percentage
  gasEstimate?: BigNumber;
}

// Transaction Types
export interface Transaction {
  hash: string;
  type: 'swap' | 'add-liquidity' | 'remove-liquidity' | 'approve';
  status: 'pending' | 'confirmed' | 'failed';
  timestamp: number;
  gasUsed?: BigNumber;
  gasPrice?: BigNumber;
  blockNumber?: number;
  from: string;
  to: string;
  value?: BigNumber;
}

// AMM Types
export const AMMType = {
  BASIC: 'basic',
  ENHANCED: 'enhanced'
} as const;

export type AMMType = typeof AMMType[keyof typeof AMMType];

export interface AMMInfo {
  type: AMMType;
  name: string;
  description: string;
  address: string;
  features: string[];
  isActive: boolean;
}

// UI Types
export interface LoadingState {
  isLoading: boolean;
  message?: string;
}

export interface ErrorState {
  hasError: boolean;
  message?: string;
  code?: string | number;
}

// Settings Types
export interface UserSettings {
  slippageTolerance: number; // percentage (0.5 = 0.5%)
  transactionDeadline: number; // minutes
  autoRefreshInterval: number; // seconds
  preferredAMM: AMMType;
}