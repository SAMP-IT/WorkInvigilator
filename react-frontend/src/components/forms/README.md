# Form Components

Light mode React form components for the Work Invigilator application.

## Components

### AddEmployeeForm
Comprehensive form for adding new employees with validation and preview.

```tsx
import { AddEmployeeForm } from '../../components/forms';
import type { EmployeeFormData } from '../../components/forms';

const handleSubmit = (data: EmployeeFormData) => {
  console.log('Form data:', data);
  // Handle employee creation
};

<AddEmployeeForm
  onSubmit={handleSubmit}
  onCancel={() => setModalOpen(false)}
  loading={isCreating}
/>
```

**Props:**
- `onSubmit`: Callback function with form data
- `onCancel`: Callback for cancel action
- `loading`: Optional boolean loading state

**Form Data Interface:**
```tsx
interface EmployeeFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  department: string;
  role: 'USER' | 'ADMIN';
  shiftStartTime: string; // Format: "HH:MM"
  shiftEndTime: string;   // Format: "HH:MM"
}
```

## Features

- Real-time validation
- Password visibility toggle
- Department dropdown
- Role selection with visual buttons
- Shift time pickers
- Live preview of employee card
- Error messaging
- Loading states

## Validation Rules

- **Name**: Required, non-empty
- **Email**: Required, valid email format
- **Password**: Required, minimum 6 characters
- **Confirm Password**: Required, must match password
- **Department**: Required
- **Shift Times**: Required

## Design System

Follows light mode design:
- White backgrounds
- Blue accents for primary actions
- Yellow accents for admin role
- Red error messages
- Gray borders and secondary elements
- Smooth transitions and hover effects
