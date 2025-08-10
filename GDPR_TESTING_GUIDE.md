# GDPR Compliance Testing Guide

## Overview
The GDPR Compliance system has been successfully implemented with role-based access controls. Here's how to test each feature:

## Role-Based Access Levels

### Staff Role
- Can submit data export requests
- Can submit data deletion requests
- **Cannot access**: Retention policies, security incidents, full audit logs

### Manager Role  
- All Staff permissions, plus:
- Can view and manage security incidents
- Can view audit logs
- **Cannot access**: Retention policy management (read-only)

### Admin Role
- Full access to all GDPR features
- Can manage retention policies
- Can approve/reject deletion requests
- Full audit and incident management

## Testing Each Feature

### 1. Data Export Requests
**How to Test:**
1. Navigate to GDPR Compliance → Data Export tab
2. Click "Request New Export"
3. Fill out the form:
   - Select export format (JSON/CSV/XML)
   - Choose data types to include (Personal/Service/Financial)
   - Add a reason for the export
4. Submit the request
5. **Expected Result**: Request appears in the table with "pending" status

### 2. Data Deletion Requests
**How to Test:**
1. Navigate to GDPR Compliance → Data Deletion tab
2. Click "Request Data Deletion" 
3. Select a reason (account_closure, data_minimization, etc.)
4. Add detailed justification
5. Submit the request
6. **Expected Result**: Request appears in table
7. **Admin Testing**: Admin users can see "Approve" button to approve requests

### 3. Retention Policies (Admin Only)
**How to Test:**
1. Only visible to Admin users
2. Navigate to GDPR Compliance → Retention Policies tab
3. Click "Create New Policy"
4. Fill out policy details:
   - Data type (personal_data, service_records, etc.)
   - Retention period in days
   - Description
5. **Expected Result**: New policy appears in active policies list

### 4. Security Incidents (Manager/Admin Only)
**How to Test:**
1. Navigate to GDPR Compliance → Security Incidents tab
2. Click "Report New Incident"
3. Fill incident details:
   - Incident type (unauthorized_access, data_breach, etc.)
   - Severity level (low, medium, high, critical)
   - Description of what happened
4. **Expected Result**: Incident appears in incidents table with "detected" status

### 5. Audit Logs (Manager/Admin Only)
**How to Test:**
1. Navigate to GDPR Compliance → Audit Logs tab
2. **Expected Result**: Shows recent data access activities
3. Logs are automatically created when users access sensitive data

## What You Should See

### Dashboard Overview Cards:
- **Export Requests**: Shows total count and pending requests
- **Deletion Requests**: Shows total count and pending requests  
- **Active Policies**: Shows count of active retention policies
- **Security Incidents**: Shows total incidents and active ones

### Role-Based Visibility:
- **Staff**: Only sees Overview, Export Requests, and Deletion Requests tabs
- **Manager**: Sees all tabs except Retention Policies (read-only access)
- **Admin**: Full access to all tabs with full CRUD permissions

## Testing Tips

1. **Test Role Permissions**: Try accessing different tabs with different user roles
2. **Create Test Data**: Submit requests and policies to see the system in action
3. **Check Status Updates**: Admins can approve deletion requests to see status changes
4. **Verify Audit Trail**: Data access creates automatic audit log entries

## Expected 403 Errors (Normal Behavior)
- Staff users getting 403 on retention policies endpoint
- Staff users getting 403 on security incidents endpoint  
- Staff users getting 403 on audit logs endpoint
- These errors confirm role-based access control is working correctly

## Troubleshooting
- If you see empty tables, that's expected - create some test data first
- 403 errors are normal for unauthorized role access
- All forms should validate required fields before submission