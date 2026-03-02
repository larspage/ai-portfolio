'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import LoadingSpinner from '@/components/LoadingSpinner';

interface OverviewData {
  summary: string;
  highlights: string[];
}

interface ResumeMetadata {
  name: string;
  title: string;
  email: string;
  linkedin: string;
  location: string;
}

export default function HomePage() {
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [metadata, setMetadata] = useState<ResumeMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [overviewRes, metadataRes] = await Promise.all([
          fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ section: 'overview' }),
          }),
          fetch('/api/resume'),
        ]);

        if (!overviewRes.ok) {
          throw new Error('Failed to fetch overview');
        }

        const overviewData = await overviewRes.json();
        setOverview(overviewData);

        if (metadataRes.ok) {
          const metadataData = await metadataRes.json();
          setMetadata(metadataData.metadata);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  if (isLoading) {
    return <LoadingSpinner message="Generating professional summary..." />;
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="card max-w-md mx-auto">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Error</h2>
          <p className="text-slate-600">{error}</p>
          <p className="text-sm text-slate-500 mt-4">
            Make sure your OPENAI_API_KEY is configured in .env.local
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Hero Section */}
      <section className="text-center py-10 animate-fade-in">
        <h1 className="text-4xl md:text-5xl font-bold text-umber-900 mb-4">
          {metadata?.name || 'Professional Portfolio'}
        </h1>
        <p className="text-xl text-slate-600 mb-6">
          {metadata?.title || 'Software Engineer'}
        </p>
        {metadata && (
          <div className="flex flex-wrap justify-center gap-4 text-sm text-slate-500">
            <span>{metadata.location}</span>
            <span>•</span>
            <a href={`mailto:${metadata.email}`} className="hover:text-umber-600">
              {metadata.email}
            </a>
            <span>•</span>
            <a
              href={`https://${metadata.linkedin}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-umber-600"
            >
              LinkedIn
            </a>
          </div>
        )}
      </section>

      {/* AI-Generated Summary */}
      {overview && (
        <section className="card animate-slide-up">
          <h2 className="section-title">Professional Summary</h2>
          <p className="text-lg text-slate-700 leading-relaxed mb-6">
            {overview.summary}
          </p>

          {overview.highlights && overview.highlights.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-umber-800 mb-4">Key Highlights</h3>
              <div className="grid md:grid-cols-2 gap-4">
                {overview.highlights.map((highlight, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <svg
                      className="w-5 h-5 text-umber-600 flex-shrink-0 mt-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span className="text-slate-700">{highlight}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Quick Links */}
      <section className="animate-slide-up">
        <h2 className="section-title text-center">Explore My Experience</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <Link href="/leadership" className="card hover:shadow-lg transition-shadow group">
            <div className="text-center">
              <div className="w-16 h-16 bg-umber-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-umber-200 transition-colors">
                <svg className="w-8 h-8 text-umber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-umber-900 mb-2">Leadership</h3>
              <p className="text-slate-600">Team management, mentorship, and strategic initiatives</p>
            </div>
          </Link>

          <Link href="/architecture" className="card hover:shadow-lg transition-shadow group">
            <div className="text-center">
              <div className="w-16 h-16 bg-umber-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-umber-200 transition-colors">
                <svg className="w-8 h-8 text-umber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-umber-900 mb-2">Architecture</h3>
              <p className="text-slate-600">System design, scalability, and technical decisions</p>
            </div>
          </Link>

          <Link href="/development" className="card hover:shadow-lg transition-shadow group">
            <div className="text-center">
              <div className="w-16 h-16 bg-umber-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-umber-200 transition-colors">
                <svg className="w-8 h-8 text-umber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-umber-900 mb-2">Development</h3>
              <p className="text-slate-600">Technical achievements and project accomplishments</p>
            </div>
          </Link>
        </div>
      </section>

      {/* CTA for Recruiters */}
      <section className="card bg-gradient-to-r from-umber-800 to-umber-900 text-white text-center animate-slide-up shadow-2xl">
        <h2 className="text-2xl font-bold mb-4">Recruiters & Hiring Managers</h2>
        <p className="text-umber-100 mb-6 max-w-2xl mx-auto">
          Use our AI-powered job matching tool to see how my experience aligns with your specific role requirements.
        </p>
        <Link href="/match" className="inline-block bg-white text-umber-900 px-8 py-3 rounded-lg font-medium hover:bg-umber-50 hover:shadow-lg transform hover:scale-105 transition-all duration-200">
          Try Job Match Tool
        </Link>
      </section>
    </div>
  );
}
