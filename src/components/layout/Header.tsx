import React from 'react';
import { Button } from '../ui';
import { useAppStore } from '../../store';
import { AMMType } from '../../config/contracts';

export const Header: React.FC = () => {
  const { 
    wallet, 
    connectWallet, 
    disconnectWallet, 
    loading,
    selectedAMM,
    setSelectedAMM
  } = useAppStore();
  
  const handleWalletAction = async () => {
    if (wallet.isConnected) {
      disconnectWallet();
    } else {
      try {
        await connectWallet();
      } catch (error) {
        console.error('Failed to connect wallet:', error);
      }
    }
  };
  
  const shortenAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };
  
  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-700/50 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-24">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-xl bg-brand-mystic flex items-center justify-center overflow-hidden">
              <img 
                src="/img/fluent.png" 
                alt="Fluent Logo" 
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gradient">Fluentswap</h1>
              <p className="text-sm text-gray-400">DEX Interface</p>
            </div>
          </div>
          
          {/* AMM Selector & Network Status */}
          {wallet.isConnected && (
            <div className="hidden sm:flex items-center space-x-6">
              {/* AMM Slider */}
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-300">Basic</span>
                <div className="relative">
                  <button
                    onClick={() => setSelectedAMM(selectedAMM === AMMType.BASIC ? AMMType.ENHANCED : AMMType.BASIC)}
                    className={`w-12 h-6 rounded-full transition-colors duration-200 ${
                      selectedAMM === AMMType.ENHANCED 
                        ? 'bg-gradient-to-r from-mystic-start to-mystic-end' 
                        : 'bg-gray-600'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-200 ${
                        selectedAMM === AMMType.ENHANCED ? 'translate-x-6' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>
                <span className="text-sm text-gray-300">Blended</span>
              </div>
              
              {/* Network Status */}
              <div className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-gray-800/50 border border-gray-700/50">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-300">Fluent Testnet</span>
              </div>
            </div>
          )}
          
          {/* Wallet Connection */}
          <div className="flex items-center space-x-4">
            {wallet.isConnected ? (
              <div className="flex items-center space-x-3">
                {/* Wallet Info */}
                <div className="hidden sm:block text-right">
                  <p className="text-sm font-medium text-white">
                    {wallet.address && shortenAddress(wallet.address)}
                  </p>
                  <p className="text-xs text-gray-400">Connected</p>
                </div>
                
                {/* Disconnect Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleWalletAction}
                  className="hidden sm:inline-flex"
                >
                  Disconnect
                </Button>
                
                {/* Mobile wallet display */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleWalletAction}
                  className="sm:hidden"
                >
                  {wallet.address && shortenAddress(wallet.address)}
                </Button>
              </div>
            ) : (
              <Button
                variant="gradient"
                onClick={handleWalletAction}
                loading={loading.isLoading}
                disabled={loading.isLoading}
              >
                {loading.isLoading ? 'Connecting...' : 'Connect Wallet'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};