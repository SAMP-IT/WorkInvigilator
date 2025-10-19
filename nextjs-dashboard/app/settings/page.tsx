'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';
import { useAuth } from '@/lib/auth-context';

interface UserSettings {
  id: string;
  name: string;
  email: string;
  role: string;
  organization: string;
  department: string;
  joinDate: string;
  lastLogin: string;
  totalEmployees: number;
  activeEmployees: number;
  avatar: string;
  screenshotInterval?: string;
  dataRetention?: string;
  autoDelete?: boolean;
  emailNotifications?: boolean;
  lowProductivityAlerts?: boolean;
  dailyReports?: boolean;
}

interface Employee {
  id: string;
  name: string;
  email: string;
  department: string;
  role: string;
  status: 'online' | 'offline';
  lastActive: string;
}

export default function SettingsPage() {
  const { profile, user } = useAuth();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    department: ''
  });

  // Employee management states
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (profile?.organization_id && user?.id) {
      loadSettings();
      // Load employees if user is admin
      if (profile?.role === 'admin') {
        loadEmployees();
      }
    }
  }, [profile, user]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!profile?.organization_id || !user?.id) {
        setError('User not authenticated');
        setLoading(false);
        return;
      }

      const response = await fetch(`/api/settings?userId=${user.id}&organizationId=${profile.organization_id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch settings');
      }

      const data = await response.json();
      setSettings(data.currentUser);
      setFormData({
        name: data.currentUser?.name || '',
        email: data.currentUser?.email || '',
        department: data.currentUser?.department || ''
      });
    } catch (err) {
      setError('Failed to load settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      if (!user?.id) {
        setError('User not authenticated');
        setSaving(false);
        return;
      }

      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          ...formData
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save settings');
      }

      const data = await response.json();
      // Reload settings to get updated data
      await loadSettings();
      setSuccessMessage('Settings updated successfully!');
      setIsEditing(false);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (settings) {
      setFormData({
        name: settings.name,
        email: settings.email,
        department: settings.department
      });
    }
    setError(null);
    setSuccessMessage(null);
    setIsEditing(false);
  };

  const loadEmployees = async () => {
    try {
      setLoadingEmployees(true);

      if (!profile?.organization_id) {
        return;
      }

      const response = await fetch(`/api/employees?organizationId=${profile.organization_id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch employees');
      }

      const data = await response.json();
      setEmployees(data.employees || []);
    } catch (err) {
      console.error('Failed to load employees:', err);
    } finally {
      setLoadingEmployees(false);
    }
  };

  const handleDeleteClick = (employee: Employee) => {
    setSelectedEmployee(employee);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedEmployee || !profile?.organization_id) {
      return;
    }

    try {
      setDeleting(true);
      setError(null);

      const response = await fetch(
        `/api/employees?employeeId=${selectedEmployee.id}&organizationId=${profile.organization_id}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete employee');
      }

      const result = await response.json();
      setSuccessMessage(`Successfully deleted ${selectedEmployee.email}`);

      // Reload employees list
      await loadEmployees();

      // Close modal and reset
      setShowDeleteModal(false);
      setSelectedEmployee(null);

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to delete employee');
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setSelectedEmployee(null);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-ink-hi">Settings</h1>
            <p className="text-ink-muted">Manage your account and system preferences</p>
          </div>
          <div className="flex items-center space-x-3">
            <Badge variant="warning">
              {loading ? '...' : settings?.role || 'USER'}
            </Badge>
          </div>
        </div>

        {/* Account Settings */}
        <Card>
          <CardContent>
            {loading ? (
              <div className="space-y-6">
                <div className="flex items-start space-x-6">
                  <div className="w-16 h-16 bg-gray-300 rounded-full animate-pulse"></div>
                  <div className="flex-1 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i}>
                          <div className="h-4 bg-gray-300 rounded w-20 mb-2 animate-pulse"></div>
                          <div className="h-6 bg-gray-300 rounded animate-pulse"></div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <div className="text-danger text-sm mb-2">{error}</div>
                <Button variant="outline" size="sm" onClick={loadSettings}>
                  Try Again
                </Button>
              </div>
            ) : !settings ? (
              <div className="text-center py-8 text-ink-muted">
                No settings data available.
              </div>
            ) : (
              <>
                {/* Account Details */}
                <div className="space-y-6">
                    {/* Profile Section */}
                    <div className="flex items-start space-x-6">
                      <div className="flex flex-col items-center space-y-3">
                        <Avatar
                          fallback={settings.avatar}
                          size="lg"
                        />
                        <Button variant="outline" size="sm">
                          Change Photo
                        </Button>
                      </div>

                      <div className="flex-1 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-ink-hi mb-2">
                              Full Name
                            </label>
                            {isEditing ? (
                              <Input
                                value={formData.name}
                                onChange={(e) => setFormData({...formData, name: e.target.value})}
                              />
                            ) : (
                              <p className="text-ink-mid">{settings.name}</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-ink-hi mb-2">
                              Email Address
                            </label>
                            {isEditing ? (
                              <Input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({...formData, email: e.target.value})}
                              />
                            ) : (
                              <p className="text-ink-mid">{settings.email}</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-ink-hi mb-2">
                              Department
                            </label>
                            {isEditing ? (
                              <Input
                                value={formData.department}
                                onChange={(e) => setFormData({...formData, department: e.target.value})}
                              />
                            ) : (
                              <p className="text-ink-mid">{settings.department}</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-ink-hi mb-2">
                              Role
                            </label>
                            <Badge variant="warning">{settings.role}</Badge>
                          </div>
                        </div>

                        <div className="space-y-3">
                          {successMessage && (
                            <div className="px-4 py-2 bg-success/10 border border-success/20 rounded-lg text-success text-sm">
                              {successMessage}
                            </div>
                          )}
                          {error && !loading && (
                            <div className="px-4 py-2 bg-danger/10 border border-danger/20 rounded-lg text-danger text-sm">
                              {error}
                            </div>
                          )}
                          <div className="flex space-x-3">
                            {isEditing ? (
                              <>
                                <Button onClick={handleSave} disabled={saving}>
                                  {saving ? 'Saving...' : 'Save Changes'}
                                </Button>
                                <Button variant="outline" onClick={handleCancel}>
                                  Cancel
                                </Button>
                              </>
                            ) : (
                              <Button onClick={() => setIsEditing(true)}>
                                Edit Profile
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Account Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card elevated>
                        <CardContent className="py-4 text-center">
                          <div className="text-2xl font-semibold text-ink-hi font-mono">
                            {settings.totalEmployees}
                          </div>
                          <div className="text-sm text-ink-muted">Total Employees</div>
                        </CardContent>
                      </Card>
                      <Card elevated>
                        <CardContent className="py-4 text-center">
                          <div className="text-2xl font-semibold text-success font-mono">
                            {settings.activeEmployees}
                          </div>
                          <div className="text-sm text-ink-muted">Active Today</div>
                        </CardContent>
                      </Card>
                      <Card elevated>
                        <CardContent className="py-4 text-center">
                          <div className="text-2xl font-semibold text-primary font-mono">
                            {Math.round((settings.activeEmployees / settings.totalEmployees) * 100)}%
                          </div>
                          <div className="text-sm text-ink-muted">Activity Rate</div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Employee Management Section - Only for Admins */}
        {settings?.role === 'admin' && (
          <Card>
            <CardHeader>
              <CardTitle>Employee Account Management</CardTitle>
              <p className="text-sm text-ink-muted mt-1">
                Select an employee account to permanently delete it and all associated data
              </p>
            </CardHeader>
            <CardContent>
              {loadingEmployees ? (
                <div className="text-center py-8">
                  <div className="text-ink-muted">Loading employees...</div>
                </div>
              ) : employees.length === 0 ? (
                <div className="text-center py-8 text-ink-muted">
                  No employees found
                </div>
              ) : (
                <div className="space-y-2">
                  {employees.map((employee) => (
                    <div
                      key={employee.id}
                      className="flex items-center justify-between p-4 border border-line rounded-lg hover:bg-raised transition-colors"
                    >
                      <div className="flex items-center space-x-4">
                        <Avatar
                          fallback={employee.name.charAt(0).toUpperCase()}
                          size="md"
                        />
                        <div>
                          <div className="font-medium text-ink-hi">{employee.name}</div>
                          <div className="text-sm text-ink-muted">{employee.email}</div>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge variant={employee.status === 'online' ? 'success' : 'default'} size="sm">
                              {employee.status}
                            </Badge>
                            <span className="text-xs text-ink-muted">{employee.department}</span>
                            <span className="text-xs text-ink-muted">•</span>
                            <span className="text-xs text-ink-muted">{employee.lastActive}</span>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDeleteClick(employee)}
                        disabled={employee.id === user?.id}
                      >
                        {employee.id === user?.id ? 'Cannot Delete Self' : 'Delete Account'}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && selectedEmployee && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-surface border border-line rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-xl font-semibold text-ink-hi mb-4">
                Delete Employee Account
              </h3>
              <div className="space-y-4">
                <div className="p-4 bg-danger/10 border border-danger/20 rounded-lg">
                  <p className="text-danger font-medium mb-2">Warning: This action cannot be undone!</p>
                  <p className="text-sm text-ink-mid">
                    You are about to permanently delete the following employee account and ALL associated data:
                  </p>
                </div>

                <div className="p-4 bg-raised rounded-lg space-y-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-ink-hi">Name:</span>
                    <span className="text-sm text-ink-mid">{selectedEmployee.name}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-ink-hi">Email:</span>
                    <span className="text-sm text-ink-mid">{selectedEmployee.email}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-ink-hi">Department:</span>
                    <span className="text-sm text-ink-mid">{selectedEmployee.department}</span>
                  </div>
                </div>

                <div className="p-4 bg-raised rounded-lg">
                  <p className="text-sm font-medium text-ink-hi mb-2">The following data will be permanently deleted:</p>
                  <ul className="text-sm text-ink-mid space-y-1 list-disc list-inside">
                    <li>All screenshots</li>
                    <li>All audio recordings</li>
                    <li>All recording sessions</li>
                    <li>All productivity metrics</li>
                    <li>All break records</li>
                    <li>All activity logs</li>
                    <li>All attendance records</li>
                    <li>User profile and authentication</li>
                  </ul>
                </div>

                {error && (
                  <div className="p-3 bg-danger/10 border border-danger/20 rounded-lg text-danger text-sm">
                    {error}
                  </div>
                )}

                <div className="flex space-x-3 pt-2">
                  <Button
                    variant="danger"
                    onClick={handleDeleteConfirm}
                    disabled={deleting}
                    className="flex-1"
                  >
                    {deleting ? 'Deleting...' : 'Yes, Delete Permanently'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleDeleteCancel}
                    disabled={deleting}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}