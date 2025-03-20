'use client';

import React from 'react';
import { cn } from '@/app/utils/helpers';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  children: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', children, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:opacity-50 disabled:pointer-events-none';
    
    const variants = {
      default: 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm',
      outline: 'border border-gray-300 bg-white hover:bg-gray-50 text-gray-800 shadow-sm',
      ghost: 'bg-transparent hover:bg-gray-100 text-gray-800',
      link: 'bg-transparent underline-offset-4 hover:underline text-blue-600 hover:text-blue-700',
    };
    
    const sizes = {
      default: 'h-10 py-2 px-4 text-sm',
      sm: 'h-8 px-3 text-xs font-medium',
      lg: 'h-12 px-6 text-base',
      icon: 'h-10 w-10',
    };
    
    return (
      <button
        className={cn(
          baseStyles,
          variants[variant],
          sizes[size],
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button }; 