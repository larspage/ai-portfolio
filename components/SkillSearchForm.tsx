'use client';

import { useState, useMemo } from 'react';
import SummaryCard from '@/components/SummaryCard';
import LoadingSpinner from '@/components/LoadingSpinner';

// Skills from resume Technical Skills section (client-safe)
const RESUME_SKILLS = [
  'C#.NET', '.NET Core', 'SQL', 'VB.NET', 'JavaScript', 'Oracle',
  'Agile', 'Scrum', 'Kanban', 'SOLID', 'Clean Architecture', 'DevOps',
  'MS SQL Server', 'Blazor', 'MVC', 'ASP.NET', 'REST', 'Web API',
  'Web Services', 'LINQ', 'ADO.NET', 'HTML', 'XML', 'CSS', 'jQuery',
  'Bootstrap', 'React', 'Visual Studio', 'SSMS', 'SSIS', 'Azure DevOps',
  'Git', 'TFS', 'Jira', 'Tortoise SVN', 'Generative AI'
];

interface SkillSearchResult {
  title: string;
  description: string;
  impact?: string;
  technologies?: string[];
  matchReason: string;
  date?: string;
}

interface SkillSearchResponse {
  results: SkillSearchResult[];
  summary: string;
  searchTerms: string;
}

export default function SkillSearchForm() {
  const [searchTerms, setSearchTerms] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SkillSearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Get skills from resume - filtered to only show relevant skills
  const resumeSkills = useMemo(() => {
    return RESUME_SKILLS.filter(skill => {
      // Exclude AWS (not in resume)
      if (skill.toLowerCase().includes('aws')) return false;
      // Only include Generative AI from Mr Brooks section, exclude Claude.AI and Cursor
      if (skill.toLowerCase().includes('claude')) return false;
      if (skill.toLowerCase() === 'cursor') return false;
      return true;
    });
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerms.trim()) return;

    setIsSearching(true);
    setError(null);

    try {
      const response = await fetch('/api/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ searchTerms: searchTerms.trim() }),
      });

      if (!response.ok) {
        throw new Error('Failed to search skills');
      }

      const data = await response.json();
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSearching(false);
    }
  };

  const handleClear = () => {
    setSearchTerms('');
    setResults(null);
    setError(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-slate-600 mb-4">
          Enter skills or keywords you&apos;re looking for, and we&apos;ll find relevant 
          experiences from the resume.
        </p>
        
        <form onSubmit={handleSearch} className="space-y-4">
          <div>
            <label htmlFor="searchTerms" className="sr-only">
              Search terms
            </label>
            <input
              type="text"
              id="searchTerms"
              value={searchTerms}
              onChange={(e) => setSearchTerms(e.target.value)}
              placeholder={'e.g., ' + resumeSkills.slice(0, 5).join(', ') + '...'}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 
                         focus:ring-umber-500 focus:border-umber-500 outline-none transition-all"
              disabled={isSearching}
            />
          </div>
          
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={isSearching || !searchTerms.trim()}
              className="flex-1 bg-umber-600 text-white px-6 py-3 rounded-lg font-medium
                         hover:bg-umber-700 disabled:bg-slate-300 disabled:cursor-not-allowed
                         transition-colors flex items-center justify-center gap-2"
            >
              {isSearching ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Searching...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Search Skills
                </>
              )}
            </button>
            
            {results && (
              <button
                type="button"
                onClick={handleClear}
                className="px-6 py-3 border border-slate-300 text-slate-600 rounded-lg font-medium
                           hover:bg-slate-50 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </form>
      </div>

      {isSearching && (
        <LoadingSpinner message="Searching resume for relevant experiences..." />
      )}

      {error && (
        <div className="card bg-red-50 border border-red-200">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {results && !isSearching && (
        <div className="space-y-6 animate-fade-in">
          {results.summary && (
            <div className="card bg-umber-50 border border-umber-200">
              <h3 className="text-lg font-semibold text-umber-900 mb-2">
                Summary
              </h3>
              <p className="text-slate-700">{results.summary}</p>
              <p className="text-sm text-slate-500 mt-2">
                Searched for: <span className="font-medium">{results.searchTerms}</span>
              </p>
            </div>
          )}

          {results.results && results.results.length > 0 ? (
            <div className="grid gap-6">
              <h3 className="text-lg font-semibold text-umber-900">
                Relevant Experiences ({results.results.length})
              </h3>
              {results.results.map((result, index) => (
                <SummaryCard
                  key={index}
                  title={result.date ? `${result.title} (${result.date})` : result.title}
                  description={result.description}
                  impact={result.impact}
                  technologies={result.technologies}
                  metrics={result.matchReason}
                />
              ))}
            </div>
          ) : (
            <div className="card text-center py-8">
              <p className="text-slate-600">
                No specific experiences found for &quot;{results.searchTerms}&quot;. 
                Try different keywords or more general terms.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
