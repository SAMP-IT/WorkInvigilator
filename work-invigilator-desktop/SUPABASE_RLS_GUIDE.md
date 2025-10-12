# Supabase Row Level Security (RLS) Troubleshooting Guide

## Overview
If sessions are still showing as "Ongoing" after clicking "Work Invigilator OFF", the issue might be with Supabase Row Level Security (RLS) policies. RLS policies control who can read, insert, update, or delete rows in a table.

## Problem
Employees need to be able to UPDATE their own session records to set the `session_end_time`. If the RLS policy doesn't allow this, the update will fail silently (unless you check the console logs).

## How to Check RLS Policies

### 1. Access Supabase Dashboard
1. Go to https://supabase.com
2. Sign in to your account
3. Select your project

### 2. Navigate to Table Editor
1. Click on "Table Editor" in the left sidebar
2. Find the `recording_sessions` table
3. Click on it to view the table

### 3. Check RLS Settings
1. Look for the shield icon (🛡️) next to the table name
2. If RLS is enabled, you'll see "RLS enabled" badge
3. Click on "RLS" or "Policies" to view existing policies

## Required RLS Policies for `recording_sessions` Table

You need the following policies for employees to properly manage their sessions:

### Policy 1: Allow Employees to Insert Their Own Sessions
```sql
-- Policy Name: Employees can insert their own sessions
-- Allowed operation: INSERT
-- Target roles: authenticated

CREATE POLICY "Employees can insert their own sessions"
ON recording_sessions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
```

### Policy 2: Allow Employees to Update Their Own Sessions
```sql
-- Policy Name: Employees can update their own sessions
-- Allowed operation: UPDATE
-- Target roles: authenticated

CREATE POLICY "Employees can update their own sessions"
ON recording_sessions
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

### Policy 3: Allow Employees to Select Their Own Sessions
```sql
-- Policy Name: Employees can view their own sessions
-- Allowed operation: SELECT
-- Target roles: authenticated

CREATE POLICY "Employees can view their own sessions"
ON recording_sessions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
```

### Policy 4: Allow Admins to View All Sessions (for Dashboard)
```sql
-- Policy Name: Admins can view all sessions in their organization
-- Allowed operation: SELECT
-- Target roles: authenticated

CREATE POLICY "Admins can view organization sessions"
ON recording_sessions
FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id 
    FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);
```

## How to Add RLS Policies

### Option 1: Using Supabase Dashboard (GUI)

1. **Navigate to Authentication → Policies**
   - Click on "Authentication" in the left sidebar
   - Click on "Policies"
   - Select `recording_sessions` table

2. **Add New Policy**
   - Click "New Policy"
   - Choose "Create a policy from scratch" or use a template
   - Fill in the policy details:
     - **Policy name**: e.g., "Employees can update their own sessions"
     - **Allowed operation**: UPDATE
     - **Target roles**: authenticated
     - **USING expression**: `auth.uid() = user_id`
     - **WITH CHECK expression**: `auth.uid() = user_id`
   - Click "Review" → "Save policy"

3. **Repeat for Other Operations**
   - Create similar policies for INSERT and SELECT

### Option 2: Using SQL Editor

1. **Navigate to SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New query"

2. **Run the SQL Commands**
   - Copy and paste the SQL commands from the "Required RLS Policies" section above
   - Click "Run" or press F5 to execute
   - Repeat for each policy

3. **Verify Policies**
   - Go back to "Table Editor" → `recording_sessions`
   - Check that all policies are listed under "Policies"

## Testing RLS Policies

After adding the policies, test them:

1. **Test Insert (Start Session)**
   ```javascript
   // This should succeed
   const { data, error } = await supabase
     .from('recording_sessions')
     .insert([{
       user_id: currentUser.id,
       organization_id: orgId,
       session_start_time: new Date().toISOString(),
       session_end_time: null
     }])
     .select()
     .single();
   
   console.log('Insert result:', { data, error });
   ```

2. **Test Update (End Session)**
   ```javascript
   // This should succeed
   const { data, error } = await supabase
     .from('recording_sessions')
     .update({
       session_end_time: new Date().toISOString(),
       total_duration_seconds: 3600
     })
     .eq('id', sessionId);
   
   console.log('Update result:', { data, error });
   ```

3. **Check Console Logs**
   - Open Developer Tools (F12 or Ctrl+Shift+I)
   - Look for any errors in the console
   - Common RLS errors:
     - `"new row violates row-level security policy"`
     - `"permission denied for table recording_sessions"`

## Common Issues and Solutions

### Issue 1: "new row violates row-level security policy"
**Cause**: The RLS policy's `WITH CHECK` condition is not met.

**Solution**:
- Ensure the `user_id` in the insert/update matches the authenticated user's ID
- Check that `auth.uid()` returns the correct user ID
- Verify the policy's `WITH CHECK` expression

### Issue 2: "permission denied for table recording_sessions"
**Cause**: No RLS policy allows the operation.

**Solution**:
- Add the missing policy (INSERT, UPDATE, or SELECT)
- Ensure the policy targets "authenticated" role
- Check that RLS is enabled on the table

### Issue 3: Update fails silently (no error)
**Cause**: The policy's `USING` condition is not met.

**Solution**:
- Check the `USING` expression in the UPDATE policy
- Ensure `auth.uid() = user_id`
- Verify the user is authenticated and has a valid session

### Issue 4: Admin can't view employee sessions
**Cause**: Missing admin policy or incorrect organization_id.

**Solution**:
- Add the admin policy (see Policy 4 above)
- Verify the `profiles` table has the correct `role` and `organization_id`
- Check that admins have `role = 'admin'` in their profile

## Complete RLS Setup Script

Run this script to set up all required policies:

```sql
-- Enable RLS on recording_sessions table
ALTER TABLE recording_sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (if any)
DROP POLICY IF EXISTS "Employees can insert their own sessions" ON recording_sessions;
DROP POLICY IF EXISTS "Employees can update their own sessions" ON recording_sessions;
DROP POLICY IF EXISTS "Employees can view their own sessions" ON recording_sessions;
DROP POLICY IF EXISTS "Admins can view organization sessions" ON recording_sessions;

-- Create new policies
CREATE POLICY "Employees can insert their own sessions"
ON recording_sessions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Employees can update their own sessions"
ON recording_sessions
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Employees can view their own sessions"
ON recording_sessions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view organization sessions"
ON recording_sessions
FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id 
    FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Verify policies
SELECT * FROM pg_policies WHERE tablename = 'recording_sessions';
```

## Verification Checklist

After setting up RLS policies, verify:

- [ ] RLS is enabled on `recording_sessions` table
- [ ] INSERT policy exists for employees
- [ ] UPDATE policy exists for employees
- [ ] SELECT policy exists for employees
- [ ] SELECT policy exists for admins (to view all organization sessions)
- [ ] Test creating a session (should succeed)
- [ ] Test updating a session (should succeed)
- [ ] Test viewing sessions in dashboard (should show sessions)
- [ ] No RLS errors in browser console

## Additional Resources

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Policy Examples](https://supabase.com/docs/guides/auth/row-level-security#policies)
- [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)

## Getting Help

If you're still experiencing issues:

1. Check the browser console for errors (F12)
2. Check the Supabase logs in the dashboard
3. Verify the user's auth token is valid
4. Test the policies using SQL Editor
5. Contact Supabase support or check their Discord

