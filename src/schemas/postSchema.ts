import { z } from 'zod';

export const createPostSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Field harus diisi')
    .min(3, 'Judul minimal 3 karakter')
    .max(255, 'Judul maksimal 255 karakter'),
  content: z
    .string()
    .trim()
    .min(1, 'Field harus diisi')
    .min(10, 'Konten minimal 10 karakter'),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;

/**
 * Escapes potentially hazardous characters for robust XSS prevention,
 * ensuring injected HTML/script tags or SQL fragments like:
 * <script>alert(1)</script> or ' OR 1=1;--
 * are safely stored and rendered as inert plain text strings.
 */
export function sanitizeString(val: string): string {
  if (!val) return '';
  return val
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}
