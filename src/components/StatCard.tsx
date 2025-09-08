import { ReactNode } from 'react';
import Card from './Card';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  className?: string;
}

export default function StatCard({ title, value, subtitle, icon, className = '' }: StatCardProps) {
  return (
    <Card hover className={className}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {subtitle && (
            <p className="text-sm text-gray-500">{subtitle}</p>
          )}
        </div>
        <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
          {icon}
        </div>
      </div>
    </Card>
  );
}
