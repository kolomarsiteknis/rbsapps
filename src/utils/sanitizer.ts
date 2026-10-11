/**
 * Sanitizes input to prevent XSS and injection by stripping dangerous HTML tags and characters.
 */
export const sanitizeInput = (input: string): string => {
  if (typeof input !== 'string') return '';
  // Strip HTML tags using a regex, then trim
  return input
    .replace(/<[^>]*>/g, '') 
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .trim();
};
