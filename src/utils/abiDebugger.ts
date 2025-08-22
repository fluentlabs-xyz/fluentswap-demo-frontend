// ABI Debugging Utility
// This file helps debug ABI loading issues

export interface ABIDebugInfo {
  contractName: string;
  basePath: string;
  fullPath: string;
  status: 'success' | 'failed' | 'pending';
  error?: string;
  responseStatus?: number;
  responseText?: string;
  abiLength?: number;
  timestamp: number;
}

export class ABIDebugger {
  private debugLog: ABIDebugInfo[] = [];
  
  // Test ABI loading for a specific contract
  async testABILoading(contractName: string): Promise<ABIDebugInfo> {
    const basePath = import.meta.env.BASE_URL || '/';
    const fullPath = `${basePath}out/${contractName}.sol/${contractName}.json`;
    
    const debugInfo: ABIDebugInfo = {
      contractName,
      basePath,
      fullPath,
      status: 'pending',
      timestamp: Date.now()
    };
    
    try {
      console.log(`🔍 Testing ABI loading for ${contractName}...`);
      console.log(`📍 Base path: ${basePath}`);
      console.log(`📍 Full path: ${fullPath}`);
      
      const response = await fetch(fullPath);
      debugInfo.responseStatus = response.status;
      debugInfo.responseText = response.statusText;
      
      if (!response.ok) {
        debugInfo.status = 'failed';
        debugInfo.error = `HTTP ${response.status}: ${response.statusText}`;
        console.error(`❌ Failed to load ABI for ${contractName}:`, debugInfo.error);
        return debugInfo;
      }
      
      const artifact = await response.json();
      const abi = artifact.abi || [];
      
      if (!abi || abi.length === 0) {
        debugInfo.status = 'failed';
        debugInfo.error = 'ABI is empty or invalid';
        console.error(`❌ ABI for ${contractName} is empty or invalid`);
        return debugInfo;
      }
      
      debugInfo.status = 'success';
      debugInfo.abiLength = abi.length;
      console.log(`✅ Successfully loaded ABI for ${contractName} with ${abi.length} functions`);
      
    } catch (error) {
      debugInfo.status = 'failed';
      debugInfo.error = error instanceof Error ? error.message : String(error);
      console.error(`❌ Error loading ABI for ${contractName}:`, error);
    }
    
    this.debugLog.push(debugInfo);
    return debugInfo;
  }
  
  // Test all contract ABIs
  async testAllABIs(): Promise<ABIDebugInfo[]> {
    const contractNames = ['ERC20', 'BasicAMM', 'EnhancedAMM'];
    console.log('🚀 Starting ABI loading tests for all contracts...');
    
    const results = await Promise.all(
      contractNames.map(name => this.testABILoading(name))
    );
    
    this.logSummary(results);
    return results;
  }
  
  // Log a summary of all ABI loading attempts
  private logSummary(results: ABIDebugInfo[]): void {
    console.log('\n📊 ABI Loading Test Summary:');
    console.log('=============================');
    
    const successCount = results.filter(r => r.status === 'success').length;
    const failedCount = results.filter(r => r.status === 'failed').length;
    
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${failedCount}`);
    console.log(`📁 Total: ${results.length}`);
    
    if (failedCount > 0) {
      console.log('\n🔍 Failed ABIs:');
      results
        .filter(r => r.status === 'failed')
        .forEach(r => {
          console.log(`  • ${r.contractName}: ${r.error}`);
          console.log(`    Path: ${r.fullPath}`);
          if (r.responseStatus) {
            console.log(`    HTTP Status: ${r.responseStatus}`);
          }
        });
    }
    
    console.log('\n📋 Environment Info:');
    console.log(`  • Base URL: ${import.meta.env.BASE_URL || '/'}`);
    console.log(`  • Mode: ${import.meta.env.MODE}`);
    console.log(`  • Dev: ${import.meta.env.DEV}`);
    console.log(`  • Prod: ${import.meta.env.PROD}`);
  }
  
  // Get the debug log
  getDebugLog(): ABIDebugInfo[] {
    return [...this.debugLog];
  }
  
  // Clear the debug log
  clearDebugLog(): void {
    this.debugLog = [];
  }
  
  // Export debug info for external analysis
  exportDebugInfo(): string {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      environment: {
        baseUrl: import.meta.env.BASE_URL || '/',
        mode: import.meta.env.MODE,
        dev: import.meta.env.DEV,
        prod: import.meta.env.PROD,
        userAgent: navigator.userAgent,
        url: window.location.href
      },
      abiTests: this.debugLog
    }, null, 2);
  }
}

// Create singleton instance
export const abiDebugger = new ABIDebugger();

// Auto-run tests in development mode
if (import.meta.env.DEV) {
  console.log('🔧 Development mode detected. ABI debugger is available.');
  console.log('💡 Use abiDebugger.testAllABIs() to test ABI loading.');
  
  // Make debugger available globally for easy access
  if (typeof window !== 'undefined') {
    (window as any).abiDebugger = abiDebugger;
    console.log('🌐 ABI debugger available globally as window.abiDebugger');
  }
  
  // Auto-test after a short delay
  setTimeout(() => {
    abiDebugger.testAllABIs();
  }, 1000);
}
