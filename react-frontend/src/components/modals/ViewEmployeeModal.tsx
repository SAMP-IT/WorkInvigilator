import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';

interface Screenshot {
  id: string;
  url: string;
  created_at: string;
}

interface Employee {
  id: string;
  name: string;
  email: string;
  department: string;
  role: string;
  productivity7d: number;
  totalBreakHours: number;
  totalWorkHours: number;
  lastActive: string;
  status: 'online' | 'offline';
  createdAt: string;
  shiftStartTime?: string;
  shiftEndTime?: string;
  hourlyRate?: number;
}

interface ViewEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
  screenshots: Screenshot[];
}

export function ViewEmployeeModal({ isOpen, onClose, employee, screenshots }: ViewEmployeeModalProps) {
  const [selectedScreenshot, setSelectedScreenshot] = useState<Screenshot | null>(null);

  if (!employee) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Employee Details" size="xl">
        <div className="space-y-6">
          {/* Header Section with Avatar and Basic Info */}
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <div className="p-6">
              <div className="flex items-start space-x-6">
                {/* Avatar */}
                <div className="relative">
                  <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-xl">
                    <span className="text-white text-3xl font-bold">
                      {employee.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                    </span>
                  </div>
                  <div
                    className={`absolute -bottom-2 -right-2 w-8 h-8 rounded-full border-4 border-white shadow-lg ${
                      employee.status === 'online' ? 'bg-green-500' : 'bg-gray-400'
                    }`}
                  />
                </div>

                {/* Basic Info */}
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">{employee.name}</h2>
                  <p className="text-lg text-gray-600 mb-3">{employee.email}</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={employee.status === 'online' ? 'success' : 'default'}>
                      {employee.status.toUpperCase()}
                    </Badge>
                    <Badge variant={employee.role.toLowerCase() === 'admin' ? 'warning' : 'info'}>
                      {employee.role.toUpperCase()}
                    </Badge>
                    <Badge variant="primary">{employee.department}</Badge>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Total Work Hours */}
            <Card className="p-4 hover:shadow-lg transition-all duration-200">
              <div className="flex items-center space-x-2 mb-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xs font-semibold text-gray-600 uppercase">Work Hours</p>
              </div>
              <p className="text-2xl font-bold text-blue-600">{employee.totalWorkHours.toFixed(1)}h</p>
            </Card>

            {/* Break Hours */}
            <Card className="p-4 hover:shadow-lg transition-all duration-200">
              <div className="flex items-center space-x-2 mb-2">
                <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
                <p className="text-xs font-semibold text-gray-600 uppercase">Break Hours</p>
              </div>
              <p className="text-2xl font-bold text-orange-600">{employee.totalBreakHours.toFixed(1)}h</p>
            </Card>

            {/* Productivity */}
            <Card className="p-4 hover:shadow-lg transition-all duration-200">
              <div className="flex items-center space-x-2 mb-2">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                <p className="text-xs font-semibold text-gray-600 uppercase">Productivity</p>
              </div>
              <p className="text-2xl font-bold text-green-600">{employee.productivity7d.toFixed(1)}%</p>
            </Card>

            {/* Hourly Rate */}
            <Card className="p-4 hover:shadow-lg transition-all duration-200">
              <div className="flex items-center space-x-2 mb-2">
                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xs font-semibold text-gray-600 uppercase">Hourly Rate</p>
              </div>
              <p className="text-2xl font-bold text-emerald-600">${employee.hourlyRate?.toFixed(2) || '0.00'}/hr</p>
            </Card>
          </div>

          {/* Work Schedule & Activity */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Work Schedule */}
            <Card className="p-5">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center space-x-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>Work Schedule</span>
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">Shift Start</span>
                  <span className="text-sm font-bold text-gray-900 font-mono">{employee.shiftStartTime || '09:00'}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">Shift End</span>
                  <span className="text-sm font-bold text-gray-900 font-mono">{employee.shiftEndTime || '17:00'}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <span className="text-sm font-medium text-blue-700">Total Hours/Day</span>
                  <span className="text-sm font-bold text-blue-900 font-mono">
                    {(() => {
                      const start = employee.shiftStartTime || '09:00';
                      const end = employee.shiftEndTime || '17:00';
                      const startHour = parseInt(start.split(':')[0]);
                      const endHour = parseInt(end.split(':')[0]);
                      return `${endHour - startHour}h`;
                    })()}
                  </span>
                </div>
              </div>
            </Card>

            {/* Activity Info */}
            <Card className="p-5">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center space-x-2">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Account Information</span>
              </h3>
              <div className="space-y-3">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <span className="text-xs text-gray-600 block mb-1">Member Since</span>
                  <span className="text-sm font-semibold text-gray-900">{formatDate(employee.createdAt)}</span>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <span className="text-xs text-gray-600 block mb-1">Last Active</span>
                  <span className="text-sm font-semibold text-gray-900">{employee.lastActive}</span>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <span className="text-xs text-gray-600 block mb-1">Employee ID</span>
                  <span className="text-sm font-mono font-semibold text-gray-900">{employee.id}</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Recent Screenshots */}
          {screenshots.length > 0 && (
            <Card className="p-5">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center space-x-2">
                <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>Recent Screenshots</span>
                <Badge variant="info" size="sm">{screenshots.length}</Badge>
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {screenshots.map((screenshot) => (
                  <div
                    key={screenshot.id}
                    className="group relative cursor-pointer overflow-hidden rounded-xl border-2 border-gray-200 hover:border-blue-500 transition-all duration-300"
                    onClick={() => setSelectedScreenshot(screenshot)}
                  >
                    <img
                      src={screenshot.url}
                      alt="Screenshot"
                      className="w-full h-32 object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="absolute bottom-0 left-0 right-0 p-2">
                        <p className="text-white text-xs font-semibold truncate">
                          {new Date(screenshot.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <svg className="w-10 h-10 text-white drop-shadow-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                      </svg>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Monthly Earnings Estimate */}
          <Card className="p-5 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center space-x-2">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <span>Monthly Earnings Estimate</span>
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                <span className="text-sm text-gray-700">160 hours (regular)</span>
                <span className="text-sm font-bold text-gray-900 font-mono">
                  ${((employee.hourlyRate || 0) * 160).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                <span className="text-sm text-gray-700">20 hours (overtime @ 1.5x)</span>
                <span className="text-sm font-bold text-gray-900 font-mono">
                  ${((employee.hourlyRate || 0) * 20 * 1.5).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-green-100 rounded-lg border-2 border-green-300">
                <span className="text-base font-semibold text-green-900">Total (180 hrs)</span>
                <span className="text-xl font-bold text-green-700 font-mono">
                  ${((employee.hourlyRate || 0) * 160 + (employee.hourlyRate || 0) * 20 * 1.5).toFixed(2)}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </Modal>

      {/* Screenshot Fullscreen Modal */}
      {selectedScreenshot && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={() => setSelectedScreenshot(null)}
        >
          <div className="relative w-[90vw] h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setSelectedScreenshot(null)}
              className="absolute top-4 right-4 z-10 bg-red-500 hover:bg-red-600 rounded-full p-3 transition-all duration-200 shadow-2xl"
            >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <img
              src={selectedScreenshot.url}
              alt="Screenshot"
              className="w-full h-full object-contain rounded-2xl"
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-6 rounded-b-2xl">
              <p className="text-white text-lg font-semibold">
                {new Date(selectedScreenshot.created_at).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
