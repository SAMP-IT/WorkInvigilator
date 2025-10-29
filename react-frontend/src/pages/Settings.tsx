import { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Avatar } from '../components/ui/Avatar';
import { useAuthStore } from '../store/authStore';
import { mockAdminUser, mockProfiles, mockOrganizations, mockSessions } from '../lib/mockData';
import { EmployeeSidebar } from '../components/dashboard/EmployeeSidebar';

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

export default function Settings() {
  const { profile, user } = useAuthStore();
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
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [roleChanging, setRoleChanging] = useState(false);

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

      // Use mock data instead of API call
      const currentUserProfile = mockProfiles.find(p => p.id === user.id) || mockAdminUser.profile;
      const organization = mockOrganizations.find(org => org.id === currentUserProfile.organization_id);

      // Count employees in the organization
      const totalEmployees = mockProfiles.filter(p => p.organization_id === currentUserProfile.organization_id).length;
      const activeEmployees = Math.floor(totalEmployees * 0.6); // Mock: 60% active

      const mockSettings: UserSettings = {
        id: currentUserProfile.id,
        name: currentUserProfile.name,
        email: currentUserProfile.email,
        role: currentUserProfile.role,
        organization: organization?.name || 'Unknown Organization',
        department: 'Engineering',
        joinDate: new Date(currentUserProfile.created_at).toLocaleDateString(),
        lastLogin: new Date().toLocaleString(),
        totalEmployees,
        activeEmployees,
        avatar: currentUserProfile.avatar_url || currentUserProfile.name.charAt(0).toUpperCase(),
        screenshotInterval: '5 minutes',
        dataRetention: '90 days',
        autoDelete: true,
        emailNotifications: true,
        lowProductivityAlerts: true,
        dailyReports: true
      };

      setSettings(mockSettings);
      setFormData({
        name: mockSettings.name || '',
        email: mockSettings.email || '',
        department: mockSettings.department || ''
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

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));

      // Update settings in-memory only
      if (settings) {
        setSettings({
          ...settings,
          name: formData.name,
          email: formData.email,
          department: formData.department
        });
      }

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

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 300));

      // Use mock data instead of API call
      const organizationEmployees = mockProfiles
        .filter(p => p.organization_id === profile.organization_id && p.role === 'employee')
        .map(p => ({
          id: p.id,
          name: p.name,
          email: p.email,
          department: 'Engineering',
          role: p.role,
          status: Math.random() > 0.5 ? 'online' : 'offline' as 'online' | 'offline',
          lastActive: new Date(Date.now() - Math.random() * 3600000).toLocaleString()
        }));

      setEmployees(organizationEmployees);
    } catch (err) {
      console.error('Failed to load employees:', err);
    } finally {
      setLoadingEmployees(false);
    }
  };

  // Prepare employee data for sidebar
  const employeesForSidebar = useMemo(() => {
    return employees.map(emp => {
      const empSessions = mockSessions.filter(s => s.employee_id === emp.id);
      const activeSession = empSessions.find(s => s.status === 'active');
      const avgProductivity = empSessions.length > 0
        ? Math.round(empSessions.reduce((sum, s) => sum + s.productivity_score, 0) / empSessions.length)
        : 0;
      const profile = mockProfiles.find(p => p.id === emp.id);

      return {
        id: emp.id,
        name: emp.name,
        email: emp.email,
        avatar_url: profile?.avatar_url || '',
        department: emp.department || '',
        status: emp.status,
        productivity: avgProductivity,
      };
    });
  }, [employees]);

  const selectedEmployee = useMemo(() => {
    return employees.find(emp => emp.id === selectedEmployeeId) || null;
  }, [employees, selectedEmployeeId]);

  const handleDeleteClick = () => {
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedEmployee || !profile?.organization_id) {
      return;
    }

    try {
      setDeleting(true);
      setError(null);

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Remove employee from in-memory list (mock operation)
      setEmployees(prevEmployees =>
        prevEmployees.filter(emp => emp.id !== selectedEmployee.id)
      );

      setSuccessMessage(`Successfully deleted ${selectedEmployee.email}`);

      // Close modal and reset
      setShowDeleteModal(false);
      setSelectedEmployeeId(null);

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
  };

  const handleRoleChange = async (newRole: string) => {
    if (!selectedEmployee) return;

    try {
      setRoleChanging(true);
      setError(null);

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));

      // Update employee role in-memory
      setEmployees(prevEmployees =>
        prevEmployees.map(emp =>
          emp.id === selectedEmployee.id
            ? { ...emp, role: newRole }
            : emp
        )
      );

      setSuccessMessage(`Successfully updated role for ${selectedEmployee.name}`);

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update role');
    } finally {
      setRoleChanging(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
          <p className="text-gray-600">Manage your account and system preferences</p>
        </div>
        <div className="flex items-center space-x-3">
          <Badge variant="warning">
            {loading ? '...' : settings?.role || 'USER'}
          </Badge>
        </div>
      </div>

      {/* Account Settings */}
      <Card className="bg-white">
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
              <div className="text-red-600 text-sm mb-2">{error}</div>
              <Button variant="outline" size="sm" onClick={loadSettings}>
                Try Again
              </Button>
            </div>
          ) : !settings ? (
            <div className="text-center py-8 text-gray-600">
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
                          <label className="block text-sm font-medium text-gray-900 mb-2">
                            Full Name
                          </label>
                          {isEditing ? (
                            <Input
                              value={formData.name}
                              onChange={(e) => setFormData({...formData, name: e.target.value})}
                            />
                          ) : (
                            <p className="text-gray-700">{settings.name}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-2">
                            Email Address
                          </label>
                          {isEditing ? (
                            <Input
                              type="email"
                              value={formData.email}
                              onChange={(e) => setFormData({...formData, email: e.target.value})}
                            />
                          ) : (
                            <p className="text-gray-700">{settings.email}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-2">
                            Department
                          </label>
                          {isEditing ? (
                            <Input
                              value={formData.department}
                              onChange={(e) => setFormData({...formData, department: e.target.value})}
                            />
                          ) : (
                            <p className="text-gray-700">{settings.department}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-2">
                            Role
                          </label>
                          <Badge variant="warning">{settings.role}</Badge>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {successMessage && (
                          <div className="px-4 py-2 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                            {successMessage}
                          </div>
                        )}
                        {error && !loading && (
                          <div className="px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
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
                    <Card elevated className="bg-blue-50 border-blue-200">
                      <CardContent className="py-4 text-center">
                        <div className="text-2xl font-semibold text-gray-900 font-mono">
                          {settings.totalEmployees}
                        </div>
                        <div className="text-sm text-gray-600">Total Employees</div>
                      </CardContent>
                    </Card>
                    <Card elevated className="bg-green-50 border-green-200">
                      <CardContent className="py-4 text-center">
                        <div className="text-2xl font-semibold text-green-700 font-mono">
                          {settings.activeEmployees}
                        </div>
                        <div className="text-sm text-gray-600">Active Today</div>
                      </CardContent>
                    </Card>
                    <Card elevated className="bg-blue-50 border-blue-200">
                      <CardContent className="py-4 text-center">
                        <div className="text-2xl font-semibold text-blue-600 font-mono">
                          {Math.round((settings.activeEmployees / settings.totalEmployees) * 100)}%
                        </div>
                        <div className="text-sm text-gray-600">Activity Rate</div>
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
        <>
          {/* Employee Sidebar */}
          <EmployeeSidebar
            employees={employeesForSidebar as any}
            selectedEmployeeId={selectedEmployeeId}
            onSelectEmployee={setSelectedEmployeeId}
            isOpen={isSidebarOpen}
            onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
          />

          <Card className="bg-white">
            <CardHeader>
              <CardTitle>Employee Account Management</CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                {selectedEmployee
                  ? `Managing account for ${selectedEmployee.name}`
                  : 'Select an employee from the sidebar to manage their account'}
              </p>
            </CardHeader>
            <CardContent>
              {loadingEmployees ? (
                <div className="text-center py-8">
                  <div className="text-gray-600">Loading employees...</div>
                </div>
              ) : employees.length === 0 ? (
                <div className="text-center py-8 text-gray-600">
                  No employees found
                </div>
              ) : !selectedEmployee ? (
                <div className="flex items-center justify-center h-[calc(100vh-600px)]">
                  <div className="text-center">
                    <svg className="w-24 h-24 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    <h3 className="text-xl font-semibold text-gray-700 mb-2">No Employee Selected</h3>
                    <p className="text-gray-500">Select an employee from the sidebar to manage their account</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Employee Info Card */}
                  <Card elevated className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                    <CardContent className="py-6">
                      <div className="flex items-center space-x-4">
                        <Avatar
                          fallback={selectedEmployee.name.charAt(0).toUpperCase()}
                          size="lg"
                        />
                        <div className="flex-1">
                          <h3 className="text-xl font-semibold text-gray-900">{selectedEmployee.name}</h3>
                          <p className="text-gray-600">{selectedEmployee.email}</p>
                          <div className="flex items-center space-x-3 mt-2">
                            <Badge variant={selectedEmployee.status === 'online' ? 'success' : 'default'}>
                              {selectedEmployee.status}
                            </Badge>
                            <span className="text-sm text-gray-600">{selectedEmployee.department}</span>
                            <span className="text-sm text-gray-600">•</span>
                            <span className="text-sm text-gray-600">Last active: {selectedEmployee.lastActive}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Role Management */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Role Management</CardTitle>
                      <p className="text-sm text-gray-600 mt-1">
                        Change the employee's role and permissions
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Current Role
                          </label>
                          <div className="flex items-center space-x-3">
                            <select
                              value={selectedEmployee.role}
                              onChange={(e) => handleRoleChange(e.target.value)}
                              disabled={roleChanging || selectedEmployee.id === user?.id}
                              className="flex-1 bg-white border border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="employee">Employee</option>
                              <option value="admin">Admin</option>
                              <option value="manager">Manager</option>
                            </select>
                            {roleChanging && (
                              <span className="text-sm text-gray-600">Updating...</span>
                            )}
                          </div>
                          {selectedEmployee.id === user?.id && (
                            <p className="text-xs text-gray-500 mt-1">
                              You cannot change your own role
                            </p>
                          )}
                        </div>

                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <h4 className="text-sm font-semibold text-gray-900 mb-2">Role Permissions</h4>
                          <ul className="text-sm text-gray-700 space-y-1">
                            {selectedEmployee.role === 'admin' && (
                              <>
                                <li>✓ Full access to all features</li>
                                <li>✓ Manage all employees</li>
                                <li>✓ View all reports and analytics</li>
                                <li>✓ System settings access</li>
                              </>
                            )}
                            {selectedEmployee.role === 'manager' && (
                              <>
                                <li>✓ View team reports</li>
                                <li>✓ Manage team members</li>
                                <li>✓ Limited system settings</li>
                              </>
                            )}
                            {selectedEmployee.role === 'employee' && (
                              <>
                                <li>✓ View own productivity data</li>
                                <li>✓ Track work sessions</li>
                                <li>✓ Basic profile settings</li>
                              </>
                            )}
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Danger Zone */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-red-600">Danger Zone</CardTitle>
                      <p className="text-sm text-gray-600 mt-1">
                        Irreversible and destructive actions
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div className="p-4 border-2 border-red-200 rounded-lg bg-red-50">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="text-sm font-semibold text-gray-900 mb-1">
                              Delete Employee Account
                            </h4>
                            <p className="text-sm text-gray-700 mb-3">
                              Permanently delete this employee account and all associated data. This action cannot be undone.
                            </p>
                            <ul className="text-xs text-gray-600 space-y-1 mb-3">
                              <li>• All screenshots and recordings will be deleted</li>
                              <li>• All productivity data will be lost</li>
                              <li>• All session history will be removed</li>
                              <li>• Employee will lose access immediately</li>
                            </ul>
                          </div>
                        </div>
                        <Button
                          variant="danger"
                          onClick={handleDeleteClick}
                          disabled={selectedEmployee.id === user?.id}
                          className="w-full"
                        >
                          {selectedEmployee.id === user?.id
                            ? 'Cannot Delete Your Own Account'
                            : 'Delete Account Permanently'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white border border-gray-200 rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Delete Employee Account
            </h3>
            <div className="space-y-4">
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 font-medium mb-2">Warning: This action cannot be undone!</p>
                <p className="text-sm text-gray-700">
                  You are about to permanently delete the following employee account and ALL associated data:
                </p>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-900">Name:</span>
                  <span className="text-sm text-gray-700">{selectedEmployee.name}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-900">Email:</span>
                  <span className="text-sm text-gray-700">{selectedEmployee.email}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-900">Department:</span>
                  <span className="text-sm text-gray-700">{selectedEmployee.department}</span>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-900 mb-2">The following data will be permanently deleted:</p>
                <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
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
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
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
  );
}
