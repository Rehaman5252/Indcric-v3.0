'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSessionFromStorage } from '@/lib/admin-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  TrendingUp,
  DollarSign,
  BarChart3,
  XCircle,
  Check,
  X,
  Download,
  AlertTriangle,
  Clock,
  Calendar,
  RotateCcw,
} from 'lucide-react';
import {
  getAllPaymentRequests,
  getPaymentStats,
  markPaymentCompleted,
  markPaymentFailed,
} from '@/lib/payment-service';
import { PaymentRequest, PaymentStats } from '@/types/payment';
import { toast } from 'sonner';

// Time Slot Interface
interface TimeSlot {
  id: string;
  label: string;
  startTime: string;
  endTime: string;
  startMinutes: number;
}

// Payment with Slot
interface PaymentWithSlot extends PaymentRequest {
  timeSlot?: TimeSlot;
  originalTimestamp?: Date;
  slotAssignmentDebug?: string;
}

interface SlotGroup {
  slot: TimeSlot;
  payments: PaymentWithSlot[];
  totalAmount: number;
}

type ViewMode = 'none' | 'total' | 'pending' | 'completed' | 'failed';
type DisplayMode = 'table' | 'slots';

// Generate time slots - 24 hours, 10 minutes each (00:00 - 23:50)
const generateTimeSlots = (): TimeSlot[] => {
  const slots: TimeSlot[] = [];

  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 10) {
      const startHour = hour;
      const startMin = minute;
      const endHour = minute === 50 ? (hour + 1) % 24 : hour;
      const endMin = minute === 50 ? 0 : minute + 10;

      const startTimeStr = `${String(startHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}`;
      const endTimeStr = `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;
      const slotId = `slot_${startHour}_${startMin}`;

      slots.push({
        id: slotId,
        label: `${startTimeStr} - ${endTimeStr}`,
        startTime: startTimeStr,
        endTime: endTimeStr,
        startMinutes: startHour * 60 + startMin,
      });
    }
  }

  console.log(`✅ Generated ${slots.length} time slots`);
  return slots;
};

// Normalize timestamp to Date object with detailed logging
const normalizeTimestamp = (timestamp: any, paymentId?: string): Date | null => {
  if (!timestamp) {
    if (paymentId) console.warn(`⚠️ [${paymentId}] Timestamp is null/undefined`);
    return null;
  }

  try {
    // Firebase Timestamp object
    if (timestamp.toDate && typeof timestamp.toDate === 'function') {
      const d = timestamp.toDate() as Date;
      if (paymentId) console.log(`✓ [${paymentId}] Firebase Timestamp → ${d.toLocaleString()}`);
      return d;
    }

    // JavaScript Date
    if (timestamp instanceof Date) {
      if (paymentId) console.log(`✓ [${paymentId}] JS Date → ${timestamp.toLocaleString()}`);
      return timestamp;
    }

    // Number (milliseconds or seconds)
    if (typeof timestamp === 'number') {
      const d =
        timestamp < 10000000000
          ? new Date(timestamp * 1000)
          : new Date(timestamp);
      if (paymentId) console.log(`✓ [${paymentId}] Number → ${d.toLocaleString()}`);
      return d;
    }

    // String (ISO format)
    if (typeof timestamp === 'string') {
      const d = new Date(timestamp);
      if (!isNaN(d.getTime())) {
        if (paymentId) console.log(`✓ [${paymentId}] String → ${d.toLocaleString()}`);
        return d;
      }
    }

    if (paymentId) {
      console.error(`❌ [${paymentId}] Unknown timestamp type: ${typeof timestamp}`, timestamp);
    }
    return null;
  } catch (error) {
    if (paymentId) console.error(`❌ [${paymentId}] Error normalizing timestamp:`, error);
    return null;
  }
};

// Get time slot for payment - with detailed validation
const getTimeSlotForPayment = (timestamp: any, slots: TimeSlot[], paymentId?: string): TimeSlot | null => {
  const date = normalizeTimestamp(timestamp, paymentId);
  if (!date) {
    if (paymentId) console.warn(`⚠️ [${paymentId}] Failed to normalize timestamp`);
    return null;
  }

  const hours = date.getHours();
  const minutes = date.getMinutes();
  const totalMinutes = hours * 60 + minutes;

  const slot = slots.find(
    (slot) => totalMinutes >= slot.startMinutes && totalMinutes < slot.startMinutes + 10
  );

  if (!slot) {
    if (paymentId) {
      console.error(
        `❌ [${paymentId}] No slot found for ${hours}:${minutes} (${totalMinutes} minutes)`
      );
    }
    return null;
  }

  if (paymentId) console.log(`✓ [${paymentId}] Assigned to slot: ${slot.label}`);
  return slot;
};

// Slot Group Card Component
interface SlotGroupCardProps {
  slotGroup: SlotGroup;
  index: number;
  isPending?: boolean;
  onMarkCompleted: (paymentId: string) => Promise<void>;
  onMarkFailed: (paymentId: string) => Promise<void>;
  processing: string | null;
}

const SlotGroupCard = ({
  slotGroup,
  index,
  isPending = false,
  onMarkCompleted,
  onMarkFailed,
  processing,
}: SlotGroupCardProps) => {
  const [expanded, setExpanded] = useState(index < 2);

  return (
    <Card className="mb-4 hover:shadow-lg transition-shadow">
      <div
        className={`p-4 cursor-pointer border-b rounded-t-lg ${
          isPending
            ? 'bg-gradient-to-r from-amber-500/10 to-amber-500/5'
            : 'bg-gradient-to-r from-primary/10 to-primary/5'
        }`}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className={`h-5 w-5 ${isPending ? 'text-amber-600' : 'text-primary'}`} />
            <div>
              <h3 className="font-semibold text-lg">{slotGroup.slot.label}</h3>
              <p className="text-sm text-muted-foreground">
                {slotGroup.payments.length} payment{slotGroup.payments.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Total Amount</p>
              <p className={`font-bold text-lg ${isPending ? 'text-amber-600' : 'text-primary'}`}>
                ₹{slotGroup.totalAmount.toLocaleString()}
              </p>
            </div>
            <Button variant="ghost" size="sm" className={expanded ? 'rotate-180' : ''}>
              ▼
            </Button>
          </div>
        </div>
      </div>

      {expanded && (
        <CardContent className="pt-6">
          <div className="space-y-3">
            {slotGroup.payments.map((payment: PaymentWithSlot) => (
              <div
                key={payment.id}
                className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg hover:bg-secondary transition-colors"
              >
                <div className="flex-1">
                  <p className="font-semibold">{payment.userName}</p>
                  <p className="text-xs text-muted-foreground">
                    {payment.userUpi || 'N/A'} • {payment.userPhone}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="font-bold text-green-600">₹{payment.amount}</p>
                    <Badge
                      variant={
                        payment.status === 'completed'
                          ? 'default'
                          : payment.status === 'pending'
                          ? 'secondary'
                          : 'destructive'
                      }
                      className="text-xs mt-1"
                    >
                      {payment.status}
                    </Badge>
                  </div>

                  {payment.status === 'pending' && (
                    <div className="flex gap-1">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => onMarkCompleted(payment.id)}
                        disabled={processing === payment.id}
                        title="Mark as Paid"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => onMarkFailed(payment.id)}
                        disabled={processing === payment.id}
                        title="Mark as Failed"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default function FinancesPage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('none');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('table');
  const [payments, setPayments] = useState<PaymentWithSlot[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<PaymentWithSlot[]>([]);
  const [stats, setStats] = useState<PaymentStats>({
    totalPayments: 0,
    pendingPayments: 0,
    completedPayments: 0,
    failedPayments: 0,
    totalAmount: 0,
    pendingAmount: 0,
    completedAmount: 0,
  });
  const [processing, setProcessing] = useState<string | null>(null);
  const [timeSlots] = useState<TimeSlot[]>(generateTimeSlots());

  // ✅ SIMPLIFIED: Single Date Filter
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [dateFilterActive, setDateFilterActive] = useState(false);

  useEffect(() => {
    const adminSession = getSessionFromStorage();
    if (!adminSession) {
      router.push('/admin/login');
      return;
    }
    setSession(adminSession);
    loadPayments();
  }, [router]);

  const loadPayments = async () => {
    try {
      setLoading(true);
      console.log('📥 Loading payments...');
      const [allPayments, paymentStats] = await Promise.all([
        getAllPaymentRequests(),
        getPaymentStats(),
      ]);

      console.log(`\n📊 Total payments loaded: ${allPayments.length}`);
      console.log('Status breakdown:', {
        pending: allPayments.filter((p: PaymentRequest) => p.status === 'pending').length,
        completed: allPayments.filter((p: PaymentRequest) => p.status === 'completed').length,
        failed: allPayments.filter((p: PaymentRequest) => p.status === 'failed').length,
      });

      // Assign time slots to payments with detailed logging
      console.log('\n🔄 Assigning time slots...');
      const paymentsWithSlots: PaymentWithSlot[] = allPayments.map((payment: PaymentRequest, index: number) => {
        console.log(`\n[Payment ${index + 1}/${allPayments.length}] ${payment.userName} (${payment.id})`);
        console.log(`  Status: ${payment.status}`);

        const timestamp = payment.status === 'pending' ? payment.createdAt : payment.completedAt;
        const originalDate = normalizeTimestamp(timestamp, payment.id);
        const timeSlot = getTimeSlotForPayment(timestamp, timeSlots, payment.id);

        if (!timeSlot) {
          console.error(`❌ FAILED TO ASSIGN SLOT for ${payment.id}`);
        }

        return {
          ...payment,
          timeSlot: timeSlot || undefined,
          originalTimestamp: originalDate || undefined,
        };
      });

      console.log('\n✅ Slot assignment complete');

      // Count results
      const assignedCount = paymentsWithSlots.filter((p: PaymentWithSlot) => p.timeSlot).length;
      const failedCount = paymentsWithSlots.filter((p: PaymentWithSlot) => !p.timeSlot).length;
      console.log(`\n📈 Assignment Results: ${assignedCount} assigned, ${failedCount} failed`);

      setPayments(paymentsWithSlots);
      setFilteredPayments(paymentsWithSlots);
      setStats(paymentStats);
    } catch (error) {
      console.error('Error loading payments:', error);
      toast.error('Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  // ✅ SIMPLIFIED: Apply Date Filter (Single Date)
  const applyDateFilter = () => {
    if (!selectedDate) {
      toast.error('Please select a date');
      return;
    }

    const filterDate = new Date(selectedDate);
    const startOfDay = new Date(filterDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(filterDate);
    endOfDay.setHours(23, 59, 59, 999);

    let filtered = payments;

    // Apply status filter
    switch (viewMode) {
      case 'pending':
        filtered = payments.filter((p: PaymentWithSlot) => p.status === 'pending');
        break;
      case 'completed':
        filtered = payments.filter((p: PaymentWithSlot) => p.status === 'completed');
        break;
      case 'failed':
        filtered = payments.filter((p: PaymentWithSlot) => p.status === 'failed');
        break;
      default:
        filtered = payments;
    }

    // Apply date filter (for the entire day)
    filtered = filtered.filter((p: PaymentWithSlot) => {
      const paymentDate = normalizeTimestamp(p.createdAt);
      if (!paymentDate) return false;
      return paymentDate >= startOfDay && paymentDate <= endOfDay;
    });

    setFilteredPayments(filtered);
    setDateFilterActive(true);
    toast.success(`Showing ${filtered.length} payments on ${filterDate.toLocaleDateString()}`);
    console.log(`📋 Filtered to ${filtered.length} payments for ${selectedDate}`);
  };

  // ✅ SIMPLIFIED: Clear Date Filter
  const clearDateFilter = () => {
    setSelectedDate('');
    setDateFilterActive(false);
    
    // Reapply status filter only
    let filtered = payments;
    switch (viewMode) {
      case 'pending':
        filtered = payments.filter((p: PaymentWithSlot) => p.status === 'pending');
        break;
      case 'completed':
        filtered = payments.filter((p: PaymentWithSlot) => p.status === 'completed');
        break;
      case 'failed':
        filtered = payments.filter((p: PaymentWithSlot) => p.status === 'failed');
        break;
      default:
        filtered = payments;
    }
    setFilteredPayments(filtered);
    toast.success('Date filter cleared');
  };

  useEffect(() => {
    let filtered = payments;

    switch (viewMode) {
      case 'pending':
        filtered = payments.filter((p: PaymentWithSlot) => p.status === 'pending');
        break;
      case 'completed':
        filtered = payments.filter((p: PaymentWithSlot) => p.status === 'completed');
        break;
      case 'failed':
        filtered = payments.filter((p: PaymentWithSlot) => p.status === 'failed');
        break;
      default:
        filtered = payments;
    }

    // If date filter is active, reapply it
    if (dateFilterActive && selectedDate) {
      const filterDate = new Date(selectedDate);
      const startOfDay = new Date(filterDate);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(filterDate);
      endOfDay.setHours(23, 59, 59, 999);

      filtered = filtered.filter((p: PaymentWithSlot) => {
        const paymentDate = normalizeTimestamp(p.createdAt);
        if (!paymentDate) return false;
        return paymentDate >= startOfDay && paymentDate <= endOfDay;
      });
    }

    setFilteredPayments(filtered);
    console.log(`📋 Filtered to ${filtered.length} payments for view mode: ${viewMode}`);
  }, [viewMode, payments, dateFilterActive, selectedDate]);

  const handleMarkCompleted = async (paymentId: string) => {
    if (!session?.email) {
      toast.error('Admin session not found');
      return;
    }

    if (!confirm('Are you sure you have sent the payment to this user?')) return;

    try {
      setProcessing(paymentId);
      await markPaymentCompleted(paymentId, session.email);
      toast.success('Payment marked as completed!');
      loadPayments();
    } catch (error) {
      console.error('Error completing payment:', error);
      toast.error('Failed to mark payment as completed');
    } finally {
      setProcessing(null);
    }
  };

  const handleMarkFailed = async (paymentId: string) => {
    if (!session?.email) {
      toast.error('Admin session not found');
      return;
    }

    const reason = prompt('Please provide a reason for failure:');
    if (!reason) return;

    try {
      setProcessing(paymentId);
      await markPaymentFailed(paymentId, session.email, reason);
      toast.success('Payment marked as failed');
      loadPayments();
    } catch (error) {
      console.error('Error marking payment as failed:', error);
      toast.error('Failed to mark payment as failed');
    } finally {
      setProcessing(null);
    }
  };

  const exportToCSV = () => {
    const csv = [
      ['User Name', 'UPI ID', 'Phone', 'Amount', 'Status', 'Created At', 'Completed At', 'Completed By'],
      ...filteredPayments.map((p: PaymentWithSlot) => [
        p.userName,
        p.userUpi,
        p.userPhone,
        `₹${p.amount}`,
        p.status,
        p.createdAt.toDate().toLocaleString(),
        p.completedAt ? p.completedAt.toDate().toLocaleString() : '-',
        p.completedBy || '-',
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payments_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success('CSV exported successfully!');
  };

  // Helper function to group payments by slot
  const groupPaymentsBySlot = (paymentsToGroup: PaymentWithSlot[], useCreatedAt: boolean = false) => {
    console.log(`\n🔀 Grouping ${paymentsToGroup.length} payments by slot (useCreatedAt: ${useCreatedAt})...`);

    const groups = new Map<string, PaymentWithSlot[]>();
    let processedCount = 0;
    let skippedCount = 0;

    paymentsToGroup.forEach((payment: PaymentWithSlot) => {
      const timestamp = useCreatedAt ? payment.createdAt : payment.completedAt;
      const timeSlot = getTimeSlotForPayment(timestamp, timeSlots, payment.id);

      if (timeSlot) {
        const key = timeSlot.id;
        if (!groups.has(key)) {
          groups.set(key, []);
        }
        groups.get(key)!.push(payment);
        processedCount++;
      } else {
        console.warn(`⚠️ Payment ${payment.id} has no time slot`);
        skippedCount++;
      }
    });

    console.log(`✅ Grouping complete: ${processedCount} processed, ${skippedCount} skipped, ${groups.size} unique slots`);

    const sortedGroups: SlotGroup[] = [];
    groups.forEach((paymentsInSlot, slotId) => {
      const slot = timeSlots.find((s) => s.id === slotId);
      if (slot) {
        sortedGroups.push({
          slot,
          payments: paymentsInSlot.sort((a: PaymentWithSlot, b: PaymentWithSlot) => b.amount - a.amount),
          totalAmount: paymentsInSlot.reduce((sum, p: PaymentWithSlot) => sum + p.amount, 0),
        });
      }
    });

    const result = sortedGroups.sort((a: SlotGroup, b: SlotGroup) => a.slot.startMinutes - b.slot.startMinutes);
    console.log(`📊 Final slot groups: ${result.length} slots with payments`);
    return result;
  };

  // Group completed & failed payments by time slot
  const slotGroups: SlotGroup[] = groupPaymentsBySlot(
    filteredPayments.filter((p: PaymentWithSlot) => p.status !== 'pending'),
    false
  );

  // Group pending payments by creation time
  const pendingSlotGroups: SlotGroup[] = groupPaymentsBySlot(
    filteredPayments.filter((p: PaymentWithSlot) => p.status === 'pending'),
    true
  );

  if (loading || !session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading finances...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black text-white">💰 Finances & Payouts</h1>
          <p className="text-gray-400 mt-2">Real-time payment management for quiz winners</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportToCSV} className="gap-2">
            <Download className="h-5 w-5" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Stats Cards - CLICKABLE */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card
          className={`cursor-pointer transition-all hover:scale-105 ${
            viewMode === 'total' ? 'ring-2 ring-blue-500' : ''
          } bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800`}
          onClick={() => setViewMode(viewMode === 'total' ? 'none' : 'total')}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">🎯 Total Payments</CardTitle>
            <BarChart3 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-700 dark:text-blue-300">{stats.totalPayments}</div>
            <p className="text-xs text-muted-foreground mt-1">₹{stats.totalAmount.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all hover:scale-105 ${
            viewMode === 'pending' ? 'ring-2 ring-yellow-500' : ''
          } bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-950 dark:to-yellow-900 border-yellow-200 dark:border-yellow-800`}
          onClick={() => setViewMode(viewMode === 'pending' ? 'none' : 'pending')}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">⏳ Pending Payouts</CardTitle>
            <TrendingUp className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-700 dark:text-yellow-300">{stats.pendingPayments}</div>
            <p className="text-xs text-muted-foreground mt-1">₹{stats.pendingAmount.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all hover:scale-105 ${
            viewMode === 'completed' ? 'ring-2 ring-green-500' : ''
          } bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800`}
          onClick={() => setViewMode(viewMode === 'completed' ? 'none' : 'completed')}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">✅ Completed</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-700 dark:text-green-300">{stats.completedPayments}</div>
            <p className="text-xs text-muted-foreground mt-1">₹{stats.completedAmount.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all hover:scale-105 ${
            viewMode === 'failed' ? 'ring-2 ring-red-500' : ''
          } bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 border-red-200 dark:border-red-800`}
          onClick={() => setViewMode(viewMode === 'failed' ? 'none' : 'failed')}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">❌ Failed</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-700 dark:text-red-300">{stats.failedPayments}</div>
            <p className="text-xs text-muted-foreground mt-1">Click to review</p>
          </CardContent>
        </Card>
      </div>

      {/* ✅ SIMPLIFIED: Single Date Picker */}
      <Card className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 border-purple-200 dark:border-purple-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-purple-600" />
            📅 Filter by Date
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="select-date" className="text-sm font-semibold">
                Select Date
              </Label>
              <Input
                id="select-date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full"
                max={new Date().toISOString().split('T')[0]}
              />
            </div>

            <Button 
              onClick={applyDateFilter} 
              className="gap-2 bg-purple-600 hover:bg-purple-700"
              disabled={!selectedDate}
            >
              <Calendar className="h-4 w-4" />
              Show Payments
            </Button>

            {dateFilterActive && (
              <Button 
                onClick={clearDateFilter} 
                variant="outline" 
                className="gap-2 border-purple-300 text-purple-700 hover:bg-purple-100 dark:border-purple-700 dark:text-purple-300"
              >
                <RotateCcw className="h-4 w-4" />
                Clear Filter
              </Button>
            )}
          </div>

          {dateFilterActive && selectedDate && (
            <div className="mt-4 p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <p className="text-sm font-semibold text-purple-800 dark:text-purple-200">
                🔍 Showing payments from: <span className="font-bold">{new Date(selectedDate).toLocaleDateString('en-IN', { 
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}</span>
                <span className="ml-2 font-bold">({filteredPayments.length} payments)</span>
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Display Mode Toggle */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <p className="text-sm font-semibold">View Mode:</p>
            <div className="flex gap-2">
              <Button
                variant={displayMode === 'table' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDisplayMode('table')}
                className="gap-2"
              >
                <BarChart3 className="h-4 w-4" />
                Table View
              </Button>
              <Button
                variant={displayMode === 'slots' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDisplayMode('slots')}
                className="gap-2"
              >
                <Clock className="h-4 w-4" />
                Time Slots
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* TABLE VIEW */}
      {displayMode === 'table' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>
                {viewMode === 'total' && '📋 All Payment Requests'}
                {viewMode === 'pending' && '⏳ Pending Payouts'}
                {viewMode === 'completed' && '✅ Completed Payments'}
                {viewMode === 'failed' && '❌ Failed Payments'}
                {viewMode === 'none' && '📋 All Payment Requests'}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Showing {filteredPayments.length} payments</p>
            </div>
            {viewMode !== 'none' && (
              <Button variant="outline" onClick={() => setViewMode('none')} className="text-sm">
                Clear Filter
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {filteredPayments.length === 0 ? (
              <div className="text-center py-12">
                <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">No payments found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User Name</TableHead>
                      <TableHead>UPI ID</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created At</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayments.map((payment: PaymentWithSlot) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-medium">{payment.userName}</TableCell>
                        <TableCell className="font-mono text-xs">{payment.userUpi || 'Not Provided'}</TableCell>
                        <TableCell>{payment.userPhone}</TableCell>
                        <TableCell className="font-semibold text-green-600">₹{payment.amount}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              payment.status === 'completed'
                                ? 'default'
                                : payment.status === 'pending'
                                ? 'secondary'
                                : 'destructive'
                            }
                          >
                            {payment.status === 'completed' && '✅ '}
                            {payment.status === 'pending' && '⏳ '}
                            {payment.status === 'failed' && '❌ '}
                            {payment.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          {payment.createdAt.toDate().toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {payment.status === 'pending' && (
                            <div className="flex items-center gap-2">
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleMarkCompleted(payment.id)}
                                disabled={processing === payment.id}
                                title="Mark as Paid"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleMarkFailed(payment.id)}
                                disabled={processing === payment.id}
                                title="Mark as Failed"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                          {payment.status === 'completed' && (
                            <span className="text-xs text-muted-foreground">Paid by {payment.completedBy}</span>
                          )}
                          {payment.status === 'failed' && (
                            <span className="text-xs text-red-600">{payment.failureReason}</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* SLOT VIEW */}
      {displayMode === 'slots' && (
        <div>
          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                {viewMode === 'pending' ? 'Pending Payouts by Creation Time' : 'Payments by Time Slot'}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Showing {filteredPayments.length} payments in {viewMode === 'pending' ? pendingSlotGroups.length : slotGroups.length} time slots
                {viewMode === 'pending' && ' (sorted by creation time)'}
                {viewMode !== 'pending' && ' (sorted by completion time)'}
              </p>
            </CardHeader>
          </Card>

          {viewMode === 'pending' ? (
            // Show pending payments grouped by creation time
            pendingSlotGroups.length > 0 ? (
              pendingSlotGroups.map((slotGroup: SlotGroup, index: number) => (
                <SlotGroupCard
                  key={slotGroup.slot.id}
                  slotGroup={slotGroup}
                  index={index}
                  isPending={true}
                  onMarkCompleted={handleMarkCompleted}
                  onMarkFailed={handleMarkFailed}
                  processing={processing}
                />
              ))
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No pending payments found.</p>
                </CardContent>
              </Card>
            )
          ) : // Show completed/failed payments grouped by completion time
          slotGroups.length > 0 ? (
            slotGroups.map((slotGroup: SlotGroup, index: number) => (
              <SlotGroupCard
                key={slotGroup.slot.id}
                slotGroup={slotGroup}
                index={index}
                onMarkCompleted={handleMarkCompleted}
                onMarkFailed={handleMarkFailed}
                processing={processing}
              />
            ))
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No payments found for the selected filter.</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
