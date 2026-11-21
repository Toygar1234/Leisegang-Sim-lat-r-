# Liesegang Lab

**Liesegang halkaları için 3B, etkileşimli ve matematik tabanlı bilim simülatörü.**
Toygar Özdemir · 9. Sınıf · Mustafa Azmi Doğan Anadolu Lisesi · Kimya Projesi · Ankara 2026

Liesegang halkaları, iki kimyasal maddenin bir jelin içinde yavaşça buluşmasıyla oluşan,
aralıkları giderek açılan çökelti bantlarıdır (Liesegang, 1896). Bu proje, gerçek laboratuvarda
pahalı ve tehlikeli kimyasallar (krom(VI), kurşun, kobalt, gümüş) gerektiren bu deneyi
güvenli bir dijital laboratuvara taşır.

## Nasıl açılır?

| Yol | Ne yapmalı |
|---|---|
| İnternetsiz (önerilen) | `release/Liesegang-Lab.html` dosyasını Chrome ya da Edge ile çift tıklayarak aç. Tek dosyadır, USB bellekle taşınabilir. |
| Geliştirme | `npm install` → `npm run dev` → tarayıcıda `http://localhost:5173` |
| Yeniden derleme | `npm run build` (çıktı: `dist/index.html`, kopyası `release/` klasörüne konur) |
| Testler | `npm test` |

Zayıf bilgisayarlarda (ör. akıllı tahta) üst çubuktaki yıldız düğmesinden grafik kalitesini **Düşük** yap.

## Neler var?

1. **3B kitaplık (ana ekran):** sıcak ışıklı, canlı bir kütüphane. 18 kitabın her biri ayrı bir
   Liesegang deneyi ya da konusu. Kitaba tıklayınca kitap önüne uçar ve açılır; sayfaları
   sürükleyerek ya da ← → tuşlarıyla çevirirsin. "Canlı deney" sayfasında 3B deney sayfadan çıkar.
2. **Nedir?** Sayfayı kaydırdıkça tüpte bantlar oluşur (kaydırma = zaman makinesi).
3. **Nasıl oluşur?** Binlerce parçacıkla 4 adımda bant oluşumu.
4. **Sanal laboratuvar:** 12 kimyasal sistem, gerçek birimli derişimler, NH₃/NaOH, jel yüzdesi,
   sıcaklık; canlı grafikler, bant tablosu, tahmin oyunu, iki deneyi karşılaştırma, CSV/PNG.
5. **Yasalar:** zaman yasası, Jablczynski aralık yasası, ardışık oran, Matalon–Packter;
   3B uzay-zaman yüzeyi ve kuramlar tablosu.
6. **3B malzeme müzesi:** 12 laboratuvar aleti (döndür, yakınlaştır, parçalara ayır).
7. **Doğada ve teknolojide:** akik, kumtaşı, doku kesiti, altın nanoparçacıklar, Runge'nin kâğıdı.
8. **Tarihçe**, **görevler/rozetler/quiz** (XP, 6 seviye, 10 rozet, 8 görev, 4 quiz + final testi,
   tehlike işareti oyunu) ve **kaynakça/sözlük/müfredat**.

## Matematik motoru (`src/sim/engine.js`)

Ostwald'ın (1897) aşırı doygunluk fikri ve Keller–Rubinow (1981) modelinin sade bir hâli:

```
∂a/∂t = Dₐ∇²a − R      (dış elektrolit, Fick'in 2. yasası)
∂b/∂t = D_b∇²b − R      (iç elektrolit)
∂d/∂t = R               (çökelti)
Q = a_etkin · b         (iyon çarpımı)
Q > q_çek → çekirdeklenme;  çökelti varsa Q > q_çöz → büyüme
Zayıf baz:  a_etkin = (−K_b + √(K_b² + 4K_b·a)) / 2
```

Tüp için 1B, Petri kabı için radyal (eksenel simetrik) sonlu hacim yöntemi kullanılır.
Kompleksleşme (Co, Cu, Ni'de fazla amonyakla yeniden çözünme) ve renk yaşlanması (Mn) eklidir.

**Otomatik testler (`npm test`)** motorun şunları ürettiğini doğrular:
zaman yasası (R² > 0,995), sabit ardışık oran (aralık yasası), Matalon–Packter eğilimi
(a₀ ve b₀ arttıkça p azalır), zayıf bazın daha seyrek bant vermesi (Chopard ve ark., 1999),
kütle korunumu, Petri kabında halkalar ve kompleksleşme.

## Dürüstlük notu

Model sonuçları **örnek/varsayımsal veridir**. Simülatör yasaları ve eğilimleri doğru gösterir,
ancak gerçek bir tüpte bandın hangi gün kaç milimetrede çıkacağını birebir tahmin etmez.
Liesegang halkalarının mekanizması bilimde hâlâ tartışmalıdır; ölçülebilir yasalar ise sağlamdır.

## Teknoloji

Three.js (3B), Chart.js (grafikler), Vite + vite-plugin-singlefile (tek dosya), Web Audio (sesler).
Bütün 3B modeller ve dokular kodla üretilmiştir; dışarıdan görsel ya da model indirilmez.
