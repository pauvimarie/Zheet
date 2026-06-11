import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createWorksheet } from '../lib/db';
import type { WorksheetConfig, Category, AnswerType, QuestionAnswer } from '../types';
import { ChevronRight } from 'lucide-react';

const CATEGORIES: Category[] = ['Verbal', 'Analytical', 'Numerical', 'General Information'];

const inputClass = `w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition-colors worksheet-font`;
const inputStyle = {
  backgroundColor: 'var(--paper-bg)',
  borderColor: 'var(--paper-line)',
  color: 'var(--ink)',
};

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5"
    style={{ color: 'var(--ink-secondary)' }}>
    {children}
  </label>
);

const NewWorksheet: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [config, setConfig] = useState<WorksheetConfig>({
    title: '',
    worksheetNumber: 1,
    category: 'Verbal',
    answerType: 'bubble',
    numQuestions: 50,
    numChoices: 4,
    timedMode: false,
    timeLimit: 60,
  });

  const set = <K extends keyof WorksheetConfig>(key: K, value: WorksheetConfig[K]) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const handleCreate = async () => {
    if (!user) { setError('Not signed in.'); return; }
    if (!config.title.trim()) { setError('Please enter an exam title.'); return; }
    if (config.numQuestions < 1 || config.numQuestions > 500) {
      setError('Number of questions must be between 1 and 500.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const answers: QuestionAnswer[] = Array.from({ length: config.numQuestions }, (_, i) => ({
        questionNumber: i + 1,
        selectedChoice: undefined,
        writtenAnswer: '',
        status: null,
      }));

      const id = await createWorksheet(user.uid, {
        userId: user.uid,
        config,
        answers,
        startedAt: new Date(),
        isComplete: false,
        correct: 0,
        wrong: 0,
        checked: 0,
      });
      navigate(`/worksheet/${id}`);
    } catch (err) {
      console.error(err);
      setError('Failed to create worksheet. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const AnswerTypeBtn: React.FC<{ type: AnswerType; label: string; desc: string }> = ({ type, label, desc }) => (
    <button
      onClick={() => set('answerType', type)}
      className="flex-1 rounded-xl p-4 border-2 text-left transition-all"
      style={{
        borderColor: config.answerType === type ? 'var(--accent-blue)' : 'var(--paper-line)',
        backgroundColor: config.answerType === type ? 'rgba(59,130,246,0.06)' : 'transparent',
      }}
    >
      <p className="worksheet-font font-semibold text-sm" style={{ color: 'var(--ink)' }}>{label}</p>
      <p className="text-xs mt-0.5" style={{ color: 'var(--ink-secondary)' }}>{desc}</p>
    </button>
  );

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h1 className="handwritten text-3xl font-bold mb-2" style={{ color: 'var(--ink)' }}>
        New Worksheet
      </h1>
      <p className="text-sm worksheet-font mb-8" style={{ color: 'var(--ink-secondary)' }}>
        Set up your worksheet details
      </p>

      <div className="space-y-6">
        {/* Title */}
        <div>
          <SectionLabel>Exam Title</SectionLabel>
          <input
            type="text"
            placeholder="e.g. Mock Exam 1"
            value={config.title}
            onChange={(e) => set('title', e.target.value)}
            className={inputClass}
            style={inputStyle}
          />
        </div>

        {/* Worksheet # & Category */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <SectionLabel>Worksheet #</SectionLabel>
            <input
              type="number"
              min={1}
              value={config.worksheetNumber}
              onChange={(e) => set('worksheetNumber', parseInt(e.target.value) || 1)}
              className={inputClass}
              style={inputStyle}
            />
          </div>
          <div>
            <SectionLabel>Category</SectionLabel>
            <select
              value={config.category}
              onChange={(e) => set('category', e.target.value as Category)}
              className={inputClass}
              style={inputStyle}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Answer type */}
        <div>
          <SectionLabel>Answer Type</SectionLabel>
          <div className="flex gap-3">
            <AnswerTypeBtn type="bubble" label="Bubble Sheet" desc="Multiple choice circles" />
            <AnswerTypeBtn type="written" label="Written" desc="Type your answers" />
          </div>
        </div>

        {/* Number of questions — always manual input */}
        <div className={config.answerType === 'bubble' ? 'grid grid-cols-2 gap-4' : ''}>
          <div>
            <SectionLabel>Number of Questions</SectionLabel>
            <input
              type="number"
              min={1}
              max={500}
              value={config.numQuestions}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                if (!isNaN(val)) set('numQuestions', val);
              }}
              placeholder="e.g. 50"
              className={inputClass}
              style={inputStyle}
            />
            <p className="text-xs mt-1" style={{ color: 'var(--ink-secondary)' }}>
              Enter any number (1–500)
            </p>
          </div>

          {/* Choices — only for bubble */}
          {config.answerType === 'bubble' && (
            <div>
              <SectionLabel>Choices per Question</SectionLabel>
              <select
                value={config.numChoices}
                onChange={(e) => set('numChoices', parseInt(e.target.value))}
                className={inputClass}
                style={inputStyle}
              >
                <option value={2}>2 choices (A–B)</option>
                <option value={3}>3 choices (A–C)</option>
                <option value={4}>4 choices (A–D)</option>
                <option value={5}>5 choices (A–E)</option>
              </select>
            </div>
          )}
        </div>

        {/* Timed mode */}
        <div className="rounded-xl border p-4" style={{ borderColor: 'var(--paper-line)' }}>
          <div className="flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <p className="worksheet-font font-semibold text-sm" style={{ color: 'var(--ink)' }}>Timed Mode</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--ink-secondary)' }}>
                Auto-submit when time runs out
              </p>
            </div>
            {/* Toggle — fixed alignment */}
            <button
              onClick={() => set('timedMode', !config.timedMode)}
              role="switch"
              aria-checked={config.timedMode}
              className="relative inline-flex items-center flex-shrink-0 rounded-full transition-colors duration-200"
              style={{
                width: '44px',
                height: '24px',
                backgroundColor: config.timedMode ? 'var(--accent-blue)' : 'var(--paper-line)',
              }}
            >
              <span
                className="inline-block rounded-full bg-white shadow-sm transition-transform duration-200"
                style={{
                  width: '18px',
                  height: '18px',
                  transform: config.timedMode ? 'translateX(23px)' : 'translateX(3px)',
                }}
              />
            </button>
          </div>

          {config.timedMode && (
            <div className="mt-4">
              <SectionLabel>Time Limit (minutes)</SectionLabel>
              <select
                value={config.timeLimit}
                onChange={(e) => set('timeLimit', parseInt(e.target.value))}
                className={inputClass}
                style={inputStyle}
              >
                {[10, 15, 20, 30, 45, 60, 90, 120].map((n) => (
                  <option key={n} value={n}>{n} minutes</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Bubble preview */}
        {config.answerType === 'bubble' && config.numQuestions > 0 && (
          <div className="rounded-xl p-4 border" style={{ borderColor: 'var(--paper-line)', backgroundColor: 'var(--paper-bg)' }}>
            <p className="text-xs mb-3 font-semibold" style={{ color: 'var(--ink-secondary)' }}>PREVIEW</p>
            <div className="flex items-center gap-3">
              <span className="worksheet-font text-sm w-6 text-right flex-shrink-0" style={{ color: 'var(--ink)' }}>1.</span>
              <div className="flex gap-2 flex-wrap">
                {Array.from({ length: config.numChoices }, (_, i) => {
                  const letter = String.fromCharCode(65 + i);
                  return (
                    <div key={letter} className="bubble">{letter}</div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="text-xs py-2 px-3 rounded-lg"
            style={{ backgroundColor: '#fef2f2', color: '#dc2626' }}>
            {error}
          </p>
        )}

        {/* Submit */}
        <button
          onClick={handleCreate}
          disabled={!config.title.trim() || loading || config.numQuestions < 1}
          className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-opacity"
          style={{
            backgroundColor: 'var(--ink)',
            color: 'var(--paper-bg)',
            opacity: (!config.title.trim() || loading || config.numQuestions < 1) ? 0.5 : 1,
          }}
        >
          <span className="worksheet-font">
            {loading ? 'Creating…' : 'Start Worksheet'}
          </span>
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};

export default NewWorksheet;
