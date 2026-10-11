/**
 * Utility to sanitize user input to prevent XSS and potential injection.
 */
export const sanitizeInput = (input: string): string => {
  if (typeof input !== 'string') return '';
  return input
    .replace(/[<>]/g, '') // Strip < and >
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .trim();
};
