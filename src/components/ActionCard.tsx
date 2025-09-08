import { ReactNode } from 'react';
import Card from './Card';

interface ActionCardProps {
  title: string;
  description: string;
  icon: ReactNode;
  onClick?: () => void;
  href?: string;
  className?: string;
}

export default function ActionCard({ title, description, icon, onClick, href, className = '' }: ActionCardProps) {
  const content = (
    <div className="flex items-center group">
      <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mr-4 group-hover:bg-primary-200 transition-colors">
        {icon}
      </div>
      <div>
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <p className="text-gray-600">{description}</p>
      </div>
    </div>
  );

  if (href) {
    return (
      <a href={href} className="block">
        <Card hover className={`cursor-pointer ${className}`}>
          {content}
        </Card>
      </a>
    );
  }

  return (
    <Card 
      hover 
      className={`cursor-pointer ${onClick ? 'hover:shadow-lg' : ''} ${className}`}
      onClick={onClick}
    >
      {content}
    </Card>
  );
}
