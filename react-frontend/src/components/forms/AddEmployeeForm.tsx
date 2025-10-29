import React, { useState } from 'react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

interface AddEmployeeFormProps {
  onSubmit: (data: EmployeeFormData) => void;
  onCancel: () => void;
  loading?: boolean;
}

export interface EmployeeFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  department: string;
  role: 'USER' | 'ADMIN';
  shiftStartTime: string;
  shiftEndTime: string;
}

export function AddEmployeeForm({ onSubmit, onCancel, loading = false }: AddEmployeeFormProps) {
  const [formData, setFormData] = useState<EmployeeFormData>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    department: '',
    role: 'USER',
    shiftStartTime: '09:00',
    shiftEndTime: '18:00'
  });

  const [errors, setErrors] = useState<Partial<EmployeeFormData>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: Partial<EmployeeFormData> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!formData.password.trim()) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!formData.confirmPassword.trim()) {
      newErrors.confirmPassword = 'Confirm password is required';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.department.trim()) {
      newErrors.department = 'Department is required';
    }

    if (!formData.shiftStartTime) {
      newErrors.shiftStartTime = 'Start time is required';
    }

    if (!formData.shiftEndTime) {
      newErrors.shiftEndTime = 'End time is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const handleInputChange = (field: keyof EmployeeFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const departments = [
    'Engineering',
    'Design',
    'Marketing',
    'Sales',
    'Operations',
    'HR',
    'Finance'
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Employee Information */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Full Name
          </label>
          <Input
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder="Enter employee's full name"
            className={errors.name ? 'border-red-500' : ''}
            disabled={loading}
          />
          {errors.name && (
            <p className="text-red-600 text-xs mt-1">{errors.name}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email Address
          </label>
          <Input
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            placeholder="employee@company.com"
            className={errors.email ? 'border-red-500' : ''}
            disabled={loading}
          />
          {errors.email && (
            <p className="text-red-600 text-xs mt-1">{errors.email}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Password
          </label>
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              placeholder="Minimum 6 characters"
              className={`pr-10 ${errors.password ? 'border-red-500' : ''}`}
              disabled={loading}
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 flex items-center pr-3"
              onClick={() => setShowPassword(!showPassword)}
              disabled={loading}
            >
              <span className="text-gray-500 hover:text-gray-700 text-sm">
                {showPassword ? "Hide" : "Show"}
              </span>
            </button>
          </div>
          {errors.password && (
            <p className="text-red-600 text-xs mt-1">{errors.password}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Confirm Password
          </label>
          <div className="relative">
            <Input
              type={showConfirmPassword ? "text" : "password"}
              value={formData.confirmPassword}
              onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
              placeholder="Confirm password"
              className={`pr-10 ${errors.confirmPassword ? 'border-red-500' : ''}`}
              disabled={loading}
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 flex items-center pr-3"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              disabled={loading}
            >
              <span className="text-gray-500 hover:text-gray-700 text-sm">
                {showConfirmPassword ? "Hide" : "Show"}
              </span>
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-red-600 text-xs mt-1">{errors.confirmPassword}</p>
          )}
          <p className="text-gray-500 text-xs mt-1">
            Employee will be able to change this password after first login
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Department
          </label>
          <select
            value={formData.department}
            onChange={(e) => handleInputChange('department', e.target.value)}
            className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
            disabled={loading}
          >
            <option value="">Select department</option>
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
          {errors.department && (
            <p className="text-red-600 text-xs mt-1">{errors.department}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Shift Start Time
            </label>
            <Input
              type="time"
              value={formData.shiftStartTime}
              onChange={(e) => handleInputChange('shiftStartTime', e.target.value)}
              className={errors.shiftStartTime ? 'border-red-500' : ''}
              disabled={loading}
            />
            {errors.shiftStartTime && (
              <p className="text-red-600 text-xs mt-1">{errors.shiftStartTime}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Shift End Time
            </label>
            <Input
              type="time"
              value={formData.shiftEndTime}
              onChange={(e) => handleInputChange('shiftEndTime', e.target.value)}
              className={errors.shiftEndTime ? 'border-red-500' : ''}
              disabled={loading}
            />
            {errors.shiftEndTime && (
              <p className="text-red-600 text-xs mt-1">{errors.shiftEndTime}</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Role
          </label>
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={() => handleInputChange('role', 'USER')}
              className={`flex-1 p-3 rounded-lg border transition-colors ${
                formData.role === 'USER'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
              }`}
              disabled={loading}
            >
              <div className="text-center">
                <div className="font-medium">USER</div>
                <div className="text-xs mt-1">Standard employee access</div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => handleInputChange('role', 'ADMIN')}
              className={`flex-1 p-3 rounded-lg border transition-colors ${
                formData.role === 'ADMIN'
                  ? 'border-yellow-500 bg-yellow-50 text-yellow-700'
                  : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
              }`}
              disabled={loading}
            >
              <div className="text-center">
                <div className="font-medium">ADMIN</div>
                <div className="text-xs mt-1">Management access</div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Preview</h4>
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
            <span className="text-blue-600 text-sm font-medium">
              {formData.name ? formData.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '??'}
            </span>
          </div>
          <div className="flex-1">
            <div className="font-medium text-gray-900">
              {formData.name || 'Employee Name'}
            </div>
            <div className="text-sm text-gray-500">
              {formData.email || 'email@company.com'}
            </div>
          </div>
          <div className="flex space-x-2">
            <Badge variant="default" size="sm">
              {formData.department || 'Department'}
            </Badge>
            <Badge variant={formData.role === 'ADMIN' ? 'warning' : 'default'} size="sm">
              {formData.role}
            </Badge>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={loading}
        >
          {loading ? 'Creating Employee...' : 'Create Employee'}
        </Button>
      </div>
    </form>
  );
}
