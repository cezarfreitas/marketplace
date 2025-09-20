import { Card, CardContent } from '@/components/ui/card';

interface ImportHeaderProps {
  title: string;
  subtitle: string;
}

export const ImportHeader = ({ title, subtitle }: ImportHeaderProps) => {
  return (
    <Card className="mb-8 border border-gray-200 shadow-sm bg-white">
      <CardContent className="p-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-6">
          <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
          </svg>
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          {title}
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          {subtitle}
        </p>
      </CardContent>
    </Card>
  );
};
