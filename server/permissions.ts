import { Request, Response, NextFunction } from "express";

// Define role hierarchy and permissions
export enum UserRole {
  STAFF = "staff",
  MANAGER = "manager", 
  ADMIN = "admin"
}

export enum Permission {
  CREATE = "create",
  READ = "read", 
  UPDATE = "update",
  DELETE = "delete",
  APPROVE = "approve",
  MANAGE_USERS = "manage_users",
  VIEW_REPORTS = "view_reports",
  MANAGE_SYSTEM = "manage_system"
}

// Role permission mapping
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.STAFF]: [
    Permission.CREATE,
    Permission.READ
  ],
  [UserRole.MANAGER]: [
    Permission.CREATE,
    Permission.READ,
    Permission.UPDATE,
    Permission.APPROVE,
    Permission.VIEW_REPORTS
  ],
  [UserRole.ADMIN]: [
    Permission.CREATE,
    Permission.READ,
    Permission.UPDATE,
    Permission.DELETE,
    Permission.APPROVE,
    Permission.MANAGE_USERS,
    Permission.VIEW_REPORTS,
    Permission.MANAGE_SYSTEM
  ]
};

// Check if user has permission
export function hasPermission(userRole: string, permission: Permission): boolean {
  const role = userRole as UserRole;
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
}

// Check if user can perform CRUD operation
export function canPerformOperation(userRole: string, operation: 'create' | 'read' | 'update' | 'delete'): boolean {
  const permissionMap = {
    'create': Permission.CREATE,
    'read': Permission.READ,
    'update': Permission.UPDATE,
    'delete': Permission.DELETE
  };
  
  return hasPermission(userRole, permissionMap[operation]);
}

// Middleware to check permissions for routes
export function requirePermission(permission: Permission) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as any;
    
    if (!user) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    if (!hasPermission(user.role, permission)) {
      return res.status(403).json({ 
        message: "Insufficient permissions",
        required: permission,
        userRole: user.role
      });
    }
    
    next();
  };
}

// Middleware to check CRUD operation permissions
export function requireCrudPermission(operation: 'create' | 'read' | 'update' | 'delete') {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as any;
    
    if (!user) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    if (!canPerformOperation(user.role, operation)) {
      return res.status(403).json({ 
        message: `Insufficient permissions for ${operation} operation`,
        userRole: user.role,
        allowedOperations: getAllowedOperations(user.role)
      });
    }
    
    next();
  };
}

// Get list of allowed operations for a role
export function getAllowedOperations(userRole: string): string[] {
  const operations = [];
  if (canPerformOperation(userRole, 'create')) operations.push('create');
  if (canPerformOperation(userRole, 'read')) operations.push('read');
  if (canPerformOperation(userRole, 'update')) operations.push('update');
  if (canPerformOperation(userRole, 'delete')) operations.push('delete');
  return operations;
}

// Resource-specific permission checking
export function canManageResource(userRole: string, resourceType: string, operation: string): boolean {
  // Special cases for specific resources
  switch (resourceType) {
    case 'users':
      // Only admins can manage users
      return userRole === UserRole.ADMIN && hasPermission(userRole, Permission.MANAGE_USERS);
    
    case 'system-settings':
      // Only admins can manage system settings  
      return userRole === UserRole.ADMIN && hasPermission(userRole, Permission.MANAGE_SYSTEM);
    
    case 'reports':
      // Managers and admins can view reports
      return [UserRole.MANAGER, UserRole.ADMIN].includes(userRole as UserRole) && 
             hasPermission(userRole, Permission.VIEW_REPORTS);
             
    case 'approvals':
      // Managers and admins can approve
      return [UserRole.MANAGER, UserRole.ADMIN].includes(userRole as UserRole) && 
             hasPermission(userRole, Permission.APPROVE);
    
    default:
      // Default CRUD permissions for other resources
      return canPerformOperation(userRole, operation as any);
  }
}

// Middleware for resource-specific permissions
export function requireResourcePermission(resourceType: string, operation: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as any;
    
    if (!user) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    if (!canManageResource(user.role, resourceType, operation)) {
      return res.status(403).json({ 
        message: `Insufficient permissions for ${operation} on ${resourceType}`,
        userRole: user.role
      });
    }
    
    next();
  };
}

// Helper to get user permissions summary
export function getUserPermissionsSummary(userRole: string) {
  const role = userRole as UserRole;
  const permissions = ROLE_PERMISSIONS[role] || [];
  
  // Create detailed resource-specific permissions for frontend
  const canCreate = canPerformOperation(userRole, 'create');
  const canRead = canPerformOperation(userRole, 'read');
  const canUpdate = canPerformOperation(userRole, 'update');
  const canDelete = canPerformOperation(userRole, 'delete');
  
  // Role-specific resource permissions
  const isAdmin = userRole === UserRole.ADMIN;
  const isManager = [UserRole.MANAGER, UserRole.ADMIN].includes(userRole as UserRole);
  
  return {
    canCreate,
    canRead,
    canUpdate,
    canDelete,
    resources: {
      clients: { 
        create: canCreate, 
        read: canRead, 
        update: canUpdate, 
        delete: canDelete 
      },
      staff: { 
        create: canCreate, 
        read: canRead, 
        update: canUpdate, 
        delete: canDelete 
      },
      users: { 
        create: isManager, 
        read: canRead, 
        update: isManager, 
        delete: isAdmin 
      },
      timeLogs: { 
        create: canCreate, 
        read: canRead, 
        update: canUpdate, 
        delete: canDelete 
      },
      budgets: { 
        create: canCreate, 
        read: canRead, 
        update: canUpdate, 
        delete: canDelete 
      },
      assignments: { 
        create: canCreate, 
        read: canRead, 
        update: canUpdate, 
        delete: canDelete 
      },
      reports: { 
        create: isAdmin, 
        read: isManager, 
        update: isAdmin, 
        delete: isAdmin 
      },
      systemSettings: { 
        create: isAdmin, 
        read: isManager, 
        update: isAdmin, 
        delete: isAdmin 
      },
      approvals: { 
        create: isManager, 
        read: isManager, 
        update: isManager, 
        delete: isAdmin 
      },
      dataImport: { 
        create: canCreate, 
        read: canRead, 
        update: canUpdate, 
        delete: canDelete 
      },
      documents: { 
        create: canCreate, 
        read: canRead, 
        update: canUpdate, 
        delete: canDelete 
      }
    },
    // Legacy compatibility
    role: userRole,
    permissions,
    allowedOperations: getAllowedOperations(userRole),
    canManageUsers: hasPermission(userRole, Permission.MANAGE_USERS),
    canViewReports: hasPermission(userRole, Permission.VIEW_REPORTS),
    canApprove: hasPermission(userRole, Permission.APPROVE),
    canManageSystem: hasPermission(userRole, Permission.MANAGE_SYSTEM)
  };
}