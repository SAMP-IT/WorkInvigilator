'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { supabase } from '@/lib/supabase';
import type { Profile, Recording } from '@/lib/supabase';

export default function AudioPage() {
  const searchParams = useSearchParams();
  const selectedEmployeeId = searchParams.get('employee');

  const [employees, setEmployees] = useState<Profile[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmailMap, setUserEmailMap] = useState<{ [key: string]: string }>({});

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
  }, [selectedEmployee]);

  async function loadEmployees() {
    try {
      const { data: employeesData } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'user')
        .order('email', { ascending: true });

      setEmployees(employeesData || []);

      if (employeesData && employeesData.length > 0 && !selectedEmployee) {
        setSelectedEmployee(employeesData[0].id);
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

      // Load recordings for the selected employee
      const { data: recordingsData } = await supabase
        .from('recordings')
        .select('*')
        .eq('user_id', employeeId)
        .order('created_at', { ascending: false });

      setRecordings(recordingsData || []);

      // Create user email mapping
      if (recordingsData && recordingsData.length > 0) {
        const userIds = [...new Set(recordingsData.map(r => r.user_id))];
        const { data: userProfiles } = await supabase
          .from('profiles')
          .select('id, email')
          .in('id', userIds);

        const emailMap: { [key: string]: string } = {};
        userProfiles?.forEach(profile => {
          emailMap[profile.id] = profile.email;
        });
        setUserEmailMap(emailMap);
      }

    } catch (error) {
      console.error('Error loading recordings:', error);
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

        {/* Employee Filter */}
        <Card>
          <CardHeader>
            <CardTitle>Select Employee</CardTitle>
          </CardHeader>
          <CardContent>
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="w-full max-w-xs bg-surface border border-line rounded-lg px-3 py-2 text-sm text-ink-hi focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={loading}
            >
              <option value="">Select an employee...</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.email}
                </option>
              ))}
            </select>
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
                            {formatDuration(recording.duration)}
                          </Badge>
                          <Badge size="sm" variant="outline">
                            {formatFileSize(recording.file_size)}
                          </Badge>
                        </div>

                        <div className="flex items-center space-x-4 text-xs text-ink-muted">
                          <span>Employee: {userEmailMap[recording.user_id] || 'Unknown'}</span>
                          <span>•</span>
                          <span>Created: {new Date(recording.created_at).toLocaleDateString()}</span>
                          <span>•</span>
                          <span>Time: {new Date(recording.created_at).toLocaleTimeString()}</span>
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
                        ) : (
                          <Badge variant="outline" size="sm">
                            No audio file available
                          </Badge>
                        )}
                      </div>
                    </div>
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

        {/* Audio Info */}
        <Card>
          <CardHeader>
            <CardTitle>Audio Recording Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-ink-muted space-y-2">
              <p><strong>Audio Quality:</strong> Recordings are captured at the system&apos;s default quality settings</p>
              <p><strong>Format Support:</strong> The player supports WebM, WAV, and MP3 audio formats</p>
              <p><strong>Privacy:</strong> All audio recordings are stored securely and are only accessible by administrators</p>
              <p><strong>Storage:</strong> Audio files are automatically organized by employee and date</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}