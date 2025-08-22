// Path utility functions for consistent asset loading
// This ensures all assets use the correct base path for deployment

/**
 * Get the base URL for the application
 * Uses Vite's BASE_URL environment variable or defaults to '/'
 */
export function getBaseUrl(): string {
  return import.meta.env.BASE_URL || '/';
}

/**
 * Resolve a path relative to the public directory
 * @param path - Path relative to public directory (e.g., 'img/logo.png')
 * @returns Full URL with base path (e.g., '/fluentswap-demo-frontend/img/logo.png')
 */
export function resolvePublicPath(path: string): string {
  const baseUrl = getBaseUrl();
  // Remove leading slash if present to avoid double slashes
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${baseUrl}${cleanPath}`;
}

/**
 * Resolve a path for contract ABIs
 * @param contractName - Name of the contract (e.g., 'ERC20')
 * @returns Full URL to the ABI file
 */
export function resolveABIPath(contractName: string): string {
  return resolvePublicPath(`out/${contractName}.sol/${contractName}.json`);
}

/**
 * Resolve a path for images
 * @param imagePath - Path to image relative to public/img (e.g., 'logo.png')
 * @returns Full URL to the image
 */
export function resolveImagePath(imagePath: string): string {
  return resolvePublicPath(`img/${imagePath}`);
}

/**
 * Resolve a path for any public asset
 * @param assetPath - Path to asset relative to public directory
 * @returns Full URL to the asset
 */
export function resolveAssetPath(assetPath: string): string {
  return resolvePublicPath(assetPath);
}

// Common image paths
export const IMAGE_PATHS = {
  FLUENT_LOGO: () => resolveImagePath('fluent.png'),
  BRAND_ASSETS: () => resolveImagePath('brand-assets.png'),
  DEFAULT_TOKEN: () => resolveImagePath('default-token.svg'),
  TOKEN_A: () => resolveImagePath('token-a.svg'),
  TOKEN_B: () => resolveImagePath('token-b.svg'),
} as const;

// Common ABI paths
export const ABI_PATHS = {
  ERC20: () => resolveABIPath('ERC20'),
  BasicAMM: () => resolveABIPath('BasicAMM'),
  EnhancedAMM: () => resolveABIPath('EnhancedAMM'),
} as const;
