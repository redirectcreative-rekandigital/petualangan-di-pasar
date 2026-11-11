import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCerita } from '../src/data/cerita';
import { bukaPercakapan } from '../src/ui/percakapan';
import { potretPemain } from '../src/ui/components/potretPemain';

vi.mock('../src/ui/components/potretPemain', () => ({ potretPemain: vi.fn() }));

const render = vi.mocked(potretPemain);
const potret = (): HTMLElement => document.querySelector('.vn-potret') as HTMLElement;
const tunggu = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

describe('potret pemain di percakapan', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    render.mockReset();
  });

  it('memakai gambar GLB untuk pemain, bukan untuk NPC', async () => {
    render.mockResolvedValue('data:image/png;base64,AAAA');
    const p = bukaPercakapan(document.body, { nama: 'Sari', gender: 'perempuan' });
    void p.bicara('pemain', 'Halo');
    await tunggu();
    expect(potret().style.backgroundImage).toContain('data:image/png');
    expect(potret().textContent).toBe('');

    const penjaga = getCerita('F01')?.penjaga;
    if (!penjaga) throw new Error('data hilang');
    p.tutup();
    const q = bukaPercakapan(document.body, { nama: 'Sari', gender: 'perempuan' });
    void q.bicara(penjaga, 'Halo');
    await tunggu();
    expect(potret().style.backgroundImage).toBe('');
    q.tutup();
  });

  it('tetap emoji bila render gagal', async () => {
    render.mockResolvedValue(null);
    const p = bukaPercakapan(document.body, { nama: 'Budi', gender: 'laki-laki' });
    void p.bicara('pemain', 'Halo');
    await tunggu();
    expect(potret().textContent).toBe('👦');
    p.tutup();
  });
});
