# Dynamic Token Metadata System

This document explains how to use the new dynamic token metadata system that fetches token information directly from smart contracts instead of using hardcoded values.

## Overview

The system automatically fetches token metadata (name, symbol, decimals, total supply) from ERC20 smart contracts on the blockchain. It includes caching, error handling, and fallback mechanisms for a robust user experience.

## Key Components

### 1. TokenMetadataService (`src/services/tokenMetadata.ts`)

The core service that handles:
- Fetching token metadata from blockchain
- Caching with configurable TTL (5 minutes default)
- Error handling and fallbacks
- Batch operations for multiple tokens

```typescript
import { tokenMetadataService } from '../services/tokenMetadata';

// Get metadata for a single token
const metadata = await tokenMetadataService.getTokenMetadata(tokenAddress);

// Get metadata for both known tokens
const { tokenA, tokenB } = await tokenMetadataService.getKnownTokens();

// Refresh cache for a specific token
await tokenMetadataService.refreshTokenMetadata(tokenAddress);
```

### 2. React Hooks (`src/hooks/useTokenMetadata.ts`)

Ready-to-use hooks for React components:

```typescript
import { useTokenMetadata, useSingleTokenMetadata } from '../hooks/useTokenMetadata';

// Hook for both tokens
function MyComponent() {
  const { tokenA, tokenB, isLoading, error, refresh } = useTokenMetadata();
  
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  
  return (
    <div>
      <h2>{tokenA?.name} ({tokenA?.symbol})</h2>
      <h2>{tokenB?.name} ({tokenB?.symbol})</h2>
      <button onClick={refresh}>Refresh</button>
    </div>
  );
}

// Hook for a single token
function SingleTokenComponent({ address }: { address: string }) {
  const { metadata, isLoading, error } = useSingleTokenMetadata(address);
  
  // ... component logic
}
```

### 3. UI Components (`src/components/ui/TokenDisplay.tsx`)

Pre-built components for displaying token information:

```typescript
import { TokenDisplay, TokenPairDisplay } from '../components/ui';

// Display a single token
<TokenDisplay 
  address={tokenAddress}
  showLogo={true}
  showDecimals={true}
  showTotalSupply={true}
/>

// Display a token pair
<TokenPairDisplay 
  tokenAAddress={tokenA.address}
  tokenBAddress={tokenB.address}
/>
```

## Usage Examples

### Basic Usage

```typescript
import { useTokenMetadata } from '../hooks/useTokenMetadata';

function TokenInfo() {
  const { tokenA, tokenB, isLoading } = useTokenMetadata();
  
  if (isLoading) return <div>Loading tokens...</div>;
  
  return (
    <div>
      <h3>Token A: {tokenA?.name} ({tokenA?.symbol})</h3>
      <p>Decimals: {tokenA?.decimals}</p>
      <p>Total Supply: {tokenA?.totalSupply?.toString()}</p>
      
      <h3>Token B: {tokenB?.name} ({tokenB?.symbol})</h3>
      <p>Decimals: {tokenB?.decimals}</p>
      <p>Total Supply: {tokenB?.totalSupply?.toString()}</p>
    </div>
  );
}
```

### Advanced Usage with Custom Error Handling

```typescript
import { useSingleTokenMetadata } from '../hooks/useTokenMetadata';

function CustomTokenDisplay({ address }: { address: string }) {
  const { metadata, isLoading, error, refresh } = useSingleTokenMetadata(address);
  
  if (isLoading) {
    return <div className="animate-pulse">Loading token...</div>;
  }
  
  if (error) {
    return (
      <div className="text-red-500">
        <p>Failed to load token: {error}</p>
        <button onClick={refresh} className="btn btn-primary">
          Retry
        </button>
      </div>
    );
  }
  
  if (!metadata) {
    return <div>Token not found</div>;
  }
  
  return (
    <div className="token-card">
      <img src={metadata.logoURI} alt={`${metadata.symbol} logo`} />
      <h4>{metadata.name}</h4>
      <p>{metadata.symbol}</p>
      <p>Decimals: {metadata.decimals}</p>
      {metadata.totalSupply && (
        <p>Supply: {metadata.totalSupply.toString()}</p>
      )}
    </div>
  );
}
```

### Batch Operations

```typescript
import { useMultipleTokenMetadata } from '../hooks/useTokenMetadata';

function TokenList({ addresses }: { addresses: string[] }) {
  const { tokens, isLoading, error } = useMultipleTokenMetadata(addresses);
  
  if (isLoading) return <div>Loading multiple tokens...</div>;
  if (error) return <div>Error: {error}</div>;
  
  return (
    <div>
      {addresses.map(address => {
        const token = tokens[address];
        if (!token) return <div key={address}>Loading...</div>;
        
        return (
          <div key={address} className="token-item">
            <TokenDisplay address={address} />
          </div>
        );
      })}
    </div>
  );
}
```

## Configuration

### Cache TTL

The default cache TTL is 5 minutes. You can modify this in `TokenMetadataService`:

```typescript
private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
```

### Default Logo

Set a default logo path in the service:

```typescript
private readonly DEFAULT_LOGO_URI = '/img/default-token.svg';
```

### Token Logo Logic

Implement custom logo logic in the `getTokenLogoURI` method:

```typescript
private getTokenLogoURI(symbol: string): string {
  // Option 1: Use external API
  // return `https://api.coingecko.com/api/v3/coins/${symbol}/image`;
  
  // Option 2: Map to local assets
  const logoMap: { [key: string]: string } = {
    'USDC': '/img/usdc.svg',
    'WETH': '/img/weth.svg',
    // ... more mappings
  };
  
  return logoMap[symbol] || this.DEFAULT_LOGO_URI;
}
```

## Error Handling

The system includes comprehensive error handling:

1. **Network Errors**: Falls back to cached data if available
2. **Contract Errors**: Returns fallback metadata
3. **Loading States**: Shows appropriate loading indicators
4. **Retry Mechanisms**: Users can manually refresh data

## Performance Considerations

- **Caching**: Reduces blockchain calls
- **Batch Operations**: Fetches multiple tokens simultaneously
- **Lazy Loading**: Only fetches when needed
- **Preloading**: Known tokens are pre-populated in cache

## Migration from Hardcoded Values

### Before (Hardcoded)
```typescript
export const TOKENS = {
  tokenA: {
    address: CONFIG.addresses.tokenA,
    name: 'Token A',        // Hardcoded
    symbol: 'TOKA',         // Hardcoded
    decimals: 18,           // Hardcoded
    logoURI: '',            // Hardcoded
  }
};
```

### After (Dynamic)
```typescript
// In your component
const { tokenA } = useTokenMetadata();

// Or fetch directly
const metadata = await tokenMetadataService.getTokenMetadata(CONFIG.addresses.tokenA);
```

## Benefits

1. **Always Up-to-Date**: Token metadata reflects actual blockchain state
2. **Flexible**: Works with any ERC20 token address
3. **Robust**: Includes caching and error handling
4. **User-Friendly**: Loading states and error messages
5. **Maintainable**: No need to update hardcoded values

## Troubleshooting

### Common Issues

1. **Token not loading**: Check if the address is correct and the contract exists
2. **Cache not updating**: Use `refresh()` method or wait for TTL to expire
3. **Logo not showing**: Check the `logoURI` path and fallback to default logo

### Debug Mode

Enable debug logging in the service:

```typescript
// Add to TokenMetadataService methods
console.log('Fetching metadata for:', address);
console.log('Cache status:', this.isCacheValid(address));
```
