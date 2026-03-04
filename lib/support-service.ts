import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp,
  serverTimestamp,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface SupportMessage {
  id: string;
  senderId: string;
  senderName: string;
  message: string;
  timestamp: Timestamp;
  isAdmin: boolean;
}

export interface SupportTicket {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  title: string;
  description: string;
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high';
  createdAt: Timestamp;
  updatedAt: Timestamp;
  assignedTo?: string;
  participants: string[];
  messageCount: number;
}

// Create a new support ticket
export const createSupportTicket = async (
  userId: string,
  userName: string,
  userEmail: string,
  userPhone: string,
  title: string,
  description: string
): Promise<string> => {
  try {
    const ticketsRef = collection(db, 'supportTickets');
    const docRef = await addDoc(ticketsRef, {
      userId,
      userName,
      userEmail,
      userPhone,
      title,
      description,
      status: 'open',
      priority: 'medium',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      participants: [userId],
      messageCount: 0,
    });

    // Add initial message
    const messagesRef = collection(db, 'supportTickets', docRef.id, 'messages');
    await addDoc(messagesRef, {
      senderId: userId,
      senderName: userName,
      message: description,
      timestamp: Timestamp.now(),
      isAdmin: false,
    });

    return docRef.id;
  } catch (error) {
    console.error('Error creating support ticket:', error);
    throw error;
  }
};

// ✅ NEW: Get user's ACTIVE tickets only (open + in-progress)
export const getUserActiveTickets = async (userId: string): Promise<SupportTicket[]> => {
  try {
    const ticketsRef = collection(db, 'supportTickets');
    const q = query(
      ticketsRef,
      where('userId', '==', userId),
      where('status', 'in', ['open', 'in-progress']),
      orderBy('updatedAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as SupportTicket[];
  } catch (error) {
    console.error('Error fetching active tickets:', error);
    throw error;
  }
};

// Get user's ALL support tickets (including resolved and closed)
export const getUserSupportTickets = async (userId: string): Promise<SupportTicket[]> => {
  try {
    const ticketsRef = collection(db, 'supportTickets');
    const q = query(
      ticketsRef,
      where('userId', '==', userId),
      orderBy('updatedAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as SupportTicket[];
  } catch (error) {
    console.error('Error fetching user support tickets:', error);
    throw error;
  }
};

// ✅ NEW: Get admin's ACTIVE tickets only (open + in-progress)
export const getActiveTickets = async (): Promise<SupportTicket[]> => {
  try {
    const ticketsRef = collection(db, 'supportTickets');
    const q = query(
      ticketsRef,
      where('status', 'in', ['open', 'in-progress']),
      orderBy('updatedAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as SupportTicket[];
  } catch (error) {
    console.error('Error fetching active tickets:', error);
    throw error;
  }
};

// Get all support tickets (admin) - ALL statuses
export const getAllSupportTickets = async (): Promise<SupportTicket[]> => {
  try {
    const ticketsRef = collection(db, 'supportTickets');
    const q = query(ticketsRef, orderBy('updatedAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as SupportTicket[];
  } catch (error) {
    console.error('Error fetching all support tickets:', error);
    throw error;
  }
};

// Get single ticket with messages
export const getSupportTicket = async (ticketId: string): Promise<SupportTicket | null> => {
  try {
    const ticketRef = doc(db, 'supportTickets', ticketId);
    const snapshot = await getDoc(ticketRef);
    if (!snapshot.exists()) return null;
    return {
      id: snapshot.id,
      ...snapshot.data(),
    } as SupportTicket;
  } catch (error) {
    console.error('Error fetching support ticket:', error);
    throw error;
  }
};

// Get ticket messages
export const getTicketMessages = async (ticketId: string): Promise<SupportMessage[]> => {
  try {
    const messagesRef = collection(db, 'supportTickets', ticketId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as SupportMessage[];
  } catch (error) {
    console.error('Error fetching ticket messages:', error);
    throw error;
  }
};

// Add message to ticket
export const addTicketMessage = async (
  ticketId: string,
  senderId: string,
  senderName: string,
  message: string,
  isAdmin: boolean
): Promise<void> => {
  try {
    const messagesRef = collection(db, 'supportTickets', ticketId, 'messages');
    await addDoc(messagesRef, {
      senderId,
      senderName,
      message,
      timestamp: Timestamp.now(),
      isAdmin,
    });

    // Update ticket's updatedAt and messageCount
    const ticketRef = doc(db, 'supportTickets', ticketId);
    const messages = await getTicketMessages(ticketId);

    await updateDoc(ticketRef, {
      updatedAt: Timestamp.now(),
      messageCount: messages.length,
    });
  } catch (error) {
    console.error('Error adding ticket message:', error);
    throw error;
  }
};

// Update ticket status (admin)
export const updateTicketStatus = async (
  ticketId: string,
  status: 'open' | 'in-progress' | 'resolved' | 'closed'
): Promise<void> => {
  try {
    const ticketRef = doc(db, 'supportTickets', ticketId);
    await updateDoc(ticketRef, {
      status,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error updating ticket status:', error);
    throw error;
  }
};

// Update ticket priority (admin)
export const updateTicketPriority = async (
  ticketId: string,
  priority: 'low' | 'medium' | 'high'
): Promise<void> => {
  try {
    const ticketRef = doc(db, 'supportTickets', ticketId);
    await updateDoc(ticketRef, {
      priority,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error updating ticket priority:', error);
    throw error;
  }
};

// Assign ticket to admin (admin)
export const assignTicket = async (ticketId: string, adminId: string): Promise<void> => {
  try {
    const ticketRef = doc(db, 'supportTickets', ticketId);
    await updateDoc(ticketRef, {
      assignedTo: adminId,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error assigning ticket:', error);
    throw error;
  }
};

// Delete ticket (admin) – hard delete the document
export const deleteSupportTicket = async (ticketId: string): Promise<void> => {
  try {
    const ticketRef = doc(db, 'supportTickets', ticketId);
    await deleteDoc(ticketRef);
  } catch (error) {
    console.error('Error deleting support ticket:', error);
    throw error;
  }
};
