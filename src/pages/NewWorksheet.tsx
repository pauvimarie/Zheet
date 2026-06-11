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
    if (!user || !config.title.trim()) return;
    setLoading(true);
    try {
      // Build initial answers array
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

        {/* Number & Category */}
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

        {/* Bubble options */}
        {config.answerType === 'bubble' && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <SectionLabel>Number of Questions</SectionLabel>
              <select
                value={config.numQuestions}
                onChange={(e) => set('numQuestions', parseInt(e.target.value))}
                className={inputClass}
                style={inputStyle}
              >
                {[10, 15, 20, 25, 30, 40, 50, 75, 100].map((n) => (
                  <option key={n} value={n}>{n} questions</option>
                ))}
              </select>
            </div>
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
          </div>
        )}

        {/* Written options */}
        {config.answerType === 'written' && (
          <div>
            <SectionLabel>Number of Questions</SectionLabel>
            <select
              value={config.numQuestions}
              onChange={(e) => set('numQuestions', parseInt(e.target.value))}
              className={inputClass}
              style={inputStyle}
            >
              {[5, 10, 15, 20, 25, 30, 40, 50].map((n) => (
                <option key={n} value={n}>{n} questions</option>
              ))}
            </select>
          </div>
        )}

        {/* Timed mode */}
        <div className="rounded-xl border p-4" style={{ borderColor: 'var(--paper-line)' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="worksheet-font font-semibold text-sm" style={{ color: 'var(--ink)' }}>Timed Mode</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--ink-secondary)' }}>
                Auto-submit when time runs out
              </p>
            </div>
            <button
              onClick={() => set('timedMode', !config.timedMode)}
              className="w-12 h-6 rounded-full transition-colors relative flex-shrink-0"
              style={{ backgroundColor: config.timedMode ? 'var(--accent-blue)' : 'var(--paper-line)' }}
            >
              <span
                className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
                style={{ transform: config.timedMode ? 'translateX(24px)' : 'translateX(2px)' }}
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

        {/* Preview */}
        {config.answerType === 'bubble' && (
          <div className="rounded-xl p-4 border" style={{ borderColor: 'var(--paper-line)', backgroundColor: 'var(--paper-bg)' }}>
            <p className="text-xs mb-3 font-semibold" style={{ color: 'var(--ink-secondary)' }}>PREVIEW</p>
            <div className="flex items-center gap-3">
              <span className="worksheet-font text-sm w-6 text-right flex-shrink-0" style={{ color: 'var(--ink)' }}>1.</span>
              <div className="flex gap-2">
                {Array.from({ length: config.numChoices }, (_, i) => {
                  const letter = String.fromCharCode(65 + i);
                  return (
                    <div key={letter} className="bubble" style={{ opacity: 1 }}>{letter}</div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleCreate}
          disabled={!config.title.trim() || loading}
          className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-opacity"
          style={{
            backgroundColor: 'var(--ink)',
            color: 'var(--paper-bg)',
            opacity: !config.title.trim() || loading ? 0.5 : 1,
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
