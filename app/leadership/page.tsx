'use client';

import { useEffect, useState } from 'react';
import SummaryCard from '@/components/SummaryCard';
import LoadingSpinner from '@/components/LoadingSpinner';

interface LeadershipHighlight {
  title: string;
  description: string;
  impact: string;
}

interface LeadershipData {
  summary: string;
  highlights: LeadershipHighlight[];
}

export default function LeadershipPage() {
  const [data, setData] = useState<LeadershipData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ section: 'leadership' }),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch leadership data');
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
    return <LoadingSpinner message="Analyzing leadership experience..." />;
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
        <h1 className="section-title">Leadership Experience</h1>
        <p className="section-subtitle">
          {data?.summary || 'Highlights of team management, strategic initiatives, and mentorship.'}
        </p>
      </header>

      <div className="grid gap-6">
        {data?.highlights && data.highlights.map((highlight, index) => (
          <SummaryCard
            key={index}
            title={highlight.title}
            description={highlight.description}
            impact={highlight.impact}
          />
        ))}
      </div>

      {(!data?.highlights || data.highlights.length === 0) && (
        <div className="card text-center py-12">
          <p className="text-slate-500">No leadership highlights available.</p>
        </div>
      )}
    </div>
  );
}
