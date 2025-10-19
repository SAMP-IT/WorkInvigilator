import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function PATCH(request: NextRequest) {
  try {
    const { employeeId, hourlyRate, organizationId } = await request.json()

    if (!employeeId || hourlyRate === undefined) {
      return NextResponse.json(
        { error: 'Employee ID and hourly rate are required' },
        { status: 400 }
      )
    }

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      )
    }

    // Validate hourly rate is a positive number
    const rate = parseFloat(hourlyRate)
    if (isNaN(rate) || rate < 0) {
      return NextResponse.json(
        { error: 'Hourly rate must be a positive number' },
        { status: 400 }
      )
    }

    // Verify employee belongs to the organization
    const { data: employee } = await supabaseAdmin
      .from('profiles')
      .select('id, organization_id')
      .eq('id', employeeId)
      .single()

    if (!employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      )
    }

    if (employee.organization_id !== organizationId) {
      return NextResponse.json(
        { error: 'Unauthorized: Employee does not belong to your organization' },
        { status: 403 }
      )
    }

    // Update hourly rate
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({ hourly_rate: rate })
      .eq('id', employeeId)
      .select()
      .single()

    if (error) {
      console.error('Error updating hourly rate:', error)
      return NextResponse.json(
        { error: 'Failed to update hourly rate' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Hourly rate updated successfully',
      employee: {
        id: data.id,
        hourly_rate: data.hourly_rate
      }
    })

  } catch (error) {
    console.error('Update hourly rate API error:', error)
    return NextResponse.json(
      { error: 'Failed to update hourly rate' },
      { status: 500 }
    )
  }
}
