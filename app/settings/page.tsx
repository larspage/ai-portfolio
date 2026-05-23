'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import LoadingSpinner from '@/components/LoadingSpinner';

interface SectionConfig {
  id: string;
  name: string;
  label: string;
  focus_description: string | null;
  resume_section_key: string | null;
  sort_order: number;
  is_active: boolean;
}

interface FormData {
  name: string;
  label: string;
  focus_description: string;
  resume_section_key: string;
}

const emptyForm: FormData = { name: '', label: '', focus_description: '', resume_section_key: '' };

export default function SettingsPage() {
  const { status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [sections, setSections] = useState<SectionConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  const fetchSections = useCallback(async () => {
    try {
      const res = await fetch('/api/sections?all=true');
      if (!res.ok) throw new Error('Failed to fetch sections');
      const data = await res.json();
      setSections(data.sections || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated') {
      fetch('/api/sections?all=true')
        .then(res => res.json())
        .then(data => {
          if (data.sections) setSections(data.sections);
        })
        .catch(() => setError('Failed to fetch sections'))
        .finally(() => setIsLoading(false));
    }
  }, [status]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/sections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create section');
      }
      setForm(emptyForm);
      setShowForm(false);
      await fetchSections();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create');
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(id: string) {
    setSaving(true);
    try {
      const res = await fetch(`/api/sections/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update section');
      }
      setEditingId(null);
      setForm(emptyForm);
      await fetchSections();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this section? This cannot be undone.')) return;
    try {
      const res = await fetch(`/api/sections/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      await fetchSections();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  }

  async function handleToggleActive(id: string, current: boolean) {
    try {
      const res = await fetch(`/api/sections/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !current }),
      });
      if (!res.ok) throw new Error('Failed to toggle');
      await fetchSections();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle');
    }
  }

  async function handleMoveUp(index: number) {
    if (index === 0) return;
    const newSections = [...sections];
    [newSections[index - 1], newSections[index]] = [newSections[index], newSections[index - 1]];
    await saveOrder(newSections);
  }

  async function handleMoveDown(index: number) {
    if (index === sections.length - 1) return;
    const newSections = [...sections];
    [newSections[index], newSections[index + 1]] = [newSections[index + 1], newSections[index]];
    await saveOrder(newSections);
  }

  async function saveOrder(newSections: SectionConfig[]) {
    try {
      const res = await fetch('/api/sections/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: newSections.map(s => s.id) }),
      });
      if (!res.ok) throw new Error('Failed to reorder');
      const data = await res.json();
      setSections(data.sections || newSections);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reorder');
    }
  }

  function startEdit(section: SectionConfig) {
    setEditingId(section.id);
    setForm({
      name: section.name,
      label: section.label,
      focus_description: section.focus_description || '',
      resume_section_key: section.resume_section_key || '',
    });
    setShowForm(true);
  }

  if (status === 'loading' || isLoading) {
    return <LoadingSpinner message="Loading settings..." />;
  }

  if (status !== 'authenticated') return null;

  return (
    <div className="space-y-8">
      <header className="animate-fade-in">
        <h1 className="section-title">Settings</h1>
        <div className="flex gap-1 border-b border-slate-200 mb-6">
          <Link
            href="/settings"
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              pathname === '/settings'
                ? 'border-umber-700 text-umber-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Sections
          </Link>
          <Link
            href="/settings/resumes"
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              pathname === '/settings/resumes'
                ? 'border-umber-700 text-umber-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Resumes
          </Link>
        </div>
      </header>

      {error && (
        <div className="card bg-red-50 border-red-200">
          <p className="text-red-700">{error}</p>
          <button onClick={() => setError(null)} className="text-sm text-red-500 underline mt-1">Dismiss</button>
        </div>
      )}

      {/* Section list */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-umber-800">
            Sections ({sections.length}/8)
          </h2>
          {sections.length < 8 && (
            <button
              onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyForm); }}
              className="btn-primary text-sm px-4 py-2"
            >
              + Add Section
            </button>
          )}
        </div>

        {sections.length === 0 && (
          <div className="card text-center py-12">
            <p className="text-slate-500">No sections yet. Add one to get started.</p>
          </div>
        )}

        {sections.map((section, index) => (
          <div key={section.id} className="card flex items-center gap-4 py-3 px-5">
            {/* Reorder arrows */}
            <div className="flex flex-col gap-0.5">
              <button
                onClick={() => handleMoveUp(index)}
                disabled={index === 0}
                className="text-slate-400 hover:text-umber-700 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              </button>
              <button
                onClick={() => handleMoveDown(index)}
                disabled={index === sections.length - 1}
                className="text-slate-400 hover:text-umber-700 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-800">{section.label || section.name}</h3>
                <span className="text-xs text-slate-400 font-mono">({section.name})</span>
                {!section.is_active && (
                  <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded">Hidden</span>
                )}
              </div>
              {section.focus_description && (
                <p className="text-sm text-slate-500 truncate">{section.focus_description}</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleToggleActive(section.id, section.is_active)}
                className={`p-2 rounded-lg text-sm transition-colors ${
                  section.is_active
                    ? 'text-slate-400 hover:text-amber-600'
                    : 'text-green-600 hover:text-green-800'
                }`}
                title={section.is_active ? 'Hide section' : 'Show section'}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {section.is_active ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  )}
                </svg>
              </button>
              <button
                onClick={() => startEdit(section)}
                className="p-2 text-slate-400 hover:text-umber-700 rounded-lg transition-colors"
                title="Edit section"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                onClick={() => handleDelete(section.id)}
                className="p-2 text-slate-400 hover:text-red-600 rounded-lg transition-colors"
                title="Delete section"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit form */}
      {showForm && (
        <div className="card">
          <h2 className="text-xl font-semibold text-umber-800 mb-4">
            {editingId ? 'Edit Section' : 'Add Section'}
          </h2>
          <form onSubmit={async (e) => { e.preventDefault(); if (editingId) { await handleUpdate(editingId); } else { await handleCreate(e); } }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name (slug)</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-umber-500 focus:border-umber-500"
                  placeholder="e.g., my-section"
                  required
                  disabled={!!editingId}
                />
                <p className="text-xs text-slate-400 mt-1">Used in URLs: /my-section</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Label</label>
                <input
                  type="text"
                  value={form.label}
                  onChange={e => setForm({ ...form, label: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-umber-500 focus:border-umber-500"
                  placeholder="e.g., My Section"
                  required
                />
                <p className="text-xs text-slate-400 mt-1">Displayed in navigation and page titles</p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Focus Description</label>
              <textarea
                value={form.focus_description}
                onChange={e => setForm({ ...form, focus_description: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-umber-500 focus:border-umber-500"
                placeholder="e.g., Team management, strategic initiatives, and mentorship"
                rows={2}
              />
              <p className="text-xs text-slate-400 mt-1">Tells the AI what to highlight in this section</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Resume Section (optional)</label>
              <input
                type="text"
                value={form.resume_section_key}
                onChange={e => setForm({ ...form, resume_section_key: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-umber-500 focus:border-umber-500"
                placeholder="e.g., leadership (or leave blank for full resume)"
              />
              <p className="text-xs text-slate-400 mt-1">Which part of the resume to analyze. Leave blank to use the full resume.</p>
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={saving} className="btn-primary text-sm px-6 py-2">
                {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Create Section'}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setEditingId(null); setForm(emptyForm); }}
                className="btn-secondary text-sm px-6 py-2"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="text-sm text-slate-400 space-y-2">
        <p><strong>Note:</strong> The prompt factory generates AI system prompts automatically from the section name and focus description. You don&apos;t need to write prompts yourself.</p>
      </div>
    </div>
  );
}
