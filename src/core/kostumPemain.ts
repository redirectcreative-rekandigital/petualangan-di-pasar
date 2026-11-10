import type { PlayerGender, Progress } from '../../shared/types';
import { hitungWarna, rapikanPilihan, type PilihanKostum } from '../world/kostum';

/**
 * Jembatan antara kostum avatar GLB (`world/kostum.ts`) dan data progres.
 *
 * Kostum disimpan per profil di `Progress.kostum`. Karakter prosedural
 * (cadangan bila GLB gagal dimuat, ikon pemain di peta, dan teman di mode
 * kelas) hanya mengenal tiga warna, jadi warnanya diturunkan dari kostum.
 */

/** Pilihan kostum milik progres ini (sudah dirapikan; kosong = preset bawaan). */
export function kostumDari(p: Pick<Progress, 'gender' | 'kostum'>): PilihanKostum {
  return rapikanPilihan(p.gender, p.kostum ?? {});
}

const keAngka = (hex: string | undefined): number | undefined =>
  hex && /^#[0-9a-f]{6}$/i.test(hex) ? parseInt(hex.slice(1), 16) : undefined;

/** Tiga warna untuk karakter prosedural, diturunkan dari pilihan kostum. */
export function warnaTurunan(
  gender: PlayerGender,
  pilihan: PilihanKostum,
): { warnaBaju?: number; warnaBawahan?: number; warnaHijab?: number } {
  const { bagian } = hitungWarna(gender, pilihan);
  if (gender === 'perempuan') {
    return { warnaBaju: keAngka(bagian.tunik), warnaBawahan: keAngka(bagian.rok), warnaHijab: keAngka(bagian.kerudung) };
  }
  return { warnaBaju: keAngka(bagian.baju), warnaBawahan: keAngka(bagian.celana), warnaHijab: undefined };
}
