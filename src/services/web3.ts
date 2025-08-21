import { ethers, BigNumber } from 'ethers';
import { CONFIG } from '../config/contracts';
import type { WalletState } from '../types';

// Web3 Provider Management
class Web3Service {
  private provider: ethers.providers.Web3Provider | null = null;
  private signer: ethers.Signer | null = null;
  
  // Initialize provider with MetaMask
  async connectWallet(): Promise<WalletState> {
    try {
      // Check if MetaMask is installed
      if (!window.ethereum) {
        throw new Error('MetaMask is not installed');
      }

      // Request account access
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      // Initialize provider and signer
      this.provider = new ethers.providers.Web3Provider(window.ethereum);
      this.signer = this.provider.getSigner();
      
      // Get wallet info
      const address = await this.signer.getAddress();
      const network = await this.provider.getNetwork();
      
      // Check if we're on the correct network
      if (network.chainId !== CONFIG.chainId) {
        await this.switchToFluentNetwork();
      }
      
      return {
        isConnected: true,
        address,
        chainId: network.chainId,
        provider: this.provider,
        signer: this.signer
      };
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      throw error;
    }
  }
  
  // Switch to Fluent testnet
  async switchToFluentNetwork(): Promise<void> {
    if (!window.ethereum) {
      throw new Error('MetaMask is not installed');
    }
    
    try {
      // Try to switch to the network
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${CONFIG.chainId.toString(16)}` }],
      });
    } catch (switchError: any) {
      // If network doesn't exist, add it
      if (switchError.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: `0x${CONFIG.chainId.toString(16)}`,
              chainName: CONFIG.network.name,
              rpcUrls: CONFIG.network.rpcUrls,
              nativeCurrency: CONFIG.network.nativeCurrency,
              blockExplorerUrls: CONFIG.network.blockExplorerUrls,
            },
          ],
        });
      } else {
        throw switchError;
      }
    }
  }
  
  // Disconnect wallet
  disconnect(): WalletState {
    this.provider = null;
    this.signer = null;
    
    return {
      isConnected: false,
      address: null,
      chainId: null,
      provider: null,
      signer: null
    };
  }
  
  // Get current wallet state
  async getWalletState(): Promise<WalletState> {
    try {
      if (!window.ethereum || !this.provider || !this.signer) {
        return this.disconnect();
      }
      
      const address = await this.signer.getAddress();
      const network = await this.provider.getNetwork();
      
      return {
        isConnected: true,
        address,
        chainId: network.chainId,
        provider: this.provider,
        signer: this.signer
      };
    } catch (error) {
      console.error('Failed to get wallet state:', error);
      return this.disconnect();
    }
  }
  
  // Get ETH balance
  async getETHBalance(address: string): Promise<BigNumber> {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }
    
    return await this.provider.getBalance(address);
  }
  
  // Get current provider (read-only)
  getProvider(): ethers.providers.JsonRpcProvider {
    return new ethers.providers.JsonRpcProvider(CONFIG.rpcURL);
  }
  
  // Get current signer
  getSigner(): ethers.Signer {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }
    return this.signer;
  }
  
  // Estimate gas for transaction
  async estimateGas(transaction: ethers.providers.TransactionRequest): Promise<BigNumber> {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }
    
    return await this.provider.estimateGas(transaction);
  }
  
  // Get current gas price
  async getGasPrice(): Promise<BigNumber> {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }
    
    return await this.provider.getGasPrice();
  }
  
  // Listen for account changes
  onAccountsChanged(callback: (accounts: string[]) => void): void {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', callback);
    }
  }
  
  // Listen for network changes
  onChainChanged(callback: (chainId: string) => void): void {
    if (window.ethereum) {
      window.ethereum.on('chainChanged', callback);
    }
  }
  
  // Remove listeners
  removeAllListeners(): void {
    if (window.ethereum) {
      window.ethereum.removeAllListeners('accountsChanged');
      window.ethereum.removeAllListeners('chainChanged');
    }
  }
}

// Create singleton instance
export const web3Service = new Web3Service();

// Type declarations for window.ethereum
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on: (event: string, callback: (...args: any[]) => void) => void;
      removeAllListeners: (event: string) => void;
      selectedAddress: string | null;
      isMetaMask?: boolean;
    };
  }
}