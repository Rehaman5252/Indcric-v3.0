// lib/user-management-service.ts
import { db } from '@/lib/firebase';
import { 
  collection, 
  doc, 
  getDocs, 
  onSnapshot, 
  deleteDoc, 
  query, 
  where,
  writeBatch
} from 'firebase/firestore';

export interface UserData {
  uid: string;
  displayName: string;
  email: string;
  phoneNumber: string;
  lastLogin: string;
  lastQuizTaken: string;
  lastQuizDate?: Date;
}

export interface UserMetrics {
  totalUsers: number;
  activeTodayUsers: string[];
  activeWeekUsers: string[];
  activeMonthUsers: string[];
}

// ✅ Helper function to parse any timestamp format to Date
function parseTimestamp(timestamp: any): Date | undefined {
  try {
    if (timestamp && typeof timestamp.toDate === 'function') {
      return timestamp.toDate();
    }
    if (timestamp && typeof timestamp === 'object' && 'seconds' in timestamp) {
      return new Date(timestamp.seconds * 1000);
    }
    if (timestamp instanceof Date) {
      return timestamp;
    }
    if (typeof timestamp === 'number') {
      return new Date(timestamp);
    }
    if (typeof timestamp === 'string') {
      const parsed = new Date(timestamp);
      return isNaN(parsed.getTime()) ? undefined : parsed;
    }
    return undefined;
  } catch (error) {
    console.error('Timestamp parsing error:', error);
    return undefined;
  }
}

// ✅ Format Date to Indian locale string
function formatDate(date: Date | undefined, options?: Intl.DateTimeFormatOptions): string {
  if (!date || isNaN(date.getTime())) {
    return 'N/A';
  }
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  };
  
  return date.toLocaleString('en-IN', options || defaultOptions);
}

export function subscribeToUserMetrics(callback: (metrics: UserMetrics) => void) {
  let currentMetrics: UserMetrics = {
    totalUsers: 0,
    activeTodayUsers: [],
    activeWeekUsers: [],
    activeMonthUsers: [],
  };

  const updateMetrics = () => callback({ ...currentMetrics });
  
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);
  
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  const usersUnsub = onSnapshot(collection(db, 'users'), (snapshot) => {
    currentMetrics.totalUsers = snapshot.size;
    updateMetrics();
  });

  const quizAttemptsUnsub = onSnapshot(collection(db, 'quizAttempts'), (snapshot) => {
    const todaySet = new Set<string>();
    const weekSet = new Set<string>();
    const monthSet = new Set<string>();

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const userId = data.userId;
      
      const attemptDate = parseTimestamp(data.timestamp);

      if (userId && attemptDate && !isNaN(attemptDate.getTime())) {
        if (attemptDate >= todayStart) todaySet.add(userId);
        if (attemptDate >= sevenDaysAgo) weekSet.add(userId);
        if (attemptDate >= thirtyDaysAgo) monthSet.add(userId);
      }
    });

    currentMetrics.activeTodayUsers = Array.from(todaySet);
    currentMetrics.activeWeekUsers = Array.from(weekSet);
    currentMetrics.activeMonthUsers = Array.from(monthSet);

    updateMetrics();
  });

  return () => {
    usersUnsub();
    quizAttemptsUnsub();
  };
}

async function buildQuizAttemptsMap(): Promise<Map<string, Date>> {
  const quizAttemptsMap = new Map<string, Date>();
  
  try {
    const quizDocs = await getDocs(collection(db, 'quizAttempts'));
    
    quizDocs.forEach((doc) => {
      const data = doc.data();
      const userId = data.userId;
      const attemptDate = parseTimestamp(data.timestamp);
      
      if (userId && attemptDate) {
        const existingDate = quizAttemptsMap.get(userId);
        if (!existingDate || attemptDate > existingDate) {
          quizAttemptsMap.set(userId, attemptDate);
        }
      }
    });
    
    console.log('✅ Quiz attempts map built:', quizAttemptsMap.size, 'unique users');
  } catch (error) {
    console.error('❌ Error building quiz attempts map:', error);
  }
  
  return quizAttemptsMap;
}

export async function getAllUsersWithDetails(): Promise<UserData[]> {
  try {
    console.time('⏱️ Total fetch time');
    
    console.time('⏱️ Fetching users and quiz attempts');
    const [userDocs, quizAttemptsMap] = await Promise.all([
      getDocs(collection(db, 'users')),
      buildQuizAttemptsMap()
    ]);
    console.timeEnd('⏱️ Fetching users and quiz attempts');

    console.time('⏱️ Processing users');
    const users: UserData[] = userDocs.docs.map((userDoc) => {
      const data = userDoc.data();
      
      const lastPlayedDate = parseTimestamp(data.lastPlayedAt);
      const lastLogin = formatDate(lastPlayedDate);

      const lastQuizDate = quizAttemptsMap.get(userDoc.id);
      const lastQuizTaken = formatDate(lastQuizDate);

      return {
        uid: userDoc.id,
        displayName: data.name || 'Unknown',
        email: data.email || 'N/A',
        phoneNumber: data.phone || 'N/A',
        lastLogin,
        lastQuizTaken,
        lastQuizDate,
      };
    });
    console.timeEnd('⏱️ Processing users');

    console.timeEnd('⏱️ Total fetch time');
    console.log('✅ All users loaded:', users.length);
    
    return users;
  } catch (error) {
    console.error('❌ Error fetching users:', error);
    return [];
  }
}

export async function getUsersByIdsWithDetails(userIds: string[]): Promise<UserData[]> {
  if (userIds.length === 0) return [];
  
  try {
    const allUsers = await getAllUsersWithDetails();
    return allUsers.filter((u) => userIds.includes(u.uid));
  } catch (error) {
    console.error('❌ Error fetching users by IDs:', error);
    return [];
  }
}

// ✅ ENHANCED: Delete user and all related data with batch operations
export async function deleteUser(userId: string): Promise<void> {
  try {
    console.log('🗑️ Starting deletion for user:', userId);

    // Delete user document
    await deleteDoc(doc(db, 'users', userId));
    console.log('✅ User document deleted');

    // Delete subcollections (handled by Firestore rules now)
    const subcollections = ['reviewState', 'quizAttempts', 'rewards', 'answers'];
    
    for (const subcol of subcollections) {
      try {
        const subcollectionRef = collection(db, `users/${userId}/${subcol}`);
        const subcollectionDocs = await getDocs(subcollectionRef);
        
        if (subcollectionDocs.size > 0) {
          const batch = writeBatch(db);
          subcollectionDocs.docs.forEach((doc) => {
            batch.delete(doc.ref);
          });
          await batch.commit();
          console.log(`✅ Deleted ${subcollectionDocs.size} docs from ${subcol}`);
        }
      } catch (error) {
        console.warn(`⚠️ Could not delete ${subcol}:`, error);
      }
    }

    // Delete related quiz attempts from main collection
    try {
      const quizAttemptsQuery = query(
        collection(db, 'quizAttempts'),
        where('userId', '==', userId)
      );
      const quizAttempts = await getDocs(quizAttemptsQuery);
      
      if (quizAttempts.size > 0) {
        const batch = writeBatch(db);
        quizAttempts.docs.forEach((doc) => {
          batch.delete(doc.ref);
        });
        await batch.commit();
        console.log(`✅ Deleted ${quizAttempts.size} quiz attempts`);
      }
    } catch (error) {
      console.warn('⚠️ Could not delete quiz attempts:', error);
    }

    // Delete user question history
    try {
      await deleteDoc(doc(db, 'userQuestionHistory', userId));
      console.log('✅ User question history deleted');
    } catch (error) {
      console.warn('⚠️ Could not delete question history:', error);
    }

    console.log('✅ User and all related data deleted successfully');
  } catch (error) {
    console.error('❌ Error deleting user:', userId, error);
    throw error;
  }
}
