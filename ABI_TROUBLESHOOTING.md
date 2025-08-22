# ABI Loading Troubleshooting Guide

## Problem
When deploying your FluentSwap frontend, the deployed version cannot find the contract ABIs in `out/contract.sol/contract.json`.

## Root Cause
The issue is typically caused by:
1. **Path mismatch**: The code is looking for ABIs at `/out/` but your Vite base path is `/fluentswap-demo-frontend/`
2. **Build artifacts not copied**: The ABIs in `public/out/` are not being properly copied to the `dist/` folder
3. **Network/CORS issues**: The deployed site cannot access the ABI files

## Solutions Implemented

### 1. Fixed Base Path Handling
Updated `src/services/contracts.ts` to use `import.meta.env.BASE_URL` instead of hardcoded `/out/` paths:

```typescript
const basePath = import.meta.env.BASE_URL || '/';
const fullPath = `${basePath}out/${contractName}.sol/${contractName}.json`;
```

### 2. Added Fallback ABIs
Implemented fallback ABIs in case dynamic loading fails:

```typescript
const FALLBACK_ABIS = {
  ERC20: [/* basic ERC20 functions */],
  BasicAMM: [/* basic AMM functions */],
  EnhancedAMM: [/* enhanced AMM functions */]
};
```

### 3. Enhanced Error Handling
Added comprehensive error logging and fallback mechanisms:

```typescript
// Try to use fallback ABI if available
if (FALLBACK_ABIS[contractName as keyof typeof FALLBACK_ABIS]) {
  console.warn(`Using fallback ABI for ${contractName} due to loading failure`);
  return FALLBACK_ABIS[contractName as keyof typeof FALLBACK_ABIS];
}
```

### 4. Improved Vite Configuration
Updated `vite.config.ts` to ensure proper asset handling:

```typescript
export default defineConfig({
  plugins: [react()],
  base: '/fluentswap-demo-frontend/',
  build: {
    assetsDir: 'assets',
    copyPublicDir: true,
  },
  assetsInclude: ['**/*.json'],
})
```

### 5. Added ABI Debugger
Created `src/utils/abiDebugger.ts` for troubleshooting:

```typescript
// In browser console:
abiDebugger.testAllABIs()
```

## Verification Steps

### 1. Check Local Build
```bash
npm run build
npm run preview
```

### 2. Verify ABI Files in Dist
Ensure these files exist in `dist/out/`:
- `dist/out/ERC20.sol/ERC20.json`
- `dist/out/BasicAMM.sol/BasicAMM.json`
- `dist/out/EnhancedAMM.sol/EnhancedAMM.json`

### 3. Test ABI Loading
Open browser console and run:
```typescript
abiDebugger.testAllABIs()
```

### 4. Check Network Tab
In browser DevTools → Network tab, look for:
- `GET /fluentswap-demo-frontend/out/ERC20.sol/ERC20.json`
- `GET /fluentswap-demo-frontend/out/BasicAMM.sol/BasicAMM.json`
- `GET /fluentswap-demo-frontend/out/EnhancedAMM.sol/EnhancedAMM.json`

## Common Issues and Fixes

### Issue: 404 Errors for ABI Files
**Cause**: Path mismatch or files not copied
**Fix**: Ensure Vite base path is correct and `copyPublicDir: true`

### Issue: CORS Errors
**Cause**: Server configuration blocking JSON files
**Fix**: Ensure server allows access to JSON files in public directories

### Issue: Empty ABIs
**Cause**: ABI files corrupted or incomplete
**Fix**: Rebuild contracts and regenerate ABI files

### Issue: Base Path Not Applied
**Cause**: Environment variable not set correctly
**Fix**: Check `import.meta.env.BASE_URL` value in browser console

## Deployment Checklist

- [ ] Run `npm run build` locally
- [ ] Verify ABIs exist in `dist/out/`
- [ ] Test locally with `npm run preview`
- [ ] Check browser console for ABI loading errors
- [ ] Deploy to production
- [ ] Test deployed version
- [ ] Check browser console for errors
- [ ] Verify network requests for ABI files

## Debug Commands

```bash
# Build and check locally
npm run build:check

# Debug ABI loading
npm run debug:abi

# Deploy to production
npm run deploy
```

## Browser Console Debugging

```typescript
// Test all ABIs
abiDebugger.testAllABIs()

// Check environment
console.log('Base URL:', import.meta.env.BASE_URL)
console.log('Mode:', import.meta.env.MODE)

// Test specific ABI
abiDebugger.testABILoading('ERC20')

// Export debug info
console.log(abiDebugger.exportDebugInfo())
```

## Still Having Issues?

1. **Check the browser console** for detailed error messages
2. **Verify file paths** in the Network tab
3. **Test with fallback ABIs** to see if the issue is with loading or the ABIs themselves
4. **Check server logs** for any server-side errors
5. **Verify deployment** - ensure all files were uploaded correctly

## Support

If you continue to experience issues:
1. Run the ABI debugger and share the output
2. Check browser console for error messages
3. Verify the deployed file structure matches your local build
4. Ensure your hosting provider supports the required file types and paths
