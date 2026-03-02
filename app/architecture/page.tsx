'use client';

import { useEffect, useState } from 'react';
import SummaryCard from '@/components/SummaryCard';
import LoadingSpinner from '@/components/LoadingSpinner';

interface ArchitectureHighlight {
  title: string;
  description: string;
  technologies: string[];
  impact: string;
}

interface ArchitectureData {
  summary: string;
  highlights: ArchitectureHighlight[];
}

export default function ArchitecturePage() {
  const [data, setData] = useState<ArchitectureData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ section: 'architecture' }),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch architecture data');
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
    return <LoadingSpinner message="Analyzing architecture and design work..." />;
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
        <h1 className="section-title">Architecture & Design</h1>
        <p className="section-subtitle">
          {data?.summary || 'System design, technical architecture, and scalability solutions.'}
        </p>
      </header>

      <div className="grid gap-6">
        {data?.highlights && data.highlights.map((highlight, index) => (
          <SummaryCard
            key={index}
            title={highlight.title}
            description={highlight.description}
            technologies={highlight.technologies}
            impact={highlight.impact}
          />
        ))}
      </div>

      {(!data?.highlights || data.highlights.length === 0) && (
        <div className="card text-center py-12">
          <p className="text-slate-500">No architecture highlights available.</p>
        </div>
      )}
    </div>
  );
}
