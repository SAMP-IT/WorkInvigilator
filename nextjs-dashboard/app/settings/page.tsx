'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';

// Mock current user data
const currentUser = {
  id: 'admin-1',
  name: 'John Doe',
  email: 'john.doe@company.com',
  role: 'ADMIN',
  organization: 'TechCorp Solutions',
  department: 'IT Administration',
  joinDate: '15/03/2023',
  lastLogin: '24/09/2024 14:23',
  totalEmployees: 47,
  activeEmployees: 34,
  avatar: 'JD'
};

// Mock organization settings
const organizationSettings = {
  name: 'TechCorp Solutions',
  industry: 'Software Development',
  timezone: 'UTC+00:00 (GMT)',
  workingHours: '09:00 - 17:00',
  workingDays: 'Monday - Friday',
  screenshotInterval: '5 minutes',
  dataRetention: '90 days',
  autoDelete: true
};

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'account' | 'organization' | 'preferences' | 'security'>('account');
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: currentUser.name,
    email: currentUser.email,
    department: currentUser.department
  });

  const tabs = [
    { id: 'account' as const, label: 'Account Details', icon: '/user.png' },
    { id: 'organization' as const, label: 'Organization', icon: '/office.png' },
    { id: 'preferences' as const, label: 'Preferences', icon: '/settings.png' },
    { id: 'security' as const, label: 'Security', icon: '/lock.png' }
  ];

  const handleSave = () => {
    // Save logic here
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFormData({
      name: currentUser.name,
      email: currentUser.email,
      department: currentUser.department
    });
    setIsEditing(false);
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
              {currentUser.role}
            </Badge>
            <Button variant="outline">
              🚪 Switch Account
            </Button>
          </div>
        </div>

        {/* Settings Tabs */}
        <Card>
          <CardHeader className="border-b border-line">
            <div className="flex space-x-4">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-primary/10 text-primary border border-primary/20'
                      : 'text-ink-mid hover:text-ink-hi hover:bg-raised'
                  }`}
                >
                  <div className="relative w-4 h-4">
                    <img
                      src={tab.icon}
                      alt={tab.label}
                      className={`w-full h-full object-contain transition-opacity ${
                        activeTab === tab.id ? 'opacity-100' : 'opacity-70'
                      }`}
                    />
                  </div>
                  <span className="font-ui text-sm">{tab.label}</span>
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            {/* Account Details Tab */}
            {activeTab === 'account' && (
              <div className="space-y-6">
                {/* Profile Section */}
                <div className="flex items-start space-x-6">
                  <div className="flex flex-col items-center space-y-3">
                    <Avatar
                      fallback={currentUser.avatar}
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
                          <p className="text-ink-mid">{currentUser.name}</p>
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
                          <p className="text-ink-mid">{currentUser.email}</p>
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
                          <p className="text-ink-mid">{currentUser.department}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-ink-hi mb-2">
                          Role
                        </label>
                        <Badge variant="warning">{currentUser.role}</Badge>
                      </div>
                    </div>

                    <div className="flex space-x-3">
                      {isEditing ? (
                        <>
                          <Button onClick={handleSave}>
                            Save Changes
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

                {/* Account Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card elevated>
                    <CardContent className="py-4 text-center">
                      <div className="text-2xl font-semibold text-ink-hi font-mono">
                        {currentUser.totalEmployees}
                      </div>
                      <div className="text-sm text-ink-muted">Total Employees</div>
                    </CardContent>
                  </Card>
                  <Card elevated>
                    <CardContent className="py-4 text-center">
                      <div className="text-2xl font-semibold text-success font-mono">
                        {currentUser.activeEmployees}
                      </div>
                      <div className="text-sm text-ink-muted">Active Today</div>
                    </CardContent>
                  </Card>
                  <Card elevated>
                    <CardContent className="py-4 text-center">
                      <div className="text-2xl font-semibold text-primary font-mono">
                        {Math.round((currentUser.activeEmployees / currentUser.totalEmployees) * 100)}%
                      </div>
                      <div className="text-sm text-ink-muted">Activity Rate</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Account Info */}
                <Card>
                  <CardHeader>
                    <CardTitle>Account Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-ink-muted">Member Since</label>
                        <p className="text-ink-hi font-mono">{currentUser.joinDate}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-ink-muted">Last Login</label>
                        <p className="text-ink-hi font-mono">{currentUser.lastLogin}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-ink-muted">User ID</label>
                        <p className="text-ink-hi font-mono">{currentUser.id}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-ink-muted">Organization</label>
                        <p className="text-ink-hi">{currentUser.organization}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Organization Tab */}
            {activeTab === 'organization' && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Organization Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-ink-hi mb-2">
                          Organization Name
                        </label>
                        <p className="text-ink-mid">{organizationSettings.name}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-ink-hi mb-2">
                          Industry
                        </label>
                        <p className="text-ink-mid">{organizationSettings.industry}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-ink-hi mb-2">
                          Timezone
                        </label>
                        <p className="text-ink-mid">{organizationSettings.timezone}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-ink-hi mb-2">
                          Working Hours
                        </label>
                        <p className="text-ink-mid">{organizationSettings.workingHours}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-ink-hi mb-2">
                          Working Days
                        </label>
                        <p className="text-ink-mid">{organizationSettings.workingDays}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-ink-hi mb-2">
                          Total Employees
                        </label>
                        <p className="text-ink-mid">{currentUser.totalEmployees} members</p>
                      </div>
                    </div>
                    <div className="mt-6">
                      <Button>
                        Edit Organization Settings
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Preferences Tab */}
            {activeTab === 'preferences' && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Monitoring Preferences</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium text-ink-hi">Screenshot Interval</label>
                          <p className="text-xs text-ink-muted">How often to capture screenshots</p>
                        </div>
                        <select className="bg-surface border border-line rounded-lg px-3 py-2 text-sm text-ink-hi">
                          <option>Every 5 minutes</option>
                          <option>Every 10 minutes</option>
                          <option>Every 15 minutes</option>
                          <option>Every 30 minutes</option>
                        </select>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium text-ink-hi">Data Retention</label>
                          <p className="text-xs text-ink-muted">How long to keep monitoring data</p>
                        </div>
                        <select className="bg-surface border border-line rounded-lg px-3 py-2 text-sm text-ink-hi">
                          <option>30 days</option>
                          <option>60 days</option>
                          <option>90 days</option>
                          <option>1 year</option>
                        </select>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium text-ink-hi">Auto-delete Old Data</label>
                          <p className="text-xs text-ink-muted">Automatically remove data after retention period</p>
                        </div>
                        <input type="checkbox" defaultChecked className="rounded" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Notification Preferences</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium text-ink-hi">Email Notifications</label>
                          <p className="text-xs text-ink-muted">Receive email alerts and reports</p>
                        </div>
                        <input type="checkbox" defaultChecked className="rounded" />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium text-ink-hi">Low Productivity Alerts</label>
                          <p className="text-xs text-ink-muted">Alert when employee productivity drops</p>
                        </div>
                        <input type="checkbox" defaultChecked className="rounded" />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium text-ink-hi">Daily Reports</label>
                          <p className="text-xs text-ink-muted">Receive daily summary reports</p>
                        </div>
                        <input type="checkbox" defaultChecked className="rounded" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Password & Authentication</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <Button>
                        Change Password
                      </Button>
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium text-ink-hi">Two-Factor Authentication</label>
                          <p className="text-xs text-ink-muted">Add extra security to your account</p>
                        </div>
                        <Button variant="outline" size="sm">
                          Enable 2FA
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Session Management</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-raised rounded-lg">
                        <div>
                          <div className="text-sm font-medium text-ink-hi">Current Session</div>
                          <div className="text-xs text-ink-muted">Chrome on Windows • Active now</div>
                        </div>
                        <Badge variant="success">Active</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-raised rounded-lg">
                        <div>
                          <div className="text-sm font-medium text-ink-hi">Previous Session</div>
                          <div className="text-xs text-ink-muted">Chrome on Windows • 2 hours ago</div>
                        </div>
                        <Button variant="ghost" size="sm">
                          Revoke
                        </Button>
                      </div>
                    </div>
                    <div className="mt-4">
                      <Button variant="outline">
                        Revoke All Sessions
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Account Actions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium text-ink-hi">Export Account Data</label>
                          <p className="text-xs text-ink-muted">Download all your account information</p>
                        </div>
                        <Button variant="outline">
                          Export Data
                        </Button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium text-ink-hi">Delete Account</label>
                          <p className="text-xs text-ink-muted">Permanently delete your account and data</p>
                        </div>
                        <Button variant="danger">
                          Delete Account
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}