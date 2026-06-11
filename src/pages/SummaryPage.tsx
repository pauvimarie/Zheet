import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { subscribeToWorksheet, updateWorksheet, recalcStats } from '../lib/db';
import { useAuth } from '../context/AuthContext';
import type { WorksheetSession, QuestionAnswer, AnswerStatus } from '../types';
import { format } from 'date-fns';
import { CheckCircle, XCircle, ArrowLeft, Download } from 'lucide-react';

const SummaryPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [session, setSession] = useState<WorksheetSession | null>(null);
  const [answers, setAnswers] = useState<QuestionAnswer[]>([]);
  const saveTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!id) return;
    return subscribeToWorksheet(id, (s) => {
      if (!s) return;
      setSession(s);
      setAnswers(s.answers || []);
    });
  }, [id]);

  const debounceSave = useCallback(
    (newAnswers: QuestionAnswer[], correct: number, wrong: number, checked: number) => {
      if (!id || !user) return;
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(async () => {
        await updateWorksheet(id, { answers: newAnswers, correct, wrong, checked });
        await recalcStats(user.uid);
      }, 600);
    },
    [id, user]
  );

  const handleCheck = (qNum: number, status: AnswerStatus) => {
    const updated = answers.map((a) => {
      if (a.questionNumber !== qNum) return a;
      // Toggle: clicking same status removes it
      return { ...a, status: a.status === status ? null : status };
    });
    setAnswers(updated);

    const correct = updated.filter((a) => a.status === 'correct').length;
    const wrong = updated.filter((a) => a.status === 'wrong').length;
    const checked = correct + wrong;
    debounceSave(updated, correct, wrong, checked);
  };

  if (!session) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-pulse text-sm worksheet-font" style={{ color: 'var(--ink-secondary)' }}>
          Loading summary…
        </div>
      </div>
    );
  }

  const { config } = session;
  const correct = answers.filter((a) => a.status === 'correct').length;
  const wrong = answers.filter((a) => a.status === 'wrong').length;
  const checked = correct + wrong;
  const remaining = config.numQuestions - checked;
  const accuracy = checked > 0 ? Math.round((correct / checked) * 100) : 0;

  const formatTimeTaken = (secs?: number) => {
    if (!secs) return '—';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Back link */}
      <Link to="/library"
        className="flex items-center gap-1.5 text-sm mb-6 worksheet-font"
        style={{ color: 'var(--ink-secondary)' }}>
        <ArrowLeft size={14} />
        Back to Library
      </Link>

      {/* Summary header */}
      <div className="rounded-2xl border overflow-hidden shadow-md mb-4"
        style={{ borderColor: 'var(--paper-line)' }}>
        
        <div className="px-8 py-6 border-b text-center"
          style={{ borderColor: 'var(--paper-line)', backgroundColor: 'var(--paper-bg)' }}>
          <h1 className="handwritten text-2xl font-bold" style={{ color: 'var(--ink)' }}>
            {config.title}
          </h1>
          <p className="worksheet-font text-sm mt-1" style={{ color: 'var(--ink-secondary)' }}>
            Worksheet #{config.worksheetNumber} · {config.category}
          </p>
          <div className="flex flex-wrap justify-center gap-4 mt-3 text-xs"
            style={{ color: 'var(--ink-secondary)' }}>
            <span>
              {session.completedAt
                ? format(new Date(session.completedAt), 'MMMM d, yyyy · h:mm a')
                : 'In progress'}
            </span>
            {session.timeTaken && (
              <span>Time taken: {formatTimeTaken(session.timeTaken)}</span>
            )}
          </div>
        </div>

        {/* Live stats */}
        <div className="grid grid-cols-4 divide-x border-b"
          style={{ borderColor: 'var(--paper-line)', backgroundColor: 'var(--paper-bg)' }}>
          {[
            { label: 'Correct', value: correct, color: 'var(--correct)' },
            { label: 'Wrong', value: wrong, color: 'var(--wrong)' },
            { label: 'Checked', value: checked, color: 'var(--ink)' },
            { label: 'Remaining', value: remaining, color: 'var(--ink-secondary)' },
          ].map(({ label, value, color }) => (
            <div key={label} className="text-center py-4">
              <p className="handwritten text-2xl font-bold" style={{ color }}>{value}</p>
              <p className="text-xs worksheet-font" style={{ color: 'var(--ink-secondary)' }}>{label}</p>
            </div>
          ))}
        </div>

        {/* Accuracy bar */}
        {checked > 0 && (
          <div className="px-6 py-3 border-b" style={{ borderColor: 'var(--paper-line)', backgroundColor: 'var(--paper-bg)' }}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs worksheet-font" style={{ color: 'var(--ink-secondary)' }}>Accuracy</span>
              <span className="text-xs font-semibold worksheet-font" style={{ color: 'var(--ink)' }}>{accuracy}%</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--paper-line)' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${accuracy}%`,
                  backgroundColor: accuracy >= 75 ? 'var(--correct)' : accuracy >= 50 ? 'var(--accent-orange)' : 'var(--wrong)',
                }}
              />
            </div>
          </div>
        )}

        {/* Answers list */}
        <div className="px-6 md:px-10 py-4" style={{ backgroundColor: 'var(--paper-bg)' }}>
          <p className="text-xs font-semibold uppercase tracking-wide mb-4"
            style={{ color: 'var(--ink-secondary)' }}>
            Answers — click ✓ or ✗ to check
          </p>

          <div className="space-y-0.5">
            {answers.map((answer) => (
              <div
                key={answer.questionNumber}
                className="flex items-center gap-3 py-2.5 border-b"
                style={{
                  borderColor: 'var(--paper-line)',
                  backgroundColor:
                    answer.status === 'correct'
                      ? 'rgba(16,185,129,0.05)'
                      : answer.status === 'wrong'
                      ? 'rgba(239,68,68,0.05)'
                      : 'transparent',
                }}>
                
                {/* Number */}
                <span className="worksheet-font text-sm w-8 text-right flex-shrink-0"
                  style={{ color: 'var(--ink-secondary)' }}>
                  {answer.questionNumber}.
                </span>

                {/* Answer */}
                <span className="flex-1 handwritten text-lg" style={{ color: 'var(--ink)' }}>
                  {config.answerType === 'bubble'
                    ? answer.selectedChoice || '—'
                    : answer.writtenAnswer || '—'}
                </span>

                {/* Check buttons */}
                <div className="flex gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => handleCheck(answer.questionNumber, 'correct')}
                    className={`check-btn correct ${answer.status === 'correct' ? 'active' : ''}`}
                    aria-label="Mark correct"
                  >
                    ✓
                  </button>
                  <button
                    onClick={() => handleCheck(answer.questionNumber, 'wrong')}
                    className={`check-btn wrong ${answer.status === 'wrong' ? 'active' : ''}`}
                    aria-label="Mark wrong"
                  >
                    ✗
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Link to={`/worksheet/${id}`}
          className="flex-1 py-3 rounded-xl border text-sm text-center worksheet-font transition-opacity hover:opacity-70"
          style={{ borderColor: 'var(--paper-line)', color: 'var(--ink)' }}>
          Re-answer
        </Link>
        <Link to="/new"
          className="flex-1 py-3 rounded-xl text-sm text-center worksheet-font"
          style={{ backgroundColor: 'var(--ink)', color: 'var(--paper-bg)' }}>
          New Worksheet
        </Link>
      </div>
    </div>
  );
};

export default SummaryPage;
