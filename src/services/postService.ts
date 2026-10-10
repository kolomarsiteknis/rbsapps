import { Post, AuthUser } from '../types';
import { createPostSchema, sanitizeString } from '../schemas/postSchema';
import { storageService } from './storageService';
import { recordUserActivity } from '../utils/activityLogger';

const POSTS_STORAGE_KEY = 'suryaland_posts_v1';

// Initial seed posts for operational bulletin
const initialPosts: Post[] = [
  {
    id: 'post-1',
    title: 'SOP Pembukaan Lahan Zero Burning 2026',
    content: 'Seluruh tim lapangan dan pengawas wajib mematuhi standar Zero Burning tanpa pembakaran sampah atau kayu ralas.',
    author_id: 'usr-dev-superadmin',
    author_name: 'Bambang Sugiarto (Direktur)',
    author_role: 'director',
    created_at: '2026-10-01T08:00:00.000Z',
  },
  {
    id: 'post-2',
    title: 'Pemberitahuan Cuaca Ekstrem Musim Hujan',
    content: 'P2H alat berat diperketat setiap pagi pukul 06:30 WIB untuk mengantisipasi potensi amblas di lahan gambut.',
    author_id: 'usr-dev-manager',
    author_name: 'Hadi Prasetyo (Manager)',
    author_role: 'manager',
    created_at: '2026-10-02T09:30:00.000Z',
  },
];

type PostEventListener = () => void;
const listeners = new Set<PostEventListener>();

function notifyPostListeners() {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (e) {
      console.error('Error notifying post listener:', e);
    }
  });
}

export interface CreatePostResult {
  success: boolean;
  message?: string;
  post?: Post;
  errors?: {
    title?: string;
    content?: string;
  };
  error?: string;
  code?: number;
}

export const postService = {
  subscribe(listener: PostEventListener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  getPosts(): Post[] {
    try {
      const data = localStorage.getItem(POSTS_STORAGE_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch (err) {
      console.error('[STORAGE ERROR] Failed to parse posts from storage:', err);
    }
    return initialPosts;
  },

  /**
   * Core Server Action / Endpoint simulation
   * Enforces Authentication, RBAC, Zod Validation, XSS Sanitization, and DB Integrity
   */
  async createPost(
    input: { title: string; content: string },
    authUser: AuthUser | null,
    options?: { simulateServerError?: boolean }
  ): Promise<CreatePostResult> {
    // 1. Pengujian Akses & Otorisasi: Bypass Login Check
    if (!authUser || !authUser.username) {
      console.warn('[SECURITY AUDIT] Unauthorized attempt to create post: No valid session.');
      return {
        success: false,
        error: 'Unauthorized',
        code: 401,
        message: 'Unauthorized: Sesi tidak valid atau belum login.',
      };
    }

    // 2. Pengujian Akses Role (RBAC)
    // Guest or unknown restricted role is explicitly denied
    const userRole = (authUser.role as string) || '';
    const userLevel = (authUser.userLevel as string) || '';
    const isGuest = userRole === 'guest' || userLevel.toLowerCase() === 'guest';
    const isAllowedRole = ['director', 'manager', 'supervisor', 'client'].includes(userRole) && !isGuest;

    if (!isAllowedRole) {
      console.warn(`[SECURITY AUDIT] Access Denied: User ${authUser.username} with role "${userRole}" attempted restricted action.`);
      return {
        success: false,
        error: 'Unauthorized',
        code: 403,
        message: 'Akses ditolak: Role Anda (Guest/Terbatas) tidak diizinkan membuat postingan baru.',
      };
    }

    // 3. Pengujian Validasi Input (Zod)
    // Run validation BEFORE triggering any database query or mutation
    const validationResult = createPostSchema.safeParse(input);

    if (!validationResult.success) {
      const formattedErrors: { title?: string; content?: string } = {};
      const fieldErrors = validationResult.error.flatten().fieldErrors;

      if (fieldErrors.title && fieldErrors.title.length > 0) {
        formattedErrors.title = fieldErrors.title[0];
      }
      if (fieldErrors.content && fieldErrors.content.length > 0) {
        formattedErrors.content = fieldErrors.content[0];
      }

      // Return immediately WITHOUT querying database
      return {
        success: false,
        errors: formattedErrors,
        message: 'Validasi input gagal. Silakan periksa kolom yang ditandai.',
      };
    }

    // 4. Pengujian UI/UX (Server Error Simulation / DB Disconnect)
    if (options?.simulateServerError) {
      const internalServerErr = new Error('Database connection failed: ETIMEDOUT 127.0.0.1:5432');
      console.error('[SERVER LOG ERROR] Failed to connect to local database server:', internalServerErr);
      return {
        success: false,
        error: 'Terjadi kesalahan internal server. Silakan coba beberapa saat lagi.',
        code: 500,
        message: 'Terjadi kesalahan internal server, silakan hubungi administrator.',
      };
    }

    // 5. Pengujian Integritas Database & XSS/SQL Injection Escaping
    try {
      const validData = validationResult.data;

      // Injeksi XSS/SQL: Data disimpan sebagai string biasa (escaped/parameterized)
      const sanitizedTitle = sanitizeString(validData.title);
      const sanitizedContent = sanitizeString(validData.content);

      const newPost: Post = {
        id: `post-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        title: sanitizedTitle,
        content: sanitizedContent,
        author_id: authUser.id || authUser.username,
        author_name: authUser.displayName || authUser.username,
        author_role: authUser.roleTitle || authUser.role,
        created_at: new Date().toISOString(),
      };

      const existingPosts = this.getPosts();
      const updatedPosts = [newPost, ...existingPosts];
      localStorage.setItem(POSTS_STORAGE_KEY, JSON.stringify(updatedPosts));

      // 6. Revalidasi Cache: Notify subscribers immediately without manual browser refresh
      notifyPostListeners();

      // Log activity
      try {
        recordUserActivity({
          userId: authUser.id,
          userName: authUser.displayName || authUser.username,
          userRole: authUser.role,
          actionCategory: 'REPORT',
          actionTitle: 'Buat Postingan Baru',
          actionDescription: `Membuat memo/post operasional baru: "${newPost.title.substring(0, 30)}..."`,
          targetEntity: 'Post Operasional',
        }).catch(() => {});
      } catch (_) {}

      return {
        success: true,
        message: 'Post berhasil dibuat!',
        post: newPost,
      };
    } catch (err: any) {
      console.error('[DATABASE INTEGRITY ERROR] Unexpected error while inserting post record:', err);
      return {
        success: false,
        error: 'Terjadi kesalahan internal server saat menyimpan data.',
        code: 500,
        message: 'Terjadi kesalahan internal server, silakan coba lagi nanti.',
      };
    }
  },

  deletePost(id: string): boolean {
    try {
      const current = this.getPosts();
      const updated = current.filter((p) => p.id !== id);
      localStorage.setItem(POSTS_STORAGE_KEY, JSON.stringify(updated));
      notifyPostListeners();
      return true;
    } catch (err) {
      console.error('Failed to delete post:', err);
      return false;
    }
  },

  resetPosts(): void {
    localStorage.setItem(POSTS_STORAGE_KEY, JSON.stringify(initialPosts));
    notifyPostListeners();
  },
};
