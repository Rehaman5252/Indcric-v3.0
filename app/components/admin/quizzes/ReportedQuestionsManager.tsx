// app/components/admin/quizzes/ReportedQuestionsManager.tsx
'use client';

import React, { useEffect, useState } from 'react';
import {
  subscribeToQuestionReports,
  updateReportStatus,
  type QuestionReport,
} from '@/lib/question-report-service';
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  Clock,
  MessageSquare,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export default function ReportedQuestionsManager() {
  const [reports, setReports] = useState<QuestionReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<
    'all' | 'pending' | 'reviewed' | 'dismissed' | 'fixed'
  >('all');
  const [expandedReport, setExpandedReport] = useState<string | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    const statusFilter = filter === 'all' ? undefined : filter;
    setLoading(true);
    const unsubscribe = subscribeToQuestionReports((data) => {
      setReports(data);
      setLoading(false);
    }, statusFilter);
    return () => unsubscribe();
  }, [filter]);

  const handleStatusUpdate = async (
    reportId: string,
    newStatus: QuestionReport['status']
  ) => {
    setUpdating(reportId);
    try {
      await updateReportStatus(reportId, newStatus, adminNote, 'admin');
      setAdminNote('');
      setExpandedReport(null);
    } catch (error) {
      console.error('Failed to update report:', error);
    } finally {
      setUpdating(null);
    }
  };

  const getStatusColor = (status: QuestionReport['status']) => {
    const colors = {
      pending: 'bg-yellow-900 text-yellow-200 border-yellow-700',
      reviewed: 'bg-blue-900 text-blue-200 border-blue-700',
      dismissed: 'bg-gray-800 text-gray-300 border-gray-600',
      fixed: 'bg-green-900 text-green-200 border-green-700',
    };
    return colors[status];
  };

  const getStatusIcon = (status: QuestionReport['status']) => {
    const icons = {
      pending: <Clock className="h-4 w-4" />,
      reviewed: <Eye className="h-4 w-4" />,
      dismissed: <XCircle className="h-4 w-4" />,
      fixed: <CheckCircle className="h-4 w-4" />,
    };
    return icons[status];
  };

  const getReasonColor = (reason: string) => {
    const colors: Record<string, string> = {
      'Incorrect Answer': 'bg-red-900 text-red-200',
      'Typo in Question/Options': 'bg-orange-900 text-orange-200',
      'Question is Ambiguous': 'bg-yellow-900 text-yellow-200',
      'Inappropriate Content': 'bg-pink-900 text-pink-200',
      'Technical Issue': 'bg-purple-900 text-purple-200',
      Other: 'bg-gray-800 text-gray-300',
    };
    return colors[reason] || 'bg-gray-800 text-gray-300';
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const pendingCount = reports.filter((r) => r.status === 'pending').length;

  return (
    <div className="bg-gray-900 border border-yellow-600 border-opacity-20 rounded-2xl p-8 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-black text-white">🚩 Reported Questions</h2>
          {pendingCount > 0 && (
            <span className="px-3 py-1 bg-red-600 text-white text-xs font-bold rounded-full animate-pulse">
              {pendingCount} Pending
            </span>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          {(['all', 'pending', 'reviewed', 'fixed', 'dismissed'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition ${
                filter === f
                  ? 'bg-yellow-500 text-black'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-yellow-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-400">Loading reports...</p>
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-12">
          <AlertTriangle className="h-12 w-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 text-lg">No reported questions found</p>
          <p className="text-gray-500 text-sm mt-2">
            {filter === 'all'
              ? 'When users report questions, they will appear here in real-time.'
              : `No ${filter} reports at the moment.`}
          </p>
        </div>
      ) : (
        <>
          {/* Reports Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-800 bg-gray-800">
                  <th className="text-left px-4 py-3 font-bold text-yellow-500">DATE</th>
                  <th className="text-left px-4 py-3 font-bold text-yellow-500">REPORTED BY</th>
                  <th className="text-left px-4 py-3 font-bold text-yellow-500">QUESTION</th>
                  <th className="text-left px-4 py-3 font-bold text-yellow-500">REASON</th>
                  <th className="text-left px-4 py-3 font-bold text-yellow-500">FORMAT</th>
                  <th className="text-left px-4 py-3 font-bold text-yellow-500">STATUS</th>
                  <th className="text-left px-4 py-3 font-bold text-yellow-500">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => {
                  const isExpanded = expandedReport === report.id;
                  return (
                    <React.Fragment key={report.id}>
                      {/* Main Row */}
                      <tr
                        className={`border-b border-gray-800 hover:bg-gray-800 transition cursor-pointer ${
                          isExpanded ? 'bg-gray-800' : ''
                        }`}
                        onClick={() =>
                          setExpandedReport(isExpanded ? null : report.id!)
                        }
                      >
                        <td className="px-4 py-3 text-gray-300 text-xs whitespace-nowrap">
                          {formatDate(report.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-white font-semibold text-sm">
                            {report.reportedByName}
                          </p>
                          <p className="text-gray-500 text-xs">
                            {report.reportedByEmail}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-gray-300 text-sm max-w-[300px]">
                          <p className="truncate">{report.questionText}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-bold ${getReasonColor(report.reason)}`}
                          >
                            {report.reason}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-300 font-semibold text-xs">
                          {report.quizFormat}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold border ${getStatusColor(report.status)}`}
                          >
                            {getStatusIcon(report.status)}
                            {report.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            className="p-2 bg-yellow-600 hover:bg-yellow-700 rounded text-black transition"
                            title="Toggle Details"
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedReport(isExpanded ? null : report.id!);
                            }}
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </button>
                        </td>
                      </tr>

                      {/* Expanded Detail Row */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={7} className="px-4 py-6">
                            <div className="bg-gray-800 rounded-xl p-6 space-y-4 border border-gray-700">
                              {/* Full Question */}
                              <div>
                                <p className="text-yellow-500 font-bold text-sm mb-2">📝 Full Question</p>
                                <p className="text-white bg-gray-900 p-3 rounded-lg text-sm leading-relaxed">
                                  {report.questionText}
                                </p>
                              </div>

                              {/* Options + Details Grid */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <p className="text-yellow-500 font-bold text-sm mb-2">📋 Options</p>
                                  <div className="space-y-1">
                                    {report.options?.map((opt, idx) => (
                                      <p
                                        key={idx}
                                        className={`text-sm p-2 rounded ${
                                          opt === report.correctAnswer
                                            ? 'bg-green-900 text-green-200 font-bold'
                                            : opt === report.userAnswer
                                            ? 'bg-red-900 text-red-200'
                                            : 'bg-gray-900 text-gray-300'
                                        }`}
                                      >
                                        {String.fromCharCode(65 + idx)}. {opt}
                                        {opt === report.correctAnswer && ' ✅'}
                                        {opt === report.userAnswer &&
                                          opt !== report.correctAnswer &&
                                          ' ❌'}
                                      </p>
                                    ))}
                                  </div>
                                </div>
                                <div>
                                  <p className="text-yellow-500 font-bold text-sm mb-2">ℹ️ Details</p>
                                  <div className="bg-gray-900 p-3 rounded-lg space-y-2 text-sm">
                                    <p className="text-gray-300">
                                      <span className="text-gray-500">Correct Answer:</span>{' '}
                                      <span className="text-green-400 font-bold">{report.correctAnswer}</span>
                                    </p>
                                    <p className="text-gray-300">
                                      <span className="text-gray-500">User Answer:</span>{' '}
                                      <span className="text-red-400 font-bold">{report.userAnswer}</span>
                                    </p>
                                    <p className="text-gray-300">
                                      <span className="text-gray-500">Slot ID:</span>{' '}
                                      <span className="text-white font-mono">{report.slotId}</span>
                                    </p>
                                    <p className="text-gray-300">
                                      <span className="text-gray-500">Format:</span>{' '}
                                      <span className="text-white">{report.quizFormat}</span>
                                    </p>
                                  </div>
                                </div>
                              </div>

                              {/* Explanation */}
                              {report.explanation && (
                                <div>
                                  <p className="text-yellow-500 font-bold text-sm mb-2">💡 AI Explanation</p>
                                  <p className="text-gray-300 bg-gray-900 p-3 rounded-lg text-sm">
                                    {report.explanation}
                                  </p>
                                </div>
                              )}

                              {/* User Comment */}
                              {report.comment && (
                                <div>
                                  <p className="text-yellow-500 font-bold text-sm mb-2">
                                    <MessageSquare className="inline h-4 w-4 mr-1" />
                                    User Comment
                                  </p>
                                  <p className="text-gray-300 bg-gray-900 p-3 rounded-lg text-sm italic">
                                    &quot;{report.comment}&quot;
                                  </p>
                                </div>
                              )}

                              {/* Admin Actions — only for pending */}
                              {report.status === 'pending' && (
                                <div className="border-t border-gray-700 pt-4">
                                  <p className="text-yellow-500 font-bold text-sm mb-3">⚡ Admin Action</p>
                                  <div className="space-y-3">
                                    <textarea
                                      value={adminNote}
                                      onChange={(e) => setAdminNote(e.target.value)}
                                      placeholder="Add admin note (optional)..."
                                      rows={2}
                                      className="w-full p-3 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-yellow-500 resize-none"
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                    <div className="flex gap-3">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleStatusUpdate(report.id!, 'fixed');
                                        }}
                                        disabled={updating === report.id}
                                        className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-sm transition disabled:opacity-50"
                                      >
                                        ✅ Mark as Fixed
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleStatusUpdate(report.id!, 'reviewed');
                                        }}
                                        disabled={updating === report.id}
                                        className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm transition disabled:opacity-50"
                                      >
                                        👁️ Mark as Reviewed
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleStatusUpdate(report.id!, 'dismissed');
                                        }}
                                        disabled={updating === report.id}
                                        className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-bold text-sm transition disabled:opacity-50"
                                      >
                                        ❌ Dismiss
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Already reviewed info */}
                              {report.status !== 'pending' && report.adminNote && (
                                <div className="border-t border-gray-700 pt-4">
                                  <p className="text-yellow-500 font-bold text-sm mb-2">📌 Admin Note</p>
                                  <p className="text-gray-300 bg-gray-900 p-3 rounded-lg text-sm">
                                    {report.adminNote}
                                  </p>
                                  {report.reviewedBy && (
                                    <p className="text-gray-500 text-xs mt-2">
                                      Reviewed by: {report.reviewedBy}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 text-xs text-gray-400">
            Showing {reports.length} report{reports.length !== 1 ? 's' : ''}{' '}
            {filter !== 'all' ? `(${filter})` : ''}
          </div>
        </>
      )}
    </div>
  );
}
