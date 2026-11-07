/**
 * Layar penuh otomatis di HP/tablet, baik tegak (portrait) maupun mendatar
 * (landscape).
 *
 * Peramban hanya mengizinkan layar penuh setelah ada sentuhan/ketukan pengguna,
 * jadi kita memintanya pada ketukan PERTAMA, dan meminta lagi pada ketukan
 * berikutnya bila layar penuh sempat keluar (mis. HP diputar, tombol kembali,
 * atau aplikasi berpindah). Di laptop/PC (mouse) tidak dipaksa.
 *
 * Catatan: Safari di iPhone tidak mendukung layar penuh untuk halaman web; di
 * sana pemain bisa "Tambahkan ke Layar Utama" (PWA) agar tampil tanpa bilah.
 */

type DokumenWebkit = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void>;
};
type ElemenWebkit = HTMLElement & { webkitRequestFullscreen?: (opsi?: FullscreenOptions) => Promise<void> | void };

export function sedangLayarPenuh(): boolean {
  const d = document as DokumenWebkit;
  return Boolean(d.fullscreenElement ?? d.webkitFullscreenElement);
}

function dukung(): boolean {
  const el = document.documentElement as ElemenWebkit;
  return typeof el.requestFullscreen === 'function' || typeof el.webkitRequestFullscreen === 'function';
}

/** Perangkat sentuh (HP/tablet): layar penuh otomatis hanya untuk perangkat ini. */
function perangkatSentuh(): boolean {
  try {
    return window.matchMedia('(pointer: coarse)').matches;
  } catch {
    return false;
  }
}

let sedangMeminta = false;

export async function mintaLayarPenuh(): Promise<void> {
  if (sedangMeminta || sedangLayarPenuh() || !dukung()) return;
  const el = document.documentElement as ElemenWebkit;
  sedangMeminta = true;
  try {
    if (el.requestFullscreen) await el.requestFullscreen({ navigationUI: 'hide' });
    else await el.webkitRequestFullscreen?.();
  } catch {
    // Ditolak peramban (mis. bukan dari ketukan): coba lagi pada ketukan berikutnya.
  } finally {
    sedangMeminta = false;
  }
}

/**
 * Pasang pemicu layar penuh otomatis. `paksa` = juga di perangkat bermouse
 * (dipakai lewat ?layarpenuh=1 untuk pengujian).
 */
export function pasangLayarPenuhOtomatis(paksa = false): () => void {
  if (!dukung() || (!paksa && !perangkatSentuh())) return () => {};
  // Ketukan = aktivasi pengguna yang sah untuk requestFullscreen.
  const picu = (): void => {
    if (!sedangLayarPenuh()) void mintaLayarPenuh();
  };
  const opsi = { capture: true, passive: true } as const;
  document.addEventListener('pointerup', picu, opsi);
  document.addEventListener('touchend', picu, opsi);
  document.addEventListener('click', picu, opsi);
  document.addEventListener('keydown', picu, opsi);
  return () => {
    document.removeEventListener('pointerup', picu, opsi);
    document.removeEventListener('touchend', picu, opsi);
    document.removeEventListener('click', picu, opsi);
    document.removeEventListener('keydown', picu, opsi);
  };
}
