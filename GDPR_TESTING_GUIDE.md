# GDPR Features Testing Guide

## Overview
This guide provides comprehensive instructions for testing all GDPR compliance features in the Healthcare Service Management Platform. The system implements advanced document management with encryption, access control, and audit trails.

## Test Environment Setup

### Prerequisites
- System must be running with PostgreSQL database
- User must have appropriate permissions (Admin role recommended for full testing)
- Browser with developer tools enabled for monitoring network requests

### Access Points
- **Main Interface**: Navigate to "Object Storage" in the system sidebar
- **GDPR Dashboard**: Available through the GDPR Compliance section
- **Database**: Use SQL tool for backend verification

## 1. Document Upload Testing

### Test Case 1.1: Basic Document Upload
**Objective**: Verify document upload functionality with GDPR compliance

**Steps**:
1. Navigate to Object Storage page
2. Click "Upload Document" button
3. Fill in the upload form:
   - **File Name**: `test-document.pdf`
   - **Original Name**: `Test GDPR Document.pdf`
   - **MIME Type**: `application/pdf`
   - **File Size**: `4940` (bytes)
   - **Category**: Select "Client Documents"
   - **Access Level**: Select "private"
   - **Description**: `Test document for GDPR compliance verification`

**Expected Results**:
- Document appears in the Document Library table
- Document shows "Encrypted" status badge
- Success toast notification displays
- Document ID is generated automatically
- Upload timestamp is recorded

**Verification Queries**:
```sql
-- Verify document was created
SELECT id, file_name, original_name, is_encrypted, access_level, category 
FROM documents 
ORDER BY created_at DESC 
LIMIT 1;

-- Check access log was created
SELECT document_id, action, user_id, created_at 
FROM document_access_logs 
WHERE action = 'upload' 
ORDER BY created_at DESC 
LIMIT 1;
```

### Test Case 1.2: Document Upload Validation
**Steps**:
1. Try to upload without required fields
2. Verify validation messages appear
3. Check form prevents submission

**Expected Results**:
- Error toast: "Please fill in all required fields"
- Form does not submit until all fields completed

## 2. Document Viewing Testing

### Test Case 2.1: PDF Document Viewer
**Objective**: Test document viewing functionality with audit logging

**Steps**:
1. Locate a PDF document in the Document Library
2. Click the eye (👁️) icon in the Actions column
3. Verify new tab opens with document viewer

**Expected Results**:
- New browser tab opens
- HTML viewer displays with document information:
  - Document name and file type
  - File size in KB
  - Upload timestamp
  - Encryption status (🔒 Yes)
  - Access level (private/restricted)
  - Message: "In a production system, the actual PDF content would be displayed here"

**Backend Verification**:
```sql
-- Check view action was logged
SELECT document_id, action, user_id, ip_address, created_at 
FROM document_access_logs 
WHERE action = 'view' 
ORDER BY created_at DESC 
LIMIT 3;

-- Verify GDPR data access log
SELECT entity_type, action, accessed_by, created_at 
FROM data_access_logs 
WHERE entity_type = 'documents' AND action = 'view' 
ORDER BY created_at DESC 
LIMIT 3;
```

### Test Case 2.2: Image Document Viewer
**Steps**:
1. Upload an image file (set MIME type to `image/png`)
2. Click view button
3. Verify appropriate image viewer displays

**Expected Results**:
- Black background viewer interface
- White message box with image icon (🖼️)
- Image-specific messaging and metadata

### Test Case 2.3: Unknown File Type Viewer
**Steps**:
1. Upload document with MIME type `application/octet-stream`
2. Click view button

**Expected Results**:
- Generic file viewer with 📎 icon
- Message: "Preview not available for this file type. Use download to access the file."

## 3. Document Download Testing

### Test Case 3.1: Download Functionality
**Objective**: Test download with GDPR audit logging

**Steps**:
1. Click download (⬇️) icon for any document
2. Monitor browser network tab
3. Check console for download info

**Expected Results**:
- Success toast: "Download Initiated" with file name and size
- Console log shows download information object
- Network request to `/api/documents/{id}/download` returns 200

**Response Verification**:
Expected JSON response structure:
```json
{
  "message": "Download initiated",
  "document": {
    "id": "document-uuid",
    "originalName": "filename.pdf",
    "mimeType": "application/pdf",
    "fileSize": 4940,
    "downloadUrl": "/uploads/timestamp_filename.pdf"
  }
}
```

**Audit Trail Verification**:
```sql
-- Verify download was logged in document access logs
SELECT document_id, action, user_id, created_at, ip_address 
FROM document_access_logs 
WHERE action = 'download' 
ORDER BY created_at DESC 
LIMIT 1;

-- Check GDPR data access logging
SELECT entity_type, action, entity_id, accessed_by, created_at 
FROM data_access_logs 
WHERE action = 'download' 
ORDER BY created_at DESC 
LIMIT 1;
```

## 4. Document Deletion Testing

### Test Case 4.1: Soft Delete with Admin Permissions
**Objective**: Verify GDPR-compliant soft deletion

**Steps**:
1. As Admin user, click red delete (🗑️) button
2. Confirm deletion in any modal/confirmation
3. Verify document no longer appears in list

**Expected Results**:
- Document removed from visible list
- Success notification appears
- Document marked as deleted (not permanently removed)

**Backend Verification**:
```sql
-- Verify soft delete was performed
SELECT id, file_name, is_deleted, deleted_at, deleted_by 
FROM documents 
WHERE is_deleted = true 
ORDER BY deleted_at DESC 
LIMIT 1;

-- Check deletion was logged
SELECT entity_type, action, entity_id, accessed_by, created_at 
FROM data_access_logs 
WHERE action = 'delete' 
ORDER BY created_at DESC 
LIMIT 1;
```

### Test Case 4.2: Permission-Based Delete Access
**Steps**:
1. Test with Staff role (should not see delete button)
2. Test with Manager role (should see delete button)
3. Test with Admin role (should see delete button)

**Expected Results**:
- Delete buttons only visible to users with 'delete' permissions
- Permission system prevents unauthorized deletions

## 5. Access Logging Verification

### Test Case 5.1: Complete Audit Trail
**Objective**: Verify all document interactions are logged

**Steps**:
1. Navigate to "Access Logs" tab in Object Storage
2. Perform various document operations (view, download)
3. Refresh the Access Logs tab
4. Verify all actions appear in chronological order

**Expected Log Entries**:
- Document ID (truncated UUID display)
- User ID performing action
- Action type (view, download, upload, delete)
- IP address
- Timestamp

### Test Case 5.2: Log Data Completeness
**Database Verification**:
```sql
-- Get comprehensive access log summary
SELECT 
    action,
    COUNT(*) as action_count,
    MIN(created_at) as first_occurrence,
    MAX(created_at) as last_occurrence
FROM document_access_logs 
GROUP BY action 
ORDER BY action_count DESC;

-- Verify user agent and IP logging
SELECT DISTINCT 
    action, 
    ip_address, 
    user_agent IS NOT NULL as has_user_agent
FROM document_access_logs 
WHERE created_at > NOW() - INTERVAL '1 hour';
```

## 6. Document Retention Testing

### Test Case 6.1: Retention Schedule Display
**Steps**:
1. Navigate to "Retention Schedules" tab
2. Verify pre-configured retention policies display
3. Check retention status and scheduled dates

**Expected Results**:
- Table shows retention policy details:
  - Document ID
  - Retention Policy (7-year, 5-year, etc.)
  - Status (Active, Scheduled, etc.)
  - Scheduled Deletion Date

### Test Case 6.2: Retention Policy Verification
**Database Check**:
```sql
-- View retention schedules
SELECT id, document_id, retention_policy, status, scheduled_deletion_date, created_at 
FROM document_retention_schedules 
ORDER BY scheduled_deletion_date ASC;
```

## 7. GDPR Compliance Dashboard Testing

### Test Case 7.1: Compliance Status Overview
**Steps**:
1. Navigate to main Object Storage page
2. Review "GDPR Compliance Status" section at top
3. Verify all four compliance indicators

**Expected Status Indicators**:
- **Encryption**: "All documents encrypted" ✅
- **Access Tracking**: "X access logs" with count
- **Retention**: "X scheduled" with count  
- **Audit Trail**: "Complete logging enabled" ✅

### Test Case 7.2: Compliance Metrics Accuracy
**Verification Queries**:
```sql
-- Count encrypted documents
SELECT COUNT(*) as encrypted_docs FROM documents WHERE is_encrypted = true;

-- Count access logs
SELECT COUNT(*) as total_access_logs FROM document_access_logs;

-- Count retention schedules
SELECT COUNT(*) as scheduled_retentions FROM document_retention_schedules;
```

## 8. Permission System Testing

### Test Case 8.1: Role-Based Access Control
**Test with Different Roles**:

**Staff Role Testing**:
- Should see documents but no delete buttons
- Can view and download documents
- Cannot upload new documents

**Manager Role Testing**:
- Can view, download, and upload documents
- Can see edit functionality
- Cannot delete documents

**Admin Role Testing**:
- Full access to all GDPR features
- Can delete documents
- Can access all management functions

### Test Case 8.2: Permission Verification
**Steps**:
1. Log in with different role users
2. Navigate to Object Storage
3. Document which buttons/features are visible
4. Attempt restricted actions (should fail gracefully)

## 9. Data Export and GDPR Rights Testing

### Test Case 9.1: Document Library Export
**Steps**:
1. Navigate to document library
2. Use browser developer tools to check API responses
3. Verify all document metadata is available

**API Response Verification**:
Check `/api/documents` returns complete metadata:
```json
{
  "id": "uuid",
  "fileName": "file.pdf",
  "originalName": "Original File.pdf", 
  "mimeType": "application/pdf",
  "fileSize": 4940,
  "category": "client_documents",
  "accessLevel": "private",
  "isEncrypted": true,
  "createdAt": "2025-08-10T14:16:07.171Z",
  "uploadedBy": "user-uuid"
}
```

## 10. Security Testing

### Test Case 10.1: Access Control Verification
**Steps**:
1. Attempt to access documents without authentication
2. Try to access other users' private documents
3. Verify encryption status is correctly displayed

**Expected Results**:
- Unauthenticated requests return 401 errors
- Cross-user access properly restricted
- All documents show encryption status

### Test Case 10.2: Audit Trail Integrity
**Verification**:
```sql
-- Ensure all document operations are logged
SELECT 
    d.id as document_id,
    d.created_at as document_created,
    dal.created_at as first_log_entry
FROM documents d
LEFT JOIN document_access_logs dal ON d.id = dal.document_id
WHERE dal.action = 'upload'
ORDER BY d.created_at DESC;
```

## 11. Error Handling Testing

### Test Case 11.1: Network Error Handling
**Steps**:
1. Disable network connection
2. Attempt document operations
3. Verify graceful error handling

**Expected Results**:
- Error toasts display appropriate messages
- No application crashes
- User-friendly error messages

### Test Case 11.2: Invalid Document Access
**Steps**:
1. Manually navigate to `/api/documents/invalid-uuid/view`
2. Try accessing deleted documents
3. Test with malformed requests

**Expected Results**:
- 404 errors for non-existent documents
- Proper error pages for invalid requests
- No sensitive information leaked in errors

## 12. Performance Testing

### Test Case 12.1: Document Loading Performance
**Steps**:
1. Upload multiple test documents (5-10)
2. Measure page load times
3. Check document viewer load speeds
4. Verify database query performance

**Monitoring Points**:
- Initial page load time
- Document list rendering time  
- Viewer opening speed
- Database query execution times in logs

## Testing Checklist

### Pre-Test Setup
- [ ] Database is running and accessible
- [ ] User has appropriate permissions
- [ ] Browser developer tools enabled
- [ ] Test documents prepared

### Core Functionality
- [ ] Document upload works with validation
- [ ] Document viewer opens in new tab
- [ ] Download functionality returns proper response
- [ ] Delete operation performs soft delete
- [ ] Access logging captures all operations

### GDPR Compliance
- [ ] All documents marked as encrypted
- [ ] Complete audit trail maintained
- [ ] Retention schedules properly configured
- [ ] User permissions respected
- [ ] Data access logged per GDPR requirements

### Security & Performance
- [ ] Authentication required for all operations
- [ ] Cross-user access properly restricted
- [ ] Error handling graceful and secure
- [ ] Performance within acceptable limits
- [ ] No sensitive data exposure

## Troubleshooting Common Issues

### Document Viewer Shows "Failed to load PDF"
**Solution**: Check browser cache - clear cache or use timestamp parameter in URL

### Missing Delete Buttons
**Issue**: User role doesn't have delete permissions
**Solution**: Verify user has Admin role or appropriate permissions

### Empty Access Logs
**Issue**: Database logging not working
**Solution**: Check database connection and table structure

### Documents Not Appearing as Encrypted
**Issue**: Database schema or display logic problem
**Solution**: Verify `is_encrypted` field defaults to `true` in schema

## Conclusion

This testing guide ensures comprehensive verification of all GDPR features including document management, audit trails, access controls, and compliance reporting. Regular testing using these procedures will maintain system integrity and regulatory compliance.

For issues not covered in this guide, check system logs and database queries for detailed troubleshooting information.