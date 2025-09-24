'use client';

import { useState } from 'react';
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

// Mock session data
const sessions = [
  {
    id: '1',
    employeeId: '1',
    employeeName: 'Sarah Chen',
    employeeAvatar: 'SC',
    startTime: '24/09/2024 09:15',
    endTime: '24/09/2024 17:30',
    duration: '8h 15m',
    focusTime: '6h 45m',
    focusPercent: 82.1,
    status: 'completed',
    apps: ['VS Code', 'Chrome', 'Slack'],
    screenshots: 45
  },
  {
    id: '2',
    employeeId: '2',
    employeeName: 'Mike Johnson',
    employeeAvatar: 'MJ',
    startTime: '24/09/2024 08:45',
    endTime: '24/09/2024 16:20',
    duration: '7h 35m',
    focusTime: '6h 10m',
    focusPercent: 81.3,
    status: 'completed',
    apps: ['Figma', 'Chrome', 'Notion'],
    screenshots: 38
  },
  {
    id: '3',
    employeeId: '3',
    employeeName: 'Lisa Wang',
    employeeAvatar: 'LW',
    startTime: '24/09/2024 10:00',
    endTime: 'Active',
    duration: '4h 23m',
    focusTime: '3h 15m',
    focusPercent: 74.2,
    status: 'active',
    apps: ['Photoshop', 'Chrome', 'Slack'],
    screenshots: 22
  },
  {
    id: '4',
    employeeId: '4',
    employeeName: 'David Kim',
    employeeAvatar: 'DK',
    startTime: '24/09/2024 09:30',
    endTime: '24/09/2024 18:15',
    duration: '8h 45m',
    focusTime: '7h 30m',
    focusPercent: 85.7,
    status: 'completed',
    apps: ['IntelliJ', 'Chrome', 'Terminal'],
    screenshots: 52
  }
];

// Mock employee details (reusing from employees page)
const employeeDetails = {
  '1': {
    name: 'Sarah Chen',
    email: 'sarah.chen@company.com',
    department: 'Engineering',
    role: 'USER',
    productivity7d: 92.5,
    avgFocusHDay: 6.8,
    status: 'online' as const
  },
  '2': {
    name: 'Mike Johnson',
    email: 'mike.j@company.com',
    department: 'Design',
    role: 'ADMIN',
    productivity7d: 88.3,
    avgFocusHDay: 5.9,
    status: 'online' as const
  },
  '3': {
    name: 'Lisa Wang',
    email: 'lisa.wang@company.com',
    department: 'Marketing',
    role: 'USER',
    productivity7d: 76.2,
    avgFocusHDay: 4.8,
    status: 'away' as const
  },
  '4': {
    name: 'David Kim',
    email: 'david.kim@company.com',
    department: 'Engineering',
    role: 'USER',
    productivity7d: 94.1,
    avgFocusHDay: 7.2,
    status: 'offline' as const
  }
};

export default function SessionsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredSessions = sessions.filter(session => {
    const matchesSearch = session.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         session.apps.some(app => app.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || session.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
              {sessions.filter(s => s.status === 'active').length} Active
            </Badge>
            <Badge variant="info">
              {sessions.length} Total Today
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
              {filteredSessions.map((session) => (
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
              ))}
            </TableBody>
          </Table>
        </Card>

        {/* Employee Details Sidebar */}
        {selectedEmployee && employeeDetails[selectedEmployee as keyof typeof employeeDetails] && (
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
                const employee = employeeDetails[selectedEmployee as keyof typeof employeeDetails];
                const employeeSessions = sessions.filter(s => s.employeeId === selectedEmployee);

                return (
                  <div className="space-y-6">
                    {/* Employee Info */}
                    <div className="text-center py-4">
                      <Avatar
                        fallback={employee.name}
                        status={employee.status}
                        size="lg"
                        className="mx-auto mb-3"
                      />
                      <h3 className="text-lg font-semibold text-ink-hi">{employee.name}</h3>
                      <p className="text-ink-muted">{employee.email}</p>
                      <Badge variant={employee.role === 'ADMIN' ? 'warning' : 'default'} className="mt-2">
                        {employee.role}
                      </Badge>
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
                        <div className="text-xs text-ink-muted">Productivity</div>
                        <div className="text-lg font-semibold text-ink-hi font-mono">
                          {employee.productivity7d.toFixed(1)}%
                        </div>
                      </div>
                      <div className="bg-raised p-3 rounded-lg">
                        <div className="text-xs text-ink-muted">Avg Focus</div>
                        <div className="text-lg font-semibold text-ink-hi font-mono">
                          {employee.avgFocusHDay.toFixed(1)}h
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