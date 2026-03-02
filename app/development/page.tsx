'use client';

import { useEffect, useState } from 'react';
import SummaryCard from '@/components/SummaryCard';
import LoadingSpinner from '@/components/LoadingSpinner';

interface DevelopmentHighlight {
  title: string;
  description: string;
  technologies: string[];
  metrics: string;
}

interface DevelopmentData {
  summary: string;
  highlights: DevelopmentHighlight[];
}

export default function DevelopmentPage() {
  const [data, setData] = useState<DevelopmentData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ section: 'development' }),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch development data');
        }

        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  if (isLoading) {
    return <LoadingSpinner message="Analyzing development accomplishments..." />;
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="card max-w-md mx-auto">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Error</h2>
          <p className="text-slate-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="section-title">Development Accomplishments</h1>
        <p className="section-subtitle">
          {data?.summary || 'Key technical achievements and project highlights.'}
        </p>
      </header>

      <div className="grid gap-6">
        {data?.highlights && data.highlights.map((highlight, index) => (
          <SummaryCard
            key={index}
            title={highlight.title}
            description={highlight.description}
            technologies={highlight.technologies}
            metrics={highlight.metrics}
          />
        ))}
      </div>

      {(!data?.highlights || data.highlights.length === 0) && (
        <div className="card text-center py-12">
          <p className="text-slate-500">No development highlights available.</p>
        </div>
      )}
    </div>
  );
}
