import  { useEffect } from 'react';
import { Layout } from './components/layout';
import { SwapInterface } from './components/dex/SwapInterface';
import { LiquidityInterface } from './components/dex/LiquidityInterface';
import { PoolInfo } from './components/dex/PoolInfo';
import { Card, Button, Notification } from './components/ui';
import { useAppStore } from './store';
import { AMMType } from './config/contracts';
import { abiDebugger } from './utils/abiDebugger';
import { IMAGE_PATHS } from './utils/paths';

function App() {
  const { 
    wallet, 
    loading, 
    error, 
    notifications,
    selectedAMM,
    initialize,
    clearError,
    connectWallet,
    removeNotification
  } = useAppStore();
  
  // Initialize the app on mount
  useEffect(() => {
    initialize();
  }, [initialize]);
  
  // Show loading screen during initialization
  if (loading.isLoading && loading.message === 'Initializing app...') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Card className="text-center">
          <div className="animate-pulse">
            <div className="w-24 h-24 rounded-2xl bg-brand-mystic mx-auto mb-4 flex items-center justify-center overflow-hidden">
              <img 
                src={IMAGE_PATHS.FLUENT_LOGO()}
                alt="Fluent Logo" 
                className="w-full h-full object-cover"
              />
            </div>
            <h2 className="text-2xl font-bold text-gradient mb-2">Fluentswap</h2>
            <p className="text-gray-400">{loading.message}</p>
          </div>
        </Card>
      </div>
    );
  }
  
  return (
    <div className={`min-h-screen ${selectedAMM === AMMType.ENHANCED ? 'relative' : ''}`}>
      {/* Enhanced AMM Background Gradient */}
      {selectedAMM === AMMType.ENHANCED && (
        <div 
          className="fixed inset-0 pointer-events-none z-0"
          style={{
            background: 'radial-gradient(circle at 25% 75%, #4F11FA 0%, #FF7B69 50%, #000000 100%)',
            opacity: 0.2
          }}
        />
      )}
      
      <Layout>
        {/* Notifications */}
        {notifications.length > 0 && (
          <div className="fixed top-4 right-4 z-50 w-96 max-w-full">
            {notifications.map(notification => (
              <Notification
                key={notification.id}
                {...notification}
                onRemove={removeNotification}
              />
            ))}
          </div>
        )}
        
        {/* Error Display */}
        {error.hasError && (
          <Card className="mb-6 border-red-500/50 bg-red-900/20">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-red-400">Error</h3>
                <p className="text-red-300 mt-1">{error.message}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={clearError}>
                Dismiss
              </Button>
            </div>
          </Card>
        )}
        
        {/* Debug Tools - Only visible in development */}
        {import.meta.env.DEV && (
          <Card className="mb-6 border-blue-500/50 bg-blue-900/20">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-blue-400">Debug Tools</h3>
                <p className="text-blue-300 mt-1">Test ABI loading and debug issues</p>
              </div>
              <div className="space-x-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => abiDebugger.testAllABIs()}
                  className="text-blue-400 hover:text-blue-300"
                >
                  Test ABIs
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => console.log('Debug Info:', abiDebugger.exportDebugInfo())}
                  className="text-blue-400 hover:text-blue-300"
                >
                  Export Debug
                </Button>
              </div>
            </div>
          </Card>
        )}
        
        {/* Welcome Section - Only show when wallet not connected */}
        {!wallet.isConnected && (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <h1 className="text-6xl font-bold text-gradient mb-8">
              Fluentswap
            </h1>
            <Button 
              size="lg"
              className="text-xl py-6 px-12"
              onClick={async () => {
                try {
                  await connectWallet();
                } catch (error) {
                  console.error('Failed to connect wallet:', error);
                }
              }}
            >
              Connect Wallet
            </Button>
          </div>
        )}
        
        {/* Main DEX Interface - Show when wallet is connected */}
        {wallet.isConnected && (
          <div className="space-y-6">
            {/* Pool Info */}
            <PoolInfo />
            
            {/* Swap + Liquidity Management */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SwapInterface />
              <LiquidityInterface />
            </div>
          </div>
        )}
      </Layout>
    </div>
  );
}

export default App;