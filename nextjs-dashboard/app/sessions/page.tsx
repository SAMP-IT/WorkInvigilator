'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell
} from '@/components/ui/Table';

interface Session {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeAvatar: string;
  startTime: string;
  endTime: string;
  duration: string;
  focusTime: string;
  focusPercent: number;
  status: 'active' | 'completed' | 'paused';
  apps: string[];
  screenshots: number;
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredSessions = sessions.filter(session => {
    const matchesSearch = session.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         session.apps.some(app => app.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || session.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/sessions');

      if (!response.ok) {
        throw new Error('Failed to fetch sessions');
      }

      const data = await response.json();
      setSessions(data.sessions || []);
    } catch (err) {
      console.error('Error loading sessions:', err);
      setError('Failed to load sessions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="success">Active</Badge>;
      case 'completed':
        return <Badge variant="default">Completed</Badge>;
      case 'paused':
        return <Badge variant="warning">Paused</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  const getFocusColor = (percent: number) => {
    if (percent >= 80) return 'text-success';
    if (percent >= 70) return 'text-warn';
    return 'text-danger';
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-ink-hi">Work Sessions</h1>
            <p className="text-ink-muted">Monitor employee work timing sessions and productivity</p>
          </div>
          <div className="flex items-center space-x-3">
            <Badge variant="success">
              {loading ? '...' : sessions.filter(s => s.status === 'active').length} Active
            </Badge>
            <Badge variant="info">
              {loading ? '...' : sessions.length} Total Today
            </Badge>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <Input
                  placeholder="Search by employee name or application..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-surface border border-line rounded-lg px-3 py-2 text-sm text-ink-hi focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">All Sessions</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="paused">Paused</option>
              </select>
              <Button variant="outline">
                Export CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Sessions Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Session Time</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Focus Time</TableHead>
                <TableHead>Focus %</TableHead>
                <TableHead>Applications</TableHead>
                <TableHead>Screenshots</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                // Loading skeleton
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gray-300 rounded-full animate-pulse"></div>
                        <div>
                          <div className="h-4 bg-gray-300 rounded w-32 mb-1 animate-pulse"></div>
                          <div className="h-3 bg-gray-300 rounded w-16 animate-pulse"></div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="h-4 bg-gray-300 rounded w-24 mb-1 animate-pulse"></div>
                      <div className="h-3 bg-gray-300 rounded w-20 animate-pulse"></div>
                    </TableCell>
                    <TableCell><div className="h-4 bg-gray-300 rounded w-16 animate-pulse"></div></TableCell>
                    <TableCell><div className="h-4 bg-gray-300 rounded w-16 animate-pulse"></div></TableCell>
                    <TableCell><div className="h-4 bg-gray-300 rounded w-12 animate-pulse"></div></TableCell>
                    <TableCell><div className="h-6 bg-gray-300 rounded w-20 animate-pulse"></div></TableCell>
                    <TableCell><div className="h-4 bg-gray-300 rounded w-8 animate-pulse"></div></TableCell>
                    <TableCell><div className="h-6 bg-gray-300 rounded w-16 animate-pulse"></div></TableCell>
                    <TableCell><div className="h-8 bg-gray-300 rounded w-20 animate-pulse"></div></TableCell>
                  </TableRow>
                ))
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    <div className="text-danger text-sm">{error}</div>
                    <Button variant="outline" size="sm" onClick={loadSessions} className="mt-2">
                      Try Again
                    </Button>
                  </TableCell>
                </TableRow>
              ) : filteredSessions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    <div className="text-ink-muted">
                      {searchTerm || statusFilter !== 'all' ? 'No sessions found matching your criteria.' : 'No sessions found.'}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredSessions.map((session) => (
                <TableRow
                  key={session.id}
                  onClick={() => setSelectedEmployee(session.employeeId)}
                  selected={selectedEmployee === session.employeeId}
                >
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <Avatar
                        fallback={session.employeeAvatar}
                        size="sm"
                      />
                      <div>
                        <div className="font-medium text-ink-hi">{session.employeeName}</div>
                        <div className="text-sm text-ink-muted">ID: {session.employeeId}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-mono text-sm">
                      <div className="text-ink-hi">{session.startTime}</div>
                      <div className="text-ink-muted">to {session.endTime}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-ink-hi">{session.duration}</span>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-ink-mid">{session.focusTime}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <span className={`font-mono font-medium ${getFocusColor(session.focusPercent)}`}>
                        {session.focusPercent}%
                      </span>
                      <div
                        className={`w-2 h-2 rounded-full ${
                          session.focusPercent >= 80
                            ? 'bg-success'
                            : session.focusPercent >= 70
                            ? 'bg-warn'
                            : 'bg-danger'
                        }`}
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {session.apps.slice(0, 3).map((app, i) => (
                        <Badge key={i} variant="outline" size="sm">
                          {app}
                        </Badge>
                      ))}
                      {session.apps.length > 3 && (
                        <Badge variant="outline" size="sm">
                          +{session.apps.length - 3}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-ink-mid">{session.screenshots}</span>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(session.status)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="sm">
                        View Timeline
                      </Button>
                      <Button variant="ghost" size="sm">
                        •••
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
              )}
            </TableBody>
          </Table>
        </Card>

        {/* Employee Details Sidebar */}
        {selectedEmployee && (
          <Card className="fixed right-6 top-20 bottom-6 w-96 z-50 overflow-y-auto animate-slide-up">
            <CardHeader className="border-b border-line">
              <div className="flex items-center justify-between">
                <CardTitle>Employee Details</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedEmployee(null)}
                >
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {(() => {
                const employeeSessions = sessions.filter(s => s.employeeId === selectedEmployee);
                const employee = employeeSessions[0];

                if (!employee) return null;

                return (
                  <div className="space-y-6">
                    {/* Employee Info */}
                    <div className="text-center py-4">
                      <Avatar
                        fallback={employee.employeeAvatar}
                        size="lg"
                        className="mx-auto mb-3"
                      />
                      <h3 className="text-lg font-semibold text-ink-hi">{employee.employeeName}</h3>
                      <p className="text-ink-muted">Employee ID: {employee.employeeId}</p>
                    </div>

                    {/* Today's Sessions */}
                    <div className="space-y-4">
                      <h4 className="font-medium text-ink-hi">Today's Sessions ({employeeSessions.length})</h4>
                      <div className="space-y-3">
                        {employeeSessions.map((session) => (
                          <div key={session.id} className="bg-raised p-3 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-ink-muted font-mono">{session.startTime}</span>
                              {getStatusBadge(session.status)}
                            </div>
                            <div className="text-sm text-ink-hi">Duration: {session.duration}</div>
                            <div className="text-sm text-ink-mid">Focus: {session.focusTime} ({session.focusPercent}%)</div>
                            <div className="text-xs text-ink-muted mt-1">
                              {session.screenshots} screenshots • {session.apps.join(', ')}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-raised p-3 rounded-lg">
                        <div className="text-xs text-ink-muted">Total Sessions</div>
                        <div className="text-lg font-semibold text-ink-hi font-mono">
                          {employeeSessions.length}
                        </div>
                      </div>
                      <div className="bg-raised p-3 rounded-lg">
                        <div className="text-xs text-ink-muted">Avg Focus</div>
                        <div className="text-lg font-semibold text-ink-hi font-mono">
                          {employeeSessions.length > 0 ?
                            (employeeSessions.reduce((sum, s) => sum + s.focusPercent, 0) / employeeSessions.length).toFixed(1) + '%'
                            : '0%'
                          }
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex space-x-2">
                      <Button variant="outline" className="flex-1">
                        View All Sessions
                      </Button>
                      <Button className="flex-1">
                        Export Data
                      </Button>
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}