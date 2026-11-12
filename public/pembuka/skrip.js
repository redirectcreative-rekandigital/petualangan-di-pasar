// Halaman Pembuka Survival Sains: ganti bahasa, kabut tersibak, layar enam tahap.
(function () {
  var html = document.documentElement;
  var KUNCI = 'survival-sains:bahasa';

  // ---------- Bahasa ----------
  var tombol = document.getElementById('tombol-bahasa');

  function terapkan(b) {
    var en = b === 'en';
    html.lang = b;
    html.classList.toggle('en', en);
    document.title = en ? 'Survival Sains · About the Game' : 'Survival Sains · Pembuka Karya';
    tombol.setAttribute('aria-label', en ? 'Ganti bahasa ke Bahasa Indonesia' : 'Switch language to English');
    document.querySelectorAll('img').forEach(function (img) {
      if (!img.dataset.id) img.dataset.id = img.getAttribute('src');
      if (!img.dataset.altId) img.dataset.altId = img.getAttribute('alt') || '';
      if (img.dataset.en) img.src = en ? img.dataset.en : img.dataset.id;
      if (img.dataset.altEn) img.alt = en ? img.dataset.altEn : img.dataset.altId;
    });
    gantiLayar(aktif, true);
  }

  tombol.addEventListener('click', function () {
    var b = html.lang === 'en' ? 'id' : 'en';
    try {
      localStorage.setItem(KUNCI, b);
    } catch (e) {}
    terapkan(b);
  });

  // ---------- Enam tahap: layar HP mengikuti langkah yang sedang dibaca ----------
  var layar = document.getElementById('layar-tahap');
  var bingkai = layar.parentElement.parentElement;
  var langkah = Array.prototype.slice.call(document.querySelectorAll('.tahap-daftar > li'));
  var aktif = langkah[0];

  function gantiLayar(li, paksa) {
    if (!li || (li === aktif && !paksa)) return;
    aktif = li;
    langkah.forEach(function (x) {
      x.classList.toggle('aktif', x === li);
    });
    var sumber = li.querySelector('.tahap-gambar img');
    var src = html.lang === 'en' && sumber.dataset.en ? sumber.dataset.en : sumber.dataset.id || sumber.getAttribute('src');
    if (layar.getAttribute('src') === src) return;
    bingkai.classList.add('ganti');
    setTimeout(function () {
      layar.src = src;
      bingkai.classList.toggle('lebar', li.hasAttribute('data-lebar'));
      bingkai.classList.remove('ganti');
    }, 180);
  }

  langkah[0].classList.add('aktif');

  if ('IntersectionObserver' in window) {
    var pengamatTahap = new IntersectionObserver(
      function (isi) {
        isi.forEach(function (e) {
          if (e.isIntersecting) gantiLayar(e.target);
        });
      },
      { rootMargin: '-45% 0px -45% 0px' },
    );
    langkah.forEach(function (li) {
      pengamatTahap.observe(li);
    });
  }

  // ---------- Kabut tersibak saat bagian terlihat ----------
  var kabut = document.querySelectorAll('.kabut');
  document.querySelectorAll('.jalur-titik').forEach(function (li, i) {
    li.style.setProperty('--tunda', (i % 6) * 0.12 + 's');
  });
  if ('IntersectionObserver' in window) {
    var pengamatKabut = new IntersectionObserver(
      function (isi) {
        isi.forEach(function (e) {
          if (e.isIntersecting) {
            e.target.classList.add('tersibak');
            pengamatKabut.unobserve(e.target);
          }
        });
      },
      { threshold: 0.25 },
    );
    kabut.forEach(function (k) {
      pengamatKabut.observe(k);
    });
  } else {
    kabut.forEach(function (k) {
      k.classList.add('tersibak');
    });
  }

  terapkan(html.lang === 'en' ? 'en' : 'id');
})();
