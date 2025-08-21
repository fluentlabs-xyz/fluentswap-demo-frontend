import React from 'react';
import { clsx } from 'clsx';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const Toggle: React.FC<ToggleProps> = ({
  checked,
  onChange,
  label,
  description,
  size = 'md'
}) => {
  const sizes = {
    sm: {
      switch: 'w-8 h-5',
      thumb: 'w-3 h-3',
      translate: checked ? 'translate-x-3' : 'translate-x-0.5'
    },
    md: {
      switch: 'w-11 h-6',
      thumb: 'w-4 h-4',
      translate: checked ? 'translate-x-6' : 'translate-x-1'
    },
    lg: {
      switch: 'w-14 h-8',
      thumb: 'w-6 h-6',
      translate: checked ? 'translate-x-7' : 'translate-x-1'
    }
  };
  
  const currentSize = sizes[size];
  
  return (
    <div className="flex items-center justify-between">
      <div className="flex-1">
        {label && (
          <label className="block text-sm font-medium text-white">
            {label}
          </label>
        )}
        {description && (
          <p className="text-sm text-gray-400 mt-1">{description}</p>
        )}
      </div>
      
      <button
        type="button"
        className={clsx(
          'relative inline-flex items-center flex-shrink-0 cursor-pointer transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-gradient-start/50 focus:ring-offset-2 focus:ring-offset-gray-900 rounded-full',
          currentSize.switch,
          checked ? 'bg-brand-gradient' : 'bg-gray-600'
        )}
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
      >
        <span
          className={clsx(
            'inline-block bg-white rounded-full shadow-lg transform transition-transform duration-200 ease-in-out',
            currentSize.thumb,
            currentSize.translate
          )}
        />
      </button>
    </div>
  );
};