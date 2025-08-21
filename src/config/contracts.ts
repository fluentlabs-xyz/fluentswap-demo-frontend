// Contract configuration based on js-client/config.js
export const CONFIG = {
  rpcURL: "https://stylish-frosty-sailboat.fluent-testnet.quiknode.pro/663979c2c8426521bc647debb9192865102f853b/",
  chainId: 20994, // Fluent testnet
  
  // Contract addresses from deployments/testnet.json
  addresses: {
    tokenA: "0xa37f1A5eedfb1D4e81AbE78c4B4b28c91744D1ab",
    tokenB: "0x3785F7f6046f4401b6a7cC94397ecb42A26C7fD5",
    tokenC: "0xcB340aB3c8e00886C5DBF09328D50af6D40B9EEb",
    tokenD: "0x8108c36844Faf04C091973E95aE2B725cdCb55cC", 
    mathEngine: "0x43aD2ef2fA35F2DE88E0E137429b8f6F4AeD65a2", // TODO: change to math engine address
    basicAMM: "0x8ff396af8BdEF1d23d7a7363CFc81Ed604eeB399",
    enhancedAMM: "0x3Ac977b824042344324C16bc0EA4B02396d94417",
  },
  
  // Network configuration
  network: {
    name: 'Fluent Testnet',
    chainId: 20994,
    rpcUrls: ['https://rpc.testnet.fluent.xyz/'],
    nativeCurrency: {
      name: 'ETH',
      symbol: 'ETH',
      decimals: 18
    },
    blockExplorerUrls: ['https://blockscout.testnet.fluent.xyz/']
  }
} as const;

// Token metadata - now fetched dynamically from contracts
// Use tokenMetadataService.getKnownTokens() to get actual metadata
export const TOKENS = {
  tokenA: {
    address: CONFIG.addresses.tokenA,
    // Metadata will be fetched dynamically from the contract
    // Use tokenMetadataService.getTokenMetadata(CONFIG.addresses.tokenA)
  },
  tokenB: {
    address: CONFIG.addresses.tokenB,
    // Metadata will be fetched dynamically from the contract
    // Use tokenMetadataService.getTokenMetadata(CONFIG.addresses.tokenB)
  }
} as const;

// AMM Types
export const AMMType = {
  BASIC: 'basic',
  ENHANCED: 'enhanced'
} as const;

type AMMType = typeof AMMType[keyof typeof AMMType];

export const AMM_CONFIG = {
  [AMMType.BASIC]: {
    name: 'Basic AMM',
    description: 'Standard Solidity implementation with Babylonian square root',
    address: CONFIG.addresses.basicAMM,
    features: ['Constant Product Formula', 'Standard Solidity Math', 'Basic Slippage Protection']
  },
  [AMMType.ENHANCED]: {
    name: 'Enhanced AMM', 
    description: 'Rust-powered mathematical engine with advanced features',
    address: CONFIG.addresses.enhancedAMM,
    features: ['Newton-Raphson Square Root', 'High-Precision Math', 'Impermanent Loss Calculations', 'Dynamic Fee Calculations']
  }
} as const;