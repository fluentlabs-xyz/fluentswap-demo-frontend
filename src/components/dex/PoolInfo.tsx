import React, { useState } from 'react';
import { Card, Button } from '../ui';
import { useAppStore } from '../../store';
import { formatEther } from '../../services/contracts';
import { useTokenMetadata } from '../../hooks/useTokenMetadata';
import { useDataRefresh } from '../../hooks/useDataRefresh';
import { tokenMetadataService } from '../../services/tokenMetadata';

export const PoolInfo: React.FC = () => {
  const { selectedAMM, pools, wallet } = useAppStore();
  const { tokenA, tokenB, isLoading: tokensLoading } = useTokenMetadata();
  const { refreshPools } = useDataRefresh();
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const currentPool = pools[selectedAMM];
  
  if (tokensLoading || !tokenA || !tokenB) {
    return (
      <Card>
        <div className="text-center py-8">
          <div className="w-12 h-12 rounded-full bg-gray-700 mx-auto mb-3 flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-mystic-start"></div>
          </div>
          <p className="text-gray-400 text-sm">Loading token information...</p>
        </div>
      </Card>
    );
  }
  
  if (!currentPool) {
    return (
      <Card>
        <div className="text-center py-8">
          <div className="w-12 h-12 rounded-full bg-gray-700 mx-auto mb-3 flex items-center justify-center">
            <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-gray-400 text-sm">Loading pool information...</p>
        </div>
      </Card>
    );
  }
  
  const reserve0Formatted = parseFloat(formatEther(currentPool.reserves.reserve0));
  const reserve1Formatted = parseFloat(formatEther(currentPool.reserves.reserve1));
  const totalLiquidity = reserve0Formatted + reserve1Formatted;
  const lpBalanceFormatted = parseFloat(formatEther(currentPool.lpTokenBalance));
  const totalSupplyFormatted = parseFloat(formatEther(currentPool.reserves.totalSupply));
  
  return (
    <Card variant="white-border">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - General Pool Information */}
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Pool Information</h3>
            <div className="flex items-center space-x-3">
              <div className="flex space-x-2">
                <Button
                  onClick={async () => {
                    setIsRefreshing(true);
                    try {
                      console.log('🧪 Manual refresh triggered');
                      await refreshPools();
                      console.log('✅ Manual refresh completed');
                    } catch (error) {
                      console.error('❌ Manual refresh failed:', error);
                    } finally {
                      setIsRefreshing(false);
                    }
                  }}
                  disabled={isRefreshing}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                >
                  {isRefreshing ? 'Refreshing...' : '🔄 Refresh'}
                </Button>
                
                <Button
                  onClick={async () => {
                    console.log('🧪 Clearing token metadata cache...');
                    await tokenMetadataService.refreshAllTokens();
                    console.log('✅ Token metadata cache cleared and refreshed');
                  }}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                >
                  🧹 Clear Token Cache
                </Button>
                
                <Button
                  onClick={() => {
                    console.log('🔍 Active token requests:', tokenMetadataService.getActiveRequestsStatus());
                    console.log('🔍 Token cache status:', tokenMetadataService.getCacheStatus());
                  }}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                >
                  🔍 Debug Cache
                </Button>
              </div>
            </div>
          </div>
          
          {/* Pool Reserves - moved to center */}
          <div className="flex-1 flex items-center">
            <div className="grid grid-cols-2 gap-4 w-full">
              <div className="text-center p-3 bg-gray-800/50 rounded-lg">
                <p className="text-xs text-gray-400 mb-1">{tokenA.symbol} Reserve</p>
                <p className="text-lg font-mono text-white">{reserve0Formatted.toFixed(2)}</p>
              </div>
              <div className="text-center p-3 bg-gray-800/50 rounded-lg">
                <p className="text-xs text-gray-400 mb-1">{tokenB.symbol} Reserve</p>
                <p className="text-lg font-mono text-white">{reserve1Formatted.toFixed(2)}</p>
              </div>
            </div>
          </div>
          
          {/* Pool Stats - moved to bottom */}
          <div className="mt-auto space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Total Liquidity</span>
              <span className="text-sm font-mono text-white">{totalLiquidity.toFixed(2)} Tokens</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Total LP Tokens</span>
              <span className="text-sm font-mono text-white">{totalSupplyFormatted.toFixed(4)}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Current Rate</span>
              <span className="text-sm font-mono text-white">
                1 {tokenA.symbol} = {(reserve1Formatted / reserve0Formatted).toFixed(6)} {tokenB.symbol}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Last Updated</span>
              <span className="text-sm text-gray-300">
                {new Date(currentPool.reserves.lastUpdated).toLocaleTimeString()}
              </span>
            </div>
          </div>
        </div>
        
        {/* Right Column - User Position */}
        <div className="flex flex-col h-full">
          {wallet.isConnected ? (
            <>
              {/* Visualizations at the top */}
              {lpBalanceFormatted > 0 && (
                <div className="space-y-4 mb-6">
                  {/* LP Share Visualization */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-300 mb-2">Your Pool Share</h4>
                    <div className="w-full bg-gray-800 rounded-full h-3">
                      <div 
                        className="h-3 rounded-full pool-share-bar"
                        style={{ 
                          width: `${Math.min(parseFloat(currentPool.userPoolShare), 100)}%`
                        }}
                      ></div>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-xs text-gray-400">0%</span>
                      <span className="text-xs text-white font-medium">{currentPool.userPoolShare}%</span>
                      <span className="text-xs text-gray-400">100%</span>
                    </div>
                  </div>
                  
                  {/* Token Composition Visualization */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-300 mb-2">Token Composition</h4>
                    {(() => {
                      // Use the exact same calculation as the underlying tokens display
                      const tokenAAmount = reserve0Formatted * (lpBalanceFormatted / totalSupplyFormatted);
                      const tokenBAmount = reserve1Formatted * (lpBalanceFormatted / totalSupplyFormatted);
                      const totalAmount = tokenAAmount + tokenBAmount;
                      
                      // Calculate percentages based on the actual amounts
                      const tokenAPercentage = totalAmount > 0 ? (tokenAAmount / totalAmount) * 100 : 0;
                      const tokenBPercentage = totalAmount > 0 ? (tokenBAmount / totalAmount) * 100 : 0;
                      
                      console.log('Token Composition Debug:', {
                        tokenAAmount,
                        tokenBAmount,
                        totalAmount,
                        tokenAPercentage,
                        tokenBPercentage,
                        difference: Math.abs(tokenAPercentage - tokenBPercentage),
                        isNearEqual: Math.abs(tokenAPercentage - tokenBPercentage) < 0.1
                      });
                      
                      return (
                        <>
                          <div className="flex h-3 rounded-full overflow-hidden">
                            <div 
                              className="h-full token-a-bar"
                              style={{ 
                                width: `${tokenAPercentage}%`
                              }}
                              title={`${tokenA.symbol}: ${tokenAAmount.toFixed(4)}`}
                            ></div>
                            <div 
                              className="h-full token-b-bar"
                              style={{ 
                                width: `${tokenBPercentage}%`
                              }}
                              title={`${tokenB.symbol}: ${tokenBAmount.toFixed(4)}`}
                            ></div>
                          </div>
                          <div className="flex justify-between items-center mt-1">
                            <span className="text-xs text-gray-400">{tokenA.symbol}</span>
                            <span className="text-xs text-white font-medium">
                              {tokenAPercentage.toFixed(1)}%
                              {Math.abs(tokenAPercentage - tokenBPercentage) < 0.1 && (
                                <span className="text-yellow-400 ml-1">≈</span>
                              )}
                            </span>
                            <span className="text-xs text-gray-400">{tokenB.symbol}</span>
                          </div>
                          {Math.abs(tokenAPercentage - tokenBPercentage) < 0.1 && (
                            <div className="text-xs text-yellow-400 text-center mt-1">
                              Nearly equal amounts (difference: {Math.abs(tokenAPercentage - tokenBPercentage).toFixed(3)}%)
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}
              
              {/* Position details at the bottom */}
              <div className="mt-auto">
                <h4 className="text-lg font-semibold text-white mb-4">Your Position</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">LP Tokens</span>
                    <span className="text-sm font-mono text-white">{lpBalanceFormatted.toFixed(4)}</span>
                  </div>
                  
                  {lpBalanceFormatted > 0 ? (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-400">Underlying {tokenA.symbol}</span>
                        <span className="text-sm font-mono text-white">
                          {(reserve0Formatted * (lpBalanceFormatted / totalSupplyFormatted)).toFixed(4)}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-400">Underlying {tokenB.symbol}</span>
                        <span className="text-sm font-mono text-white">
                          {(reserve1Formatted * (lpBalanceFormatted / totalSupplyFormatted)).toFixed(4)}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-3 bg-gray-800/30 rounded-lg">
                      <p className="text-sm text-gray-400">No liquidity provided yet</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col h-full justify-center">
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-full bg-gray-700 mx-auto mb-3 flex items-center justify-center">
                  <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <p className="text-gray-400 text-sm">Connect wallet to view your position</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};