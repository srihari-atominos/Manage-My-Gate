import React from 'react';

interface ActionIconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  color?: 'primary' | 'danger' | 'success' | 'secondary' | 'warning' | 'info';
  title: string;
  disabled?: boolean;
}

const ActionIconButton: React.FC<ActionIconButtonProps> = ({
  icon,
  color = 'primary',
  onClick,
  title,
  disabled = false,
  ...rest
}) => {
  // Map standard CoreUI/Bootstrap color names to Tailwind Admin equivalents
  const colorClasses = {
    primary: 'text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20',
    danger: 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20',
    success: 'text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20',
    secondary: 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800/50',
    warning: 'text-yellow-600 hover:bg-yellow-50 dark:text-yellow-400 dark:hover:bg-yellow-900/20',
    info: 'text-cyan-600 hover:bg-cyan-50 dark:text-cyan-400 dark:hover:bg-cyan-900/20',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      disabled={disabled}
      className={`inline-flex items-center justify-center rounded p-1.5 transition-colors duration-200 focus:outline-none disabled:opacity-50 disabled:pointer-events-none ${colorClasses[color]}`}
      {...rest}
    >
      {icon}
    </button>
  );
};

export default ActionIconButton;
