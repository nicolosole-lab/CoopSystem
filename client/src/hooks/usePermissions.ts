import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';

export interface UserPermissions {
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  resources: {
    clients: { create: boolean; read: boolean; update: boolean; delete: boolean };
    staff: { create: boolean; read: boolean; update: boolean; delete: boolean };
    users: { create: boolean; read: boolean; update: boolean; delete: boolean };
    timeLogs: { create: boolean; read: boolean; update: boolean; delete: boolean };
    budgets: { create: boolean; read: boolean; update: boolean; delete: boolean };
    assignments: { create: boolean; read: boolean; update: boolean; delete: boolean };
    reports: { create: boolean; read: boolean; update: boolean; delete: boolean };
    systemSettings: { create: boolean; read: boolean; update: boolean; delete: boolean };
    approvals: { create: boolean; read: boolean; update: boolean; delete: boolean };
    dataImport: { create: boolean; read: boolean; update: boolean; delete: boolean };
  };
}

// Default permissions for each role
const getDefaultPermissions = (role: string): UserPermissions => {
  const basePermissions = {
    canCreate: false,
    canRead: true, // All roles can read
    canUpdate: false,
    canDelete: false,
    resources: {
      clients: { create: false, read: true, update: false, delete: false },
      staff: { create: false, read: true, update: false, delete: false },
      users: { create: false, read: true, update: false, delete: false },
      timeLogs: { create: false, read: true, update: false, delete: false },
      budgets: { create: false, read: true, update: false, delete: false },
      assignments: { create: false, read: true, update: false, delete: false },
      reports: { create: false, read: true, update: false, delete: false },
      systemSettings: { create: false, read: false, update: false, delete: false },
      approvals: { create: false, read: false, update: false, delete: false },
      dataImport: { create: false, read: true, update: false, delete: false },
    }
  };

  switch (role) {
    case 'staff':
      return {
        ...basePermissions,
        canCreate: true,
        resources: {
          ...basePermissions.resources,
          clients: { create: true, read: true, update: false, delete: false },
          staff: { create: true, read: true, update: false, delete: false },
          users: { create: false, read: true, update: false, delete: false },
          timeLogs: { create: true, read: true, update: false, delete: false },
          budgets: { create: true, read: true, update: false, delete: false },
          assignments: { create: true, read: true, update: false, delete: false },
          dataImport: { create: true, read: true, update: false, delete: false },
        }
      };

    case 'manager':
      return {
        ...basePermissions,
        canCreate: true,
        canUpdate: true,
        resources: {
          ...basePermissions.resources,
          clients: { create: true, read: true, update: true, delete: false },
          staff: { create: true, read: true, update: true, delete: false },
          users: { create: true, read: true, update: true, delete: false },
          timeLogs: { create: true, read: true, update: true, delete: false },
          budgets: { create: true, read: true, update: true, delete: false },
          assignments: { create: true, read: true, update: true, delete: false },
          reports: { create: false, read: true, update: false, delete: false },
          systemSettings: { create: false, read: false, update: true, delete: false },
          dataImport: { create: true, read: true, update: true, delete: false },
        }
      };

    case 'admin':
      return {
        canCreate: true,
        canRead: true,
        canUpdate: true,
        canDelete: true,
        resources: {
          clients: { create: true, read: true, update: true, delete: true },
          staff: { create: true, read: true, update: true, delete: true },
          users: { create: true, read: true, update: true, delete: true },
          timeLogs: { create: true, read: true, update: true, delete: true },
          budgets: { create: true, read: true, update: true, delete: true },
          assignments: { create: true, read: true, update: true, delete: true },
          reports: { create: true, read: true, update: true, delete: true },
          systemSettings: { create: true, read: true, update: true, delete: true },
          approvals: { create: true, read: true, update: true, delete: true },
          dataImport: { create: true, read: true, update: true, delete: true },
        }
      };

    default:
      return basePermissions;
  }
};

export const usePermissions = () => {
  const { user } = useAuth();
  
  // Fetch permissions from server (fallback to default if failed)
  const { data: serverPermissions, isLoading } = useQuery({
    queryKey: ['/api/user/permissions'],
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
  
  // Use server permissions if available, otherwise fall back to defaults
  const permissions: UserPermissions = (serverPermissions as UserPermissions) || getDefaultPermissions(user?.role || '');
  
  // Helper functions for common permission checks
  const canCreate = (resource?: keyof UserPermissions['resources']) => {
    if (resource) {
      return permissions?.resources?.[resource]?.create || false;
    }
    return permissions?.canCreate || false;
  };

  const canRead = (resource?: keyof UserPermissions['resources']) => {
    if (resource) {
      return permissions?.resources?.[resource]?.read || false;
    }
    return permissions?.canRead || false;
  };

  const canUpdate = (resource?: keyof UserPermissions['resources']) => {
    if (resource) {
      return permissions?.resources?.[resource]?.update || false;
    }
    return permissions?.canUpdate || false;
  };

  const canDelete = (resource?: keyof UserPermissions['resources']) => {
    if (resource) {
      return permissions?.resources?.[resource]?.delete || false;
    }
    return permissions?.canDelete || false;
  };

  // Convenience functions for common resources
  const canManageUsers = () => canUpdate('users') || canDelete('users');
  const canManageClients = () => canUpdate('clients') || canDelete('clients');
  const canManageStaff = () => canUpdate('staff') || canDelete('staff');
  const canAccessReports = () => canRead('reports');
  const canManageSystem = () => canUpdate('systemSettings') || canDelete('systemSettings');
  const canApprove = () => canCreate('approvals');
  const canImportData = () => canCreate('dataImport');

  return {
    permissions,
    isLoading,
    canCreate,
    canRead, 
    canUpdate,
    canDelete,
    canManageUsers,
    canManageClients,
    canManageStaff,
    canAccessReports,
    canManageSystem,
    canApprove,
    canImportData,
    // Role-based helpers (for backward compatibility)
    isAdmin: user?.role === 'admin',
    isManager: user?.role === 'manager' || user?.role === 'admin',
    isStaff: user?.role === 'staff' || user?.role === 'manager' || user?.role === 'admin',
  };
};

export default usePermissions;