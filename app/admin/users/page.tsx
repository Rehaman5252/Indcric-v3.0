'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getSessionFromStorage } from '@/lib/admin-auth';
import {
  subscribeToUserMetrics,
  getAllUsersWithDetails,
  getUsersByIdsWithDetails,
  deleteUser,
  type UserMetrics,
  type UserData
} from '@/lib/user-management-service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, TrendingUp, Clock, Calendar, Trash2, Search, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

type ViewMode = 'total' | 'today' | 'week' | 'month' | null;

const StatCard = ({
  icon: Icon,
  title,
  value,
  description,
  color,
  onClick,
  isSelected
}: {
  icon: any;
  title: string;
  value: number;
  description: string;
  color: string;
  onClick: () => void;
  isSelected: boolean;
}) => (
  <Card
    className={`${color} hover:shadow-lg transition cursor-pointer ${isSelected ? 'ring-2 ring-white' : ''}`}
    onClick={onClick}
  >
    <CardHeader className="pb-2">
      <div className="flex items-center justify-between">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-5 w-5 opacity-60" />
      </div>
    </CardHeader>
    <CardContent>
      <div className="text-3xl font-bold">{value.toLocaleString()}</div>
      <p className="text-xs text-muted-foreground mt-1">{description}</p>
    </CardContent>
  </Card>
);

export default function UserManagementPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<UserMetrics>({
    totalUsers: 0,
    activeTodayUsers: [],
    activeWeekUsers: [],
    activeMonthUsers: [],
  });
  const [viewMode, setViewMode] = useState<ViewMode>(null);
  const [displayedUsers, setDisplayedUsers] = useState<UserData[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const adminSession = getSessionFromStorage();
    if (!adminSession) {
      router.push('/admin/login');
      return;
    }
    setSession(adminSession);
    setLoading(false);

    const unsubscribe = subscribeToUserMetrics(setMetrics);
    return () => unsubscribe();
  }, [router]);

  // ✅ Filter users based on search query
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return displayedUsers;

    const query = searchQuery.toLowerCase();
    return displayedUsers.filter(user =>
      user.displayName.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query) ||
      user.phoneNumber.toLowerCase().includes(query)
    );
  }, [displayedUsers, searchQuery]);

  const handleCardClick = async (mode: ViewMode) => {
    // ✅ Prevent re-fetching if same card clicked
    if (viewMode === mode) return;
    
    setViewMode(mode);
    setLoadingUsers(true);
    setSearchQuery('');

    try {
      let users: UserData[] = [];

      if (mode === 'total') {
        users = await getAllUsersWithDetails();
      } else if (mode === 'today') {
        users = await getUsersByIdsWithDetails(metrics.activeTodayUsers);
      } else if (mode === 'week') {
        users = await getUsersByIdsWithDetails(metrics.activeWeekUsers);
      } else if (mode === 'month') {
        users = await getUsersByIdsWithDetails(metrics.activeMonthUsers);
      }

      setDisplayedUsers(users);
    } catch (error) {
      console.error('Error loading users:', error);
      toast({
        title: 'Error',
        description: 'Failed to load user details',
        variant: 'destructive'
      });
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to delete user "${userName}"?`)) return;

    try {
      await deleteUser(userId);
      
      // ✅ Optimistic UI update instead of re-fetching
      setDisplayedUsers(prev => prev.filter(u => u.uid !== userId));
      
      toast({
        title: 'Success',
        description: `User "${userName}" deleted successfully`,
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete user',
        variant: 'destructive'
      });
    }
  };

  if (loading || !session) return null;

  const colors = {
    blue: 'bg-gradient-to-br from-blue-500/10 to-blue-600/5',
    green: 'bg-gradient-to-br from-green-500/10 to-green-600/5',
    purple: 'bg-gradient-to-br from-purple-500/10 to-purple-600/5',
    orange: 'bg-gradient-to-br from-orange-500/10 to-orange-600/5',
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-white mb-2">👥 User Management</h1>
        <p className="text-muted-foreground">Track active users and engagement metrics</p>
      </div>

      {/* 4 Clickable Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          title="Total Users"
          value={metrics.totalUsers}
          description="All registered players"
          color={colors.blue}
          onClick={() => handleCardClick('total')}
          isSelected={viewMode === 'total'}
        />
        <StatCard
          icon={TrendingUp}
          title="Active (Today)"
          value={metrics.activeTodayUsers.length}
          description="Played quiz today"
          color={colors.green}
          onClick={() => handleCardClick('today')}
          isSelected={viewMode === 'today'}
        />
        <StatCard
          icon={Clock}
          title="Active (This Week)"
          value={metrics.activeWeekUsers.length}
          description="Last 7 days"
          color={colors.purple}
          onClick={() => handleCardClick('week')}
          isSelected={viewMode === 'week'}
        />
        <StatCard
          icon={Calendar}
          title="Active (Last Month)"
          value={metrics.activeMonthUsers.length}
          description="Last 30 days"
          color={colors.orange}
          onClick={() => handleCardClick('month')}
          isSelected={viewMode === 'month'}
        />
      </div>

      {/* User Table with Search */}
      {viewMode && (
        <Card className="bg-card/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">
                {viewMode === 'total' && '👥 All Users'}
                {viewMode === 'today' && '🔥 Active Today'}
                {viewMode === 'week' && '📊 Active This Week'}
                {viewMode === 'month' && '📈 Active Last Month'}
                {' '}({filteredUsers.length}/{displayedUsers.length})
              </CardTitle>
            </div>

            {/* Search Box */}
            <div className="mt-4 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by name, email, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-zinc-900 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </CardHeader>

          <CardContent>
            {loadingUsers ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin mb-3" />
                <p>Loading users...</p>
              </div>
            ) : filteredUsers.length === 0 && displayedUsers.length > 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                🔍 No users match your search
              </div>
            ) : displayedUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                📭 No users found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-300">
                  <thead className="border-b border-gray-700">
                    <tr>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">Phone</th>
                      <th className="px-4 py-3">Last Login</th>
                      <th className="px-4 py-3">Last Quiz Taken</th>
                      {viewMode === 'total' && <th className="px-4 py-3">Action</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr key={user.uid} className="border-b border-gray-700 hover:bg-zinc-900 transition">
                        <td className="px-4 py-3 font-semibold">{user.displayName}</td>
                        <td className="px-4 py-3">{user.email}</td>
                        <td className="px-4 py-3">{user.phoneNumber}</td>
                        <td className="px-4 py-3 text-xs">{user.lastLogin}</td>
                        <td className="px-4 py-3 text-xs">{user.lastQuizTaken}</td>
                        {viewMode === 'total' && (
                          <td className="px-4 py-3">
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteUser(user.uid, user.displayName)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="text-center text-gray-500 text-xs py-4 border-t border-gray-800">
        <p>User Management Dashboard | Search, Filter & Manage Users ⚡ Optimized</p>
      </div>
    </div>
  );
}
