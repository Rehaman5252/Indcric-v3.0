// lib/question-report-service.ts
'use client';

import { db } from '@/lib/firebase';
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  where,
  doc,
  updateDoc,
  Timestamp,
  getCountFromServer,
} from 'firebase/firestore';

// ========== TYPES ==========
export interface QuestionReport {
  id?: string;
  questionId: string;
  questionText: string;
  options: string[];
  correctAnswer: string;
  userAnswer: string;
  explanation: string;
  reportedByUserId: string;
  reportedByName: string;
  reportedByEmail: string;
  reason:
    | 'Incorrect Answer'
    | 'Typo in Question/Options'
    | 'Question is Ambiguous'
    | 'Inappropriate Content'
    | 'Technical Issue'
    | 'Other';
  comment: string;
  quizFormat: string;
  slotId: string;
  status: 'pending' | 'reviewed' | 'dismissed' | 'fixed';
  createdAt: Timestamp | number;
  updatedAt?: Timestamp | number;
  adminNote?: string;
  reviewedBy?: string;
}

// ========== USER SIDE: Submit Report ==========
export async function submitQuestionReport(
  report: Omit<QuestionReport, 'id' | 'status' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const docRef = await addDoc(collection(db, 'questionReports'), {
    ...report,
    status: 'pending',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  return docRef.id;
}

// ========== ADMIN SIDE: Real-time listener ==========
export function subscribeToQuestionReports(
  callback: (reports: QuestionReport[]) => void,
  statusFilter?: QuestionReport['status']
): () => void {
  let q;
  if (statusFilter) {
    q = query(
      collection(db, 'questionReports'),
      where('status', '==', statusFilter),
      orderBy('createdAt', 'desc')
    );
  } else {
    q = query(
      collection(db, 'questionReports'),
      orderBy('createdAt', 'desc')
    );
  }

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const reports: QuestionReport[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as QuestionReport[];
      callback(reports);
    },
    (error) => {
      console.error('Error listening to question reports:', error);
    }
  );

  return unsubscribe;
}

// ========== ADMIN SIDE: Update report status ==========
export async function updateReportStatus(
  reportId: string,
  status: QuestionReport['status'],
  adminNote: string,
  reviewedBy: string
): Promise<void> {
  const reportRef = doc(db, 'questionReports', reportId);
  await updateDoc(reportRef, {
    status,
    adminNote,
    reviewedBy,
    updatedAt: Timestamp.now(),
  });
}

// ========== ADMIN SIDE: Get report counts ==========
export async function getReportCounts(): Promise<{
  total: number;
  pending: number;
}> {
  try {
    const totalQuery = query(collection(db, 'questionReports'));
    const pendingQuery = query(
      collection(db, 'questionReports'),
      where('status', '==', 'pending')
    );
    const [totalSnapshot, pendingSnapshot] = await Promise.all([
      getCountFromServer(totalQuery),
      getCountFromServer(pendingQuery),
    ]);
    return {
      total: totalSnapshot.data().count,
      pending: pendingSnapshot.data().count,
    };
  } catch {
    return { total: 0, pending: 0 };
  }
}
