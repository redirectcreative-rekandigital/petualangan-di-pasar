# Daftar Atribusi Aset

Seluruh aset dan soal pada **Survival Sains** dibuat sendiri oleh penulis. Tidak ada
aset gambar, model 3D, atau suara yang diunduh dari pihak ketiga.

## Aset Buatan Sendiri

| Aset | Cara dibuat |
| --- | --- |
| Peta pulau 3D & dunia 11 balai (rumah, tempat uji, obor, gapura, jalan setapak, kabut) | Kode Three.js memakai bentuk dasar (kubus, kapsul, bola, kerucut, silinder) |
| Ilustrasi Halaman Cerita (44 adegan) & cutscene | SVG/CSS ditulis sendiri dengan emoji bawaan sistem |
| Naskah cerita, dialog 9 penjaga & cantrik | Ditulis bersama AI, diperiksa dan disetujui penulis |
| Narasi suara | Suara TTS bawaan perangkat (Web Speech API), tanpa berkas audio |
| Karakter pemain, 9 penjaga, dan cantrik | Bentuk dasar Three.js |
| Papan nama balai & lencana kode materi | Tekstur digambar di kanvas (`CanvasTexture`) |
| Diagram materi interaktif (mata, telinga, magnet, siklus air, dll.) | HTML/CSS buatan sendiri dengan ikon emoji |
| Sampul, ikon aplikasi, latar cutscene, potret 9 penjaga & 11 cantrik | Dibuat penulis dengan Gemini (AI) memakai prompt sendiri, lalu dikecilkan untuk HP |
| Efek suara | Disintesis langsung dengan Web Audio API (tanpa berkas audio) |
| Ikon emoji pada antarmuka | Emoji bawaan sistem operasi/peramban |
| Soal, materi, diagram, dan pembahasan | Ditulis sendiri, semua kunci diverifikasi manual |

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
