import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md',
  fullWidth = false,
  className = '',
  ...props 
}) => {
  // Base: Solid, pill or rounded, Antigravity feel
  const baseStyles = "font-medium rounded-full transition-all duration-200 active:scale-95 flex items-center justify-center gap-2 relative overflow-hidden";
  
  const sizes = {
    sm: "py-2 px-4 text-xs",
    md: "py-3 px-6 text-sm",
    lg: "py-4 px-8 text-base tracking-wide"
  };

  const variants = {
    primary: "bg-gravity-blue text-white hover:bg-blue-600 shadow-md hover:shadow-lg border-transparent",
    secondary: "bg-gravity-surface-light dark:bg-gravity-surface-dark text-gravity-blue border border-gravity-border-light dark:border-gravity-border-dark hover:bg-gray-100 dark:hover:bg-gray-800",
    danger: "bg-gravity-danger/10 text-gravity-danger border border-gravity-danger/20 hover:bg-gravity-danger/20",
    outline: "bg-transparent border border-gravity-text-sub-light dark:border-gravity-text-sub-dark text-gravity-text-main-light dark:text-gravity-text-main-dark hover:border-gravity-blue hover:text-gravity-blue",
    ghost: "bg-transparent text-gravity-text-sub-light dark:text-gravity-text-sub-dark hover:bg-gravity-surface-light dark:hover:bg-gravity-surface-dark"
  };

  const widthClass = fullWidth ? "w-full" : "";

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${widthClass} ${className} disabled:opacity-50 disabled:cursor-not-allowed`}
      {...props}
    >
      {children}
    </button>
  );
};
