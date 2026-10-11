import { AuthUser } from '../types';

/**
 * Validates if the user has Superadmin access.
 */
export const isSuperadmin = (authUser?: AuthUser | null): boolean => {
  if (!authUser) return false;
  const role = authUser.role?.toLowerCase();
  const level = authUser.userLevel?.toLowerCase();
  const username = authUser.username?.toLowerCase();
  const jobTitle = authUser.jobTitle?.toLowerCase() || '';

  return (
    level === 'superadmin' ||
    role === 'superadmin' ||
    username === 'superadmin' ||
    jobTitle.includes('superadmin')
  );
};

/**
 * Validates if the user has Director-level or Superadmin access.
 * Includes roles: 'director', 'superadmin', 'Superadmin', or job titles containing 'direktur', 'owner', 'superadmin'.
 */
export const isDirectorLevel = (authUser?: AuthUser | null): boolean => {
  if (!authUser) return false;
  
  if (isSuperadmin(authUser)) return true;

  const role = authUser.role?.toLowerCase();
  const level = authUser.userLevel?.toLowerCase();
  const jobTitle = authUser.jobTitle?.toLowerCase() || '';

  return (
    role === 'director' ||
    level === 'director' ||
    jobTitle.includes('direktur') ||
    jobTitle.includes('owner')
  );
};

/**
 * Validates if the user is active.
 */
export const isActiveUser = (authUser?: AuthUser | null): boolean => {
    return !!authUser;
};

