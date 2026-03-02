import JobMatchForm from '@/components/JobMatchForm';

export default function MatchPage() {
  return (
    <div className="space-y-8">
      <header className="animate-fade-in">
        <h1 className="section-title">Job Match Analysis</h1>
        <p className="section-subtitle">
          Paste a job description below to see how my experience aligns with the role requirements.
          Our AI will analyze the match and provide detailed insights.
        </p>
      </header>

      <JobMatchForm />

      <section className="card bg-gradient-to-br from-slate-50 to-slate-100 animate-slide-up">
        <h2 className="text-lg font-semibold text-umber-900 mb-4">How it works</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-umber-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-umber-700 font-semibold">1</span>
            </div>
            <div>
              <h3 className="font-medium text-slate-800">Paste Job Description</h3>
              <p className="text-sm text-slate-600">Copy and paste the full job posting into the text area above.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-umber-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-umber-700 font-semibold">2</span>
            </div>
            <div>
              <h3 className="font-medium text-slate-800">AI Analysis</h3>
              <p className="text-sm text-slate-600">Our AI compares the requirements against my resume and experience.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-umber-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-umber-700 font-semibold">3</span>
            </div>
            <div>
              <h3 className="font-medium text-slate-800">Get Results</h3>
              <p className="text-sm text-slate-600">See a fit score, matching qualifications, and any potential gaps.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
