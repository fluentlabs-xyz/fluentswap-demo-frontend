import React from 'react';
import { clsx } from 'clsx';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'gradient-border' | 'white-border';
  padding?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  variant = 'default',
  padding = 'md',
  className,
  children,
  ...props
}) => {
  const baseClasses = 'rounded-xl backdrop-blur-sm';
  
  const variants = {
    default: 'card-gradient',
    'gradient-border': 'gradient-border',
    'white-border': 'card-white-border'
  };
  
  const paddings = {
    sm: 'p-4',
    md: 'p-6', 
    lg: 'p-8'
  };
  
  return (
    <div
      className={clsx(
        baseClasses,
        variants[variant],
        paddings[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};