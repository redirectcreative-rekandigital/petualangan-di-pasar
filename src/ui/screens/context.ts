import type { Progress } from '../../../shared/types';

export type ScreenName = 'title' | 'howto' | 'map' | 'noktah' | 'balai' | 'quiz' | 'result' | 'balaiResult' | 'about' | 'intro' | 'guru' | 'final' | 'tutupPanel';

/**
 * Konteks yang dibagikan ke semua layar. Router disediakan sebagai callback
 * agar layar tidak perlu tahu detail navigasi.
 */
export interface ScreenContext {
  navigate: (screen: ScreenName, options?: Record<string, unknown>) => void;
  getProgress: () => Progress;
  setProgress: (progress: Progress) => void;
  /** Menyimpan progres ke localStorage. */
  persist: () => void;
  /** Menghapus progres dan memulai dari awal; mengembalikan progres baru. */
  reset: () => Progress;
}

export interface ScreenOptions {
  [key: string]: unknown;
}
