/**
 * Helper kecil untuk membuat elemen DOM tanpa framework.
 * Semua pembuatan atribut aman: teks selalu lewat textContent, bukan innerHTML.
 */

type Child = Node | string | null | undefined | false;

interface ElOptions {
  class?: string;
  text?: string;
  html?: never;
  attrs?: Record<string, string | number | boolean | undefined>;
  on?: Partial<{ [K in keyof HTMLElementEventMap]: (ev: HTMLElementEventMap[K]) => void }>;
  children?: Child[];
}

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  options: ElOptions = {},
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (options.class) node.className = options.class;
  if (options.text !== undefined) node.textContent = options.text;
  if (options.attrs) {
    for (const [key, value] of Object.entries(options.attrs)) {
      if (value === undefined || value === false) continue;
      if (value === true) node.setAttribute(key, '');
      else node.setAttribute(key, String(value));
    }
  }
  if (options.on) {
    for (const [event, handler] of Object.entries(options.on)) {
      node.addEventListener(event, handler as EventListener);
    }
  }
  if (options.children) {
    for (const child of options.children) {
      if (child === null || child === undefined || child === false) continue;
      node.append(typeof child === 'string' ? document.createTextNode(child) : child);
    }
  }
  return node;
}

export function clear(node: HTMLElement): void {
  while (node.firstChild) node.removeChild(node.firstChild);
}

export function mount(root: HTMLElement, ...nodes: Child[]): void {
  clear(root);
  for (const node of nodes) {
    if (node === null || node === undefined || node === false) continue;
    root.append(typeof node === 'string' ? document.createTextNode(node) : node);
  }
}


