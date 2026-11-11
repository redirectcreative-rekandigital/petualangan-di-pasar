/**
 * Input terpadu: joystick virtual (sentuh) + keyboard (desktop) + drag kamera.
 * PRD v2 bagian 3 & 6: Pointer Events + HTML/CSS, multi-sentuh tanpa plugin.
 */

export interface InputState {
  /** Vektor gerak ternormalisasi (-1..1), x kanan, y depan. */
  moveX: number;
  moveY: number;
  /** Apakah pemain sedang bergerak. */
  moving: boolean;
  /** Tombol interaksi (A) ditekan pada frame ini. */
  interactPressed: boolean;
  /** Tombol menu/hint (B) ditekan pada frame ini. */
  menuPressed: boolean;
  /** Tombol lompat (Spasi / tombol ⤴️) ditekan pada frame ini. */
  jumpPressed: boolean;
  /** Lari sedang dikunci lewat tombol kecil di atas joystick. */
  lari: boolean;
}

export interface InputManager {
  state: InputState;
  /** Delta orbit kamera yang terkumpul sejak frame terakhir. */
  consumeOrbit: () => { yaw: number; pitch: number };
  /** Menempelkan elemen joystick ke DOM. */
  mountJoystick: (container: HTMLElement) => void;
  /** Dipanggil tiap frame untuk mereset tombol "pressed" sesaat. */
  endFrame: () => void;
  /** Meminta lompat (dari tombol HUD). Diproses pada frame berikutnya. */
  pressJump: () => void;
  /** Mengunci atau melepas lari. */
  toggleLari: () => void;
  destroy: () => void;
}

const DEAD_ZONE = 0.18;

export function createInputManager(): InputManager {
  const keys = new Set<string>();
  const state: InputState = {
    moveX: 0,
    moveY: 0,
    moving: false,
    interactPressed: false,
    menuPressed: false,
    jumpPressed: false,
    lari: false,
  };
  let orbitYaw = 0;
  let orbitPitch = 0;
  // Tombol sesaat yang menunggu frame berikutnya. Event keyboard/sentuh datang di
  // antara frame; disimpan di sini lalu dipindahkan ke `state` di awal frame,
  // sehingga tidak ada penekanan yang hilang.
  let jumpQueued = false;
  let interactQueued = false;
  let menuQueued = false;

  /** Mengetik di kolom isian tidak boleh menggerakkan atau melompatkan karakter. */
  const sedangMengetik = (ev: KeyboardEvent): boolean => {
    const t = ev.target as HTMLElement | null;
    return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
  };

  // --- Keyboard ---
  const onKeyDown = (ev: KeyboardEvent): void => {
    if (sedangMengetik(ev)) return;
    const k = ev.key.toLowerCase();
    keys.add(k);
    if (k === 'e') interactQueued = true;
    // Esc hanya menutup modal (ditangani modal itu sendiri); membuka menu dengan Esc
    // membuatnya langsung terbuka lagi setelah ditutup.
    if (k === 'h') menuQueued = true;
    // Spasi = lompat. Abaikan saat fokus di tombol, karena Spasi juga "mengklik" tombol itu.
    if (k === ' ' && !ev.repeat && !(ev.target instanceof HTMLButtonElement)) jumpQueued = true;
    if (['w', 'a', 's', 'd', ' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) {
      if (!(ev.target instanceof HTMLButtonElement)) ev.preventDefault();
    }
  };
  const onKeyUp = (ev: KeyboardEvent): void => {
    keys.delete(ev.key.toLowerCase());
  };
  // Saat jendela kehilangan fokus, `keyup` bisa tidak pernah datang (mis. alt-tab),
  // sehingga pemain terus berjalan sendiri. Bersihkan tombol yang tertahan.
  const onBlur = (): void => {
    keys.clear();
    joyX = 0;
    joyY = 0;
    resetJoystick?.();
  };
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);

  // --- Joystick virtual (menempel di container). ---
  let joyX = 0;
  let joyY = 0;
  let joyActive = false;
  /** Mengembalikan kenop ke tengah (dipasang oleh mountJoystick). */
  let resetJoystick: (() => void) | null = null;

  const mountJoystick = (container: HTMLElement): void => {
    const base = document.createElement('div');
    base.className = 'joystick-base';
    const knob = document.createElement('div');
    knob.className = 'joystick-knob';
    base.append(knob);
    container.append(base);

    let centerX = 0;
    let centerY = 0;
    let pointerId: number | null = null;

    const setKnob = (dx: number, dy: number): void => {
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
    };

    const onDown = (ev: PointerEvent): void => {
      pointerId = ev.pointerId;
      joyActive = true;
      base.setPointerCapture(ev.pointerId);
      const rect = base.getBoundingClientRect();
      centerX = rect.left + rect.width / 2;
      centerY = rect.top + rect.height / 2;
      handleMove(ev);
    };
    const handleMove = (ev: PointerEvent): void => {
      if (!joyActive || ev.pointerId !== pointerId) return;
      const rect = base.getBoundingClientRect();
      const maxR = rect.width / 2;
      let dx = ev.clientX - centerX;
      let dy = ev.clientY - centerY;
      const len = Math.hypot(dx, dy) || 1;
      if (len > maxR) {
        dx = (dx / len) * maxR;
        dy = (dy / len) * maxR;
      }
      setKnob(dx, dy);
      const nx = dx / maxR;
      const ny = dy / maxR;
      // Zona mati melingkar (bukan per sumbu): arah tetap utuh, sehingga dorongan
      // serong tidak "terpotong" menjadi lurus dan arah tidak meloncat-loncat.
      const besar = Math.hypot(nx, ny);
      if (besar < DEAD_ZONE) {
        joyX = 0;
        joyY = 0;
      } else {
        // Skala ulang agar kecepatan naik mulus dari 0 tepat di tepi zona mati.
        const skala = Math.min(1, (besar - DEAD_ZONE) / (1 - DEAD_ZONE)) / besar;
        joyX = nx * skala;
        joyY = -ny * skala; // layar Y ke bawah; "atas" di joystick = maju
      }
    };
    const lepas = (): void => {
      joyActive = false;
      pointerId = null;
      joyX = 0;
      joyY = 0;
      setKnob(0, 0);
    };
    resetJoystick = lepas;
    const onUp = (ev: PointerEvent): void => {
      if (ev.pointerId !== pointerId) return;
      lepas();
    };

    base.addEventListener('pointerdown', onDown);
    base.addEventListener('pointermove', handleMove);
    base.addEventListener('pointerup', onUp);
    base.addEventListener('pointercancel', onUp);
    base.addEventListener('lostpointercapture', onUp);
  };

  // --- Drag kamera di sisi kanan layar (area selain joystick & tombol). ---
  let dragId: number | null = null;
  let lastX = 0;
  let lastY = 0;

  const onPointerDown = (ev: PointerEvent): void => {
    const target = ev.target as HTMLElement;
    if (target.closest('.joystick-base') || target.closest('button') || target.closest('.panel') || target.closest('.overlay')) return;
    dragId = ev.pointerId;
    lastX = ev.clientX;
    lastY = ev.clientY;
  };
  const onPointerMove = (ev: PointerEvent): void => {
    if (dragId !== ev.pointerId) return;
    const dx = ev.clientX - lastX;
    const dy = ev.clientY - lastY;
    lastX = ev.clientX;
    lastY = ev.clientY;
    // Dijumlahkan (bukan ditimpa): beberapa event bisa datang dalam satu frame.
    orbitYaw += dx * 0.005;
    orbitPitch += dy * 0.004;
  };
  const onPointerUp = (ev: PointerEvent): void => {
    if (dragId === ev.pointerId) dragId = null;
  };
  window.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);

  const consumeOrbit = (): { yaw: number; pitch: number } => {
    const out = { yaw: orbitYaw, pitch: orbitPitch };
    orbitYaw = 0;
    orbitPitch = 0;
    return out;
  };

  /** Memindahkan tombol sesaat yang tertunda ke status frame ini, lalu mengosongkan antrean. */
  const ambilTombol = (): void => {
    state.interactPressed = interactQueued;
    state.menuPressed = menuQueued;
    state.jumpPressed = jumpQueued;
    interactQueued = false;
    menuQueued = false;
    jumpQueued = false;
  };

  const destroy = (): void => {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('pointerdown', onPointerDown);
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', onPointerUp);
  };

  // Menghitung vektor gerak dari keyboard + joystick tiap frame.
  const computeMove = (): void => {
    let kx = 0;
    let ky = 0;
    if (keys.has('w') || keys.has('arrowup')) ky += 1;
    if (keys.has('s') || keys.has('arrowdown')) ky -= 1;
    if (keys.has('a') || keys.has('arrowleft')) kx -= 1;
    if (keys.has('d') || keys.has('arrowright')) kx += 1;
    const len = Math.hypot(kx, ky);
    if (len > 0) {
      kx /= len;
      ky /= len;
    }
    state.moveX = kx + joyX;
    state.moveY = ky + joyY;
    const mlen = Math.hypot(state.moveX, state.moveY);
    if (mlen > 1) {
      state.moveX /= mlen;
      state.moveY /= mlen;
    }
    state.moving = mlen > DEAD_ZONE;
  };


  return {
    state,
    consumeOrbit,
    mountJoystick,
    // Dipanggil sekali di AWAL tiap frame (lihat loop di main.ts): hitung gerak
    // dan ambil tombol sesaat untuk frame ini.
    endFrame: () => {
      computeMove();
      ambilTombol();
    },
    pressJump: () => {
      jumpQueued = true;
    },
    toggleLari: () => {
      state.lari = !state.lari;
    },
    destroy,
  };
}
