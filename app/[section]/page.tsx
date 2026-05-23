'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import SummaryCard from '@/components/SummaryCard';
import LoadingSpinner from '@/components/LoadingSpinner';

interface Highlight {
  title: string;
  description: string;
  impact?: string;
  technologies?: string[];
  metrics?: string;
}

interface SectionData {
  summary: string;
  highlights: Highlight[];
}

function formatLabel(name: string): string {
  return name
    .split(/[-_\s]+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export default function SectionPage() {
  const params = useParams();
  const section = params.section as string;
  const label = formatLabel(section);

  const [data, setData] = useState<SectionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ section }),
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(err.error || `Failed to fetch ${label.toLowerCase()} data`);
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
  }, [section, label]);

  if (isLoading) {
    return <LoadingSpinner message={`Analyzing ${label.toLowerCase()} experience...`} />;
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="card max-w-md mx-auto">
          <h2 className="text-xl font-semibold text-red-600 mb-2">{label}</h2>
          <p className="text-slate-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="section-title">{label}</h1>
        <p className="section-subtitle">
          {data?.summary || `${label} highlights and accomplishments.`}
        </p>
      </header>

      <div className="grid gap-6">
        {data?.highlights?.map((highlight, index) => (
          <SummaryCard
            key={index}
            title={highlight.title}
            description={highlight.description}
            technologies={highlight.technologies}
            impact={highlight.impact}
            metrics={highlight.metrics}
          />
        ))}
      </div>

      {(!data?.highlights || data.highlights.length === 0) && (
        <div className="card text-center py-12">
          <p className="text-slate-500">No {label.toLowerCase()} highlights available.</p>
        </div>
      )}
    </div>
  );
}
