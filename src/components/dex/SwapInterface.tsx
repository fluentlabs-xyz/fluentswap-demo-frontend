import React, { useState, useEffect } from 'react';
import { Card, Button, Input } from '../ui';
import { useAppStore } from '../../store';
import { contractService, formatEther, parseEther } from '../../services/contracts';
import { useTokenMetadata } from '../../hooks/useTokenMetadata';
import { BigNumber } from 'ethers';

export const SwapInterface: React.FC = () => {
  const { 
    wallet, 
    selectedAMM, 
    pools, 
    tokenBalances, 
    addTransaction,
    updateTransaction,
    setLoading,
    setError,
  } = useAppStore();
  
  const { tokenA, tokenB, isLoading: tokensLoading } = useTokenMetadata();
  
  const [tokenIn, setTokenIn] = useState<any>(null);
  const [tokenOut, setTokenOut] = useState<any>(null);
  const [amountIn, setAmountIn] = useState('');
  const [amountOut, setAmountOut] = useState('');
  const [isSwapping, setIsSwapping] = useState(false);
  
  // Fixed slippage at 0.5%
  const slippage = 0.5;
  
  // Set initial tokens when metadata loads
  useEffect(() => {
    if (tokenA && tokenB && !tokenIn && !tokenOut) {
      setTokenIn(tokenA);
      setTokenOut(tokenB);
    }
  }, [tokenA, tokenB, tokenIn, tokenOut]);
  
  const currentPool = pools[selectedAMM];
  const tokenInBalance = tokenBalances.find(tb => tb.token.address === tokenIn?.address);
  const tokenOutBalance = tokenBalances.find(tb => tb.token.address === tokenOut?.address);
  
  // Calculate quote when amount changes
  useEffect(() => {
    const calculateQuote = async () => {
      if (!amountIn || parseFloat(amountIn) <= 0 || !currentPool || !tokenIn || !tokenOut) {
        setAmountOut('');
        return;
      }
      
      try {
        const amountInBN = parseEther(amountIn);
        const quote = await contractService.getSwapQuote(
          selectedAMM,
          tokenIn,
          tokenOut,
          amountInBN,
          slippage
        );
        setAmountOut(formatEther(quote.amountOut));
      } catch (error) {
        console.error('Failed to get quote:', error);
        setAmountOut('');
      }
    };
    
    const timeoutId = setTimeout(calculateQuote, 500); // Debounce
    return () => clearTimeout(timeoutId);
  }, [amountIn, tokenIn, tokenOut, selectedAMM, currentPool, slippage]);
  
  const handleSwap = async () => {
    if (!wallet.isConnected || !amountIn || !amountOut || !tokenIn || !tokenOut) return;
    
    try {
      setIsSwapping(true);
      
      const amountInBN = parseEther(amountIn);
      // No slippage protection for now - matching js-client behavior
      const minAmountOut = BigNumber.from(0);
      
      // Check allowance and approve if needed
      const allowance = await contractService.getTokenAllowance(
        tokenIn.address,
        wallet.address!,
        selectedAMM === 'basic' ? '0x1f9483387E54577aAD7E8145E99d38D4722eaCFD' : '0x3Ac977b824042344324C16bc0EA4B02396d94417'
      );
      
      if (allowance.lt(amountInBN)) {
        setLoading({ isLoading: true, message: 'Approving token...' });
        const approveTx = await contractService.approveToken(
          tokenIn.address,
          selectedAMM === 'basic' ? '0x1f9483387E54577aAD7E8145E99d38D4722eaCFD' : '0x3Ac977b824042344324C16bc0EA4B02396d94417',
          BigNumber.from('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')
        );
        
        addTransaction({
          hash: approveTx.hash,
          type: 'approve',
          status: 'pending',
          from: wallet.address!,
          to: tokenIn.address
        });
        
        await approveTx.wait();
      }
      
      setLoading({ isLoading: true, message: 'Executing swap...' });
      
      // Execute swap
      const swapTx = await contractService.executeSwap({
        tokenIn,
        tokenOut,
        amountIn: amountInBN,
        amountOutMin: minAmountOut,
        to: wallet.address!
      }, selectedAMM, selectedAMM === 'enhanced');
      
      addTransaction({
        hash: swapTx.hash,
        type: 'swap',
        status: 'pending',
        from: wallet.address!,
        to: selectedAMM === 'basic' ? '0x1f9483387E54577aAD7E8145E99d38D4722eaCFD' : '0x3Ac977b824042344324C16bc0EA4B02396d94417'
      });
      
      await swapTx.wait();
      
      // Update transaction status to confirmed
      updateTransaction(swapTx.hash, { status: 'confirmed' });
      
      // Reset form
      setAmountIn('');
      setAmountOut('');
      
      setLoading({ isLoading: false });
      
    } catch (error: any) {
      setError({ hasError: true, message: error.message });
      setLoading({ isLoading: false });
    } finally {
      setIsSwapping(false);
    }
  };
  
  const handleFlipTokens = () => {
    setTokenIn(tokenOut);
    setTokenOut(tokenIn);
    setAmountIn(amountOut);
    setAmountOut('');
  };
  
  const isValidSwap = wallet.isConnected && 
    amountIn && 
    parseFloat(amountIn) > 0 && 
    amountOut && 
    parseFloat(amountOut) > 0 &&
    tokenInBalance && 
    parseFloat(amountIn) <= parseFloat(tokenInBalance.formatted) &&
    tokenIn && tokenOut;
  
  if (tokensLoading || !tokenA || !tokenB) {
    return (
      <Card variant="white-border">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Swap Tokens</h3>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-mystic-start"></div>
            <span className="ml-2 text-gray-400">Loading tokens...</span>
          </div>
        </div>
      </Card>
    );
  }
  
  return (
    <Card variant="white-border">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Swap Tokens</h3>
        
        {/* Token In */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-medium text-gray-300">From</label>
            <span className="text-xs text-gray-400">
              Balance: {tokenInBalance ? parseFloat(tokenInBalance.formatted).toFixed(4) : '0.0000'}
            </span>
          </div>
          <div className="relative">
            <Input
              type="number"
              placeholder="0.0"
              value={amountIn}
              onChange={(e) => setAmountIn(e.target.value)}
              className="pr-20"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 z-10">
              <span className="text-white text-sm font-medium">{tokenIn?.symbol}</span>
            </div>
          </div>
        </div>
        
        {/* Flip Button */}
        <div className="flex justify-center">
          <button
            type="button"
            onClick={handleFlipTokens}
            className="p-3 rounded-xl bg-gray-700 hover:bg-gray-600 border border-gray-600 hover:border-mystic-start transition-all duration-200 hover:scale-105 z-10 relative"
            title="Flip tokens"
          >
            <svg className="w-5 h-5 text-gray-300 hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          </button>
        </div>
        
        {/* Token Out */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-medium text-gray-300">To</label>
            <span className="text-xs text-gray-400">
              Balance: {tokenOutBalance ? parseFloat(tokenOutBalance.formatted).toFixed(4) : '0.0000'}
            </span>
          </div>
          <div className="relative">
            <Input
              type="number"
              placeholder="0.0"
              value={amountOut}
              readOnly
              className="pr-20 bg-gray-700/30"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 z-10">
              <span className="text-white text-sm font-medium">{tokenOut?.symbol}</span>
            </div>
          </div>
        </div>
        
        {/* Swap Button */}
        <Button
          onClick={handleSwap}
          disabled={!isValidSwap || isSwapping}
          loading={isSwapping}
          className="w-full relative z-10"
          size="lg"
        >
          {!wallet.isConnected ? 'Connect Wallet' : 
           !isValidSwap ? 'Enter Amount' : 
           'Swap'}
        </Button>
        
        {/* Swap Info */}
        {amountIn && amountOut && tokenIn && tokenOut && (
          <div className="text-xs text-gray-400 space-y-1 border-t border-gray-700/50 pt-3">
            <div className="flex justify-between">
              <span>Rate:</span>
              <span>1 {tokenIn.symbol} = {(parseFloat(amountOut) / parseFloat(amountIn)).toFixed(6)} {tokenOut.symbol}</span>
            </div>
            <div className="flex justify-between">
              <span>Min received ({slippage}% slippage):</span>
              <span>{(parseFloat(amountOut) * (1 - slippage / 100)).toFixed(6)} {tokenOut.symbol}</span>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};