import React, { useState, useEffect } from 'react';
import { Card, Button, Input, Toggle } from '../ui';
import { useAppStore } from '../../store';
import { contractService, formatEther, parseEther } from '../../services/contracts';
import { useTokenMetadata } from '../../hooks/useTokenMetadata';
import { BigNumber } from 'ethers';
import { AMMType } from '../../config/contracts';

export const LiquidityInterface: React.FC = () => {
  const { 
    wallet, 
    selectedAMM, 
    pools, 
    tokenBalances, 
    addTransaction,
    updateTransaction,
    setLoading,
    setError 
  } = useAppStore();
  
  const { tokenA, tokenB, isLoading: tokensLoading } = useTokenMetadata();
  
  const [isAddMode, setIsAddMode] = useState(true);
  const [amountA, setAmountA] = useState('');
  const [amountB, setAmountB] = useState('');
  const [liquidityPercent, setLiquidityPercent] = useState('');
  const [gasLimit, setGasLimit] = useState('500000'); // Default gas limit
  const [isProcessing, setIsProcessing] = useState(false);
  const [estimatedGas, setEstimatedGas] = useState<number | null>(null);
  const [optimalAmounts, setOptimalAmounts] = useState<{amount0: string, amount1: string} | null>(null);
  const [slippageTolerance, setSlippageTolerance] = useState('2.0'); // Default 2%
  const [isAdvancedMode, setIsAdvancedMode] = useState(false); // Controls interface complexity
  
  // For Basic AMM mode: track which token is input and which is calculated
  const [inputToken, setInputToken] = useState<any>(null);
  const [calculatedToken, setCalculatedToken] = useState<any>(null);
  
  const currentPool = pools[selectedAMM];
  const tokenABalance = tokenBalances.find(tb => tb.token.address === tokenA?.address);
  const tokenBBalance = tokenBalances.find(tb => tb.token.address === tokenB?.address);
  
  // Set initial tokens when metadata loads
  useEffect(() => {
    if (tokenA && tokenB && !inputToken && !calculatedToken) {
      setInputToken(tokenA);
      setCalculatedToken(tokenB);
    }
  }, [tokenA, tokenB, inputToken, calculatedToken]);
  
  // Clear estimated gas when relevant values change
  useEffect(() => {
    setEstimatedGas(null);
    setOptimalAmounts(null);
  }, [isAddMode, amountA, amountB, liquidityPercent]);
  
  // Calculate optimal amounts for the current pool ratio
  const calculateOptimalAmounts = () => {
    if (!currentPool || !amountA || !amountB || !tokenA || !tokenB) {
      setOptimalAmounts(null);
      return;
    }
    
    try {
      const amountANum = parseFloat(amountA);
      const amountBNum = parseFloat(amountB);
      
      if (amountANum <= 0 || amountBNum <= 0) {
        setOptimalAmounts(null);
        return;
      }
      
      const reserve0 = parseFloat(formatEther(currentPool.reserves.reserve0));
      const reserve1 = parseFloat(formatEther(currentPool.reserves.reserve1));
      
      if (reserve0 === 0 || reserve1 === 0) {
        // First liquidity provider
        setOptimalAmounts({ amount0: amountA, amount1: amountB });
        return;
      }
      
      // Calculate optimal amounts maintaining current ratio
      const ratio = reserve1 / reserve0;
      const amount1Optimal = amountANum * ratio;
      
      if (amount1Optimal <= amountBNum) {
        // Use amountA as base, calculate optimal amountB
        setOptimalAmounts({ 
          amount0: amountA, 
          amount1: amount1Optimal.toFixed(6) 
        });
      } else {
        // Use amountB as base, calculate optimal amountA
        const amount0Optimal = amountBNum / ratio;
        setOptimalAmounts({ 
          amount0: amount0Optimal.toFixed(6), 
          amount1: amountB 
        });
      }
    } catch (error) {
      setOptimalAmounts(null);
    }
  };
  
  // Calculate optimal amounts when inputs change
  useEffect(() => {
    calculateOptimalAmounts();
  }, [amountA, amountB, currentPool]);
  
  // Calculate actual amounts that will be used (after slippage)
  const calculateActualAmounts = () => {
    if (!amountA || !amountB || !slippageTolerance) return null;
    
    try {
      const slippage = parseFloat(slippageTolerance);
      const amountANum = parseFloat(amountA);
      const amountBNum = parseFloat(amountB);
      
      const amountAMin = amountANum * (100 - slippage) / 100;
      const amountBMin = amountBNum * (100 - slippage) / 100;
      
      return {
        amountAMin: amountAMin.toFixed(6),
        amountBMin: amountBMin.toFixed(6),
        slippage
      };
    } catch (error) {
      return null;
    }
  };
  
  const actualAmounts = calculateActualAmounts();
  
  // For Basic AMM: Calculate the optimal amount for the calculated token
  const calculateBasicAmounts = () => {
    if (!currentPool || !amountA || !inputToken || !calculatedToken) return null;
    
    try {
      const inputAmount = parseFloat(amountA);
      if (inputAmount <= 0) return null;
      
      const reserve0 = parseFloat(formatEther(currentPool.reserves.reserve0));
      const reserve1 = parseFloat(formatEther(currentPool.reserves.reserve1));
      
      if (reserve0 === 0 || reserve1 === 0) {
        // First liquidity provider - use equal amounts
        return { amount0: inputAmount, amount1: inputAmount };
      }
      
      // For debugging
      console.log('Pool reserves:', { reserve0, reserve1 });
      console.log('Input token:', inputToken.symbol, 'Amount:', inputAmount);
      console.log('Calculated token:', calculatedToken.symbol);
      console.log('Pool token0:', currentPool.token0.symbol, currentPool.token0.address);
      console.log('Pool token1:', currentPool.token1.symbol, currentPool.token1.address);
      
      // We know the exact mapping: token0 == tokenA, token1 == tokenB
      // So we can always determine which reserve corresponds to which token
      let inputReserve: number;
      let calculatedReserve: number;
      
      if (inputToken.address.toLowerCase() === currentPool.token0.address.toLowerCase()) {
        // Input token is token0 (tokenA), so it corresponds to reserve0
        inputReserve = reserve0;
        calculatedReserve = reserve1;
        console.log('Input token is token0 (tokenA), using reserve0:', inputReserve);
      } else if (inputToken.address.toLowerCase() === currentPool.token1.address.toLowerCase()) {
        // Input token is token1 (tokenB), so it corresponds to reserve1
        inputReserve = reserve1;
        calculatedReserve = reserve0;
        console.log('Input token is token1 (tokenB), using reserve1:', inputReserve);
      } else {
        // This should never happen if the mapping is correct
        console.error('Token mapping mismatch! Input token does not match pool tokens');
        console.error('Input token:', inputToken.address);
        console.error('Pool token0:', currentPool.token0.address);
        console.error('Pool token1:', currentPool.token1.address);
        return null;
      }
      
      // Calculate the ratio between the calculated token's reserve and input token's reserve
      const ratio = calculatedReserve / inputReserve;
      const calculatedAmount = inputAmount * ratio;
      
      console.log('Using exact mapping - ratio:', ratio, 'calculated amount:', calculatedAmount);
      
      // Return the amounts in the correct order
      if (inputToken.address.toLowerCase() === currentPool.token0.address.toLowerCase()) {
        // Input is token0 (tokenA), return { amount0: input, amount1: calculated }
        return { amount0: inputAmount, amount1: calculatedAmount };
      } else {
        // Input is token1 (tokenB), return { amount0: calculated, amount1: input }
        return { amount0: calculatedAmount, amount1: inputAmount };
      }
      
    } catch (error) {
      console.error('Error calculating basic amounts:', error);
      return null;
    }
  };
  
  const basicAmounts = calculateBasicAmounts();
  
  // Function to estimate gas manually (Enhanced mode only)
  const estimateGas = async () => {
    if (!wallet.isConnected || !amountA || !amountB || !tokenA || !tokenB) return;
    
    try {
      const amountABN = parseEther(amountA);
      const amountBBN = parseEther(amountB);
      
      const ammAddress = selectedAMM === 'basic' ? '0x1f9483387E54577aAD7E8145E99d38D4722eaCFD' : '0x3Ac977b824042344324C16bc0EA4B02396d94417';
      
      // Check allowances first
      const [allowanceA, allowanceB] = await Promise.all([
        contractService.getTokenAllowance(tokenA.address, wallet.address!, ammAddress),
        contractService.getTokenAllowance(tokenB.address, wallet.address!, ammAddress)
      ]);
      
      if (allowanceA.lt(amountABN) || allowanceB.lt(amountBBN)) {
        setEstimatedGas(null);
        return; // Can't estimate if approvals are needed
      }
      
      // Try to estimate gas
      const ammContract = await contractService.getAMMContract(selectedAMM, true);
      const estimate = await ammContract.estimateGas.addLiquidity(
        amountABN,
        amountBBN,
        amountABN.mul(100 - parseFloat(slippageTolerance)).div(100),
        amountBBN.mul(100 - parseFloat(slippageTolerance)).div(100),
        wallet.address!
      );
      
      setEstimatedGas(estimate.toNumber());
    } catch (error: any) {
      setEstimatedGas(null);
      console.error('Gas estimation failed:', error);
      
      // Try to provide more specific error information
      if (error.message.includes('Insufficient amount')) {
        setError({ hasError: true, message: 'Gas estimation failed: Insufficient amount. The amounts may not meet the pool\'s requirements.' });
      } else if (error.message.includes('execution reverted')) {
        setError({ hasError: true, message: 'Gas estimation failed: Transaction would revert. Check your amounts and pool state.' });
      }
    }
  };
  
  // Function to estimate gas for remove liquidity (Enhanced mode only)
  const estimateRemoveGas = async () => {
    if (!wallet.isConnected || !liquidityPercent || !currentPool || !tokenA || !tokenB) return;
    
    try {
      const percent = parseFloat(liquidityPercent);
      const liquidityToRemove = currentPool.lpTokenBalance.mul(percent).div(100);
      
      // Try to estimate gas
      const ammContract = await contractService.getAMMContract(selectedAMM, true);
      const estimate = await ammContract.estimateGas.removeLiquidity(
        liquidityToRemove,
        BigNumber.from(0), // TODO: Calculate proper minimums
        BigNumber.from(0),
        wallet.address!
      );
      
      setEstimatedGas(estimate.toNumber());
    } catch (error: any) {
      setEstimatedGas(null);
      console.error('Gas estimation failed:', error);
      
      // Try to provide more specific error information
      if (error.message.includes('Insufficient amount')) {
        setError({ hasError: true, message: 'Gas estimation failed: Insufficient amount. You may not have enough LP token balance.' });
      } else if (error.message.includes('execution reverted')) {
        setError({ hasError: true, message: 'Gas estimation failed: Transaction would revert. Check your LP token balance and pool constraints.' });
      }
    }
  };
  
  // Handle token flip for Basic AMM mode
  const handleFlipTokens = () => {
    setInputToken(calculatedToken);
    setCalculatedToken(inputToken);
    setAmountA('');
  };
  
  const handleAddLiquidity = async () => {
    if (!wallet.isConnected || !tokenA || !tokenB) return;
    
    // For Basic AMM: validate input amount and use calculated amount
    if (selectedAMM === AMMType.BASIC) {
      if (!amountA || !basicAmounts) return;
      
      // Validate input amount
      const inputAmountNum = parseFloat(amountA);
      if (inputAmountNum <= 0) {
        setError({ hasError: true, message: 'Please enter a valid amount greater than 0' });
        return;
      }
      
      // Check if user has sufficient balance for input token
      const inputTokenBalance = tokenBalances.find(tb => tb.token.address === inputToken?.address);
      if (inputTokenBalance && inputAmountNum > parseFloat(inputTokenBalance.formatted)) {
        setError({ hasError: true, message: `Insufficient ${inputToken.symbol} balance. You have ${parseFloat(inputTokenBalance.formatted).toFixed(4)} but trying to add ${inputAmountNum}` });
        return;
      }
      
      // Check if user has sufficient balance for calculated token
      const calculatedTokenBalance = tokenBalances.find(tb => tb.token.address === calculatedToken?.address);
      if (calculatedTokenBalance && basicAmounts.amount1 > parseFloat(calculatedTokenBalance.formatted)) {
        setError({ hasError: true, message: `Insufficient ${calculatedToken.symbol} balance. You have ${parseFloat(calculatedTokenBalance.formatted).toFixed(4)} but need ${basicAmounts.amount1.toFixed(4)}` });
        return;
      }
      
      // Use Basic AMM logic: fixed gas limit (500k) and 5% slippage
      try {
        setIsProcessing(true);
        setLoading({ isLoading: true, message: 'Adding liquidity...' });
        
        const amountABN = parseEther(amountA);
        const amountBBN = parseEther(basicAmounts.amount1.toString());
        
        // Use 5% slippage for Basic AMM
        const amountAMin = amountABN.mul(95).div(100);
        const amountBMin = amountBBN.mul(95).div(100);
        
        // Check and approve tokens if needed
        const ammAddress = '0x1f9483387E54577aAD7E8145E99d38D4722eaCFD';
        
        const [allowanceA, allowanceB] = await Promise.all([
          contractService.getTokenAllowance(inputToken.address, wallet.address!, ammAddress),
          contractService.getTokenAllowance(calculatedToken.address, wallet.address!, ammAddress)
        ]);
        
        if (allowanceA.lt(amountABN)) {
          const approveTx = await contractService.approveToken(
            inputToken.address,
            ammAddress,
            BigNumber.from('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')
          );
          await approveTx.wait();
        }
        
        if (allowanceB.lt(amountBBN)) {
          const approveTx = await contractService.approveToken(
            calculatedToken.address,
            ammAddress,
            BigNumber.from('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')
          );
          await approveTx.wait();
        }
        
        // Add liquidity with fixed gas limit
        const liquidityTx = await contractService.addLiquidity({
          tokenA: inputToken,
          tokenB: calculatedToken,
          amountADesired: amountABN,
          amountBDesired: amountBBN,
          amountAMin: amountAMin,
          amountBMin: amountBMin,
          to: wallet.address!
        }, selectedAMM, false, 500000); // Fixed gas limit for Basic AMM
        
        addTransaction({
          hash: liquidityTx.hash,
          type: 'add-liquidity',
          status: 'pending',
          from: wallet.address!,
          to: ammAddress
        });
        
        await liquidityTx.wait();
        
        // Update transaction status
        updateTransaction(liquidityTx.hash, { status: 'confirmed' });
        
        // Reset form
        setAmountA('');
        setLoading({ isLoading: false });
        
      } catch (error: any) {
        let errorMessage = error.message;
        
        // Provide more specific error messages for common issues
        if (error.message.includes('cannot estimate gas')) {
          errorMessage = 'Gas estimation failed. This usually means the transaction will revert. Try adjusting the amounts or check if you have sufficient token balances and allowances.';
        } else if (error.message.includes('Insufficient amount')) {
          errorMessage = 'Insufficient token amount. The amounts you\'re trying to add may not meet the pool\'s requirements. Try adjusting the amounts or check the pool reserves.';
        } else if (error.message.includes('execution reverted')) {
          errorMessage = 'Transaction execution reverted. This could be due to insufficient balances, allowances, or pool constraints. Check your inputs and try again.';
        }
        
        setError({ hasError: true, message: errorMessage });
        setLoading({ isLoading: false });
      } finally {
        setIsProcessing(false);
      }
      
      return;
    }
    
    // Enhanced AMM mode: original logic with all features
    if (!amountA || !amountB) return;
    
    // Validate gas limit
    const gasLimitNum = parseInt(gasLimit);
    if (isNaN(gasLimitNum) || gasLimitNum <= 0) {
      setError({ hasError: true, message: 'Please enter a valid gas limit' });
      return;
    }
    
    // Validate amounts
    const amountANum = parseFloat(amountA);
    const amountBNum = parseFloat(amountB);
    
    if (amountANum <= 0 || amountBNum <= 0) {
      setError({ hasError: true, message: 'Please enter valid amounts greater than 0' });
      return;
    }
    
    // Check if user has sufficient balance
    if (tokenABalance && amountANum > parseFloat(tokenABalance.formatted)) {
      setError({ hasError: true, message: `Insufficient ${tokenA.symbol} balance. You have ${parseFloat(tokenABalance.formatted).toFixed(4)} but trying to add ${amountANum}` });
      return;
    }
    
    if (tokenBBalance && amountBNum > parseFloat(tokenBBalance.formatted)) {
      setError({ hasError: true, message: `Insufficient ${tokenB.symbol} balance. You have ${parseFloat(tokenBBalance.formatted).toFixed(4)} but trying to add ${amountBNum}` });
      return;
    }
    
    try {
      setIsProcessing(true);
      setLoading({ isLoading: true, message: 'Adding liquidity...' });
      
      const amountABN = parseEther(amountA);
      const amountBBN = parseEther(amountB);
      
      // Use more flexible slippage for existing pools
      let slippageToleranceNum = parseFloat(slippageTolerance);
      if (currentPool && currentPool.reserves.totalSupply.gt(0)) {
        // For existing pools, use more flexible slippage
        slippageToleranceNum = 2.0; // 2%
      }
      
      const amountAMin = amountABN.mul(100 - slippageToleranceNum).div(100);
      const amountBMin = amountBBN.mul(100 - slippageToleranceNum).div(100);
      
      // Check and approve tokens if needed
      const ammAddress = '0x3Ac977b824042344324C16bc0EA4B02396d94417';
      
      const [allowanceA, allowanceB] = await Promise.all([
        contractService.getTokenAllowance(tokenA.address, wallet.address!, ammAddress),
        contractService.getTokenAllowance(tokenB.address, wallet.address!, ammAddress)
      ]);
      
      if (allowanceA.lt(amountABN)) {
        const approveTx = await contractService.approveToken(
          tokenA.address,
          ammAddress,
          BigNumber.from('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')
        );
        await approveTx.wait();
      }
      
      if (allowanceB.lt(amountBBN)) {
        const approveTx = await contractService.approveToken(
          tokenB.address,
          ammAddress,
          BigNumber.from('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')
        );
        await approveTx.wait();
      }
      
      // Add liquidity
      const liquidityTx = await contractService.addLiquidity({
        tokenA,
        tokenB,
        amountADesired: amountABN,
        amountBDesired: amountBBN,
        amountAMin: amountAMin,
        amountBMin: amountBMin,
        to: wallet.address!
      }, selectedAMM, true, parseInt(gasLimit));
      
      addTransaction({
        hash: liquidityTx.hash,
        type: 'add-liquidity',
        status: 'pending',
        from: wallet.address!,
        to: ammAddress
      });
      
              await liquidityTx.wait();
        
        // Update transaction status
        updateTransaction(liquidityTx.hash, { status: 'confirmed' });
        
        // Reset form
        setAmountA('');
        setAmountB('');
        setLoading({ isLoading: false });
      
    } catch (error: any) {
      let errorMessage = error.message;
      
      // Provide more specific error messages for common issues
      if (error.message.includes('cannot estimate gas')) {
        errorMessage = 'Gas estimation failed. This usually means the transaction will revert. Try increasing the gas limit or check if you have sufficient token balances and allowances.';
      } else if (error.message.includes('Insufficient amount')) {
        errorMessage = 'Insufficient token amount. The amounts you\'re trying to add may not meet the pool\'s requirements. Try adjusting the amounts or check the pool reserves.';
      } else if (error.message.includes('execution reverted')) {
        errorMessage = 'Transaction execution reverted. This could be due to insufficient balances, allowances, or pool constraints. Check your inputs and try again.';
      }
      
      setError({ hasError: true, message: errorMessage });
      setLoading({ isLoading: false });
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleRemoveLiquidity = async () => {
    if (!wallet.isConnected || !liquidityPercent || !currentPool || !tokenA || !tokenB) return;
    
    // For Basic AMM: use fixed gas limit and 5% slippage
    if (selectedAMM === AMMType.BASIC) {
      try {
        setIsProcessing(true);
        setLoading({ isLoading: true, message: 'Removing liquidity...' });
        
        const percent = parseFloat(liquidityPercent);
        const liquidityToRemove = currentPool.lpTokenBalance.mul(percent).div(100);
        
        const removeTx = await contractService.removeLiquidity({
          tokenA,
          tokenB,
          liquidity: liquidityToRemove,
          amountAMin: BigNumber.from(0), // TODO: Calculate proper minimums
          amountBMin: BigNumber.from(0),
          to: wallet.address!
        }, selectedAMM, false, 500000); // Fixed gas limit for Basic AMM
        
        addTransaction({
          hash: removeTx.hash,
          type: 'remove-liquidity',
          status: 'pending',
          from: wallet.address!,
          to: '0x1f9483387E54577aAD7E8145E99d38D4722eaCFD'
        });
        
        await removeTx.wait();
        
        // Update transaction status
        updateTransaction(removeTx.hash, { status: 'confirmed' });
        
        setLiquidityPercent('');
        setLoading({ isLoading: false });
        
      } catch (error: any) {
        let errorMessage = error.message;
        
        // Provide more specific error messages for common issues
        if (error.message.includes('cannot estimate gas')) {
          errorMessage = 'Gas estimation failed. This usually means the transaction will revert. Try checking if you have sufficient LP token balance.';
        } else if (error.message.includes('Insufficient amount')) {
          errorMessage = 'Insufficient LP token amount. You may not have enough LP tokens to remove the specified percentage.';
        } else if (error.message.includes('execution reverted')) {
          errorMessage = 'Transaction execution reverted. This could be due to insufficient LP token balance or pool constraints. Check your inputs and try again.';
        }
        
        setError({ hasError: true, message: errorMessage });
        setLoading({ isLoading: false });
      } finally {
        setIsProcessing(false);
      }
      
      return;
    }
    
    // Enhanced AMM mode: original logic with all features
    // Validate gas limit
    const gasLimitNum = parseInt(gasLimit);
    if (isNaN(gasLimitNum) || gasLimitNum <= 0) {
      setError({ hasError: true, message: 'Please enter a valid gas limit' });
      return;
    }
    
    try {
      setIsProcessing(true);
      setLoading({ isLoading: true, message: 'Removing liquidity...' });
      
      const percent = parseFloat(liquidityPercent);
      const liquidityToRemove = currentPool.lpTokenBalance.mul(percent).div(100);
      
      const removeTx = await contractService.removeLiquidity({
        tokenA,
        tokenB,
        liquidity: liquidityToRemove,
        amountAMin: BigNumber.from(0), // TODO: Calculate proper minimums
        amountBMin: BigNumber.from(0),
        to: wallet.address!
      }, selectedAMM, true, parseInt(gasLimit));
      
      addTransaction({
        hash: removeTx.hash,
        type: 'remove-liquidity',
        status: 'pending',
        from: wallet.address!,
        to: '0x3Ac977b824042344324C16bc0EA4B02396d94417'
      });
      
              await removeTx.wait();
        
        // Update transaction status
        updateTransaction(removeTx.hash, { status: 'confirmed' });
        
        setLiquidityPercent('');
        setLoading({ isLoading: false });
      
    } catch (error: any) {
      let errorMessage = error.message;
      
      // Provide more specific error messages for common issues
      if (error.message.includes('cannot estimate gas')) {
        errorMessage = 'Gas estimation failed. This usually means the transaction will revert. Try increasing the gas limit or check if you have sufficient LP token balance.';
      } else if (error.message.includes('Insufficient amount')) {
        errorMessage = 'Insufficient LP token amount. You may not have enough LP tokens to remove the specified percentage.';
      } else if (error.message.includes('execution reverted')) {
        errorMessage = 'Transaction execution reverted. This could be due to insufficient LP token balance or pool constraints. Check your inputs and try again.';
      }
      
      setError({ hasError: true, message: errorMessage });
      setLoading({ isLoading: false });
    } finally {
      setIsProcessing(false);
    }
  };
  
  if (tokensLoading || !tokenA || !tokenB) {
    return (
      <Card variant="white-border">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Liquidity Management</h3>
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
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Liquidity Management</h3>
          <div className="flex items-center space-x-3">
            <span className="text-sm text-gray-300">Advanced:</span>
            <Toggle
              checked={isAdvancedMode}
              onChange={(checked) => setIsAdvancedMode(checked)}
              label=""
            />
          </div>
        </div>
        
        <div className="flex items-center justify-center space-x-8 text-sm">
          <button
            onClick={() => setIsAddMode(true)}
            className={`pb-2 border-b-2 transition-colors ${
              isAddMode 
                ? 'border-gradient-start text-white' 
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            Add Liquidity
          </button>
          <button
            onClick={() => setIsAddMode(false)}
            className={`pb-2 border-b-2 transition-colors ${
              !isAddMode 
                ? 'border-gradient-start text-white' 
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            Remove Liquidity
          </button>
        </div>
        
        {isAddMode ? (
          <div className="space-y-4">
            {/* Simple Mode - Basic Interface for both AMM types */}
            {!isAdvancedMode && (
              <>
                {/* Input Token */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium text-gray-300">Amount to Add</label>
                    <span className="text-xs text-gray-400">
                      Balance: {tokenBalances.find(tb => tb.token.address === inputToken?.address) ? parseFloat(tokenBalances.find(tb => tb.token.address === inputToken?.address)!.formatted).toFixed(4) : '0.0000'}
                    </span>
                  </div>
                  <div className="relative">
                    <Input
                      type="number"
                      placeholder="0.0"
                      value={amountA}
                      onChange={(e) => setAmountA(e.target.value)}
                      className="pr-20"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 z-10">
                      <span className="text-white text-sm font-medium">{inputToken?.symbol}</span>
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
                
                {/* Calculated Token */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium text-gray-300">Optimal Amount (Auto-Calculated)</label>
                    <span className="text-xs text-gray-400">
                      Balance: {tokenBalances.find(tb => tb.token.address === calculatedToken?.address) ? parseFloat(tokenBalances.find(tb => tb.token.address === calculatedToken?.address)!.formatted).toFixed(4) : '0.0000'}
                    </span>
                  </div>
                  <div className="relative">
                    <Input
                      type="number"
                      placeholder="0.0"
                      value={basicAmounts ? 
                        (inputToken.address.toLowerCase() === currentPool?.token0.address.toLowerCase() ? 
                          basicAmounts.amount1.toFixed(6) : 
                          basicAmounts.amount0.toFixed(6)
                        ) : ''
                      }
                      readOnly
                      className="pr-20 bg-gray-700/30"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 z-10">
                      <span className="text-white text-sm font-medium">{calculatedToken?.symbol}</span>
                    </div>
                  </div>
                </div>
                
                {/* Transaction Info */}
                {basicAmounts && (
                  <div className="transaction-details-electric-meadow">
                    <h4 className="text-sm font-medium text-white mb-2">Transaction Details</h4>
                    <div className="text-xs text-white space-y-1">
                      <p>• <strong>Gas Limit:</strong> {selectedAMM === AMMType.BASIC ? '500,000 (fixed)' : 'Auto-estimated'} for reliability</p>
                      <p>• <strong>Slippage:</strong> {selectedAMM === AMMType.BASIC ? '5% (fixed)' : '2% (default)'} for {selectedAMM === AMMType.BASIC ? 'Basic AMM' : 'Enhanced AMM'}</p>
                      <p>• <strong>Pool Ratio:</strong> Maintained automatically</p>
                    </div>
                  </div>
                )}
              </>
            )}
            
            {/* Advanced Mode - Full-featured Interface for both AMM types */}
            {isAdvancedMode && (
              <>
                {/* Troubleshooting Tips - Always on top */}
                <div className="troubleshooting-golden-sunrise">
                  <h4 className="text-sm font-medium text-white mb-2">💡 Troubleshooting Tips</h4>
                  <div className="text-xs text-white space-y-1">
                    <p>• <strong>If gas estimation fails:</strong> Try increasing the gas limit or slippage tolerance</p>
                    <p>• <strong>If transaction reverts:</strong> Check that your amounts maintain the pool ratio</p>
                    <p>• <strong>For existing pools:</strong> Use the "Optimal Amounts" as a guide for proper ratios</p>
                    <p>• <strong>For first liquidity:</strong> Any amounts will work, but consider equal values</p>
                  </div>
                </div>
                
                {/* Optimal Amounts Display */}
                {optimalAmounts && (
                  <div className="optimal-amounts-aurora">
                    <h4 className="text-sm font-medium text-white mb-2">Optimal Amounts (Pool Ratio)</h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-white">{tokenA?.symbol}: </span>
                        <span className="text-white">{optimalAmounts.amount0}</span>
                      </div>
                      <div>
                        <span className="text-white">{tokenB?.symbol}: </span>
                        <span className="text-white">{optimalAmounts.amount1}</span>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-white">
                      <p>💡 These amounts maintain the current pool ratio. Your input amounts will be adjusted to match.</p>
                    </div>
                    <div className="mt-3">
                      <Button
                        onClick={() => {
                          setAmountA(optimalAmounts.amount0);
                          setAmountB(optimalAmounts.amount1);
                        }}
                        variant="outline"
                        size="sm"
                        className="w-full text-xs"
                      >
                        Use Optimal Amounts
                      </Button>
                    </div>
                  </div>
                )}
                
                {/* Actual Amounts Display */}
                {actualAmounts && (
                  <div className="transaction-details-electric-meadow">
                    <h4 className="text-sm font-medium text-white mb-2">Transaction Details</h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-white">Min {tokenA?.symbol}: </span>
                        <span className="text-white">{actualAmounts.amountAMin}</span>
                      </div>
                      <div>
                        <span className="text-white">Min {tokenB?.symbol}: </span>
                        <span className="text-white">{actualAmounts.amountBMin}</span>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-white">
                      <p>💡 With {actualAmounts.slippage}% slippage tolerance, these are the minimum amounts you'll receive.</p>
                    </div>
                  </div>
                )}
                
                {/* Add Liquidity */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium text-gray-300">{tokenA.symbol}</label>
                    <span className="text-xs text-gray-400">
                      Balance: {tokenABalance ? parseFloat(tokenABalance.formatted).toFixed(4) : '0.0000'}
                    </span>
                  </div>
                  <Input
                    type="number"
                    placeholder="0.0"
                    value={amountA}
                    onChange={(e) => setAmountA(e.target.value)}
                  />
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium text-gray-300">{tokenB.symbol}</label>
                    <span className="text-xs text-gray-400">
                      Balance: {tokenBBalance ? parseFloat(tokenBBalance.formatted).toFixed(4) : '0.0000'}
                    </span>
                  </div>
                  <Input
                    type="number"
                    placeholder="0.0"
                    value={amountB}
                    onChange={(e) => setAmountB(e.target.value)}
                  />
                </div>
                
                {/* Gas Limit Input */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium text-gray-300">Gas Limit</label>
                    <span className="text-xs text-gray-400">
                      Recommended: 500,000
                    </span>
                  </div>
                  <div className="mb-2">
                    <p className="text-xs text-gray-400 bg-gray-800 p-2 rounded">
                      💡 Manual gas limit may be needed if automatic estimation fails. This usually happens when the transaction is likely to revert due to insufficient amounts or other constraints.
                    </p>
                    <div className="mt-2 text-xs text-gray-500">
                      <p>Common causes:</p>
                      <ul className="list-disc list-inside ml-2 space-y-1">
                        <li>Insufficient token balance</li>
                        <li>Token approval needed</li>
                        <li>Amounts too small for pool</li>
                        <li>Pool constraints not met</li>
                      </ul>
                    </div>
                  </div>
                  <div className="flex space-x-2 mb-2">
                    <Input
                      type="number"
                      placeholder="500000"
                      value={gasLimit}
                      onChange={(e) => setGasLimit(e.target.value)}
                      className="text-sm flex-1"
                    />
                    <Button
                      onClick={estimateGas}
                      disabled={!wallet.isConnected || !amountA || !amountB}
                      variant="outline"
                      size="sm"
                      className="px-3"
                    >
                      Estimate
                    </Button>
                  </div>
                  {estimatedGas && (
                    <div className="text-xs text-green-400 bg-green-900/20 p-2 rounded">
                      Estimated gas: {estimatedGas.toLocaleString()}
                    </div>
                  )}
                  <div className="flex space-x-2 mt-2">
                    {[300000, 500000, 800000, 1000000].map(limit => (
                      <button
                        key={limit}
                        onClick={() => setGasLimit(limit.toString())}
                        className="flex-1 py-1 px-2 text-xs rounded bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white transition-colors"
                      >
                        {limit.toLocaleString()}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Slippage Tolerance Input */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium text-gray-300">Slippage Tolerance</label>
                    <span className="text-xs text-gray-400">
                      Default: 2%
                    </span>
                  </div>
                  <div className="mb-2">
                    <p className="text-xs text-gray-400 bg-gray-800 p-2 rounded">
                      💡 Adjust slippage tolerance for the transaction. Higher slippage means more flexibility, but also higher risk.
                    </p>
                    <div className="mt-2 text-xs text-gray-500">
                      <p>Common values:</p>
                      <ul className="list-disc list-inside ml-2 space-y-1">
                        <li>0.1% - 0.5% (very strict)</li>
                        <li>1% - 2% (default)</li>
                        <li>5% - 10% (flexible)</li>
                      </ul>
                    </div>
                  </div>
                  <div className="flex space-x-2 mb-2">
                    <Input
                      type="number"
                      placeholder="2.0"
                      value={slippageTolerance}
                      onChange={(e) => setSlippageTolerance(e.target.value)}
                      className="text-sm flex-1"
                    />
                    <span className="text-xs text-gray-400 flex items-center px-2">%</span>
                  </div>
                  <div className="flex space-x-2 mt-2">
                    {[0.1, 0.5, 1, 2, 5, 10].map(slippage => (
                      <button
                        key={slippage}
                        onClick={() => setSlippageTolerance(slippage.toString())}
                        className="flex-1 py-1 px-2 text-xs rounded bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white transition-colors"
                      >
                        {slippage}%
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
            
            <Button
              onClick={handleAddLiquidity}
              disabled={!wallet.isConnected || 
                (!isAdvancedMode ? (!amountA || !basicAmounts) : (!amountA || !amountB)) || 
                isProcessing}
              loading={isProcessing}
              variant="gradient-secondary"
              className="w-full"
              size="lg"
            >
              {!wallet.isConnected ? 'Connect Wallet' : 
               !isAdvancedMode ? 
                 (!amountA || !basicAmounts) ? 'Enter Amount' : 'Add Liquidity' :
                 (!amountA || !amountB) ? 'Enter Amounts' : 'Add Liquidity'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Simple Mode - Basic Remove Interface for both AMM types */}
            {!isAdvancedMode && (
              <>

                
                {/* Remove Liquidity */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium text-gray-300">Amount to Remove</label>
                    <span className="text-xs text-gray-400">
                      LP Balance: {currentPool ? formatEther(currentPool.lpTokenBalance) : '0.0000'}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <Input
                      type="number"
                      placeholder="0"
                      value={liquidityPercent}
                      onChange={(e) => setLiquidityPercent(e.target.value)}
                      suffix={<span className="text-gray-400">%</span>}
                    />
                    <div className="flex space-x-2">
                      {[25, 50, 75, 100].map(percent => (
                        <button
                          key={percent}
                          onClick={() => setLiquidityPercent(percent.toString())}
                          className="flex-1 py-1 px-2 text-xs rounded bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white transition-colors"
                        >
                          {percent}%
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Transaction Info */}
                <div className="transaction-details-electric-meadow">
                  <h4 className="text-sm font-medium text-white mb-2">Transaction Details</h4>
                  <div className="text-xs text-white space-y-1">
                    <p>• <strong>Gas Limit:</strong> {selectedAMM === AMMType.BASIC ? '500,000 (fixed)' : 'Auto-estimated'} for reliability</p>
                    <p>• <strong>Slippage:</strong> {selectedAMM === AMMType.BASIC ? '5% (fixed)' : '2% (default)'} for {selectedAMM === AMMType.BASIC ? 'Basic AMM' : 'Enhanced AMM'}</p>
                  </div>
                </div>
              </>
            )}
            
            {/* Advanced Mode - Full-featured Remove Interface for both AMM types */}
            {isAdvancedMode && (
              <>
                {/* Remove Liquidity */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium text-gray-300">Amount to Remove</label>
                    <span className="text-xs text-gray-400">
                      LP Balance: {currentPool ? formatEther(currentPool.lpTokenBalance) : '0.0000'}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <Input
                      type="number"
                      placeholder="0"
                      value={liquidityPercent}
                      onChange={(e) => setLiquidityPercent(e.target.value)}
                      suffix={<span className="text-gray-400">%</span>}
                    />
                    <div className="flex space-x-2">
                      {[25, 50, 75, 100].map(percent => (
                        <button
                          key={percent}
                          onClick={() => setLiquidityPercent(percent.toString())}
                          className="flex-1 py-1 px-2 text-xs rounded bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white transition-colors"
                        >
                          {percent}%
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Gas Limit Input */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium text-gray-300">Gas Limit</label>
                    <span className="text-xs text-gray-400">
                      Recommended: 500,000
                    </span>
                  </div>
                  <div className="mb-2">
                    <p className="text-xs text-gray-400 bg-gray-800 p-2 rounded">
                      💡 Manual gas limit may be needed if automatic estimation fails. This usually happens when the transaction is likely to revert due to insufficient amounts or other constraints.
                    </p>
                    <div className="mt-2 text-xs text-gray-500">
                      <p>Common causes:</p>
                      <ul className="list-disc list-inside ml-2 space-y-1">
                        <li>Insufficient LP token balance</li>
                        <li>Amount exceeds available liquidity</li>
                        <li>Pool constraints not met</li>
                        <li>Minimum amount requirements</li>
                      </ul>
                    </div>
                  </div>
                  <div className="flex space-x-2 mb-2">
                    <Input
                      type="number"
                      placeholder="500000"
                      value={gasLimit}
                      onChange={(e) => setGasLimit(e.target.value)}
                      className="text-sm flex-1"
                    />
                    <Button
                      onClick={estimateRemoveGas}
                      disabled={!wallet.isConnected || !liquidityPercent}
                      variant="outline"
                      size="sm"
                      className="px-3"
                    >
                      Estimate
                    </Button>
                  </div>
                  {estimatedGas && (
                    <div className="text-xs text-green-400 bg-green-900/20 p-2 rounded">
                      Estimated gas: {estimatedGas.toLocaleString()}
                    </div>
                  )}
                  <div className="flex space-x-2 mt-2">
                    {[300000, 500000, 800000, 1000000].map(limit => (
                      <button
                        key={limit}
                        onClick={() => setGasLimit(limit.toString())}
                        className="flex-1 py-1 px-2 text-xs rounded bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white transition-colors"
                      >
                        {limit.toLocaleString()}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
            
            <Button
              onClick={handleRemoveLiquidity}
              disabled={!wallet.isConnected || !liquidityPercent || isProcessing}
              loading={isProcessing}
              variant="outline"
              className="w-full btn-remove-liquidity-hover"
              size="lg"
            >
              {!wallet.isConnected ? 'Connect Wallet' : 'Remove Liquidity'}
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};