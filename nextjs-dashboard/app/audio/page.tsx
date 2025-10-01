'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import type { Profile, Recording } from '@/lib/supabase';

export default function AudioPage() {
  const searchParams = useSearchParams();
  const selectedEmployeeId = searchParams.get('employee');
  const { profile } = useAuth();

  const [employees, setEmployees] = useState<Profile[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmailMap, setUserEmailMap] = useState<{ [key: string]: string }>({});
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  useEffect(() => {
    loadEmployees();
  }, []);

  useEffect(() => {
    if (selectedEmployeeId) {
      setSelectedEmployee(selectedEmployeeId);
    }
  }, [selectedEmployeeId]);

  useEffect(() => {
    if (selectedEmployee) {
      loadRecordings(selectedEmployee);
    }
  }, [selectedEmployee, startDate, endDate]);

  async function loadEmployees() {
    try {
      // Use the new audio API to get employees with recording counts
      const response = await fetch('/api/audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getEmployees' })
      });

      if (response.ok) {
        const data = await response.json();
        setEmployees(data.employees || []);

        if (data.employees && data.employees.length > 0 && !selectedEmployee) {
          setSelectedEmployee(data.employees[0].id);
        }
      } else {
        console.error('Failed to load employees');
      }
    } catch (error) {
      console.error('Error loading employees:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadRecordings(employeeId: string) {
    try {
      setLoading(true);

      if (!profile?.organization_id) {
        console.error('No organization ID found');
        setLoading(false);
        return;
      }

      // Use the new centralized audio API with organization filter and date range
      let url = `/api/audio?employeeId=${employeeId}&organizationId=${profile.organization_id}&limit=50`;
      if (startDate) url += `&startDate=${startDate}`;
      if (endDate) url += `&endDate=${endDate}`;

      const response = await fetch(url);

      if (response.ok) {
        const data = await response.json();
        setRecordings(data.recordings || []);

        // Create user email mapping from the recordings data
        const emailMap: { [key: string]: string } = {};
        data.recordings?.forEach((recording: { user_id?: string; employeeName?: string }) => {
          if (recording.user_id && recording.employeeName) {
            emailMap[recording.user_id] = recording.employeeName;
          }
        });
        setUserEmailMap(emailMap);
      } else {
        console.error('Failed to load recordings');
        setRecordings([]);
      }

    } catch (error) {
      console.error('Error loading recordings:', error);
      setRecordings([]);
    } finally {
      setLoading(false);
    }
  }

  const formatDuration = (duration: number) => {
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (size: number | null) => {
    if (!size) return 'N/A';
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
    return `${Math.round(size / (1024 * 1024))} MB`;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-ui text-2xl tracking-tightish font-semibold text-ink-hi">Audio Recordings</h1>
            <p className="font-ui text-sm text-ink-muted">Listen to employee audio recordings</p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="info">
              {recordings.length} Recordings
            </Badge>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-ink-hi mb-2">
                  Employee
                </label>
                <select
                  value={selectedEmployee}
                  onChange={(e) => setSelectedEmployee(e.target.value)}
                  className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-sm text-ink-hi focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={loading}
                >
                  <option value="">Select an employee...</option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.email}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-hi mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-sm text-ink-hi focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-hi mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-sm text-ink-hi focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={loading}
                />
              </div>
            </div>
            {(startDate || endDate) && (
              <div className="mt-3 flex items-center justify-between">
                <p className="text-sm text-ink-muted">
                  {startDate && endDate ? `Showing recordings from ${startDate} to ${endDate}` :
                   startDate ? `Showing recordings from ${startDate}` :
                   `Showing recordings until ${endDate}`}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                  }}
                >
                  Clear Dates
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Audio Recordings */}
        <Card>
          <CardHeader>
            <CardTitle>Audio Recordings</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="flex items-center justify-between p-4 bg-raised rounded-lg">
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-300 rounded w-1/3"></div>
                        <div className="h-3 bg-gray-300 rounded w-1/4"></div>
                      </div>
                      <div className="h-10 bg-gray-300 rounded w-20"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : recordings.length > 0 ? (
              <div className="space-y-4">
                {recordings.map((recording) => (
                  <div key={recording.id} className="p-4 bg-raised rounded-lg border border-line">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-sm font-medium text-ink-hi">
                            {recording.filename}
                          </h3>
                          <Badge size="sm" variant="outline">
                            {recording.durationFormatted || formatDuration(recording.duration)}
                          </Badge>
                          {recording.type && (
                            <Badge size="sm" variant={recording.type === 'complete' ? 'success' : 'info'}>
                              {recording.type === 'complete' ? 'Complete' : 'Chunked'}
                            </Badge>
                          )}
                          {recording.session_info && (
                            <Badge size="sm" variant="outline">
                              {recording.session_info.total_chunks} chunks
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center space-x-4 text-xs text-ink-muted">
                          <span>Employee: {recording.employeeName || userEmailMap[recording.user_id] || 'Unknown'}</span>
                          <span>•</span>
                          <span>Created: {recording.timestamp || new Date(recording.created_at).toLocaleDateString()}</span>
                          {recording.type === 'chunked' && recording.session_info && (
                            <>
                              <span>•</span>
                              <span>Session: {new Date(recording.session_info.session_start_time).toLocaleDateString()}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {recording.file_url ? (
                          <audio
                            controls
                            className="w-64"
                            preload="metadata"
                          >
                            <source src={recording.file_url} type="audio/webm" />
                            <source src={recording.file_url} type="audio/wav" />
                            <source src={recording.file_url} type="audio/mp3" />
                            Your browser does not support the audio element.
                          </audio>
                        ) : recording.session_info?.chunks && recording.session_info.chunks.length > 0 ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setExpandedSession(expandedSession === recording.id ? null : recording.id)}
                          >
                            {expandedSession === recording.id ? 'Hide' : 'Show'} {recording.session_info.chunks.length} Chunks
                          </Button>
                        ) : (
                          <Badge variant="outline" size="sm">
                            No audio file available
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Expanded Chunks View */}
                    {expandedSession === recording.id && recording.session_info?.chunks && (
                      <div className="mt-4 pl-4 border-l-2 border-primary/20">
                        <h4 className="text-sm font-medium text-ink-hi mb-3">Audio Chunks ({recording.session_info.chunks.length})</h4>
                        <div className="space-y-3">
                          {recording.session_info.chunks.map((chunk: { id: string; chunk_number: number; duration_seconds: number; chunk_start_time: string; file_url: string; filename: string }) => (
                            <div key={chunk.id} className="p-3 bg-surface rounded-lg border border-line">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2 mb-1">
                                    <Badge size="sm" variant="outline">Chunk {chunk.chunk_number}</Badge>
                                    <span className="text-xs text-ink-muted">{chunk.duration_seconds}s</span>
                                  </div>
                                  <p className="text-xs text-ink-muted">{chunk.filename}</p>
                                </div>
                                {chunk.file_url && (
                                  <audio
                                    controls
                                    className="w-48"
                                    preload="metadata"
                                  >
                                    <source src={chunk.file_url} type="audio/webm" />
                                    <source src={chunk.file_url} type="audio/wav" />
                                    Your browser does not support the audio element.
                                  </audio>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : selectedEmployee ? (
              <div className="text-center py-8 text-ink-muted">
                <div className="text-4xl mb-4">🎤</div>
                <p className="text-sm">No audio recordings found for this employee</p>
              </div>
            ) : (
              <div className="text-center py-8 text-ink-muted">
                <div className="text-4xl mb-4">🎵</div>
                <p className="text-sm">Select an employee to view their audio recordings</p>
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </DashboardLayout>
  );
}