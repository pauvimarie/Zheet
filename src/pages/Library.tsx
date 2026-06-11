import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { subscribeToWorksheets, deleteWorksheet } from '../lib/db';
import type { WorksheetSession, Category } from '../types';
import { format } from 'date-fns';
import { Search, Trash2, Eye, FileText, Filter } from 'lucide-react';

const CATEGORY_COLORS: Record<Category, string> = {
  Verbal: '#3b82f6',
  Analytical: '#8b5cf6',
  Numerical: '#10b981',
  'General Information': '#f59e0b',
};

type SortKey = 'newest' | 'oldest' | 'highest' | 'lowest' | 'number';

const Library: React.FC = () => {
  const { user } = useAuth();
  const [worksheets, setWorksheets] = useState<WorksheetSession[]>([]);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<Category | 'All'>('All');
  const [sortBy, setSortBy] = useState<SortKey>('newest');
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    return subscribeToWorksheets(user.uid, setWorksheets);
  }, [user]);

  const filtered = useMemo(() => {
    let list = [...worksheets];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (w) =>
          w.config.title.toLowerCase().includes(q) ||
          w.config.category.toLowerCase().includes(q) ||
          String(w.config.worksheetNumber).includes(q)
      );
    }

    if (filterCategory !== 'All') {
      list = list.filter((w) => w.config.category === filterCategory);
    }

    list.sort((a, b) => {
      const aDate = a.startedAt ? new Date(a.startedAt).getTime() : 0;
      const bDate = b.startedAt ? new Date(b.startedAt).getTime() : 0;
      const aScore = a.checked > 0 ? a.correct / a.checked : 0;
      const bScore = b.checked > 0 ? b.correct / b.checked : 0;

      switch (sortBy) {
        case 'newest': return bDate - aDate;
        case 'oldest': return aDate - bDate;
        case 'highest': return bScore - aScore;
        case 'lowest': return aScore - bScore;
        case 'number': return a.config.worksheetNumber - b.config.worksheetNumber;
        default: return 0;
      }
    });

    return list;
  }, [worksheets, search, filterCategory, sortBy]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this worksheet? This cannot be undone.')) return;
    setDeleting(id);
    await deleteWorksheet(id);
    setDeleting(null);
  };

  const inputStyle = {
    backgroundColor: 'var(--paper-bg)',
    borderColor: 'var(--paper-line)',
    color: 'var(--ink)',
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="handwritten text-3xl font-bold" style={{ color: 'var(--ink)' }}>
            Worksheet Library
          </h1>
          <p className="text-sm worksheet-font mt-1" style={{ color: 'var(--ink-secondary)' }}>
            {worksheets.length} worksheet{worksheets.length !== 1 ? 's' : ''} saved
          </p>
        </div>
        <Link to="/new"
          className="px-4 py-2 rounded-lg text-sm font-semibold worksheet-font"
          style={{ backgroundColor: 'var(--ink)', color: 'var(--paper-bg)' }}>
          + New
        </Link>
      </div>

      {/* Search & filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: 'var(--ink-secondary)' }} />
          <input
            type="text"
            placeholder="Search worksheets…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 rounded-lg border text-sm outline-none worksheet-font"
            style={inputStyle}
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value as Category | 'All')}
          className="px-3 py-2 rounded-lg border text-sm outline-none worksheet-font"
          style={inputStyle}
        >
          <option value="All">All categories</option>
          <option value="Verbal">Verbal</option>
          <option value="Analytical">Analytical</option>
          <option value="Numerical">Numerical</option>
          <option value="General Information">General Information</option>
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortKey)}
          className="px-3 py-2 rounded-lg border text-sm outline-none worksheet-font"
          style={inputStyle}
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="highest">Highest score</option>
          <option value="lowest">Lowest score</option>
          <option value="number">By number</option>
        </select>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <FileText size={40} className="mx-auto mb-3 opacity-20" style={{ color: 'var(--ink)' }} />
          <p className="worksheet-font text-sm" style={{ color: 'var(--ink-secondary)' }}>
            {worksheets.length === 0 ? 'No worksheets yet. Create your first one!' : 'No results match your filters.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((ws) => {
            const pct = ws.checked > 0 ? Math.round((ws.correct / ws.checked) * 100) : null;
            const color = CATEGORY_COLORS[ws.config.category];

            return (
              <div key={ws.id}
                className="rounded-xl border p-4 flex flex-col gap-3 transition-shadow hover:shadow-md"
                style={{ borderColor: 'var(--paper-line)', backgroundColor: 'var(--paper-bg)' }}>
                
                {/* Category badge */}
                <div className="flex items-center justify-between">
                  <span className="text-xs px-2 py-0.5 rounded-full worksheet-font font-semibold"
                    style={{ backgroundColor: `${color}20`, color }}>
                    {ws.config.category}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--ink-secondary)' }}>
                    #{ws.config.worksheetNumber}
                  </span>
                </div>

                {/* Title */}
                <div>
                  <h3 className="worksheet-font font-semibold text-sm" style={{ color: 'var(--ink)' }}>
                    {ws.config.title}
                  </h3>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--ink-secondary)' }}>
                    {ws.config.numQuestions} questions ·{' '}
                    {ws.startedAt ? format(new Date(ws.startedAt), 'MMM d, yyyy') : '—'}
                  </p>
                </div>

                {/* Score */}
                {pct !== null ? (
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span style={{ color: 'var(--ink-secondary)' }}>
                        {ws.correct} correct / {ws.wrong} wrong
                      </span>
                      <span className="font-semibold handwritten" style={{ color }}>{pct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--paper-line)' }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: pct >= 75 ? 'var(--correct)' : pct >= 50 ? color : 'var(--wrong)',
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-xs" style={{ color: 'var(--ink-secondary)' }}>
                    {ws.isComplete ? 'Not yet checked' : 'In progress…'}
                  </p>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  {ws.isComplete ? (
                    <Link to={`/worksheet/${ws.id}/summary`}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border text-xs worksheet-font"
                      style={{ borderColor: 'var(--paper-line)', color: 'var(--ink)' }}>
                      <Eye size={12} /> View
                    </Link>
                  ) : (
                    <Link to={`/worksheet/${ws.id}`}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border text-xs worksheet-font"
                      style={{ borderColor: color, color }}>
                      Continue
                    </Link>
                  )}
                  <button
                    onClick={() => handleDelete(ws.id)}
                    disabled={deleting === ws.id}
                    className="p-1.5 rounded-lg border transition-opacity hover:opacity-70"
                    style={{ borderColor: 'var(--paper-line)', color: 'var(--wrong)' }}
                    aria-label="Delete worksheet"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Library;
