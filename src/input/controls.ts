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
}

export interface InputManager {
  state: InputState;
  /** Delta orbit kamera yang terkumpul sejak frame terakhir. */
  consumeOrbit: () => { yaw: number; pitch: number };
  /** Menempelkan elemen joystick ke DOM. */
  mountJoystick: (container: HTMLElement) => void;
  /** Dipanggil tiap frame untuk mereset tombol "pressed" sesaat. */
  endFrame: () => void;
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
  };
  let orbitYaw = 0;
  let orbitPitch = 0;

  // --- Keyboard ---
  const onKeyDown = (ev: KeyboardEvent): void => {
    keys.add(ev.key.toLowerCase());
    if (ev.key.toLowerCase() === 'e') state.interactPressed = true;
    if (ev.key.toLowerCase() === 'escape' || ev.key.toLowerCase() === 'h') state.menuPressed = true;
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(ev.key.toLowerCase())) {
      ev.preventDefault();
    }
  };
  const onKeyUp = (ev: KeyboardEvent): void => {
    keys.delete(ev.key.toLowerCase());
  };
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  // --- Joystick virtual (menempel di container). ---
  let joyX = 0;
  let joyY = 0;
  let joyActive = false;

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
      joyX = Math.abs(nx) < DEAD_ZONE ? 0 : nx;
      joyY = Math.abs(ny) < DEAD_ZONE ? 0 : -ny; // layar Y ke bawah, dunia Z ke depan
    };
    const onUp = (ev: PointerEvent): void => {
      if (ev.pointerId !== pointerId) return;
      joyActive = false;
      pointerId = null;
      joyX = 0;
      joyY = 0;
      setKnob(0, 0);
    };

    base.addEventListener('pointerdown', onDown);
    base.addEventListener('pointermove', handleMove);
    base.addEventListener('pointerup', onUp);
    base.addEventListener('pointercancel', onUp);
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
    orbitYaw = dx * 0.005;
    orbitPitch = dy * 0.004;
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

  const endFrame = (): void => {
    state.interactPressed = false;
    state.menuPressed = false;
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
    endFrame: () => {
      computeMove();
      endFrame();
    },
    destroy,
  };
}
