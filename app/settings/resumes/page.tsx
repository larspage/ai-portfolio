'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner';

interface Resume {
  id: string;
  name: string;
  original_filename: string;
  file_size: number;
  status: string;
  is_default: boolean;
  created_at: string;
  extracted_text?: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ResumesSettingsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  const fetchResumes = useCallback(async () => {
    try {
      const res = await fetch('/api/resumes');
      if (!res.ok) throw new Error('Failed to fetch resumes');
      const data = await res.json();
      setResumes(data.resumes || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated') fetchResumes();
  }, [status, fetchResumes]);

  async function handleUpload(file: File) {
    const supported = ['.docx', '.pdf', '.md', '.txt', '.markdown'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!supported.includes(ext)) {
      setError(`Unsupported format: ${ext}. Use DOCX, PDF, or Markdown.`);
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload-resume', { method: 'POST', body: formData });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Upload failed');
      }
      await fetchResumes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function handleSetDefault(id: string) {
    try {
      const res = await fetch(`/api/resumes/${id}/default`, { method: 'PUT' });
      if (!res.ok) throw new Error('Failed to set default');
      await fetchResumes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set default');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this resume? This cannot be undone.')) return;
    try {
      const res = await fetch(`/api/resumes/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      await fetchResumes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  }

  if (status === 'loading' || isLoading) {
    return <LoadingSpinner message="Loading resume manager..." />;
  }

  if (status !== 'authenticated') return null;

  return (
    <div className="space-y-8">
      <header className="animate-fade-in">
        <h1 className="section-title">Resume Manager</h1>
        <p className="section-subtitle">Upload and manage your resumes. Supported: DOCX, PDF, Markdown</p>
      </header>

      {error && (
        <div className="card bg-red-50 border-red-200">
          <p className="text-red-700">{error}</p>
          <button onClick={() => setError(null)} className="text-sm text-red-500 underline mt-1">Dismiss</button>
        </div>
      )}

      {/* Upload area */}
      <div
        className={`card border-2 border-dashed p-8 text-center transition-colors ${
          dragOver ? 'border-umber-700 bg-umber-50' : 'border-slate-300'
        }`}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleUpload(f); }}
      >
        <svg className="w-12 h-12 text-slate-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <p className="text-slate-600 mb-2">Drag and drop a resume here, or click to browse</p>
        <p className="text-sm text-slate-400 mb-4">DOCX, PDF, MD, TXT</p>
        <label className="btn-primary cursor-pointer inline-block text-sm px-6 py-2">
          {uploading ? 'Converting...' : 'Choose File'}
          <input
            type="file"
            accept=".docx,.pdf,.md,.txt,.markdown"
            className="hidden"
            disabled={uploading}
            onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ''; }}
          />
        </label>
      </div>

      {/* Resume list */}
      <div className="space-y-3">
        <h2 className="text-xl font-semibold text-umber-800">
          Uploaded Resumes ({resumes.length})
        </h2>

        {resumes.length === 0 && (
          <div className="card text-center py-12">
            <p className="text-slate-500">No resumes uploaded yet.</p>
          </div>
        )}

        {resumes.map((resume) => (
          <div key={resume.id} className="card flex items-center gap-4 py-3 px-5">
            <div className="w-10 h-10 bg-umber-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-umber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-800 truncate">{resume.original_filename}</span>
                {resume.is_default && (
                  <span className="text-xs bg-umber-100 text-umber-700 px-2 py-0.5 rounded font-medium">Default</span>
                )}
              </div>
              <p className="text-sm text-slate-500">
                {formatSize(resume.file_size)} &middot; {resume.status}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {!resume.is_default && (
                <button
                  onClick={() => handleSetDefault(resume.id)}
                  className="px-3 py-1.5 text-sm text-umber-700 hover:bg-umber-50 rounded-lg transition-colors"
                  title="Set as default"
                >
                  Set Default
                </button>
              )}
              <button
                onClick={() => handleDelete(resume.id)}
                className="p-2 text-slate-400 hover:text-red-600 rounded-lg transition-colors"
                title="Delete"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
