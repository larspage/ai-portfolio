interface MatchArea {
  requirement: string;
  resumeMatch: string;
  strength: 'strong' | 'moderate' | 'partial';
}

interface MatchResultProps {
  fitScore: number;
  matchingAreas: MatchArea[];
  gaps: string[];
  recommendation: string;
}

export default function MatchResult({
  fitScore,
  matchingAreas,
  gaps,
  recommendation,
}: MatchResultProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-100';
    if (score >= 60) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  const getStrengthStyles = (strength: string) => {
    switch (strength) {
      case 'strong':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'moderate':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'partial':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Fit Score */}
      <div className="card text-center">
        <h3 className="text-lg font-medium text-slate-600 mb-2">Overall Fit Score</h3>
        <div
          className={`inline-flex items-center justify-center w-24 h-24 rounded-full ${getScoreBgColor(
            fitScore
          )} shadow-lg transform hover:scale-110 transition-transform duration-300`}
        >
          <span className={`text-3xl font-bold ${getScoreColor(fitScore)}`}>
            {fitScore}%
          </span>
        </div>
      </div>

      {/* Matching Areas */}
      <div className="card">
        <h3 className="text-xl font-semibold text-umber-900 mb-4">Matching Qualifications</h3>
        <div className="space-y-4">
          {matchingAreas.map((area, index) => (
            <div key={index} className="border-b border-slate-100 pb-4 last:border-0 last:pb-0">
              <div className="flex items-start justify-between gap-4 mb-2">
                <p className="font-medium text-slate-800">{area.requirement}</p>
                <span
                  className={`px-2 py-1 text-xs font-medium rounded border ${getStrengthStyles(
                    area.strength
                  )}`}
                >
                  {area.strength}
                </span>
              </div>
              <p className="text-slate-600 text-sm">{area.resumeMatch}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Gaps */}
      {gaps.length > 0 && (
        <div className="card">
          <h3 className="text-xl font-semibold text-umber-900 mb-4">Potential Gaps</h3>
          <ul className="space-y-2">
            {gaps.map((gap, index) => (
              <li key={index} className="flex items-start gap-2 text-slate-600">
                <svg
                  className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                {gap}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommendation */}
      <div className="card bg-umber-50 border-umber-200">
        <h3 className="text-xl font-semibold text-umber-900 mb-3">Recommendation</h3>
        <p className="text-slate-700 leading-relaxed">{recommendation}</p>
      </div>
    </div>
  );
}
