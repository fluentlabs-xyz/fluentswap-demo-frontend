import React from 'react';
import { useSingleTokenMetadata, useMultipleTokenMetadata } from '../../hooks/useTokenMetadata';
import { formatUnits } from '../../services/contracts';
import { IMAGE_PATHS } from '../../utils/paths';

interface TokenDisplayProps {
  address: string;
  showLogo?: boolean;
  showDecimals?: boolean;
  showTotalSupply?: boolean;
  className?: string;
}

export const TokenDisplay: React.FC<TokenDisplayProps> = ({
  address,
  showLogo = true,
  showDecimals = true,
  showTotalSupply = false,
  className = ''
}) => {
  const { metadata, isLoading, error } = useSingleTokenMetadata(address);

  if (isLoading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="w-6 h-6 bg-gray-200 rounded-full animate-pulse"></div>
        <div className="h-4 bg-gray-200 rounded animate-pulse w-20"></div>
      </div>
    );
  }

  if (error || !metadata) {
    return (
      <div className={`flex items-center space-x-2 text-red-500 ${className}`}>
        <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
          <span className="text-xs">?</span>
        </div>
        <span className="text-sm">Unknown Token</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {showLogo && (
        <div className="w-6 h-6 rounded-full overflow-hidden">
          <img
            src={metadata.logoURI}
            alt={`${metadata.symbol} logo`}
            className="w-full h-full object-cover"
            onError={(e) => {
              // Fallback to default logo on error
              const target = e.target as HTMLImageElement;
              target.src = IMAGE_PATHS.DEFAULT_TOKEN();
            }}
          />
        </div>
      )}
      
      <div className="flex flex-col">
        <div className="flex items-center space-x-2">
          <span className="font-medium text-gray-900">{metadata.symbol}</span>
          {showDecimals && (
            <span className="text-xs text-gray-500">({metadata.decimals}dp)</span>
          )}
        </div>
        
        <span className="text-sm text-gray-600">{metadata.name}</span>
        
        {showTotalSupply && metadata.totalSupply && (
          <span className="text-xs text-gray-500">
            Supply: {formatUnits(metadata.totalSupply, metadata.decimals)}
          </span>
        )}
      </div>
    </div>
  );
};

// Component for displaying both tokens side by side
export const TokenPairDisplay: React.FC<{
  tokenAAddress: string;
  tokenBAddress: string;
  className?: string;
}> = ({ tokenAAddress, tokenBAddress, className = '' }) => {
  const { tokens, isLoading, error } = useMultipleTokenMetadata([tokenAAddress, tokenBAddress]);

  if (isLoading) {
    return (
      <div className={`flex items-center space-x-4 ${className}`}>
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 bg-gray-200 rounded-full animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded animate-pulse w-16"></div>
        </div>
        <span className="text-gray-400">/</span>
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 bg-gray-200 rounded-full animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded animate-pulse w-16"></div>
        </div>
      </div>
    );
  }

  if (error || !tokens[tokenAAddress] || !tokens[tokenBAddress]) {
    return (
      <div className={`text-red-500 ${className}`}>
        Failed to load token pair
      </div>
    );
  }

  // const tokenA = tokens[tokenAAddress]!;
  // const tokenB = tokens[tokenBAddress]!;

  return (
    <div className={`flex items-center space-x-4 ${className}`}>
      <TokenDisplay address={tokenAAddress} />
      <span className="text-gray-400">/</span>
      <TokenDisplay address={tokenBAddress} />
    </div>
  );
};
