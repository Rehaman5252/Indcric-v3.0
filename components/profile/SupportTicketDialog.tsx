'use client';

import React, { memo, useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Ticket,
  Send,
  AlertCircle,
  ChevronRight,
  ArrowLeft,
  Loader2,
  Trash2,
} from 'lucide-react';
import { useAuth } from '@/context/AuthProvider';
import { useToast } from '@/hooks/use-toast';

interface SupportMessage {
  id: string;
  senderId: string;
  senderName: string;
  message: string;
  timestamp: any;
  isAdmin?: boolean;
}

interface SupportTicket {
  id: string;
  userId: string;
  title: string;
  description: string;
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high';
  createdAt: any;
  messageCount: number;
  isDeleted?: boolean;
}

const SupportTicketDialogComponent = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'create' | 'previous'>('create');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  
  // ✅ CHANGED: Separate active count from total tickets
  const [activeTicketCount, setActiveTicketCount] = useState(0);

  const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [replyText, setReplyText] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);

  const [deleteTicketId, setDeleteTicketId] = useState<string | null>(null);
  const [deletingTicket, setDeletingTicket] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium' as const,
  });

  useEffect(() => {
    if (user) {
      setInitialLoading(true);
      loadTickets();
    }
  }, [user]);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !profile || !formData.title.trim() || !formData.description.trim()) {
      toast({
        title: 'Error',
        description: 'Please fill in all fields',
      });
      return;
    }

    try {
      setLoading(true);

      const { getFirestore, collection, addDoc, serverTimestamp } = await import(
        'firebase/firestore'
      );
      const { getApps } = await import('firebase/app');

      const apps = getApps();
      if (apps.length === 0) {
        throw new Error('Firebase not initialized');
      }

      const db = getFirestore(apps[0]);

      await addDoc(collection(db, 'supportTickets'), {
        userId: user.uid,
        userName: profile.fullName || profile.name || user.displayName || 'User',
        userEmail: user.email || '',
        userPhone: profile.phone || '',
        title: formData.title.trim(),
        description: formData.description.trim(),
        priority: formData.priority,
        status: 'open',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        messageCount: 0,
        isDeleted: false,
      });

      toast({
        title: 'Success!',
        description: 'Support ticket created successfully!',
      });

      setFormData({ title: '', description: '', priority: 'medium' });
      await loadTickets();
      setActiveTab('previous');
    } catch (error) {
      console.error('Error creating ticket:', error);
      toast({
        title: 'Error',
        description: 'Failed to create support ticket. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  // ✅ UPDATED: Load all tickets + calculate active count
  const loadTickets = async () => {
    if (!user) return;
    try {
      const { getFirestore, collection, query, where, getDocs } = await import(
        'firebase/firestore'
      );
      const { getApps } = await import('firebase/app');

      const apps = getApps();
      if (apps.length === 0) {
        throw new Error('Firebase not initialized');
      }

      const db = getFirestore(apps[0]);
      
      // ✅ Get ALL tickets for display
      const q = query(
        collection(db, 'supportTickets'),
        where('userId', '==', user.uid)
      );
      const querySnapshot = await getDocs(q);
      const userTickets: SupportTicket[] = [];

      querySnapshot.forEach((doc) => {
        userTickets.push({
          id: doc.id,
          ...doc.data(),
        } as SupportTicket);
      });

      setTickets(userTickets);
      
      // ✅ Calculate ACTIVE count (only open + in-progress)
      const activeCount = userTickets.filter(
        (ticket) => ticket.status === 'open' || ticket.status === 'in-progress'
      ).length;
      
      setActiveTicketCount(activeCount);
      
      console.log(`[Tickets] Total: ${userTickets.length}, Active: ${activeCount}`);
    } catch (error) {
      console.error('Error loading tickets:', error);
    } finally {
      setInitialLoading(false);
    }
  };

  const openTicketConversation = async (ticket: SupportTicket) => {
    try {
      setActiveTicket(ticket);
      setLoadingMessages(true);
      setMessages([]);
      setReplyText('');

      const { getFirestore, collection, getDocs, query, orderBy } = await import(
        'firebase/firestore'
      );
      const { getApps } = await import('firebase/app');

      const apps = getApps();
      if (apps.length === 0) {
        throw new Error('Firebase not initialized');
      }

      const db = getFirestore(apps[0]);
      const messagesRef = collection(db, 'supportTickets', ticket.id, 'messages');
      const q = query(messagesRef, orderBy('timestamp', 'asc'));
      const snapshot = await getDocs(q);

      const msgs: SupportMessage[] = [];
      snapshot.forEach((doc) => {
        msgs.push({ id: doc.id, ...doc.data() } as SupportMessage);
      });

      setMessages(msgs);
    } catch (err) {
      console.error('Error loading messages:', err);
      toast({
        title: 'Error',
        description: 'Failed to load conversation',
      });
    } finally {
      setLoadingMessages(false);
    }
  };

  const sendReply = async () => {
    if (!activeTicket || !replyText.trim() || !user || !profile) return;

    try {
      setSendingReply(true);

      const { getFirestore, collection, addDoc, serverTimestamp, doc, updateDoc } = await import(
        'firebase/firestore'
      );
      const { getApps } = await import('firebase/app');

      const apps = getApps();
      if (apps.length === 0) {
        throw new Error('Firebase not initialized');
      }

      const db = getFirestore(apps[0]);
      const messagesRef = collection(db, 'supportTickets', activeTicket.id, 'messages');

      await addDoc(messagesRef, {
        senderId: user.uid,
        senderName: profile.fullName || profile.name || user.displayName || 'User',
        message: replyText.trim(),
        timestamp: serverTimestamp(),
        isAdmin: false,
      });

      const ticketRef = doc(db, 'supportTickets', activeTicket.id);
      await updateDoc(ticketRef, {
        messageCount: (activeTicket.messageCount || 0) + 1,
        updatedAt: serverTimestamp(),
      });

      setReplyText('');
      toast({
        title: 'Success!',
        description: 'Reply sent successfully',
      });

      await openTicketConversation(activeTicket);
      await loadTickets();
    } catch (err) {
      console.error('Error sending reply:', err);
      toast({
        title: 'Error',
        description: 'Failed to send reply',
      });
    } finally {
      setSendingReply(false);
    }
  };

  const deleteTicket = async (ticketId: string) => {
    if (!user) return;

    try {
      setDeletingTicket(true);

      const { getFirestore, doc, updateDoc } = await import('firebase/firestore');
      const { getApps } = await import('firebase/app');

      const apps = getApps();
      if (apps.length === 0) {
        throw new Error('Firebase not initialized');
      }

      const db = getFirestore(apps[0]);
      const ticketRef = doc(db, 'supportTickets', ticketId);

      await updateDoc(ticketRef, {
        isDeleted: true,
        updatedAt: new Date(),
      });

      toast({
        title: 'Success!',
        description: 'Ticket deleted successfully',
      });

      setDeleteTicketId(null);
      setActiveTicket(null);
      await loadTickets();
    } catch (error) {
      console.error('Error deleting ticket:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete ticket',
      });
    } finally {
      setDeletingTicket(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      loadTickets();
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      open: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400',
      'in-progress': 'bg-blue-500/20 text-blue-700 dark:text-blue-400',
      resolved: 'bg-green-500/20 text-green-700 dark:text-green-400',
      closed: 'bg-gray-500/20 text-gray-700 dark:text-gray-400',
    };
    return colors[status] || colors.closed;
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      low: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      high: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    };
    return colors[priority] || colors.medium;
  };

  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return '';
    try {
      const date = timestamp.toDate?.() || new Date(timestamp);
      return date.toLocaleString();
    } catch {
      return '';
    }
  };

  return (
    <>
      <Card className="bg-card shadow-lg border border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Ticket className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-lg font-semibold">Raise Token</CardTitle>
                <CardDescription>Create and track your support requests</CardDescription>
              </div>
            </div>
            {/* ✅ CHANGED: Show active count instead of total */}
            {activeTicketCount > 0 && (
              <Badge className="bg-primary/20 text-primary border-primary/30">
                {activeTicketCount} Active
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent>
          <Dialog open={open} onOpenChange={handleOpenChange}>
            <Button
              onClick={() => setOpen(true)}
              size="lg"
              className="w-full justify-between text-base py-6 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            >
              {/* ✅ CHANGED: Show ticket count contextually */}
              <span>
                {activeTicketCount > 0 
                  ? `View Tickets (${activeTicketCount} Active)` 
                  : tickets.length > 0
                  ? `View ${tickets.length} Tickets`
                  : 'Create New Token'}
              </span>
              <ChevronRight className="h-5 w-5" />
            </Button>

            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              {/* CONVERSATION VIEW */}
              {activeTicket ? (
                <>
                  <DialogHeader>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setActiveTicket(null);
                          setMessages([]);
                          setReplyText('');
                        }}
                        className="hover:bg-muted p-1 rounded"
                      >
                        <ArrowLeft className="h-5 w-5" />
                      </button>
                      <div className="flex-1">
                        <DialogTitle className="text-xl font-bold">{activeTicket.title}</DialogTitle>
                        <DialogDescription>{activeTicket.description}</DialogDescription>
                      </div>
                      <button
                        type="button"
                        onClick={() => setDeleteTicketId(activeTicket.id)}
                        className="p-2 rounded bg-destructive/80 hover:bg-destructive text-white"
                        title="Delete ticket"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </DialogHeader>

                  <div className="space-y-3 py-4">
                    <div className="flex gap-2">
                      <Badge className={getStatusColor(activeTicket.status)}>
                        {activeTicket.status}
                      </Badge>
                      <Badge className={getPriorityColor(activeTicket.priority)}>
                        {activeTicket.priority}
                      </Badge>
                    </div>

                    <div className="max-h-64 overflow-y-auto space-y-2 bg-muted/60 p-3 rounded-lg border border-border">
                      {loadingMessages ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                      ) : messages.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No messages yet. Start the conversation!
                        </p>
                      ) : (
                        messages.map((msg) => (
                          <div
                            key={msg.id}
                            className={`p-3 rounded-lg text-sm ${
                              msg.isAdmin
                                ? 'bg-primary/10 ml-8 border-l-2 border-primary'
                                : 'bg-background/80 mr-8 border-l-2 border-muted-foreground'
                            }`}
                          >
                            <div className="flex justify-between items-start mb-1">
                              <span className="font-medium text-xs">{msg.senderName}</span>
                              {msg.isAdmin && (
                                <Badge variant="secondary" className="text-xs">
                                  Support Team
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mb-1">
                              {formatTimestamp(msg.timestamp)}
                            </p>
                            <p className="text-foreground">{msg.message}</p>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="space-y-2 border-t pt-3">
                      <label className="text-sm font-medium">Your Reply</label>
                      <Textarea
                        rows={3}
                        placeholder="Type your reply here..."
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        disabled={sendingReply}
                        className="resize-none"
                      />
                    </div>
                  </div>

                  <DialogFooter className="pt-4 border-t">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setActiveTicket(null);
                        setMessages([]);
                        setReplyText('');
                      }}
                      disabled={sendingReply}
                    >
                      Back to Tickets
                    </Button>
                    <Button
                      type="button"
                      disabled={!replyText.trim() || sendingReply}
                      onClick={sendReply}
                      className="gap-2"
                    >
                      {sendingReply ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          Send Reply
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </>
              ) : (
                <>
                  {/* TAB NAVIGATION */}
                  <div className="flex gap-2 border-b mb-4">
                    <button
                      onClick={() => setActiveTab('create')}
                      className={`px-4 py-2 font-medium text-sm transition-colors ${
                        activeTab === 'create'
                          ? 'border-b-2 border-primary text-primary'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Create New Token
                    </button>
                    {tickets.length > 0 && (
                      <button
                        onClick={() => setActiveTab('previous')}
                        className={`px-4 py-2 font-medium text-sm transition-colors ${
                          activeTab === 'previous'
                            ? 'border-b-2 border-primary text-primary'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {/* ✅ Show both active and total */}
                        All Tokens ({tickets.length})
                        {activeTicketCount > 0 && (
                          <span className="ml-1 text-xs text-primary">
                            · {activeTicketCount} active
                          </span>
                        )}
                      </button>
                    )}
                  </div>

                  {/* CREATE TAB */}
                  {activeTab === 'create' && (
                    <>
                      <DialogHeader className="mb-4">
                        <DialogTitle className="text-xl font-bold">Create Support Token</DialogTitle>
                        <DialogDescription>
                          Describe your issue and we'll get back to you soon.
                        </DialogDescription>
                      </DialogHeader>

                      <form onSubmit={handleCreateTicket} className="space-y-4">
                        <div>
                          <label className="text-sm font-medium">Title</label>
                          <Input
                            placeholder="Brief title of your issue"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            disabled={loading}
                          />
                        </div>

                        <div>
                          <label className="text-sm font-medium">Description</label>
                          <Textarea
                            placeholder="Describe your issue in detail..."
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            disabled={loading}
                            rows={5}
                          />
                        </div>

                        <div>
                          <label className="text-sm font-medium">Priority</label>
                          <select
                            value={formData.priority}
                            onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                            disabled={loading}
                            className="w-full p-2 border rounded bg-background text-foreground"
                          >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                          </select>
                        </div>

                        <DialogFooter className="pt-4 border-t flex justify-between">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setOpen(false)}
                            disabled={loading}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="submit"
                            disabled={loading || !formData.title.trim() || !formData.description.trim()}
                          >
                            <Send className="mr-2 h-4 w-4" />
                            {loading ? 'Creating...' : 'Create Token'}
                          </Button>
                        </DialogFooter>
                      </form>

                      {tickets.length > 0 && (
                        <div className="pt-4 border-t">
                          <Button
                            type="button"
                            variant="ghost"
                            className="w-full"
                            onClick={() => setActiveTab('previous')}
                          >
                            View My {tickets.length} Tokens
                          </Button>
                        </div>
                      )}
                    </>
                  )}

                  {/* PREVIOUS TICKETS TAB */}
                  {activeTab === 'previous' && (
                    <>
                      <DialogHeader>
                        <DialogTitle className="text-xl font-bold">My Support Tokens</DialogTitle>
                        <DialogDescription>
                          Track all your support requests here
                        </DialogDescription>
                      </DialogHeader>

                      <div className="space-y-3 py-4">
                        {initialLoading ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                          </div>
                        ) : tickets.length === 0 ? (
                          <div className="text-center py-8">
                            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                            <p className="text-muted-foreground">No tokens created yet</p>
                            <Button
                              type="button"
                              variant="outline"
                              className="mt-4"
                              onClick={() => setActiveTab('create')}
                            >
                              Create Your First Token
                            </Button>
                          </div>
                        ) : (
                          tickets.map((ticket) => (
                            <Card 
                              key={ticket.id} 
                              className="bg-muted/50 cursor-pointer hover:bg-muted/70 transition-colors"
                              onClick={() => openTicketConversation(ticket)}
                            >
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between mb-2">
                                  <h3 className="font-semibold text-foreground">{ticket.title}</h3>
                                  <Badge className={getStatusColor(ticket.status)}>
                                    {ticket.status}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground mb-2">
                                  {ticket.description.substring(0, 100)}...
                                </p>
                                <div className="flex items-center justify-between">
                                  <Badge className={getPriorityColor(ticket.priority)}>
                                    {ticket.priority}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {ticket.messageCount || 0} messages
                                  </span>
                                </div>
                              </CardContent>
                            </Card>
                          ))
                        )}
                      </div>

                      <DialogFooter className="pt-4 border-t">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setActiveTab('create')}
                          className="w-full"
                        >
                          Create New Token
                        </Button>
                      </DialogFooter>
                    </>
                  )}
                </>
              )}
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {/* DELETE CONFIRMATION DIALOG */}
      <AlertDialog open={!!deleteTicketId} onOpenChange={() => setDeleteTicketId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Support Ticket?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this ticket and all its messages. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <AlertDialogCancel onClick={() => setDeleteTicketId(null)} disabled={deletingTicket}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTicketId && deleteTicket(deleteTicketId)}
              disabled={deletingTicket}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingTicket ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Ticket'
              )}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

const SupportTicketDialog = memo(SupportTicketDialogComponent);
export default SupportTicketDialog;
