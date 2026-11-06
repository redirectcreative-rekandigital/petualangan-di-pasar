# Daftar Atribusi Aset

Seluruh aset dan soal pada **Petualangan di Pasar** dibuat sendiri oleh penulis. Tidak ada
aset gambar, model 3D, atau suara yang diunduh dari pihak ketiga.

## Aset Buatan Sendiri

| Aset | Cara dibuat |
| --- | --- |
| Peta besar 3D & dunia noktah 3D (16 noktah, balai, atap zona, papan nama, pagar, pohon, peti, lantai zona) | Kode Three.js memakai bentuk dasar (kubus, kapsul, bola, kerucut, silinder) |
| Karakter pemain & NPC penjaga balai | Bentuk dasar Three.js |
| Papan nama balai & lencana kode TKA | Tekstur digambar di kanvas (`CanvasTexture`) |
| Diagram batang & tabel | SVG dan HTML/CSS buatan sendiri |
| Ikon aplikasi (favicon, PWA) | SVG ditulis sendiri dan PNG dibuat lewat skrip `scripts/gen-icons.mjs` |
| Efek suara | Disintesis langsung dengan Web Audio API (tanpa berkas audio) |
| Ikon emoji pada antarmuka | Emoji bawaan sistem operasi/peramban |
| Soal, bacaan materi, dan pembahasan | Ditulis sendiri, semua kunci diverifikasi manual |

## Pustaka Pihak Ketiga (perangkat lunak, bukan aset seni)

| Pustaka | Lisensi | Kegunaan |
| --- | --- | --- |
| Three.js | MIT | Rendering 3D |
| Three.js addons (GLTFLoader, DRACOLoader, KTX2Loader, Meshopt) | MIT | Pemuatan aset glTF terkompresi (DRACO/KTX2) |
| Google Draco (decoder) | Apache-2.0 | Urai geometri terkompresi (disajikan statis di `public/assets/libs/draco`) |
| KTX2 / Basis Universal transcoder | Apache-2.0 | Urai tekstur terkompresi (disajikan statis di `public/assets/libs/basis`) |
| Baloo 2 (font) | SIL Open Font License 1.1 | Font display ramah anak, di-host sendiri di `src/assets/fonts` |
| zod | MIT | Validasi bank soal |
| Vite | MIT | Build dan dev server |
| vite-plugin-pwa | MIT | PWA / mode offline |
| Vitest | MIT | Uji otomatis |
| Playwright | Apache-2.0 | Uji asap otomatis (pengembangan) |

Semua pustaka dipakai sesuai lisensinya dan tidak mengubah ketentuan lisensi asli.

## Catatan

- Tidak ada iklan, pelacakan, atau pengumpulan data pribadi.
- Nama pemain hanya dipakai untuk sertifikat digital dan disimpan lokal di perangkat.
