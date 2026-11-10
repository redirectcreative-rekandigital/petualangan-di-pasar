/**
 * Membuat docs/naskah-survival-sains.md langsung dari data cerita di game,
 * sehingga naskah selalu sama dengan yang dimainkan siswa.
 * Jalankan: npx tsx scripts/gen-naskah.ts
 */
import { writeFileSync } from 'node:fs';
import { CERITA, CUTSCENE_BADAI, EPILOG, FINAL_BAGIAN, BATAS_LULUS_FINAL } from '../src/data/cerita';
import { ADEGAN } from '../src/data/adegan';

const L: string[] = [];
const siapa = (s: string, c: (typeof CERITA)[number]): string =>
  s === 'pemain' ? 'Pemain' : s === 'cantrik' ? c.cantrik.nama : s === 'narator' ? 'Narator' : c.penjaga.nama;

L.push('# Naskah Survival Sains', '');
L.push('Naskah ini dibuat otomatis dari data cerita di dalam game (`src/data/cerita.ts` dan `src/data/adegan.ts`).', '');
L.push('## Premis', '');
L.push('Pemain adalah anggota termuda Kapal Ekspedisi Sains. Badai menghantam kapal, dan pemain terbangun di Pulau Wonorejo. Untuk pulang, pemain harus menyalakan Mercusuar Tua di puncak pulau. Sembilan Penjaga pulau menyimpan bekal ilmu dan alat survival yang hanya diberikan kepada pemain yang memahami ilmunya.', '');
L.push('## Cutscene pembuka', '');
for (const a of CUTSCENE_BADAI) L.push(`- **${a.siapa === 'kapten' ? 'Kapten Bahari' : 'Narator'}:** ${a.teks}`);
L.push('');
L.push('## Jalur balai (urut bab buku)', '');
L.push('| No | Bab | Tempat | Penjaga | Cantrik | Alat survival |', '| --- | --- | --- | --- | --- | --- |');
for (const c of CERITA) L.push(`| ${c.urutan} | ${c.bab} ${c.judulBab} | ${c.tempat} | ${c.penjaga.nama} | ${c.cantrik.nama} | ${c.alat.emoji} ${c.alat.nama} |`);
L.push('');
for (const c of CERITA) {
  L.push(`## ${c.urutan}. ${c.tempat} (${c.bab}: ${c.judulBab})`, '');
  L.push('### Misi', '');
  for (const b of c.misi) L.push(`- **${siapa(b.siapa, c)}:** ${b.teks}`);
  L.push('', '*Pilihan balasan siswa:*', '');
  for (const p of c.pilihan) L.push(`- "${p.teks}" → **${c.penjaga.nama}:** ${p.balasan}`);
  L.push('', `- **${c.penjaga.nama}:** ${c.tugas}`, '');
  L.push('### Halaman Cerita', '', `- **${c.cantrik.nama}:** ${c.cantrikSapa}`, '');
  (ADEGAN[c.kode] ?? []).forEach((a, i) => {
    L.push(`**Adegan ${i + 1}: ${a.judul}**`, '');
    for (const n of a.narasi) L.push(`> ${n}`);
    if (a.interaksi) {
      const ia = a.interaksi;
      L.push('', `*Interaksi (${ia.jenis}):* ${ia.soal}`);
      if (ia.jenis === 'kelompok') L.push(...ia.item.map((it) => `- ${it.e} ${it.nama} → ${ia.kelompok[it.k]}`));
      if (ia.jenis === 'urut') L.push(`- Urutan benar: ${ia.item.map((it) => it.nama).join(' → ')}`);
      if (ia.jenis === 'pilih') L.push(...ia.opsi.map((o) => `- ${o.benar ? '✅' : '❌'} ${o.teks}`));
    }
    L.push('');
  });
  L.push(`- **${c.cantrik.nama}:** ${c.cantrikTutup}`, '');
  L.push('### Tantangan di Tempat Uji', '');
  L.push(`- Bila belum membaca: **${c.penjaga.nama}:** ${c.ujiTerkunci}`);
  L.push(`- **${c.penjaga.nama}:** ${c.ujiBuka}`);
  L.push(`- Pembuka soal: ${c.pembukaSoal.map((x) => `"${x}"`).join(' · ')}`);
  L.push('', '### Penutup', '');
  for (const b of c.lulus) L.push(`- **${siapa(b.siapa, c)}:** ${b.teks}`);
  L.push(`- Bila belum lulus: **${c.penjaga.nama}:** ${c.gagal}`);
  L.push(`- **Hikmah:** ${c.hikmah}`, '');
}
L.push('## Final: Malam Badai di Mercusuar Tua', '');
L.push(`30 soal campuran dalam 4 lantai. Lulus bila minimal ${BATAS_LULUS_FINAL} benar (70%). Bila belum lulus, siswa mengulang lantai yang skornya di bawah 70%.`, '');
for (const b of FINAL_BAGIAN) L.push(`- **${b.tempat}** (${b.penjaga.join(', ')}; materi ${b.kode.join(', ')}): ${b.pembuka}`);
L.push('', '## Epilog', '');
for (const a of EPILOG) L.push(`- **${a.siapa === 'kapten' ? 'Kapten Bahari' : 'Narator'}:** ${a.teks}`);
L.push('', 'Sertifikat **"Penyintas Sains"** diberikan kepada pemain.', '');
writeFileSync('docs/naskah-survival-sains.md', L.join('\n'));
console.log('ditulis docs/naskah-survival-sains.md', L.length, 'baris');
