# Data Management System

## Overview

The frontend now uses a centralized data management system to efficiently handle blockchain data fetching, caching, and synchronization across components. This system prevents redundant API calls, ensures data consistency, and automatically refreshes data after transactions.

## Key Features

### 1. Request Deduplication
- Prevents multiple simultaneous requests for the same data
- Uses a promise-based caching system to share results
- Configurable TTL (Time To Live) for different data types

### 2. Smart Caching
- **Pool Data**: 15 seconds TTL (frequently changing)
- **Token Data**: 1 minute TTL (less frequently changing)
- **General Requests**: 30 seconds TTL (default)

### 3. Automatic Refresh
- Pool data refreshes automatically after liquidity operations
- Token balances update after swaps
- Transaction status changes trigger appropriate data updates

### 4. Request Queuing
- Prevents overlapping refresh operations
- Queues requests when system is busy
- Processes queued requests in order

## Architecture

```
Components → useDataRefresh Hook → Store → DataManager → Blockchain
    ↓              ↓                ↓         ↓
Read data    Trigger refresh   State updates  Request deduplication
```

## Usage

### For Components

```tsx
import { useDataRefresh } from '../../hooks/useDataRefresh';

export const MyComponent: React.FC = () => {
  const { refreshPools, refreshTokens, refreshAll } = useDataRefresh();
  
  const handleManualRefresh = async () => {
    await refreshPools(); // Refresh only pool data
    // or
    await refreshAll();   // Refresh all data
  };
  
  return (
    <button onClick={handleManualRefresh}>
      Refresh Data
    </button>
  );
};
```

### For Store Updates

The store automatically handles data refresh after transactions:

```tsx
// After adding liquidity
addTransaction({
  hash: tx.hash,
  type: 'add-liquidity',
  status: 'confirmed',
  // ... other fields
});

// Store automatically refreshes pool data after 1 second
```

## Data Flow

### 1. Initialization
- App loads → Store initializes → Fetches pool data
- Wallet connects → Fetches token balances and pool data

### 2. Transaction Flow
- User executes transaction → Transaction added to store
- Transaction confirmed → Store automatically refreshes relevant data
- Components re-render with updated data

### 3. Manual Refresh
- User clicks refresh button → Component calls refresh function
- DataManager deduplicates request → Fetches fresh data
- Store updates → Components re-render

## Benefits

1. **Reduced API Calls**: Eliminates redundant requests
2. **Better UX**: Data stays fresh and consistent
3. **Rate Limit Friendly**: Prevents overwhelming the RPC endpoint
4. **Automatic Updates**: No manual refresh needed after transactions
5. **Performance**: Faster response times through caching

## Configuration

TTL values can be adjusted in the `DataManager` class:

```tsx
private readonly DEFAULT_TTL = 30000;    // 30 seconds
private readonly POOL_TTL = 15000;       // 15 seconds
private readonly TOKEN_TTL = 60000;      // 1 minute
```

## Troubleshooting

### Data Not Updating
- Check if transaction status is being updated correctly
- Verify that `addTransaction` is called with proper status
- Ensure wallet is connected when making requests

### Rate Limiting
- The system automatically deduplicates requests
- TTL values prevent excessive API calls
- Manual refresh buttons respect the same limits

### Performance Issues
- Monitor the browser console for error messages
- Check if multiple components are triggering refreshes simultaneously
- Verify that the DataManager is properly queuing requests
