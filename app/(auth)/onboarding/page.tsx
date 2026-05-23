'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface IndustryGrouping {
  id: string;
  label: string;
  description: string;
}

const INDUSTRIES: IndustryGrouping[] = [
  { id: 'stem-it', label: 'STEM & IT', description: 'Software, engineering, cybersecurity, data science' },
  { id: 'business-finance-admin', label: 'Business, Finance & Admin', description: 'Banking, marketing, management, HR' },
  { id: 'healthcare-human-services', label: 'Healthcare & Human Services', description: 'Medical care, therapy, social work, education' },
  { id: 'arts-communications', label: 'Arts & Communications', description: 'Design, writing, media, entertainment' },
  { id: 'trades-logistics', label: 'Trades & Logistics', description: 'Manufacturing, construction, agriculture, transportation' },
];

export default function OnboardingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-500">Loading...</div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Step indicator */}
        <div className="flex justify-center gap-2 mb-8">
          <div className={`w-3 h-3 rounded-full ${step === 1 ? 'bg-umber-700' : 'bg-umber-200'}`} />
          <div className={`w-3 h-3 rounded-full ${step === 2 ? 'bg-umber-700' : 'bg-umber-200'}`} />
          <div className={`w-3 h-3 rounded-full ${step === 3 ? 'bg-umber-700' : 'bg-umber-200'}`} />
        </div>

        {step === 1 && (
          <div className="text-center">
            <div className="mb-8">
              <div className="w-20 h-20 bg-umber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-umber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-umber-900 mb-2">
                Welcome, {session.user?.name || 'there'}!
              </h1>
              <p className="text-slate-600">
                Let&apos;s set up your portfolio. First, tell us your industry.
              </p>
            </div>

            <div className="space-y-3 mb-8">
              {INDUSTRIES.map((industry) => (
                <button
                  key={industry.id}
                  onClick={() => setSelectedIndustry(industry.id)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                    selectedIndustry === industry.id
                      ? 'border-umber-700 bg-umber-50'
                      : 'border-slate-200 hover:border-umber-300'
                  }`}
                >
                  <h3 className="font-semibold text-slate-800">{industry.label}</h3>
                  <p className="text-sm text-slate-500">{industry.description}</p>
                </button>
              ))}
            </div>

            <button
              onClick={() => setStep(2)}
              disabled={!selectedIndustry}
              className="btn-primary inline-flex items-center gap-2 disabled:opacity-50"
            >
              Next step
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="text-center">
            <div className="mb-8">
              <div className="w-20 h-20 bg-umber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-umber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-umber-900 mb-2">
                Your portfolio sections
              </h1>
              <p className="text-slate-600">
                Based on your industry, we&apos;ll create sections to showcase your experience.
                You can customize these later.
              </p>
            </div>

            <div className="card p-8 text-left space-y-4 mb-8">
              <h2 className="text-lg font-semibold text-umber-800">Getting started</h2>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 bg-umber-100 text-umber-700 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 mt-0.5">1</span>
                  <div>
                    <p className="font-medium text-slate-800">Upload your resume</p>
                    <p className="text-sm text-slate-500">Upload your resume in PDF or DOCX format</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 bg-umber-100 text-umber-700 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 mt-0.5">2</span>
                  <div>
                    <p className="font-medium text-slate-800">Configure categories</p>
                    <p className="text-sm text-slate-500">Up to 8 sections tailored to your career</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 bg-umber-100 text-umber-700 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 mt-0.5">3</span>
                  <div>
                    <p className="font-medium text-slate-800">AI-powered analysis</p>
                    <p className="text-sm text-slate-500">Each section gets AI-generated insights</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setStep(1)}
                className="btn-secondary"
              >
                Back
              </button>
              <Link
                href="/dashboard"
                className="btn-primary inline-flex items-center gap-2"
              >
                Go to dashboard
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
