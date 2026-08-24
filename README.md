# 🎵 Müzikal Satranç (Musical Chess)

Satranç ve müzik kurallarını birleştiren; her karenin bir notaya, her taşın bir süre değerine (Vezir 4/4, Kale 2/4, Fil 1/4, At 1/8, Piyon 1/16) ve her oyunun dinlenebilir bir besteye dönüştüğü interaktif web uygulaması.

Canlı Adres: [chess.edumanu.com](https://chess.edumanu.com)

---

## 🌟 Özellikler

- **Müzikal Satranç Tahtası**: 1-8 sıraları ve A-H sütunları boyunca diyatonik ve pentatonik nota haritalaması.
- **Zaman Ölçüleri (2/4, 3/4, 4/4)**: Her maçı Marş (2/4), Vals (3/4) ve Senfonik (4/4) versiyonlarda dinleme ve MIDI formatında dışa aktarma.
- **Harmonik Akor & Bas Eşliği**: Hamlelerin arkasında derin sub-bass ve sıcak yaylı akorları.
- **Taş Yeme Akorları (Capture Chords)**: Taş alımlarında arpejli darbe akorları.
- **Beyaz & Siyah Düet Modu**: Beyaz (Piyano) ve Siyah (Rhodes) enstrüman diyaloğu.
- **Tarihi Usta Maçları**: Anderssen, Morphy, Fischer, Kasparov ve Tal'in başyapıtlarını otomatik oynatıp beste olarak dinleme.
- **Web MIDI API & Standart MIDI (.mid) İndirici**: Logic Pro, Ableton, FL Studio için tam uyumlu MIDI çıktısı.

---

## 🚀 Yerel Geliştirme (Local Development)

```bash
# Bağımlılık gerektirmez, doğrudan Node.js ile çalıştırabilirsiniz:
node server.js
```
Tarayıcınızda açın: `http://localhost:3000`

---

## 🌐 Vercel & GitHub Canlı Yayın Kurulumu

Bu repo Vercel'e bağlıdır. `main` dalına yapılan her `git push` otomatik olarak derlenip [chess.edumanu.com](https://chess.edumanu.com) üzerinde yayına alınır.
