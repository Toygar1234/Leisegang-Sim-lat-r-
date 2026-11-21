/**
 * Site içeriği: tarihçe, kuramlar, sözlük, kaynakça, müfredat, müze, quiz, görevler, rozetler.
 * Kaynak: bu projenin raporu ve araştırma notları.
 */

export const TIMELINE = [
  { y: "1855", t: "Kâğıtta ilk desen", p: "Friedlieb Runge kurutma kâğıdına damlattığı tuz çözeltilerinde kendiliğinden oluşan halkaları gördü.", s: "Runge, Der Bildungstrieb der Stoffe" },
  { y: "1896", t: "Liesegang'ın deneyi", p: "Raphael Liesegang, dikromatlı jele gümüş nitrat damlattı ve eş merkezli halkalar elde etti. Olay onun adıyla anılır.", s: "Naturwiss. Wochenschr. 11, 353" },
  { y: "1897", t: "Ostwald'ın açıklaması", p: "Wilhelm Ostwald, çökelmenin hemen başlamadığını, önce aşırı doygunluk gerektiğini öne sürdü.", s: "Lehrbuch der allgemeinen Chemie" },
  { y: "1903", t: "Zaman yasası", p: "Morse ve Pierce, bant konumunun zamanın kareköküyle arttığını ölçtü: xₙ ∝ √tₙ.", s: "Proc. Am. Acad. Arts Sci. 38" },
  { y: "1915", t: "Akikler kitabı", p: "Liesegang, akik taşlarındaki bantları silika jelde ritmik çökelmeyle açıklamaya çalıştı.", s: "Die Achate" },
  { y: "1923", t: "Aralık yasası", p: "Jablczynski, ardışık bant konumlarının oranının sabit bir değere yaklaştığını gösterdi: xₙ₊₁/xₙ → 1+p.", s: "Bull. Soc. Chim. France 33" },
  { y: "1955", t: "Matalon–Packter yasası", p: "Aralık katsayısı p'nin derişimlere nasıl bağlı olduğu ölçüldü.", s: "J. Colloid Sci. 10" },
  { y: "1981", t: "Matematik modeli", p: "Keller ve Rubinow, Ostwald'ın fikrini denklemlere döktü. Bu sitenin motoru da bu fikre dayanır.", s: "J. Chem. Phys. 74" },
  { y: "1988", t: "Henisch'in kitabı", p: "Crystals in Gels and Liesegang Rings yayımlandı; aynı yıl bir öğrenci projesi makalesi çıktı.", s: "Cambridge University Press" },
  { y: "1999", t: "Spinodal senaryo", p: "Antal, Droz ve Rácz bantları faz ayrışmasıyla açıklayan yeni bir kuram önerdi.", s: "Phys. Rev. Lett. 83" },
  { y: "2010", t: "Nano halkalar", p: "Yüklü altın nanoparçacıklarla Liesegang halkaları oluşturuldu.", s: "JACS 132" },
  { y: "2025", t: "Isıl desenler", p: "Bilkent'teki Baytekin grubu halkaları kızılötesi kamerayla görülen geçici ısı desenlerine dönüştürdü.", s: "Soft Matter" },
  { y: "2026", t: "Liesegang Lab", p: "Bu proje: 18 deneyi 3B, etkileşimli ve matematik tabanlı bir simülatörde bir araya getirdi.", s: "Toygar Özdemir" },
];

export const THEORIES = [
  { k: "İyon çarpımı / aşırı doygunluk", w: "Ostwald 1897, Prager 1956, Keller–Rubinow 1981", idea: "Yerel iyon çarpımı eşiği aşınca çökelme olur, iyonlar tükenir.", plus: "Zaman ve aralık yasalarını türetir.", minus: "Bazı ölçümler için fazla basit kalır.", sim: true },
  { k: "Çekirdeklenme ve büyüme", w: "Dee 1986, Chopard ve ark. 1994", idea: "Bir ara ürün eşiği aşınca çekirdeklenir, sonra büyür.", plus: "Yasaları türetir; hücresel otomat modeli var.", minus: "Ek eşik parametreleri gerekir.", sim: true },
  { k: "Uyarılmış sol-koagülasyon", w: "Dhar ve Chatterji 1924, Shinohara 1970", idea: "Oluşan sol, eşik aşılınca pıhtılaşır.", plus: "Matalon–Packter yasası için güçlü aday.", minus: "Ölçülmesi zor bir parametreye dayanır.", sim: false },
  { k: "Çekirdeklenme sonrası kararsızlık", w: "Flicker ve Ross 1974, Feeney ve ark. 1983", idea: "Büyük parçacıklar küçükleri yutar (Ostwald olgunlaşması), bantlara ayrışır.", plus: "Karışık sistemlerde bant sırasını açıklar.", minus: "Aralığın düzenliliğini açıklamada zayıf.", sim: false },
  { k: "Spinodal ayrışma", w: "Antal ve ark. 1999", idea: "Hareket eden kaynağın arkasında faz ayrışması olur.", plus: "Aralık ve Matalon–Packter biçimini verir.", minus: "Deneysel ayrım sınırlı.", sim: false },
  { k: "Kompleksleşme / yeniden çözünme", w: "Lagzi 2003", idea: "Çökelti fazla amonyakla geri çözünür.", plus: "Kobaltta göç eden deseni açıklar.", minus: "Belirli sistemlere özgüdür.", sim: true },
];

export const GLOSSARY = [
  ["Liesegang halkası", "Liesegang ring", "Jelde oluşan düzenli çökelti bantları"],
  ["Periyodik çökelme", "Periodic precipitation", "Tekrarlayan aralıklarla çökelme"],
  ["Difüzyon", "Diffusion", "Çoktan aza kendiliğinden yayılma"],
  ["Konveksiyon", "Convection", "Akışla karışma"],
  ["Jel", "Gel", "Suyu tutan ağ yapı"],
  ["Jelatin", "Gelatin", "Proteinden elde edilen jel yapıcı"],
  ["Agar", "Agar", "Deniz yosunundan elde edilen jel yapıcı"],
  ["İç elektrolit", "Inner electrolyte", "Jelde çözünmüş tuz"],
  ["Dış elektrolit", "Outer electrolyte", "Jelin üstüne eklenen çözelti"],
  ["Çökelti", "Precipitate", "Çözeltiden ayrılan katı"],
  ["Çözünürlük", "Solubility", "Çözünebilen en fazla madde miktarı"],
  ["Aşırı doygunluk", "Supersaturation", "Geçici olarak fazla çözünmüş madde"],
  ["Çekirdeklenme", "Nucleation", "İlk katı tohumlarının oluşması"],
  ["Kristal büyümesi", "Crystal growth", "Tohumların büyümesi"],
  ["Ostwald olgunlaşması", "Ostwald ripening", "Büyük parçacıkların küçükleri yutması"],
  ["Tükenme bölgesi", "Depletion zone", "İyonların bittiği boş bölge"],
  ["Tepkime–difüzyon", "Reaction–diffusion", "Tepkime ile yayılmanın birlikte olması"],
  ["Zaman yasası", "Time law", "x ∝ √t ilişkisi"],
  ["Aralık yasası", "Spacing law", "Ardışık konum oranının sabitlenmesi"],
  ["Genişlik yasası", "Width law", "Bant genişliğinin konumla artması"],
  ["Aralık katsayısı", "Spacing coefficient", "1 + p değeri"],
  ["Matalon–Packter yasası", "Matalon–Packter law", "p'nin derişime bağlılığı"],
  ["Ters aralık", "Revert spacing", "Giderek küçülen aralıklar"],
  ["Kompleks iyon", "Complex ion", "Moleküllerin bağlandığı metal iyonu"],
  ["Yeniden çözünme", "Redissolution", "Çökeltinin tekrar çözünmesi"],
  ["Yükseltgenme", "Oxidation", "Elektron kaybı"],
  ["Zayıf baz", "Weak base", "Kısmen OH⁻ veren madde"],
  ["Molarite", "Molarity", "Litre başına mol (mol/L)"],
  ["Kontrol tüpü", "Control tube", "Karşılaştırma için kurulan tüp"],
  ["Bağımsız değişken", "Independent variable", "Değiştirilen etken"],
  ["Bağımlı değişken", "Dependent variable", "Ölçülen sonuç"],
  ["Regresyon", "Regression", "Verilere en uygun doğru"],
  ["R²", "Coefficient of determination", "Uyum ölçüsü (1'e ne kadar yakınsa o kadar iyi)"],
  ["GHS", "Globally Harmonized System", "Tehlike etiketleme sistemi"],
  ["Denge dışı sistem", "Far-from-equilibrium system", "Kendiliğinden desen üretebilen sistem"],
];

export const SOURCES = [
  "Ahn, A. R. ve ark. (2024). Liesegang ring in a patient with allergic bronchopulmonary aspergillosis. Int. J. Surgical Pathology.",
  "Aker, H. ve ark. (2014). Endometriumda Liesegang halkaları. Cumhuriyet Medical Journal, 36(3).",
  "Antal, T., Droz, M., Magnin, J., Rácz, Z., Zrinyi, M. (1998). Derivation of the Matalon–Packter law for Liesegang patterns. J. Chem. Phys., 109(21), 9479–9486.",
  "Antal, T., Droz, M., Magnin, J., Rácz, Z. (1999). Formation of Liesegang patterns: A spinodal decomposition scenario. Phys. Rev. Lett., 83, 2880.",
  "Arı, H., Uzunlar, R., Akbulut, E. S., Lagzi, I., Baytekin, B. (2025). Chemical reactions with Liesegang rings: generation of non-permanent thermal patterns. Soft Matter.",
  "Chopard, B., Droz, M., Magnin, J., Rácz, Z., Zrinyi, M. (1999). Liesegang patterns: Effect of dissociation of the invading electrolyte. J. Phys. Chem. A, 103, 1432.",
  "Chopard, B., Luthi, P., Droz, M. (1994). Reaction-diffusion cellular automata model for the formation of Liesegang patterns. Phys. Rev. Lett., 72, 1384.",
  "Dee, G. T. (1986). Patterns produced by precipitation at a moving reaction front. Phys. Rev. Lett., 57, 275.",
  "Droz, M., Magnin, J., Zrinyi, M. (1999). Liesegang patterns: Studies on the width law. arXiv:cond-mat/9901079.",
  "Feeney, R. ve ark. (1983). Periodic precipitation and coarsening waves. J. Chem. Phys., 78, 1293.",
  "Heaney, P. J., Davis, A. M. (1995). Observation and origin of self-organized textures in agates. Science, 269, 1562–1565.",
  "Jablczynski, K. (1923). La formation rythmique des précipités. Bull. Soc. Chim. France, 33, 1592.",
  "Keller, J. B., Rubinow, S. I. (1981). Recurrent precipitation and Liesegang rings. J. Chem. Phys., 74, 5000–5007.",
  "Lagzi, I. (2003). Simulation of Liesegang patterns: Effect of reversible complex formation of precipitate. J. Phys. Chem. B, 107(49), 13750.",
  "Lagzi, I., Kowalczyk, B., Grzybowski, B. A. (2010). Liesegang rings engineered from charged nanoparticles. JACS, 132, 58–60.",
  "Liesegang, R. E. (1896). Naturwissenschaftliche Wochenschrift, 11, 353.",
  "Matalon, R., Packter, A. (1955). The Liesegang phenomenon. I. J. Colloid Sci., 10, 46–61.",
  "Morse, H. W., Pierce, G. W. (1903). Diffusion and supersaturation in gelatine. Proc. Am. Acad. Arts Sci., 38, 625–647.",
  "Nabika, H., Itatani, M., Lagzi, I. (2020). Pattern formation in precipitation reactions: The Liesegang phenomenon. Langmuir, 36(2), 481–497.",
  "Nakouzi, E., Steinbock, O. (2016). Self-organization in precipitation reactions far from the equilibrium. Science Advances, 2(8), e1601144.",
  "Nasreddine, V., Sultan, R. (1999). Propagating fronts and chaotic dynamics in Co(OH)₂ Liesegang systems. J. Phys. Chem. A, 103(16), 2934.",
  "Pattern selection in three-precipitate Liesegang systems (2024). ACS Omega, 9(43), 43635.",
  "Pegas, K. L. ve ark. (2010). Liesegang rings in xanthogranulomatous pyelonephritis. Pathology Research International.",
  "Prager, S. (1956). Periodic precipitation. J. Chem. Phys., 25, 279.",
  "Pujani, M. ve ark. (2024). Liesegang rings in a patient with pulmonary tuberculosis. Int. J. Surgical Pathology.",
  "Schibeci, R. A., Carlsen, C. (1988). An interesting student chemistry project: Investigating Liesegang rings. J. Chem. Educ., 65(4), 365–366.",
  "Stern, K. H. (1954). The Liesegang phenomenon. Chemical Reviews, 54, 79–99.",
  "Grzybowski, B. A. (2009). Chemistry in Motion. Wiley.",
  "Henisch, H. K. (1988). Crystals in Gels and Liesegang Rings. Cambridge University Press.",
  "Ostwald, W. (1897). Lehrbuch der allgemeinen Chemie. Engelmann.",
  "Runge, F. F. (1855). Der Bildungstrieb der Stoffe.",
  "Büki, A. How to make a Liesegang pattern. insilico.hu.",
  "CLEAPSS. Student safety sheet 30: Ammonia.",
  "T.C. MEB. Türkiye Yüzyılı Maarif Modeli, Kimya 9. sınıf programı.",
];

export const CURRICULUM = [
  { k: "KİM.9.1.2", t: "Kimyasal maddelerin kullanımı ve güvenlik", p: "Tehlike işaretleri (GHS) ve güvenlik kartları her kitapta." },
  { k: "KİM.9.2.2", t: "İyonik bağın oluşumunu bilimsel gözleme dayalı tahmin edebilme", p: "Metal iyonları ile OH⁻ ve kromat iyonlarının buluşması." },
  { k: "KİM.9.2.6", t: "Bileşikleri adlandırma kurallarına ilişkin akıl yürütebilme", p: "Mn, Co, Cu, Pb, Fe gibi değişken değerlikli metallerin bileşikleri." },
  { k: "KİM.9.2.8", t: "Etkileşimlerin katıların özellikleri üzerindeki etkileri", p: "Çökelti kristal mi, amorf mu? Renkleri neden farklı?" },
  { k: "KİM.9.3.2", t: "Metallerin ekosistemdeki etkileri üzerine problem çözme", p: "Ağır metal atıkları, yeşil kimya ve dijital deneyin avantajı." },
];

export const MUSEUM = [
  { id: "tube", ico: "🧪", name: "Deney Tüpü", f: "testTube", p: "Isıya dayanıklı borosilikat camdan yapılmış ince uzun tüp.", role: "Liesegang bantları tüpte yatay şeritler hâlinde oluşur. Raporundaki deneyde 10 × 75 mm tüpler kullanılır, her birine 3 mL jel konur.", specs: [["Boyut", "10 × 75 mm"], ["Malzeme", "Borosilikat cam"]] },
  { id: "rack", ico: "🪵", name: "Tüp Sporu", f: "rack", p: "Tüpleri dik ve sarsıntısız tutan ahşap stant.", role: "Bantların düzgün oluşması için tüpler kesinlikle sarsılmamalıdır. Eğik tüp çarpık bant demektir!", specs: [["Malzeme", "Ahşap / 3B baskı"], ["Delik", "11 mm"]] },
  { id: "petri", ico: "🧫", name: "Petri Kabı", f: "petri", p: "Kapaklı, sığ ve yuvarlak cam kap.", role: "İnce bir jel tabakası dökülüp ortasına damla damlatılınca iç içe halkalar oluşur. Liesegang'ın 1896 deneyi böyleydi.", specs: [["Çap", "90 mm"], ["Parça", "Taban + kapak"]], explode: true },
  { id: "beaker", ico: "🥛", name: "Beher", f: "beaker", p: "Ölçek çizgili, dökme ağızlı silindirik kap.", role: "Jelatin bu kapta ılık suda çözülür ve tuz eklenir.", specs: [["Hacim", "250 mL"], ["Ölçek", "50 mL aralık"]] },
  { id: "flask", ico: "⚗️", name: "Erlenmeyer", f: "flask", p: "Konik gövdeli, dar boyunlu cam kap.", role: "Çözeltiler karıştırılırken sıçramayı azaltır. Stok çözeltiler burada hazırlanabilir.", specs: [["Hacim", "250 mL"], ["Şekil", "Konik"]] },
  { id: "cylinder", ico: "📏", name: "Mezür", f: "cylinder", p: "Sıvı hacmini hassas ölçmeye yarayan dereceli silindir.", role: "Jel için gereken su hacmi (ör. 14,5 mL) mezürle ölçülür.", specs: [["Hacim", "100 mL"], ["Hassasiyet", "1 mL"]] },
  { id: "dropper", ico: "💧", name: "Damlalık", f: "dropper", p: "Cam boru ve kauçuk puardan oluşur.", role: "Dış elektrolit jelin üstüne tüpün duvarından yavaşça eklenir; Petri'de ortaya tek damla damlatılır.", specs: [["Parça", "Cam + kauçuk"], ["Kullanım", "Damla damla"]], explode: true },
  { id: "bottle", ico: "🧴", name: "Reaktif Şişesi", f: "bottle", p: "Etiketli, vidalı kapaklı kimyasal şişesi. Işığa duyarlı maddeler kahverengi şişede saklanır.", role: "Gümüş nitrat ışıkta bozulduğu için kahverengi şişede durur. Etiketteki tehlike işaretlerine bak!", specs: [["Cam", "Amber (kahverengi)"], ["Etiket", "GHS işaretli"]], explode: true },
  { id: "balance", ico: "⚖️", name: "Hassas Terazi", f: "balance", p: "0,01 g hassasiyetle tartım yapar.", role: "Tuzlar öğretmen tarafından tartılır: ör. 0,357 g CoCl₂·6H₂O (0,10 mol/L, 15 mL jel için).", specs: [["Hassasiyet", "0,01 g"], ["Kullanan", "Öğretmen"]] },
  { id: "hotplate", ico: "🔥", name: "Isıtıcı", f: "hotplate", p: "Ayarlanabilir ısıtıcı tabla.", role: "Jelatin 60–70 °C'de çözülür, kaynatılmaz. Sıcak jel yanık riski taşır.", specs: [["Sıcaklık", "60–70 °C"], ["Risk", "Yanık"]] },
  { id: "goggles", ico: "🥽", name: "Koruyucu Gözlük", f: "goggles", p: "Sıçramaya dayanıklı laboratuvar gözlüğü.", role: "Amonyak ve mangan klorür gözde ciddi hasar yapabilir. Gözlük zorunludur!", specs: [["Tür", "Sıçramaya dayanıklı"], ["Zorunlu", "Evet"]] },
  { id: "spatula", ico: "🥄", name: "Spatül", f: "spatula", p: "Katı kimyasalları almaya yarayan metal kaşık.", role: "Tuzlar toz kaldırmadan spatülle alınır. Kobalt tozu solunmamalıdır.", specs: [["Malzeme", "Paslanmaz çelik"], ["Uç", "Kaşık + düz"]] },
];

export const BADGES = {
  firstrun: { ico: "🧪", name: "İlk Halka", d: "İlk sanal deneyini tamamla." },
  bookworm: { ico: "📚", name: "Kitap Kurdu", d: "Kitaplıktaki bütün kitapları aç." },
  predictor: { ico: "🎯", name: "Tahminci", d: "Bant sayısını ±1 doğrulukla tahmin et." },
  comparer: { ico: "⚖️", name: "Karşılaştırmacı", d: "İki deneyi A ve B olarak karşılaştır." },
  curator: { ico: "🏛️", name: "Müze Rehberi", d: "Müzedeki bütün aletleri incele." },
  quizmaster: { ico: "🧠", name: "Quiz Ustası", d: "Final testinden en az 8/10 al." },
  safety: { ico: "🦺", name: "Güvenlik Uzmanı", d: "Güvenlik oyununu hatasız bitir." },
  lawhunter: { ico: "📐", name: "Yasa Avcısı", d: "Zaman yasasında R² > 0,999 olan bir deney yap." },
  chemist: { ico: "🌈", name: "Renk Kimyacısı", d: "6 farklı kimyasal sistemle deney yap." },
  weakstrong: { ico: "⚡", name: "Zayıf mı Kuvvetli mi?", d: "Aynı sistemi hem NH₃ hem NaOH ile dene." },
};

export const MISSIONS = [
  { id: "m10", t: "10'dan fazla bant oluştur", d: "Dış derişimi artırmayı dene.", xp: 40, check: (r) => r.result.n > 10 },
  { id: "mp", t: "p < 0,3 olan bir desen yap", d: "Sık bantlar için derişimleri yükselt.", xp: 50, check: (r) => r.result.spacing && r.result.spacing.p < 0.3 },
  { id: "mpetri", t: "Petri kabında halka oluştur", d: "Kap olarak Petri kabını seç.", xp: 30, check: (r) => r.geo === "petri" && r.result.n >= 4 },
  { id: "mcomplex", t: "Göç eden deseni gözle", d: "Kobalt, bakır ya da nikel hidroksitle amonyak kullan.", xp: 50, check: (r) => ["cooh2", "cuoh2", "nioh2"].includes(r.book.id) && r.settings.baseType === "NH3" },
  { id: "mcold", t: "Soğuk laboratuvar", d: "10 °C'nin altında bir deney yap.", xp: 30, check: (r) => r.settings.temp < 10 },
  { id: "mhot", t: "Sıcak laboratuvar", d: "35 °C'nin üstünde bir deney yap.", xp: 30, check: (r) => r.settings.temp > 35 },
  { id: "mclassic", t: "Liesegang'ın izinde", d: "Gümüş dikromatı Petri kabında dene.", xp: 40, check: (r) => r.book.id === "ag2cr2o7" && r.geo === "petri" },
  { id: "mproject", t: "Projemin deneyi", d: "Magnezyum hidroksiti 0,20 mol/L ile dene.", xp: 40, check: (r) => r.book.id === "mgoh2" && r.settings.cIn >= 0.19 },
];

const Q = (q, a, ok, why) => ({ q, a, ok, why });
export const QUIZZES = [
  {
    id: "basics", title: "Temeller", ico: "🔬", qs: [
      Q("Liesegang halkalarını ilk kim gözlemledi?", ["Raphael Liesegang", "Friedlieb Runge", "Wilhelm Ostwald", "Marie Curie"], 1, "Runge 1855'te kurutma kâğıdında gördü; Liesegang 1896'da jelde tekrarladı ve olay onun adıyla anıldı."),
      Q("Deneyde jel neden kullanılır?", ["Rengi güzel olduğu için", "Akışla karışmayı (konveksiyonu) engellediği için", "Tepkimeyi hızlandırdığı için", "Çökeltiyi çözdüğü için"], 1, "Jel sıvının akmasını engeller; geriye yalnızca yavaş yayılma (difüzyon) kalır."),
      Q("Difüzyon nedir?", ["Taneciklerin çok oldukları yerden az oldukları yere yayılması", "Bir maddenin erimesi", "Işığın kırılması", "Bir katının buharlaşması"], 0, "Fick yasasına göre derişim farkı büyüdükçe yayılma hızlanır."),
      Q("Çökelti nedir?", ["Çözeltiden ayrılan katı", "Bir gaz", "Bir çözücü", "Bir enzim"], 0, "İki iyon buluşup suda çözünmeyen bir katı oluşturunca çökelti oluşur."),
      Q("Bantlar neden aynı aralıklarla değil, giderek açılarak oluşur?", ["Jel kurur", "Cephe √t ile yavaşlar ve iyonlar tükenir", "Işık bantları iter", "Tüp genişler"], 1, "Cephe yavaşladıkça eşiğin yeniden aşılması için daha uzun yol gerekir; aralıklar geometrik dizi gibi büyür."),
    ],
  },
  {
    id: "chem", title: "Kimyasallar", ico: "⚗️", qs: [
      Q("Liesegang'ın 1896 deneyinde hangi çökelti oluştu?", ["Gümüş dikromat", "Kurşun iyodür", "Bakır sülfat", "Sodyum klorür"], 0, "Gümüş nitrat + potasyum dikromat → koyu kırmızı gümüş dikromat."),
      Q("Magnezyum hidroksit bantlarının rengi nedir?", ["Mavi", "Sarı", "Beyaz/opal", "Kırmızı"], 2, "Mg(OH)₂ beyaz bir katıdır; siyah fon önünde yandan ışıkla iyi görünür."),
      Q("Amonyak neden \"zayıf baz\" sayılır?", ["Kokusu hafif olduğu için", "Suda çok az ayrışıp az OH⁻ verdiği için", "Hiç çözünmediği için", "Asit olduğu için"], 1, "NH₃ + H₂O ⇌ NH₄⁺ + OH⁻ dengesi büyük ölçüde sola kaymıştır."),
      Q("Kobalt hidroksit bantlarında fazla amonyak ne yapar?", ["Bantları büyütür", "Bantları yeniden çözer, desen \"göç eder\"", "Renksizleştirir ama çözmez", "Hiçbir şey"], 1, "Co(OH)₂ + 6NH₃ → [Co(NH₃)₆]²⁺: çözünen kompleks iyon oluşur."),
      Q("Mangan hidroksit bantları zamanla neden kahverengileşir?", ["Havadaki oksijenle yükseltgendiği için", "Jel yandığı için", "Işık boyadığı için", "Amonyak buharlaştığı için"], 0, "4Mn(OH)₂ + O₂ → 4MnO(OH) + 2H₂O."),
    ],
  },
  {
    id: "laws", title: "Yasalar", ico: "📐", qs: [
      Q("Zaman yasasına göre süre 4 katına çıkarsa cephe kaç kat ilerler?", ["4 kat", "2 kat", "16 kat", "Değişmez"], 1, "x ∝ √t → √4 = 2."),
      Q("Jablczynski aralık yasası neyi söyler?", ["Bantlar eşit aralıklıdır", "xₙ₊₁/xₙ oranı sabit bir 1+p değerine yaklaşır", "Bant sayısı sonsuzdur", "Bantlar zamanla kaybolur"], 1, "Ardışık konumların oranı sabitlenir: geometrik dizi."),
      Q("ln xₙ – n grafiğinin eğimi neyi verir?", ["ln(1+p)", "R²", "Sıcaklığı", "Derişimi"], 0, "p = e^eğim − 1 formülüyle aralık katsayısı bulunur."),
      Q("Matalon–Packter yasasına göre dış derişim artarsa p ne olur (genellikle)?", ["Artar", "Azalır", "Değişmez", "Negatif olur"], 1, "Bu sitenin motoru da aynı eğilimi gösterir: daha derişik → daha sık bantlar."),
      Q("R² değeri 1'e çok yakınsa ne anlarız?", ["Veriler doğruya çok iyi uyuyor", "Deney başarısız", "Hiç bant yok", "Sıcaklık yüksek"], 0, "R² uyum ölçüsüdür; 1 mükemmel uyum demektir."),
    ],
  },
  {
    id: "safety", title: "Güvenlik", ico: "🦺", qs: [
      Q("Derişik amonyak hangi şeyle asla karıştırılmaz?", ["Su", "Çamaşır suyu", "Jelatin", "Agar"], 1, "Amonyak + çamaşır suyu → zehirli kloramin gazı."),
      Q("Kobalt(II) klorürün tehlike işaretlerinden biri hangisidir?", ["GHS08 (ciddi sağlık tehlikesi)", "Hiç işareti yoktur", "Yalnızca yanıcı", "Gıda etiketi"], 0, "Kanser yapıcı, üreme için zararlı ve alerji yapıcıdır."),
      Q("Ağır metal içeren atıklar nereye konur?", ["Lavaboya", "Çöpe", "Etiketli, kapaklı atık kabına", "Toprağa"], 2, "Co ve Mn atıkları ayrı toplanır; lavaboya ve çöpe atılmaz."),
      Q("Bu projede deneyin dijital yapılmasının bir nedeni nedir?", ["Krom(VI), kurşun, kobalt gibi maddelerin tehlikeli olması", "Bilgisayarın daha eğlenceli olması", "Jelin pahalı olması", "Hiçbir neden yok"], 0, "Dijital deney hem ucuz hem de güvenli bir seçimdir."),
      Q("Evde hangi Liesegang deneyi yapılabilir?", ["Gümüş dikromat", "Kobalt hidroksit", "Hiçbiri; evde kimyasal deney yapılmaz", "Kurşun iyodür"], 2, "Evde yalnızca güvenli gösteriler (ör. lahana suyu + sirke ile difüzyon) yapılabilir."),
    ],
  },
];

export const SAFETY_GAME = [
  { code: "GHS05", right: "Aşındırıcı: cildi ve gözü yakar" },
  { code: "GHS06", right: "Akut zehirli" },
  { code: "GHS07", right: "Zararlı / tahriş edici" },
  { code: "GHS08", right: "Ciddi sağlık tehlikesi (kanser, üreme)" },
  { code: "GHS09", right: "Çevre için zararlı" },
  { code: "GHS03", right: "Yükseltgen: yangını büyütür" },
];
