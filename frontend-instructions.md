# Fluentswap Frontend Project Brief

## Project Overview
**Fluentswap** is a decentralized exchange (DEX) frontend that provides a modern, responsive interface for interacting with two AMM implementations: BasicAMM (standard Solidity) and EnhancedAMM (Rust-powered mathematical engine). The frontend enables users to swap tokens, add liquidity, and remove liquidity with a seamless wallet connection experience.

## Core Features

### 1. AMM Interface
- **Pool Selection**: Toggle between BasicAMM and EnhancedAMM implementations
- **Token Swapping**: Execute token swaps with real-time price calculations
- **Liquidity Management**: Add and remove liquidity from pools
- **Pool Information**: Display current reserves, fees, and LP token balances

### 2. Wallet Integration
- **Industry Standard SDK**: Integrate with popular wallet providers (MetaMask, WalletConnect, etc.)
- **Multi-Chain Support**: Support for Fluent testnet (chainId: 20994) and mainnet
- **Transaction Management**: Handle transaction signing, confirmation, and error states

### 3. User Experience
- **Responsive Design**: Mobile-first approach with desktop optimization
- **Real-time Updates**: Live pool data and transaction status
- **Error Handling**: User-friendly error messages and transaction feedback
- **Loading States**: Smooth transitions and loading indicators

## Technical Architecture

### Frontend Stack
- **Framework**: React.js with TypeScript
- **State Management**: Redux Toolkit or Zustand
- **Styling**: Tailwind CSS with custom gradient components
- **Web3 Integration**: ethers.js v6 or wagmi for blockchain interactions
- **Build Tool**: Vite for fast development and optimized builds

### Smart Contract Integration
- **BasicAMM**: Standard constant product AMM (x * y = k)
- **EnhancedAMM**: Rust-powered mathematical engine with dynamic fees
- **Token Contracts**: ERC20 tokens for liquidity pairs
- **Contract Addresses**: Load from deployment configuration

### Key Functions to Implement
```solidity
// BasicAMM Functions
- swap(uint256 amount0Out, uint256 amount1Out, address to)
- addLiquidity(uint256 amount0Desired, uint256 amount1Desired, uint256 amount0Min, uint256 amount1Min, address to)
- removeLiquidity(uint256 liquidity, uint256 amount0Min, uint256 amount1Min, address to)

// EnhancedAMM Functions  
- swapEnhanced(uint256 amount0Out, uint256 amount1Out, address to)
- addLiquidityEnhanced(uint256 amount0Desired, uint256 amount1Desired, uint256 amount0Min, uint256 amount1Min, address to)
- removeLiquidity(uint256 liquidity, uint256 amount0Min, uint256 amount1Min, address to)
```

## Design System

### Color Palette & Gradients
- **Primary Background**: Dark theme with gradient overlays
- **Component Outlines**: Gradient borders using brand-assets.png colors
- **CTA Buttons**: Filled backgrounds with brand gradients
- **Button Variations**:
  - **SWAP**: Primary gradient (when wallet connected)
  - **ADD LIQUIDITY**: Secondary gradient (when wallet connected)
  - **REMOVE LIQUIDITY**: Tertiary gradient (when wallet connected)
  - **CONNECT WALLET**: Main CTA gradient (when wallet not connected)

### Component Design
- **Cards**: Rounded corners with gradient borders
- **Input Fields**: Dark backgrounds with gradient focus states
- **Buttons**: Gradient fills with hover effects
- **Modals**: Dark overlays with gradient accents
- **Navigation**: Clean, minimal with gradient highlights

### Responsive Breakpoints
- **Mobile**: 320px - 768px
- **Tablet**: 768px - 1024px
- **Desktop**: 1024px+

## User Flow

### 1. Wallet Connection
- Landing page with "Connect Wallet" CTA
- Wallet selection modal
- Connection confirmation
- Display wallet address and balance

### 2. AMM Selection
- Toggle between BasicAMM and EnhancedAMM
- Display pool statistics for selected AMM
- Show current reserves and fees

### 3. Token Operations

- **Swap Flow**:
  - Select input/output tokens
  - Enter amount with real-time price impact
  - Review transaction details
  - Execute swap
- **Add Liquidity Flow**:
  - Enter token amounts
  - Review pool share calculation
  - Approve tokens and add liquidity
- **Remove Liquidity Flow**:
  - Select LP token amount
  - Preview token returns
  - Remove liquidity

The functionality can be assessed from the /js-client folder, assume `bootstrap.js` has already been run, and rely on `config.js`, `test-basic-amm.js`, `test-enhanced-amm.js` for inspiration for backend integration.

## Technical Requirements

### Performance
- **Bundle Size**: < 500KB gzipped
- **Load Time**: < 3 seconds on 3G
- **Transaction Speed**: < 30 seconds confirmation
- **Real-time Updates**: < 2 second refresh intervals

### Security
- **Input Validation**: Client-side validation for all user inputs
- **Transaction Safety**: Confirmation modals for all transactions
- **Error Boundaries**: Graceful error handling and user feedback
- **Wallet Security**: Secure wallet connection and transaction signing

### Accessibility
- **WCAG 2.1 AA Compliance**: Color contrast, keyboard navigation
- **Screen Reader Support**: Proper ARIA labels and semantic HTML
- **Mobile Optimization**: Touch-friendly interface elements
- **Internationalization**: Support for multiple languages (future)

## Integration Points

### Backend APIs
- **RPC Endpoint**: https://rpc.testnet.fluent.xyz/
- **Chain ID**: 20994 (Fluent testnet)
- **Contract Addresses**: Load from deployments/testnet.json
- **Gas Estimation**: Real-time gas cost calculations

### External Services
- **Price Feeds**: Integration with DEX aggregators for price data
- **Transaction History**: Block explorer integration
- **Token Metadata**: Token list and icon services

## Development Phases

### Phase 1: Core Infrastructure
- Project setup and configuration
- Wallet connection implementation
- Basic UI components and styling
- Smart contract integration setup

### Phase 2: Core Features
- Token swapping functionality
- Liquidity management (add/remove)
- AMM switching mechanism
- Real-time data updates

### Phase 3: Enhancement & Polish
- Advanced UI components
- Error handling and validation
- Performance optimization
- Mobile responsiveness

## Success Metrics

### User Experience
- **Transaction Success Rate**: > 95%
- **User Onboarding**: < 2 minutes to first swap
- **Mobile Usability**: > 90% mobile satisfaction score
- **Error Resolution**: < 5% user support requests

### Technical Performance
- **Uptime**: > 99.9%
- **Transaction Speed**: < 30 seconds average
- **Gas Optimization**: < 10% gas cost variance
- **Cross-browser Compatibility**: 100% modern browser support

## Conclusion

The Fluentswap frontend represents a modern, user-friendly interface for decentralized trading that leverages the mathematical precision of Rust-powered smart contracts while maintaining the simplicity and reliability of traditional AMM implementations. The focus on responsive design, wallet integration, and gradient-based visual identity creates a distinctive user experience that aligns with the project's technical innovation and aesthetic vision.
