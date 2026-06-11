import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { subscribeToWorksheet, updateWorksheet } from '../lib/db';
import type { WorksheetSession, QuestionAnswer } from '../types';
import { Clock, CheckCircle, AlertCircle } from 'lucide-react';

const CHOICES = ['A', 'B', 'C', 'D', 'E'];

const WorksheetPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<WorksheetSession | null>(null);
  const [answers, setAnswers] = useState<QuestionAnswer[]>([]);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionRef = useRef<WorksheetSession | null>(null);

  useEffect(() => {
    if (!id) return;
    const unsub = subscribeToWorksheet(id, (s) => {
      if (!s) return;
      sessionRef.current = s;
      setSession(s);
      setAnswers(s.answers || []);
      // Init timer
      if (s.config.timedMode && !s.isComplete && timeLeft === null) {
        const elapsed = Math.floor((Date.now() - new Date(s.startedAt).getTime()) / 1000);
        const total = (s.config.timeLimit || 60) * 60;
        setTimeLeft(Math.max(0, total - elapsed));
      }
    });
    return () => { unsub(); clearTimeout(saveTimeout.current!); clearInterval(timerRef.current!); };
  }, [id]);

  // Timer
  useEffect(() => {
    if (timeLeft === null) return;
    if (timeLeft <= 0) {
      handleDone(true);
      return;
    }
    timerRef.current = setTimeout(() => setTimeLeft((t) => (t !== null ? t - 1 : null)), 1000);
    return () => clearTimeout(timerRef.current!);
  }, [timeLeft]);

  const debounceSave = useCallback((newAnswers: QuestionAnswer[]) => {
    if (!id) return;
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(async () => {
      setSaving(true);
      await updateWorksheet(id, { answers: newAnswers });
      setSaving(false);
    }, 800);
  }, [id]);

  const handleBubbleSelect = (qNum: number, choice: string) => {
    const updated = answers.map((a) =>
      a.questionNumber === qNum
        ? { ...a, selectedChoice: a.selectedChoice === choice ? undefined : choice }
        : a
    );
    setAnswers(updated);
    debounceSave(updated);
  };

  const handleWrittenChange = (qNum: number, value: string) => {
    const updated = answers.map((a) =>
      a.questionNumber === qNum ? { ...a, writtenAnswer: value } : a
    );
    setAnswers(updated);
    debounceSave(updated);
  };

  const handleDone = async (_autoSubmit = false) => {
    if (!id) return;
    await updateWorksheet(id, {
      answers,
      isComplete: true,
      completedAt: new Date(),
      timeTaken: session?.config.timedMode && session.config.timeLimit
        ? (session.config.timeLimit * 60) - (timeLeft || 0)
        : undefined,
    });
    navigate(`/worksheet/${id}/summary`);
  };

  if (!session) {
    return (
      <div className="flex items-center justify-center h-full py-20">
        <div className="animate-pulse text-sm worksheet-font" style={{ color: 'var(--ink-secondary)' }}>
          Loading worksheet…
        </div>
      </div>
    );
  }

  const { config } = session;
  const answered = answers.filter((a) =>
    config.answerType === 'bubble' ? a.selectedChoice : a.writtenAnswer?.trim()
  ).length;
  const remaining = config.numQuestions - answered;
  const progress = Math.round((answered / config.numQuestions) * 100);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Sticky header */}
      <div className="sticky top-0 z-30 rounded-xl border mb-6 p-3 shadow-sm"
        style={{
          backgroundColor: 'var(--paper-bg)',
          borderColor: 'var(--paper-line)',
          backdropFilter: 'blur(8px)',
        }}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="handwritten text-xl font-bold" style={{ color: 'var(--ink)' }}>
              {config.title}
            </h1>
            <p className="text-xs worksheet-font" style={{ color: 'var(--ink-secondary)' }}>
              #{config.worksheetNumber} · {config.category}
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs worksheet-font" style={{ color: 'var(--ink-secondary)' }}>
            {config.timedMode && timeLeft !== null && (
              <span className="flex items-center gap-1.5 font-semibold text-sm"
                style={{ color: timeLeft < 60 ? 'var(--wrong)' : 'var(--ink)' }}>
                <Clock size={14} />
                {formatTime(timeLeft)}
              </span>
            )}
            <span className="flex items-center gap-1">
              <CheckCircle size={13} />
              {answered}/{config.numQuestions}
            </span>
            <span className="flex items-center gap-1">
              <AlertCircle size={13} />
              {remaining} left
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-2.5 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--paper-line)' }}>
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${progress}%`, backgroundColor: 'var(--accent-blue)' }}
          />
        </div>
      </div>

      {/* Worksheet paper */}
      <div className="rounded-2xl border shadow-md overflow-hidden"
        style={{
          borderColor: 'var(--paper-line)',
          backgroundColor: 'var(--paper-bg)',
        }}>
        
        {/* Worksheet header */}
        <div className="px-8 py-6 border-b text-center"
          style={{ borderColor: 'var(--paper-line)' }}>
          <h2 className="handwritten text-2xl font-bold" style={{ color: 'var(--ink)' }}>
            {config.title}
          </h2>
          <p className="worksheet-font text-sm mt-1" style={{ color: 'var(--ink-secondary)' }}>
            Worksheet #{config.worksheetNumber} &mdash; {config.category}
          </p>
          {config.timedMode && (
            <p className="text-xs mt-1" style={{ color: 'var(--ink-secondary)' }}>
              Time limit: {config.timeLimit} min
            </p>
          )}
        </div>

        {/* Questions */}
        <div className="px-6 md:px-10 py-6 space-y-1 ruled-paper">
          {answers.map((answer) => (
            <div key={answer.questionNumber}
              className="flex items-center gap-3 py-3 border-b"
              style={{ borderColor: 'var(--paper-line)' }}>
              
              {/* Question number */}
              <span className="worksheet-font text-sm font-semibold w-8 text-right flex-shrink-0"
                style={{ color: 'var(--ink-secondary)' }}>
                {answer.questionNumber}.
              </span>

              {/* Bubbles or input */}
              {config.answerType === 'bubble' ? (
                <div className="flex gap-2 flex-wrap">
                  {CHOICES.slice(0, config.numChoices).map((letter) => (
                    <button
                      key={letter}
                      onClick={() => handleBubbleSelect(answer.questionNumber, letter)}
                      className={`bubble ${answer.selectedChoice === letter ? 'selected' : ''}`}
                      aria-label={`Question ${answer.questionNumber}, choice ${letter}`}
                    >
                      {letter}
                    </button>
                  ))}
                </div>
              ) : (
                <input
                  type="text"
                  value={answer.writtenAnswer || ''}
                  onChange={(e) => handleWrittenChange(answer.questionNumber, e.target.value)}
                  className="worksheet-input"
                  placeholder="Answer…"
                />
              )}
            </div>
          ))}
        </div>

        {/* Done button */}
        <div className="px-8 py-6 text-center border-t" style={{ borderColor: 'var(--paper-line)' }}>
          {saving && (
            <p className="text-xs mb-3 worksheet-font" style={{ color: 'var(--ink-secondary)' }}>
              Saving…
            </p>
          )}
          <button
            onClick={() => handleDone()}
            className="px-10 py-3 rounded-xl text-base font-semibold worksheet-font transition-all active:scale-95"
            style={{
              backgroundColor: 'var(--ink)',
              color: 'var(--paper-bg)',
              letterSpacing: '0.05em',
            }}
          >
            DONE
          </button>
          <p className="text-xs mt-2" style={{ color: 'var(--ink-secondary)' }}>
            {answered} of {config.numQuestions} answered
          </p>
        </div>
      </div>
    </div>
  );
};

export default WorksheetPage;
