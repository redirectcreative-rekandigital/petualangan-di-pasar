/** Kotak penghalang (AABB) untuk collision lingkaran-vs-kotak di dunia 3D. */
export interface ColliderBox {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}
