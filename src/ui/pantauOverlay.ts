/**
 * Memantau overlay UI di atas dunia 3D tanpa `querySelector` tiap frame:
 * status dihitung ulang hanya saat DOM berubah (MutationObserver).
 */

/** Overlay yang menjeda dunia (percakapan, dialog, cerita, hadiah). */
const SELEKTOR_JEDA = '.dialog-overlay, .vn-overlay, .cerita-overlay, .hadiah-overlay';
/** Overlay yang menutup layar tanpa tembus pandang: dunia di belakangnya tak perlu digambar. */
const SELEKTOR_PENUTUP = '.cut-overlay, html.mode-ringan .cerita-overlay';

export interface PantauOverlay {
  /** Ada overlay yang menjeda dunia. */
  adaOverlay: () => boolean;
  /** Layar tertutup penuh: lewati render 3D. */
  tertutupPenuh: () => boolean;
  lepas: () => void;
}

export function pantauOverlay(): PantauOverlay {
  let ada = false;
  let tertutup = false;
  const cek = (): void => {
    ada = document.body.querySelector(SELEKTOR_JEDA) !== null;
    tertutup = document.body.querySelector(SELEKTOR_PENUTUP) !== null;
  };
  const pengamat = new MutationObserver(cek);
  pengamat.observe(document.body, { childList: true, subtree: true });
  cek();
  return { adaOverlay: () => ada, tertutupPenuh: () => tertutup, lepas: () => pengamat.disconnect() };
}
