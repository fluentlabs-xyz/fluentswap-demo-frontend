import React, { useEffect } from 'react';
import { Card } from './Card';

interface NotificationProps {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
  transactionHash?: string;
  timestamp: number;
  onRemove: (id: string) => void;
}

export const Notification: React.FC<NotificationProps> = ({
  id,
  type,
  title,
  message,
  transactionHash,
  timestamp,
  onRemove
}) => {
  // Auto-remove after 10 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove(id);
    }, 10000);

    return () => clearTimeout(timer);
  }, [id, onRemove]);

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return 'border-green-500/50 bg-green-900/20 text-green-300';
      case 'error':
        return 'border-red-500/50 bg-red-900/20 text-red-300';
      case 'info':
        return 'border-blue-500/50 bg-blue-900/20 text-blue-300';
      default:
        return 'border-gray-500/50 bg-gray-900/20 text-gray-300';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'info':
        return 'ℹ️';
      default:
        return '📢';
    }
  };

  const getBlockExplorerUrl = () => {
    if (!transactionHash) return null;
    // Fluent testnet block explorer
    return `https://testnet.fluentscan.xyz/tx/${transactionHash}`;
  };

  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return `${Math.floor(diff / 3600000)}h ago`;
  };

  return (
    <Card className={`mb-3 border ${getTypeStyles()} transition-all duration-300 hover:scale-[1.02]`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <span className="text-2xl">{getIcon()}</span>
          <div className="flex-1">
            <h4 className="font-semibold text-lg">{title}</h4>
            <p className="text-sm opacity-90 mt-1">{message}</p>
            {transactionHash && (
              <div className="mt-2">
                <a
                  href={getBlockExplorerUrl()!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs opacity-75 hover:opacity-100 underline break-all"
                >
                  View on Explorer: {transactionHash.slice(0, 6)}...{transactionHash.slice(-4)}
                </a>
              </div>
            )}
            <p className="text-xs opacity-60 mt-2">{formatTime(timestamp)}</p>
          </div>
        </div>
        <button
          onClick={() => onRemove(id)}
          className="text-opacity-60 hover:text-opacity-100 transition-opacity ml-2"
        >
          ✕
        </button>
      </div>
    </Card>
  );
};
