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

// ─── Sanitization Utility ───────────────────────────────────────────────────────
/**
 * Removes undefined values from an object recursively.
 * Firestore rejects undefined values, so this ensures all values are defined.
 */
const sanitizeForFirestore = (obj: any): any => {
  if (obj === null || obj === undefined) return null;
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeForFirestore);
  }
  
  if (typeof obj === 'object' && obj !== null) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      // Skip undefined values entirely
      if (value === undefined) {
        continue;
      }
      // Recursively sanitize nested objects
      if (typeof value === 'object' && value !== null && !(value instanceof Date)) {
        sanitized[key] = sanitizeForFirestore(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }
  
  return obj;
};

// ─── Worksheet Sessions ───────────────────────────────────────────────────────

export const createWorksheet = async (
  userId: string,
  session: Omit<WorksheetSession, 'id'>
): Promise<string> => {
  // Validate required fields
  if (!userId || !userId.trim()) {
    throw new Error('User ID is required');
  }

  if (!session.config || !session.config.title || !session.config.title.trim()) {
    throw new Error('Worksheet title is required');
  }

  if (!Array.isArray(session.answers) || session.answers.length === 0) {
    throw new Error('Worksheet must have at least one question');
  }

  // Sanitize the entire session object to remove undefined values
  const sanitizedSession = sanitizeForFirestore({
    ...session,
    userId,
    startedAt: serverTimestamp(), // Firestore server timestamp
    createdAt: serverTimestamp(),
  });

  console.log('[createWorksheet] Sanitized data:', sanitizedSession);

  try {
    const ref = await addDoc(collection(db, 'worksheets'), sanitizedSession);
    console.log('[createWorksheet] Success. Document ID:', ref.id);
    return ref.id;
  } catch (error) {
    console.error('[createWorksheet] Error adding document:', error);
    // Re-throw with more context
    if (error instanceof Error) {
      throw new Error(`Failed to create worksheet: ${error.message}`);
    }
    throw new Error('Failed to create worksheet due to unknown error');
  }
};

export const updateWorksheet = async (
  id: string,
  data: Partial<WorksheetSession>
): Promise<void> => {
  if (!id || !id.trim()) {
    throw new Error('Worksheet ID is required');
  }

  const sanitizedData = sanitizeForFirestore({
    ...data,
    updatedAt: serverTimestamp(),
  });

  const ref = doc(db, 'worksheets', id);
  
  try {
    await updateDoc(ref, sanitizedData);
    console.log('[updateWorksheet] Success');
  } catch (error) {
    console.error('[updateWorksheet] Error:', error);
    throw error;
  }
};

export const deleteWorksheet = async (id: string): Promise<void> => {
  if (!id || !id.trim()) {
    throw new Error('Worksheet ID is required');
  }

  try {
    await deleteDoc(doc(db, 'worksheets', id));
    console.log('[deleteWorksheet] Success');
  } catch (error) {
    console.error('[deleteWorksheet] Error:', error);
    throw error;
  }
};

export const getWorksheet = async (id: string): Promise<WorksheetSession | null> => {
  if (!id || !id.trim()) {
    throw new Error('Worksheet ID is required');
  }

  try {
    const snap = await getDoc(doc(db, 'worksheets', id));
    if (!snap.exists()) return null;
    return { id: snap.id, ...convertTimestamps(snap.data()) } as WorksheetSession;
  } catch (error) {
    console.error('[getWorksheet] Error:', error);
    throw error;
  }
};

export const listWorksheets = async (userId: string): Promise<WorksheetSession[]> => {
  if (!userId || !userId.trim()) {
    throw new Error('User ID is required');
  }

  try {
    const q = query(
      collection(db, 'worksheets'),
      where('userId', '==', userId),
      orderBy('startedAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map((doc) => ({
      id: doc.id,
      ...convertTimestamps(doc.data()),
    })) as WorksheetSession[];
  } catch (error) {
    console.error('[listWorksheets] Error:', error);
    throw error;
  }
};

// ─── Subscriptions ───────────────────────────────────────────────────────────

export const subscribeToWorksheets = (
  userId: string,
  callback: (worksheets: WorksheetSession[]) => void
): (() => void) => {
  if (!userId || !userId.trim()) {
    console.error('User ID is required for subscription');
    return () => {};
  }

  const q = query(
    collection(db, 'worksheets'),
    where('userId', '==', userId),
    orderBy('startedAt', 'desc')
  );

  const unsubscribe = onSnapshot(
    q,
    (snap) => {
      const worksheets = snap.docs.map((doc) => ({
        id: doc.id,
        ...convertTimestamps(doc.data()),
      })) as WorksheetSession[];
      callback(worksheets);
    },
    (error) => {
      console.error('[subscribeToWorksheets] Error:', error);
    }
  );

  return unsubscribe;
};

export const subscribeToWorksheet = (
  id: string,
  callback: (worksheet: WorksheetSession | null) => void
): (() => void) => {
  if (!id || !id.trim()) {
    console.error('Worksheet ID is required for subscription');
    return () => {};
  }

  const unsubscribe = onSnapshot(
    doc(db, 'worksheets', id),
    (snap) => {
      if (!snap.exists()) {
        callback(null);
        return;
      }
      callback({
        id: snap.id,
        ...convertTimestamps(snap.data()),
      } as WorksheetSession);
    },
    (error) => {
      console.error('[subscribeToWorksheet] Error:', error);
    }
  );

  return unsubscribe;
};

// ─── Stats ──────────────────────────────────────────────────────────────────

export const subscribeToStats = (
  userId: string,
  callback: (stats: UserStats) => void
): (() => void) => {
  if (!userId || !userId.trim()) {
    console.error('User ID is required for stats subscription');
    return () => {};
  }

  const unsubscribe = onSnapshot(
    doc(db, 'stats', userId),
    (snap) => {
      if (!snap.exists()) {
        callback(createEmptyStats());
        return;
      }
      callback(snap.data() as UserStats);
    },
    (error) => {
      console.error('[subscribeToStats] Error:', error);
      callback(createEmptyStats());
    }
  );

  return unsubscribe;
};

export const recalcStats = async (userId: string): Promise<void> => {
  if (!userId || !userId.trim()) {
    throw new Error('User ID is required');
  }

  // Fetch all worksheets
  const worksheets = await listWorksheets(userId);

  // Initialize stats
  let totalWorksheets = worksheets.length;
  let totalQuestions = 0;
  let totalCorrect = 0;
  let totalWrong = 0;
  const proficiencyMap: Record<Category, CategoryProficiency> = {
    Verbal: { category: 'Verbal', totalCorrect: 0, totalChecked: 0, proficiency: 0 },
    Analytical: { category: 'Analytical', totalCorrect: 0, totalChecked: 0, proficiency: 0 },
    Numerical: { category: 'Numerical', totalCorrect: 0, totalChecked: 0, proficiency: 0 },
    'General Information': { category: 'General Information', totalCorrect: 0, totalChecked: 0, proficiency: 0 },
  };

  // Aggregate data
  worksheets.forEach((ws) => {
    totalQuestions += ws.answers.length;
    totalCorrect += ws.correct;
    totalWrong += ws.wrong;

    const proficiency = proficiencyMap[ws.config.category];
    proficiency.totalCorrect += ws.correct;
    proficiency.totalChecked += ws.checked;
  });

  // Calculate percentages
  const overallAccuracy = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;

  Object.values(proficiencyMap).forEach((prof) => {
    prof.proficiency = prof.totalChecked > 0 ? (prof.totalCorrect / prof.totalChecked) * 100 : 0;
  });

  // Save to Firestore
  const statsRef = doc(db, 'stats', userId);
  const statsData: UserStats = {
    totalWorksheets,
    totalQuestions,
    totalCorrect,
    totalWrong,
    overallAccuracy,
    proficiency: proficiencyMap,
  };

  try {
    await setDoc(statsRef, sanitizeForFirestore(statsData));
    console.log('[recalcStats] Stats updated successfully');
  } catch (error) {
    console.error('[recalcStats] Error:', error);
    throw error;
  }
};

// ─── Helpers ────────────────────────────────────────────────────────────────

const convertTimestamps = (data: any): any => {
  if (data === null || data === undefined) return data;

  if (typeof data !== 'object') return data;

  if (data instanceof Timestamp) {
    return data.toDate();
  }

  if (Array.isArray(data)) {
    return data.map(convertTimestamps);
  }

  const converted: any = {};
  for (const [key, value] of Object.entries(data)) {
    converted[key] = convertTimestamps(value);
  }
  return converted;
};

const createEmptyStats = (): UserStats => ({
  totalWorksheets: 0,
  totalQuestions: 0,
  totalCorrect: 0,
  totalWrong: 0,
  overallAccuracy: 0,
  proficiency: {
    Verbal: { category: 'Verbal', totalCorrect: 0, totalChecked: 0, proficiency: 0 },
    Analytical: { category: 'Analytical', totalCorrect: 0, totalChecked: 0, proficiency: 0 },
    Numerical: { category: 'Numerical', totalCorrect: 0, totalChecked: 0, proficiency: 0 },
    'General Information': { category: 'General Information', totalCorrect: 0, totalChecked: 0, proficiency: 0 },
  },
});

export const DEFAULT_STATS: UserStats = {
  totalWorksheets: 0,
  totalQuestions: 0,
  totalCorrect: 0,
  totalWrong: 0,
  overallAccuracy: 0,
  proficiency: {
    Verbal: {
      category: 'Verbal' as Category,
      totalCorrect: 0,
      totalChecked: 0,
      proficiency: 0,
    },
    Analytical: {
      category: 'Analytical' as Category,
      totalCorrect: 0,
      totalChecked: 0,
      proficiency: 0,
    },
    Numerical: {
      category: 'Numerical' as Category,
      totalCorrect: 0,
      totalChecked: 0,
      proficiency: 0,
    },
    'General Information': {
      category: 'General Information' as Category,
      totalCorrect: 0,
      totalChecked: 0,
      proficiency: 0,
    },
  },
};