import React, { useEffect, useState, useMemo, Component } from 'react';
import type { ErrorInfo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { subscribeToWorksheets, deleteWorksheet } from '../lib/db';
import type { WorksheetSession, Category } from '../types';
import { format } from 'date-fns';
import { Search, Trash2, Eye, FileText, AlertCircle } from 'lucide-react';

const CATEGORY_COLORS: Record<string, string> = {
  Verbal: '#3b82f6',
  Analytical: '#8b5cf6',
  Numerical: '#10b981',
  'General Information': '#f59e0b',
};

const DEFAULT_COLOR = '#6b7280';

type SortKey = 'newest' | 'oldest' | 'highest' | 'lowest' | 'number';

// ─── Error Boundary ───────────────────────────────────────────────────────────
interface ErrorBoundaryState { hasError: boolean; message: string }

class LibraryErrorBoundary extends Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error?.message ?? 'Unknown error' };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[Library] Caught error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <AlertCircle size={40} className="mx-auto mb-3 opacity-40" style={{ color: 'var(--wrong)' }} />
          <h2 className="handwritten text-2xl mb-2" style={{ color: 'var(--ink)' }}>
            Something went wrong
          </h2>
          <p className="worksheet-font text-sm mb-4" style={{ color: 'var(--ink-secondary)' }}>
            {this.state.message}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, message: '' })}
            className="px-4 py-2 rounded-lg text-sm font-semibold worksheet-font"
            style={{ backgroundColor: 'var(--ink)', color: 'var(--paper-bg)' }}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Safe helpers ─────────────────────────────────────────────────────────────

/** Safely convert any date-like value to a JS Date, or return null */
const toDate = (val: unknown): Date | null => {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  // Firestore Timestamp that wasn't converted
  if (typeof val === 'object' && 'toDate' in (val as object)) {
    try { return (val as { toDate(): Date }).toDate(); } catch { return null; }
  }
  try {
    const d = new Date(val as string | number);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
};

const safeStr = (val: unknown): string =>
  typeof val === 'string' ? val : String(val ?? '');

const safeNum = (val: unknown, fallback = 0): number => {
  const n = Number(val);
  return isFinite(n) ? n : fallback;
};

// ─── Library inner component ──────────────────────────────────────────────────
const LibraryInner: React.FC = () => {
  const { user } = useAuth();
  const [worksheets, setWorksheets] = useState<WorksheetSession[]>([]);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<Category | 'All'>('All');
  const [sortBy, setSortBy] = useState<SortKey>('newest');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    try {
      const unsub = subscribeToWorksheets(user.uid, (data) => {
        // Ensure data is always an array
        setWorksheets(Array.isArray(data) ? data : []);
        setLoadError(null);
      });
      return unsub;
    } catch (err) {
      console.error('[Library] subscription error', err);
      setLoadError('Failed to load worksheets. Check your connection.');
    }
  }, [user]);

  const filtered = useMemo(() => {
    let list = [...worksheets];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((w) => {
        const title = safeStr(w?.config?.title).toLowerCase();
        const category = safeStr(w?.config?.category).toLowerCase();
        const num = String(w?.config?.worksheetNumber ?? '');
        return title.includes(q) || category.includes(q) || num.includes(q);
      });
    }

    if (filterCategory !== 'All') {
      list = list.filter((w) => w?.config?.category === filterCategory);
    }

    list.sort((a, b) => {
      const aDate = toDate(a?.startedAt)?.getTime() ?? 0;
      const bDate = toDate(b?.startedAt)?.getTime() ?? 0;
      const aChecked = safeNum(a?.checked);
      const bChecked = safeNum(b?.checked);
      const aScore = aChecked > 0 ? safeNum(a?.correct) / aChecked : 0;
      const bScore = bChecked > 0 ? safeNum(b?.correct) / bChecked : 0;

      switch (sortBy) {
        case 'newest': return bDate - aDate;
        case 'oldest': return aDate - bDate;
        case 'highest': return bScore - aScore;
        case 'lowest': return aScore - bScore;
        case 'number': return safeNum(a?.config?.worksheetNumber) - safeNum(b?.config?.worksheetNumber);
        default: return 0;
      }
    });

    return list;
  }, [worksheets, search, filterCategory, sortBy]);

  const handleDelete = async (id: string) => {
    if (!id) return;
    if (!confirm('Delete this worksheet? This cannot be undone.')) return;
    setDeleting(id);
    try {
      await deleteWorksheet(id);
    } catch (err) {
      console.error('[Library] delete error', err);
      alert('Failed to delete. Please try again.');
    } finally {
      setDeleting(null);
    }
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
        <Link
          to="/new"
          className="px-4 py-2 rounded-lg text-sm font-semibold worksheet-font"
          style={{ backgroundColor: 'var(--ink)', color: 'var(--paper-bg)' }}
        >
          + New
        </Link>
      </div>

      {/* Load error banner */}
      {loadError && (
        <div
          className="mb-4 px-4 py-3 rounded-lg text-sm worksheet-font flex items-center gap-2"
          style={{ backgroundColor: '#fef2f2', color: 'var(--wrong)', border: '1px solid #fecaca' }}
        >
          <AlertCircle size={14} />
          {loadError}
        </div>
      )}

      {/* Search & filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: 'var(--ink-secondary)' }}
          />
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
            {worksheets.length === 0
              ? 'No worksheets yet. Create your first one!'
              : 'No results match your filters.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((ws) => {
            // Safe access to all fields
            const id = ws?.id ?? '';
            const config = ws?.config ?? {};
            const category = safeStr(config.category) || 'Unknown';
            const title = safeStr(config.title) || 'Untitled';
            const worksheetNumber = safeNum(config.worksheetNumber);
            const numQuestions = safeNum(config.numQuestions);
            const checked = safeNum(ws?.checked);
            const correct = safeNum(ws?.correct);
            const wrong = safeNum(ws?.wrong);
            const isComplete = Boolean(ws?.isComplete);
            const startedAt = toDate(ws?.startedAt);

            const pct = checked > 0 ? Math.round((correct / checked) * 100) : null;
            const color = CATEGORY_COLORS[category] ?? DEFAULT_COLOR;

            return (
              <div
                key={id}
                className="rounded-xl border p-4 flex flex-col gap-3 transition-shadow hover:shadow-md"
                style={{ borderColor: 'var(--paper-line)', backgroundColor: 'var(--paper-bg)' }}
              >
                {/* Category badge */}
                <div className="flex items-center justify-between">
                  <span
                    className="text-xs px-2 py-0.5 rounded-full worksheet-font font-semibold"
                    style={{ backgroundColor: `${color}20`, color }}
                  >
                    {category}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--ink-secondary)' }}>
                    #{worksheetNumber}
                  </span>
                </div>

                {/* Title */}
                <div>
                  <h3 className="worksheet-font font-semibold text-sm" style={{ color: 'var(--ink)' }}>
                    {title}
                  </h3>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--ink-secondary)' }}>
                    {numQuestions} questions ·{' '}
                    {startedAt ? format(startedAt, 'MMM d, yyyy') : '—'}
                  </p>
                </div>

                {/* Score */}
                {pct !== null ? (
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span style={{ color: 'var(--ink-secondary)' }}>
                        {correct} correct / {wrong} wrong
                      </span>
                      <span className="font-semibold handwritten" style={{ color }}>
                        {pct}%
                      </span>
                    </div>
                    <div
                      className="h-1.5 rounded-full overflow-hidden"
                      style={{ backgroundColor: 'var(--paper-line)' }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${pct}%`,
                          backgroundColor:
                            pct >= 75 ? 'var(--correct)' : pct >= 50 ? color : 'var(--wrong)',
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-xs" style={{ color: 'var(--ink-secondary)' }}>
                    {isComplete ? 'Not yet checked' : 'In progress…'}
                  </p>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  {isComplete ? (
                    <Link
                      to={`/worksheet/${id}/summary`}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border text-xs worksheet-font"
                      style={{ borderColor: 'var(--paper-line)', color: 'var(--ink)' }}
                    >
                      <Eye size={12} /> View
                    </Link>
                  ) : (
                    <Link
                      to={`/worksheet/${id}`}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border text-xs worksheet-font"
                      style={{ borderColor: color, color }}
                    >
                      Continue
                    </Link>
                  )}
                  <button
                    onClick={() => handleDelete(id)}
                    disabled={deleting === id}
                    className="p-1.5 rounded-lg border transition-opacity hover:opacity-70 disabled:opacity-40"
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

// ─── Exported component (wrapped in error boundary) ───────────────────────────
const Library: React.FC = () => (
  <LibraryErrorBoundary>
    <LibraryInner />
  </LibraryErrorBoundary>
);

export default Library;
