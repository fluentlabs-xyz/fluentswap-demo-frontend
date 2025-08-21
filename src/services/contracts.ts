import { ethers, BigNumber, Contract } from 'ethers';
import { CONFIG, AMMType } from '../config/contracts';
import { web3Service } from './web3';
import type { Token, SwapParams, SwapQuote, AddLiquidityParams, RemoveLiquidityParams, PoolReserves } from '../types';

// Dynamic ABI loading from build artifacts
async function loadABI(contractName: string): Promise<any[]> {
  try {
    console.log(`Loading ABI for ${contractName}...`);
    // In a browser environment, we need to fetch the JSON files
    // The path should be relative to the public directory or we need to import them
    const response = await fetch(`/out/${contractName}.sol/${contractName}.json`);
    if (!response.ok) {
      throw new Error(`Failed to load ABI for ${contractName}: ${response.statusText}`);
    }
    const artifact = await response.json();
    const abi = artifact.abi || [];
    console.log(`Successfully loaded ABI for ${contractName} with ${abi.length} functions`);
    return abi;
  } catch (error) {
    console.error(`Failed to load ABI for ${contractName}: ${error}`);
    throw new Error(`Critical: Unable to load contract ABI for ${contractName}. Build artifacts are required.`);
  }
}



// Contract Service
class ContractService {
  private provider: ethers.providers.Provider;
  private abiCache: Map<string, any[]> = new Map();
  
  constructor() {
    this.provider = web3Service.getProvider();
    // Preload all ABIs to avoid loading delays
    this.preloadABIs();
  }
  
  // Preload all ABIs
  private async preloadABIs(): Promise<void> {
    try {
      console.log('Preloading contract ABIs...');
      await Promise.all([
        this.getABI('ERC20'),
        this.getABI('BasicAMM'),
        this.getABI('EnhancedAMM')
      ]);
      console.log('All ABIs preloaded successfully');
    } catch (error) {
      console.error('Failed to preload ABIs:', error);
      throw error; // Re-throw to fail fast
    }
  }
  
  // Get ERC20 token contract
  async getTokenContract(tokenAddress: string, withSigner: boolean = false): Promise<Contract> {
    const abi = await this.getABI('ERC20');
    const signerOrProvider = withSigner ? web3Service.getSigner() : this.provider;
    return new ethers.Contract(tokenAddress, abi, signerOrProvider);
  }
  
  // Get AMM contract
  async getAMMContract(ammType: typeof AMMType[keyof typeof AMMType], withSigner: boolean = false): Promise<Contract> {
    const contractName = ammType === AMMType.BASIC ? 'BasicAMM' : 'EnhancedAMM';
    const abi = await this.getABI(contractName);
    const address = ammType === AMMType.BASIC ? CONFIG.addresses.basicAMM : CONFIG.addresses.enhancedAMM;
    
    const signerOrProvider = withSigner ? web3Service.getSigner() : this.provider;
    return new ethers.Contract(address, abi, signerOrProvider);
  }
  
  // Get ABI with caching
  private async getABI(contractName: string): Promise<any[]> {
    if (this.abiCache.has(contractName)) {
      return this.abiCache.get(contractName)!;
    }
    
    const abi = await loadABI(contractName);
    this.abiCache.set(contractName, abi);
    return abi;
  }
  
  // Token Operations
  async getTokenBalance(tokenAddress: string, userAddress: string): Promise<BigNumber> {
    const tokenContract = await this.getTokenContract(tokenAddress);
    return await tokenContract.balanceOf(userAddress);
  }
  
  async getTokenAllowance(tokenAddress: string, owner: string, spender: string): Promise<BigNumber> {
    const tokenContract = await this.getTokenContract(tokenAddress);
    return await tokenContract.allowance(owner, spender);
  }
  
  async approveToken(tokenAddress: string, spender: string, amount: BigNumber): Promise<ethers.ContractTransaction> {
    const tokenContract = await this.getTokenContract(tokenAddress, true);
    return await tokenContract.approve(spender, amount);
  }
  
  async getTokenInfo(tokenAddress: string): Promise<{ name: string; symbol: string; decimals: number }> {
    const tokenContract = await this.getTokenContract(tokenAddress);
    const [name, symbol, decimals] = await Promise.all([
      tokenContract.name(),
      tokenContract.symbol(),
      tokenContract.decimals()
    ]);
    
    return { name, symbol, decimals };
  }
  
  // Pool Operations
  async getPoolReserves(ammType: typeof AMMType[keyof typeof AMMType]): Promise<PoolReserves> {
    const ammContract = await this.getAMMContract(ammType);
    const [reserve0, reserve1] = await ammContract.getReserves();
    const totalSupply = await ammContract.totalSupply();
    
    return {
      reserve0,
      reserve1,
      totalSupply,
      lastUpdated: Date.now()
    };
  }
  
  async getLPTokenBalance(ammType: typeof AMMType[keyof typeof AMMType], userAddress: string): Promise<BigNumber> {
    const ammContract = await this.getAMMContract(ammType);
    return await ammContract.balanceOf(userAddress);
  }
  
  // Swap Operations
  async getSwapQuote(
    ammType: typeof AMMType[keyof typeof AMMType],
    tokenIn: Token,
    tokenOut: Token,
    amountIn: BigNumber,
    slippageTolerance: number = 0.5
  ): Promise<SwapQuote> {
    const reserves = await this.getPoolReserves(ammType);
    
    // Determine which reserve is which based on token addresses
    const isToken0 = tokenIn.address.toLowerCase() < tokenOut.address.toLowerCase();
    const reserveIn = isToken0 ? reserves.reserve0 : reserves.reserve1;
    const reserveOut = isToken0 ? reserves.reserve1 : reserves.reserve0;
    
    // Calculate amount out with proper fee handling (0.3% trading fee)
    let amountOut: BigNumber;
    
    if (ammType === AMMType.BASIC) {
      // BasicAMM uses 997/1000 multiplier (0.3% fee)
      const amountInWithFee = amountIn.mul(997);
      const numerator = amountInWithFee.mul(reserveOut);
      const denominator = reserveIn.mul(1000).add(amountInWithFee);
      amountOut = numerator.div(denominator);
    } else {
      // EnhancedAMM uses basis points (30/10000 = 0.3% fee)
      const feeRate = 30; // basis points
      const amountInWithFee = amountIn.mul(10000 - feeRate);
      const numerator = amountInWithFee.mul(reserveOut);
      const denominator = reserveIn.mul(10000).add(amountInWithFee);
      amountOut = numerator.div(denominator);
    }
    
    // Calculate price impact
    const priceImpact = amountIn.mul(10000).div(reserveIn).toNumber() / 100; // percentage
    
    // Calculate minimum amount out with slippage
    const slippageMultiplier = BigNumber.from(Math.floor((100 - slippageTolerance) * 100));
    const minimumAmountOut = amountOut.mul(slippageMultiplier).div(10000);
    
    return {
      amountOut,
      priceImpact,
      minimumAmountOut,
      route: [tokenIn, tokenOut]
    };
  }
  
  async executeSwap(params: SwapParams, ammType: typeof AMMType[keyof typeof AMMType], useEnhanced: boolean = false): Promise<ethers.ContractTransaction> {
    const ammContract = await this.getAMMContract(ammType, true);
    
    if (ammType === AMMType.ENHANCED && useEnhanced) {
      return await ammContract.swapEnhanced(
        params.tokenIn.address,
        params.amountIn,
        params.amountOutMin,
        params.to
      );
    } else {
      return await ammContract.swap(
        params.tokenIn.address,
        params.amountIn,
        params.amountOutMin,
        params.to
      );
    }
  }
  
  // Liquidity Operations
  async addLiquidity(params: AddLiquidityParams, ammType: typeof AMMType[keyof typeof AMMType], useEnhanced: boolean = false, gasLimit?: number): Promise<ethers.ContractTransaction> {
    const ammContract = await this.getAMMContract(ammType, true);
    
    const txOptions: any = {};
    if (gasLimit) {
      txOptions.gasLimit = gasLimit;
    }
    
    if (ammType === AMMType.ENHANCED && useEnhanced) {
      return await ammContract.addLiquidityEnhanced(
        params.amountADesired,
        params.amountBDesired,
        params.amountAMin,
        params.amountBMin,
        params.to,
        txOptions
      );
    } else {
      return await ammContract.addLiquidity(
        params.amountADesired,
        params.amountBDesired,
        params.amountAMin,
        params.amountBMin,
        params.to,
        txOptions
      );
    }
  }
  
  async removeLiquidity(params: RemoveLiquidityParams, ammType: typeof AMMType[keyof typeof AMMType], useEnhanced: boolean = false, gasLimit?: number): Promise<ethers.ContractTransaction> {
    const ammContract = await this.getAMMContract(ammType, true);
    
    const txOptions: any = {};
    if (gasLimit) {
      txOptions.gasLimit = gasLimit;
    }
    
    if (ammType === AMMType.ENHANCED && useEnhanced) {
      return await ammContract.removeLiquidityEnhanced(
        params.liquidity,
        params.amountAMin,
        params.amountBMin,
        params.to,
        txOptions
      );
    } else {
      return await ammContract.removeLiquidity(
        params.liquidity,
        params.amountAMin,
        params.amountBMin,
        params.to,
        txOptions
      );
    }
  }
  
  // Enhanced AMM specific operations
  async calculateImpermanentLoss(initialPrice: BigNumber, currentPrice: BigNumber): Promise<ethers.ContractTransaction> {
    const enhancedAMM = await this.getAMMContract(AMMType.ENHANCED, true);
    return await enhancedAMM.calculateImpermanentLoss(initialPrice, currentPrice);
  }
  
  async getAmountOut(ammType: typeof AMMType[keyof typeof AMMType], amountIn: BigNumber, tokenIn: string): Promise<BigNumber> {
    if (ammType === AMMType.ENHANCED) {
      const enhancedAMM = await this.getAMMContract(AMMType.ENHANCED);
      return await enhancedAMM.getAmountOut(amountIn, tokenIn);
    }
    
    // For basic AMM, calculate manually using reserves with proper fee handling
    const reserves = await this.getPoolReserves(ammType);
    const isToken0 = tokenIn.toLowerCase() < (tokenIn === CONFIG.addresses.tokenA ? CONFIG.addresses.tokenB : CONFIG.addresses.tokenA).toLowerCase();
    const reserveIn = isToken0 ? reserves.reserve0 : reserves.reserve1;
    const reserveOut = isToken0 ? reserves.reserve1 : reserves.reserve0;
    
    // BasicAMM uses 997/1000 multiplier (0.3% fee)
    const amountInWithFee = amountIn.mul(997);
    const numerator = amountInWithFee.mul(reserveOut);
    const denominator = reserveIn.mul(1000).add(amountInWithFee);
    return numerator.div(denominator);
  }
}

// Create singleton instance  
export const contractService = new ContractService();

// Utility functions
export const formatEther = ethers.utils.formatEther;
export const parseEther = ethers.utils.parseEther;
export const formatUnits = ethers.utils.formatUnits;
export const parseUnits = ethers.utils.parseUnits;