import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import type { WorksheetSession, UserStats, Category, CategoryProficiency } from '../types';

// ─── Worksheet Sessions ───────────────────────────────────────────────────────

export const createWorksheet = async (
  userId: string,
  session: Omit<WorksheetSession, 'id'>
): Promise<string> => {

  console.log("userId:", userId);
  console.log("session:", session);

  const ref = await addDoc(collection(db, 'worksheets'), {
    ...session,
    userId,
    startedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
  });

  return ref.id;
};

export const updateWorksheet = async (
  id: string,
  data: Partial<WorksheetSession>
): Promise<void> => {
  const ref = doc(db, 'worksheets', id);
  await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
};

export const deleteWorksheet = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, 'worksheets', id));
};

export const getWorksheet = async (id: string): Promise<WorksheetSession | null> => {
  const snap = await getDoc(doc(db, 'worksheets', id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...convertTimestamps(snap.data()) } as WorksheetSession;
};

// Subscribe to all user worksheets (real-time)
export const subscribeToWorksheets = (
  userId: string,
  callback: (sessions: WorksheetSession[]) => void
) => {
  const q = query(
    collection(db, 'worksheets'),
    where('userId', '==', userId),
    orderBy('startedAt', 'desc')
  );
  return onSnapshot(q, (snapshot) => {
    const sessions = snapshot.docs.map((d) => ({
      id: d.id,
      ...convertTimestamps(d.data()),
    })) as WorksheetSession[];
    callback(sessions);
  });
};

// Subscribe to single worksheet (real-time)
export const subscribeToWorksheet = (
  id: string,
  callback: (session: WorksheetSession | null) => void
) => {
  return onSnapshot(doc(db, 'worksheets', id), (snap) => {
    if (!snap.exists()) { callback(null); return; }
    callback({ id: snap.id, ...convertTimestamps(snap.data()) } as WorksheetSession);
  });
};

// ─── User Stats ───────────────────────────────────────────────────────────────

const DEFAULT_PROFICIENCY = (category: Category): CategoryProficiency => ({
  category,
  totalCorrect: 0,
  totalChecked: 0,
  proficiency: 0,
});

const CATEGORIES: Category[] = ['Verbal', 'Analytical', 'Numerical', 'General Information'];

export const DEFAULT_STATS = (): UserStats => ({
  totalWorksheets: 0,
  totalQuestions: 0,
  totalCorrect: 0,
  totalWrong: 0,
  overallAccuracy: 0,
  proficiency: Object.fromEntries(
    CATEGORIES.map((c) => [c, DEFAULT_PROFICIENCY(c)])
  ) as Record<Category, CategoryProficiency>,
});

export const subscribeToStats = (
  userId: string,
  callback: (stats: UserStats) => void
) => {
  const ref = doc(db, 'stats', userId);
  return onSnapshot(ref, (snap) => {
    if (!snap.exists()) {
      callback(DEFAULT_STATS());
      return;
    }
    callback(snap.data() as UserStats);
  });
};

export const recalcStats = async (userId: string): Promise<void> => {
  // Fetch all completed worksheets and recompute stats
  const q = query(
    collection(db, 'worksheets'),
    where('userId', '==', userId),
    where('isComplete', '==', true)
  );
  const snap = await getDocs(q);
  const sessions = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as WorksheetSession[];

  const stats = DEFAULT_STATS();
  stats.totalWorksheets = sessions.length;

  for (const s of sessions) {
    stats.totalCorrect += s.correct || 0;
    stats.totalWrong += s.wrong || 0;
    stats.totalQuestions += (s.config?.numQuestions || 0);

    const cat = s.config?.category;
    if (cat && stats.proficiency[cat]) {
      stats.proficiency[cat].totalCorrect += s.correct || 0;
      stats.proficiency[cat].totalChecked += s.checked || 0;
    }
  }

  const totalChecked = stats.totalCorrect + stats.totalWrong;
  stats.overallAccuracy = totalChecked > 0
    ? Math.round((stats.totalCorrect / totalChecked) * 100)
    : 0;

  for (const cat of CATEGORIES) {
    const p = stats.proficiency[cat];
    p.proficiency = p.totalChecked > 0
      ? Math.round((p.totalCorrect / p.totalChecked) * 100)
      : 0;
  }

  await setDoc(doc(db, 'stats', userId), stats);
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function convertTimestamps(data: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value instanceof Timestamp) {
      result[key] = value.toDate();
    } else {
      result[key] = value;
    }
  }
  return result;
}
