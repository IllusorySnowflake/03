import React from 'react';

type Color = 'blue' | 'green' | 'red' | 'yellow' | 'gray' | 'orange' | 'purple' | 'emerald';

const colorMap: Record<Color, string> = {
  blue: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  green: 'bg-green-50 text-green-700 ring-1 ring-green-200',
  emerald: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  red: 'bg-red-50 text-red-700 ring-1 ring-red-200',
  yellow: 'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200',
  gray: 'bg-gray-100 text-gray-600 ring-1 ring-gray-200',
  orange: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200',
  purple: 'bg-purple-50 text-purple-700 ring-1 ring-purple-200',
};

interface BadgeProps {
  color?: Color;
  children: React.ReactNode;
  className?: string;
}

export default function Badge({ color = 'gray', children, className = '' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colorMap[color]} ${className}`}>
      {children}
    </span>
  );
}
