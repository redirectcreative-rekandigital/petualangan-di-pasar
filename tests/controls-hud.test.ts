import { describe, it, expect, beforeEach } from 'vitest';
import { createInputManager } from '../src/input/controls';
import { createHud } from '../src/ui/hud';

beforeEach(() => {
  document.body.innerHTML = '';
});

const tekan = (key: string, target: EventTarget = window): void => {
  target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
  target.dispatchEvent(new KeyboardEvent('keyup', { key, bubbles: true }));
};

describe('input: tombol sesaat', () => {
  it('tombol E tidak hilang: terbaca tepat satu frame', () => {
    const input = createInputManager();
    tekan('e');
    input.endFrame(); // awal frame berikutnya
    expect(input.state.interactPressed).toBe(true);
    input.endFrame();
    expect(input.state.interactPressed).toBe(false);
    input.destroy();
  });

  it('Spasi dan tombol Lompat memicu lompat satu kali', () => {
    const input = createInputManager();
    tekan(' ');
    input.endFrame();
    expect(input.state.jumpPressed).toBe(true);
    input.endFrame();
    expect(input.state.jumpPressed).toBe(false);
    input.pressJump();
    input.endFrame();
    expect(input.state.jumpPressed).toBe(true);
    input.destroy();
  });

  it('mengetik di kolom isian tidak menggerakkan atau melompatkan karakter', () => {
    const input = createInputManager();
    const isian = document.createElement('input');
    document.body.append(isian);
    isian.dispatchEvent(new KeyboardEvent('keydown', { key: 'w', bubbles: true }));
    isian.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    input.endFrame();
    expect(input.state.moving).toBe(false);
    expect(input.state.jumpPressed).toBe(false);
    input.destroy();
  });

  it('W = maju (moveY positif), D = kanan (moveX positif)', () => {
    const input = createInputManager();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'w' }));
    input.endFrame();
    expect(input.state.moveY).toBeCloseTo(1);
    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'w' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'd' }));
    input.endFrame();
    expect(input.state.moveX).toBeCloseTo(1);
    expect(input.state.moveY).toBeCloseTo(0);
    input.destroy();
  });
});

describe('HUD balai', () => {
  const buatHud = (): { hud: ReturnType<typeof createHud>; lompat: () => number } => {
    let jumlahLompat = 0;
    const hud = createHud({ onInteract: () => {}, onMenu: () => {}, onTas: () => {}, onLompat: () => jumlahLompat++ });
    const app = document.createElement('div');
    app.id = 'app';
    document.body.append(app);
    app.append(hud.root);
    return { hud, lompat: () => jumlahLompat };
  };

  it('kartu Misi berada di bawah kartu tas & bintang, dan tidak ada bar misi di atas', () => {
    const { hud } = buatHud();
    const kiriAtas = hud.root.querySelector('.hud-kiri-atas');
    expect(kiriAtas?.children[0]?.classList.contains('hud-stats')).toBe(true);
    expect(kiriAtas?.children[1]?.classList.contains('misi-tombol')).toBe(true);
    expect(hud.root.querySelector('.misi-bar')).toBeNull();
  });

  it('mengetuk kartu Misi membuka modal berisi tugas & tahapan', () => {
    const { hud } = buatHud();
    hud.setMisi('📖 Baca Halaman Cerita bersama Cantrik Prisma.', 1);
    hud.root.querySelector<HTMLButtonElement>('.misi-tombol')?.click();
    const modal = document.querySelector('.misi-overlay');
    expect(modal).not.toBeNull();
    // Kelas dialog-overlay membuat dunia 3D dijeda selama modal terbuka.
    expect(modal?.classList.contains('dialog-overlay')).toBe(true);
    expect(modal?.textContent).toContain('Baca Halaman Cerita bersama Cantrik Prisma.');
    const item = modal?.querySelectorAll('.misi-item');
    expect(item?.length).toBe(4);
    expect(item?.[0]?.classList.contains('lewat')).toBe(true);
    expect(item?.[1]?.classList.contains('aktif')).toBe(true);
    // Tutup.
    modal?.querySelector<HTMLButtonElement>('.dialog-panel > .tutup-x')?.click();
    expect(document.querySelector('.misi-overlay')).toBeNull();
  });

  it('kartu Misi diberi tanda "baru" saat tahap berganti, hilang setelah dibuka', () => {
    const { hud } = buatHud();
    const tombol = hud.root.querySelector<HTMLButtonElement>('.misi-tombol');
    hud.setMisi('Temui Mbok Sinar', 0);
    expect(tombol?.classList.contains('baru')).toBe(false);
    hud.setMisi('Baca Halaman Cerita', 1);
    expect(tombol?.classList.contains('baru')).toBe(true);
    tombol?.click();
    expect(tombol?.classList.contains('baru')).toBe(false);
  });

  it('tombol Lompat memanggil onLompat saat ditekan', () => {
    const { hud, lompat } = buatHud();
    const tombol = hud.root.querySelector<HTMLButtonElement>('.btn-action.lompat');
    expect(tombol).not.toBeNull();
    tombol?.dispatchEvent(new Event('pointerdown', { bubbles: true, cancelable: true }));
    expect(lompat()).toBe(1);
  });
});

describe('kunci lari', () => {
  it('tombol tersembunyi sampai diminta tampil, lalu menyalakan status terkunci', () => {
    let tekan = 0;
    const hud = createHud({ onInteract: () => {}, onMenu: () => {}, onTas: () => {}, onLompat: () => {}, onKunciLari: () => tekan++ });
    const btn = hud.root.querySelector('.btn-kunci-lari') as HTMLElement;
    expect(btn.classList.contains('hidden')).toBe(true);
    hud.setKunciLari(true, true);
    expect(btn.classList.contains('hidden')).toBe(false);
    expect(btn.getAttribute('aria-pressed')).toBe('true');
    btn.dispatchEvent(new Event('pointerdown', { cancelable: true }));
    expect(tekan).toBe(1);
    hud.destroy();
  });

  it('toggleLari membalik status input', () => {
    const input = createInputManager();
    expect(input.state.lari).toBe(false);
    input.toggleLari();
    expect(input.state.lari).toBe(true);
    input.toggleLari();
    expect(input.state.lari).toBe(false);
    input.destroy();
  });
});

describe('tombol kanan bawah', () => {
  it('Tas pindah ke lingkaran kanan bawah, tombol aksi melayang di luarnya', () => {
    const hud = createHud({ onInteract: () => {}, onMenu: () => {}, onTas: () => {}, onLompat: () => {} });
    const lingkaran = hud.root.querySelector('.hud-actions') as HTMLElement;
    expect(lingkaran.querySelector('.tas-besar')).not.toBeNull();
    expect(lingkaran.querySelector('.lompat')).not.toBeNull();
    expect(lingkaran.querySelector('.kamera')).not.toBeNull();
    expect(hud.root.querySelector('.hud-kiri-atas .tas-besar')).toBeNull();
    expect(lingkaran.querySelector('.interact')).toBeNull();
    hud.setInteractPos(120.4, 80.6);
    expect((hud.root.querySelector('.interact') as HTMLElement).style.transform).toContain('translate(120px, 81px)');
    hud.destroy();
  });

  it('tombol Kamera memanggil onKamera dan menampilkan mode', () => {
    let tekan = 0;
    const hud = createHud({ onInteract: () => {}, onMenu: () => {}, onTas: () => {}, onLompat: () => {}, onKamera: () => tekan++ });
    const btn = hud.root.querySelector('.kamera') as HTMLElement;
    btn.dispatchEvent(new Event('pointerdown', { cancelable: true }));
    expect(tekan).toBe(1);
    hud.setModeKamera('Dekat');
    expect(btn.textContent).toContain('Dekat');
    hud.destroy();
  });
});
