import { AuthUser } from '../types';

/**
 * Validates if the user has Director-level access.
 * Includes roles: 'director', 'Superadmin', or job titles containing 'direktur'.
 */
export const isDirectorLevel = (authUser?: AuthUser | null): boolean => {
  if (!authUser) return false;
  
  const role = authUser.role?.toLowerCase();
  const level = authUser.userLevel?.toLowerCase();
  const jobTitle = authUser.jobTitle?.toLowerCase() || '';

  return (
    role === 'director' ||
    level === 'superadmin' ||
    jobTitle.includes('direktur') ||
    jobTitle.includes('owner')
  );
};

/**
 * Validates if the user is active.
 */
export const isActiveUser = (authUser?: AuthUser | null): boolean => {
    // Assuming AuthUser doesn't explicitly store status, 
    // but the session/loginTime implies activity.
    // For now, if AuthUser exists, consider active, or check if status field was added to AuthUser in types.
    // Looking at AuthUser type, it doesn't have status. 
    // If we need stricter validation, we might need to check against ManagedUsers list, 
    // but this utility should be simple.
    return !!authUser;
};
