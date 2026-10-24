import type { Rect } from './geometry';

/** Parte da imagem (iw×ih) que preenche w×h sem distorcer, centralizada — como o `object-fit: cover` do CSS. */
export function coverCrop(iw: number, ih: number, w: number, h: number): Rect {
  const s = Math.max(w / iw, h / ih);
  const cw = w / s;
  const ch = h / s;
  return { x: (iw - cw) / 2, y: (ih - ch) / 2, w: cw, h: ch };
}
