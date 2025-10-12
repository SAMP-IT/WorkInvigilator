'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/lib/auth-context';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell
} from '@/components/ui/Table';

interface MuteEvent {
  id: string;
  employeeName: string;
  employeeEmail: string;
  employeeDepartment: string;
  muteStartTime: string;
  muteEndTime: string;
  durationSeconds: number;
  detectionType: 'silence' | 'track_disabled' | 'hardware_mute';
  audioLevel: number;
  date: string;
  status: 'completed' | 'active';
  sessionId?: string;
  userId?: string;
}

export default function MuteEventsPage() {
  const { profile } = useAuth();
  const [muteEvents, setMuteEvents] = useState<MuteEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [dateRange, setDateRange] = useState('today');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [eventDetails, setEventDetails] = useState<Map<string, any>>(new Map());

  const getCurrentDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };
  const [startDate, setStartDate] = useState(getCurrentDate());
  const [endDate, setEndDate] = useState(getCurrentDate());

  const departments = Array.from(new Set(muteEvents.map(event => event.employeeDepartment).filter(dept => dept && dept !== 'N/A'))).sort();

  useEffect(() => {
    if (dateRange === 'custom' && (!startDate || !endDate)) {
      return;
    }
    loadMuteEvents();
  }, [dateRange, startDate, endDate, profile]);

  const loadMuteEvents = async () => {
    if (!profile?.organization_id) {
      setLoading(false);
      return;
    }

    if (dateRange === 'custom' && (!startDate || !endDate)) {
      setError('Please select both start and end dates');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      let url = `/api/mute-events?organizationId=${profile.organization_id}&range=${dateRange}`;
      if (dateRange === 'custom' && startDate && endDate) {
        url += `&startDate=${startDate}&endDate=${endDate}`;
      }

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setMuteEvents(data.events || []);
      } else {
        setError('Failed to load mute events');
      }
    } catch (err) {
      setError('Failed to load mute events');
    } finally {
      setLoading(false);
    }
  };

  const filteredData = muteEvents.filter(event => {
    const matchesSearch = event.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          event.employeeEmail.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = selectedDepartment === 'all' || event.employeeDepartment === selectedDepartment;
    return matchesSearch && matchesDepartment;
  });

  const getDetectionTypeBadge = (type: string) => {
    switch (type) {
      case 'silence':
        return <Badge variant="warning">Silence</Badge>;
      case 'track_disabled':
        return <Badge variant="danger">Track Disabled</Badge>;
      case 'hardware_mute':
        return <Badge variant="danger">Hardware Mute</Badge>;
      default:
        return <Badge variant="default">{type}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="danger">Active</Badge>;
      case 'completed':
        return <Badge variant="default">Completed</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) {
      return `${seconds}s`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${minutes}m`;
    }
  };

  const toggleRowExpansion = async (eventId: string) => {
    const newExpanded = new Set(expandedRows);

    if (newExpanded.has(eventId)) {
      newExpanded.delete(eventId);
    } else {
      newExpanded.add(eventId);

      // Fetch details if not already loaded
      if (!eventDetails.has(eventId)) {
        try {
          const response = await fetch(`/api/mute-events/${eventId}`);
          if (response.ok) {
            const data = await response.json();
            setEventDetails(new Map(eventDetails.set(eventId, data)));
          }
        } catch (error) {
          console.error('Failed to load event details:', error);
        }
      }
    }

    setExpandedRows(newExpanded);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-ink-hi">Microphone Mute Events</h1>
            <p className="text-ink-muted">Track when employees mute or silence their microphone</p>
          </div>
          <div className="flex items-center space-x-3">
            <Badge variant="info">
              {filteredData.length} Events
            </Badge>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="py-4">
              <div className="text-sm text-ink-muted">Total Events</div>
              <div className="text-2xl font-semibold text-ink-hi">{filteredData.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <div className="text-sm text-ink-muted">Active Mutes</div>
              <div className="text-2xl font-semibold text-danger">
                {filteredData.filter(e => e.status === 'active').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <div className="text-sm text-ink-muted">Total Duration</div>
              <div className="text-2xl font-semibold text-ink-hi">
                {formatDuration(filteredData.reduce((sum, e) => sum + e.durationSeconds, 0))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="py-4">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <Input
                    placeholder="Search by employee name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div>
                  <select
                    value={selectedDepartment}
                    onChange={(e) => setSelectedDepartment(e.target.value)}
                    className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-sm text-ink-hi focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="all">All Departments</option>
                    {departments.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center space-x-4 flex-wrap gap-4">
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="bg-surface border border-line rounded-lg px-3 py-2 text-sm text-ink-hi focus:outline-none focus:ring-2 focus:ring-primary min-w-[150px]"
                >
                  <option value="today">Today</option>
                  <option value="yesterday">Yesterday</option>
                  <option value="week">This Week</option>
                  <option value="lastWeek">Last Week</option>
                  <option value="month">This Month</option>
                  <option value="custom">Custom Range</option>
                </select>

                {dateRange === 'custom' && (
                  <>
                    <div className="flex items-center space-x-2">
                      <label className="text-sm text-ink-mid whitespace-nowrap">Start:</label>
                      <Input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-40"
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <label className="text-sm text-ink-mid whitespace-nowrap">End:</label>
                      <Input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-40"
                      />
                    </div>
                    <Button variant="outline" onClick={loadMuteEvents}>
                      Apply
                    </Button>
                  </>
                )}
              </div>

              {(selectedDepartment !== 'all' || searchTerm) && (
                <div className="flex items-center justify-between pt-2 border-t border-line">
                  <div className="flex items-center space-x-3">
                    <Badge variant="outline">
                      {filteredData.length} events
                    </Badge>
                    {selectedDepartment !== 'all' && (
                      <span className="text-sm text-ink-muted">
                        Department: {selectedDepartment}
                      </span>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedDepartment('all');
                    }}
                  >
                    Clear Filters
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Mute Events Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Start Time</TableHead>
                <TableHead>End Time</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Detection Type</TableHead>
                <TableHead>Audio Level</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><div className="h-4 bg-gray-300 rounded w-32 animate-pulse"></div></TableCell>
                    <TableCell><div className="h-4 bg-gray-300 rounded w-24 animate-pulse"></div></TableCell>
                    <TableCell><div className="h-4 bg-gray-300 rounded w-24 animate-pulse"></div></TableCell>
                    <TableCell><div className="h-4 bg-gray-300 rounded w-20 animate-pulse"></div></TableCell>
                    <TableCell><div className="h-4 bg-gray-300 rounded w-20 animate-pulse"></div></TableCell>
                    <TableCell><div className="h-4 bg-gray-300 rounded w-16 animate-pulse"></div></TableCell>
                    <TableCell><div className="h-6 bg-gray-300 rounded w-20 animate-pulse"></div></TableCell>
                    <TableCell><div className="h-4 bg-gray-300 rounded w-12 animate-pulse"></div></TableCell>
                    <TableCell><div className="h-6 bg-gray-300 rounded w-20 animate-pulse"></div></TableCell>
                  </TableRow>
                ))
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    <div className="text-danger text-sm">{error}</div>
                    <Button variant="outline" size="sm" onClick={loadMuteEvents} className="mt-2">
                      Try Again
                    </Button>
                  </TableCell>
                </TableRow>
              ) : filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    <div className="text-ink-muted">
                      {searchTerm ? 'No mute events found matching your search.' : 'No mute events recorded for this period.'}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map((event) => {
                  const isExpanded = expandedRows.has(event.id);
                  const details = eventDetails.get(event.id);

                  return (
                    <React.Fragment key={event.id}>
                      <TableRow className="hover:bg-surface/50 cursor-pointer" onClick={() => toggleRowExpansion(event.id)}>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <svg
                              className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                            <div>
                              <div className="font-medium text-ink-hi">{event.employeeName}</div>
                              <div className="text-xs text-ink-muted">{event.employeeEmail}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-ink-mid">{event.employeeDepartment}</span>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-sm text-ink-mid">{event.date}</span>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-sm text-ink-hi">{event.muteStartTime}</span>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-sm text-ink-hi">{event.muteEndTime}</span>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-ink-mid">{formatDuration(event.durationSeconds)}</span>
                        </TableCell>
                        <TableCell>
                          {getDetectionTypeBadge(event.detectionType)}
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-sm text-ink-mid">
                            {event.audioLevel ? `${(event.audioLevel * 100).toFixed(1)}%` : '-'}
                          </span>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(event.status)}
                        </TableCell>
                      </TableRow>

                      {isExpanded && details && (
                        <TableRow key={`${event.id}-details`} className="bg-surface/30">
                          <TableCell colSpan={9} className="py-6">
                            <div className="ml-12 space-y-6">
                              {/* Timeline */}
                              <div>
                                <h3 className="text-sm font-semibold text-ink-hi mb-4 flex items-center space-x-2">
                                  <span>📅</span>
                                  <span>Event Timeline</span>
                                </h3>
                                <div className="space-y-3">
                                  {details.timeline.map((item: any, idx: number) => (
                                    <div key={idx} className="flex items-start space-x-3">
                                      <div className="flex-shrink-0 mt-1">
                                        {item.type === 'session_start' && <span className="text-success text-lg">▶️</span>}
                                        {item.type === 'mute_detected' && <span className="text-danger text-lg">🔇</span>}
                                        {item.type === 'mute_ended' && <span className="text-success text-lg">🔊</span>}
                                        {item.type === 'session_end' && <span className="text-success text-lg">⏹️</span>}
                                      </div>
                                      <div className="flex-1">
                                        <div className="flex items-center space-x-2">
                                          <span className="font-mono text-xs text-ink-muted">{item.time}</span>
                                          <span className="text-sm text-ink-hi font-medium">{item.description}</span>
                                        </div>
                                        {item.detectionType && (
                                          <div className="mt-1 text-xs text-ink-muted">
                                            Detection: {item.detectionType.replace('_', ' ')} | Audio Level: {((item.audioLevel || 0) * 100).toFixed(1)}%
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Audio Chunks */}
                              {details.audioChunks && details.audioChunks.length > 0 && (
                                <div>
                                  <h3 className="text-sm font-semibold text-ink-hi mb-4 flex items-center space-x-2">
                                    <span>🎙️</span>
                                    <span>Audio Recording Details</span>
                                  </h3>
                                  <div className="space-y-2">
                                    {details.audioChunks.map((chunk: any) => (
                                      <div key={chunk.chunkNumber} className="flex items-center justify-between p-3 bg-background rounded border border-line">
                                        <div className="flex items-center space-x-4">
                                          <Badge size="sm" variant="outline">Chunk {chunk.chunkNumber}</Badge>
                                          <span className="font-mono text-xs text-ink-muted">{chunk.startTime}</span>
                                          <span className="text-xs text-ink-mid">Duration: {chunk.duration}s</span>
                                        </div>
                                        <div className="flex items-center space-x-3">
                                          <span className="text-xs text-ink-muted font-mono">{chunk.filename.split('/').pop()}</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Session Summary */}
                              {details.session && (
                                <div>
                                  <h3 className="text-sm font-semibold text-ink-hi mb-4">
                                    <span>Session Summary</span>
                                  </h3>
                                  <div className="grid grid-cols-3 gap-4">
                                    <div className="p-3 bg-background rounded border border-line">
                                      <div className="text-xs text-ink-muted">Session Start</div>
                                      <div className="font-mono text-sm text-ink-hi">{details.session.startTime}</div>
                                    </div>
                                    <div className="p-3 bg-background rounded border border-line">
                                      <div className="text-xs text-ink-muted">Session End</div>
                                      <div className="font-mono text-sm text-ink-hi">{details.session.endTime}</div>
                                    </div>
                                    <div className="p-3 bg-background rounded border border-line">
                                      <div className="text-xs text-ink-muted">Total Duration</div>
                                      <div className="font-mono text-sm text-ink-hi">{formatDuration(details.session.totalDuration || 0)}</div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Card>

        {/* Summary Footer */}
        {!loading && !error && filteredData.length > 0 && (
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center justify-center">
                <div className="text-sm text-ink-muted">
                  Showing {filteredData.length} mute event{filteredData.length !== 1 ? 's' : ''} for {dateRange === 'custom' ? `${startDate} to ${endDate}` : dateRange}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
