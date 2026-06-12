import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { subscribeToStats, subscribeToWorksheets } from '../lib/db';
import { DEFAULT_STATS } from '../lib/db';
import type { UserStats, WorksheetSession, Category } from '../types';
import CircularProgress from '../components/ui/CircularProgress';
import { Plus, TrendingUp, CheckCircle, XCircle, FileText } from 'lucide-react';
import { format } from 'date-fns';

const CATEGORY_COLORS: Record<Category, string> = {
  Verbal: '#3b82f6',
  Analytical: '#8b5cf6',
  Numerical: '#10b981',
  'General Information': '#f59e0b',
};

const StatCard: React.FC<{ label: string; value: string | number; icon: React.ReactNode; accent?: string }> = ({
  label, value, icon, accent
}) => (
  <div className="rounded-xl p-4 border flex items-center gap-4"
    style={{ backgroundColor: 'var(--paper-bg)', borderColor: 'var(--paper-line)' }}>
    <div className="p-2.5 rounded-lg" style={{ backgroundColor: accent ? `${accent}20` : 'var(--paper-line)' }}>
      <div style={{ color: accent || 'var(--ink)' }}>{icon}</div>
    </div>
    <div>
      <p className="text-2xl font-bold handwritten" style={{ color: 'var(--ink)' }}>{value}</p>
      <p className="text-xs worksheet-font" style={{ color: 'var(--ink-secondary)' }}>{label}</p>
    </div>
  </div>
);

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<UserStats>(DEFAULT_STATS);
  const [recentWorksheets, setRecentWorksheets] = useState<WorksheetSession[]>([]);

  useEffect(() => {
    if (!user) return;
    const unsub1 = subscribeToStats(user.uid, setStats);
    const unsub2 = subscribeToWorksheets(user.uid, (ws) => {
      setRecentWorksheets(ws.filter((w) => w.isComplete).slice(0, 5));
    });
    return () => { unsub1(); unsub2(); };
  }, [user]);

  const strongest = Object.entries(stats.proficiency).sort(
    (a, b) => b[1].proficiency - a[1].proficiency
  )[0];
  const weakest = Object.entries(stats.proficiency).sort(
    (a, b) => a[1].proficiency - b[1].proficiency
  )[0];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="handwritten text-3xl font-bold" style={{ color: 'var(--ink)' }}>Dashboard</h1>
          <p className="text-sm worksheet-font mt-1" style={{ color: 'var(--ink-secondary)' }}>
            Your study progress at a glance
          </p>
        </div>
        <Link to="/new"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold"
          style={{ backgroundColor: 'var(--ink)', color: 'var(--paper-bg)' }}>
          <Plus size={16} />
          <span className="worksheet-font">New Worksheet</span>
        </Link>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <StatCard label="Worksheets" value={stats.totalWorksheets} icon={<FileText size={18} />} />
        <StatCard label="Questions Answered" value={stats.totalQuestions} icon={<TrendingUp size={18} />} accent="#3b82f6" />
        <StatCard label="Total Correct" value={stats.totalCorrect} icon={<CheckCircle size={18} />} accent="#10b981" />
        <StatCard label="Overall Accuracy" value={`${stats.overallAccuracy}%`} icon={<TrendingUp size={18} />} accent="#8b5cf6" />
      </div>

      {/* Proficiency circles */}
      <div className="rounded-xl border p-6 mb-8"
        style={{ borderColor: 'var(--paper-line)', backgroundColor: 'var(--paper-bg)' }}>
        <h2 className="handwritten text-xl font-bold mb-6" style={{ color: 'var(--ink)' }}>
          Category Proficiency
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 justify-items-center">
          {(Object.entries(stats.proficiency) as [Category, { proficiency: number }][]).map(([cat, data]) => (
            <CircularProgress
              key={cat}
              percentage={data.proficiency}
              color={CATEGORY_COLORS[cat]}
              label={cat}
              size={110}
            />
          ))}
        </div>

        {/* Insights */}
        {stats.totalWorksheets > 0 && (
          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-lg p-3 text-center" style={{ backgroundColor: '#f0fdf4' }}>
              <p className="text-xs mb-1" style={{ color: '#16a34a' }}>Strongest</p>
              <p className="worksheet-font font-semibold text-sm" style={{ color: '#15803d' }}>
                {strongest?.[0]} — {strongest?.[1].proficiency}%
              </p>
            </div>
            <div className="rounded-lg p-3 text-center" style={{ backgroundColor: '#fff7ed' }}>
              <p className="text-xs mb-1" style={{ color: '#c2410c' }}>Needs work</p>
              <p className="worksheet-font font-semibold text-sm" style={{ color: '#9a3412' }}>
                {weakest?.[0]} — {weakest?.[1].proficiency}%
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Recent worksheets */}
      <div className="rounded-xl border p-6" style={{ borderColor: 'var(--paper-line)' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="handwritten text-xl font-bold" style={{ color: 'var(--ink)' }}>
            Recent Worksheets
          </h2>
          <Link to="/library" className="text-xs underline worksheet-font"
            style={{ color: 'var(--ink-secondary)' }}>
            View all
          </Link>
        </div>

        {recentWorksheets.length === 0 ? (
          <div className="text-center py-8">
            <FileText size={32} className="mx-auto mb-2 opacity-30" style={{ color: 'var(--ink)' }} />
            <p className="worksheet-font text-sm" style={{ color: 'var(--ink-secondary)' }}>
              No worksheets yet. Start one!
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentWorksheets.map((ws) => {
              const total = ws.correct + ws.wrong;
              const pct = total > 0 ? Math.round((ws.correct / total) * 100) : 0;
              return (
                <Link key={ws.id} to={`/worksheet/${ws.id}/summary`}
                  className="flex items-center justify-between px-4 py-3 rounded-lg border hover:opacity-80 transition-opacity"
                  style={{ borderColor: 'var(--paper-line)' }}>
                  <div>
                    <p className="worksheet-font font-semibold text-sm" style={{ color: 'var(--ink)' }}>
                      {ws.config.title}
                      <span className="ml-2 text-xs opacity-50">#{ws.config.worksheetNumber}</span>
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--ink-secondary)' }}>
                      {ws.config.category} ·{' '}
                      {ws.completedAt ? format(new Date(ws.completedAt), 'MMM d, yyyy') : '—'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold handwritten text-lg" style={{ color: CATEGORY_COLORS[ws.config.category] }}>
                      {pct}%
                    </p>
                    <p className="text-xs" style={{ color: 'var(--ink-secondary)' }}>
                      {ws.correct}/{total}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
