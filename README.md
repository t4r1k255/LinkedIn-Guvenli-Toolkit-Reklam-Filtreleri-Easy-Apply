# LinkedIn Güvenli Toolkit

A Tampermonkey userscript for LinkedIn that combines ad filtering, viewed/applied job filters, a vertical control panel and an Easy Apply guard that keeps "follow company" unchecked.

LinkedIn için reklam ve iş ilanı filtrelerini, dikey kontrol panelini ve Easy Apply şirket takibi kontrolünü bir araya getiren Tampermonkey userscripti.

**[English](#english) · [Türkçe](#türkçe)**

---

## English

**Version:** `3.0.4` · **UI language:** Turkish · **Text matching:** Turkish and English

This toolkit replaces my earlier single-purpose LinkedIn scripts ([hide viewed/applied jobs](https://github.com/t4r1k255/LinkedIn-Hide-Viewed-Applied-Jobs), [hide promoted content](https://github.com/t4r1k255/LinkedIn-Promoted-Content-Hide-Tool) and others).

### Features

- **Ad filter:** hides recognized sponsored posts, ad slots and some Premium promotions.
- **Job filters:** hides viewed and applied job postings, each toggled separately.
- **Vertical panel:** controls sit on the right edge of the screen; on narrow or short screens the panel moves to the top.
- **Remembers settings:** ad, job and debug preferences are kept in the browser's `localStorage`.
- **Easy Apply follow guard:** tries to untick the "follow company" checkbox, re-reads its real `checked` state, and blocks Continue/Submit if it cannot confirm the box is unchecked. It never submits applications for you.
- **Dynamic page support:** a single rate-limited `MutationObserver` handles content and application steps loaded later.

### Install

1. Install the [Tampermonkey](https://www.tampermonkey.net/) browser extension.
2. **[Click here to install the script](https://github.com/t4r1k255/LinkedIn-Guvenli-Toolkit-Reklam-Filtreleri-Easy-Apply/raw/main/LinkedIn-Guvenli-Toolkit.user.js)** and confirm with **Install**.
3. Disable any older LinkedIn scripts or Toolkit copies so only one version runs.
4. Refresh LinkedIn. The panel should show `Toolkit 3.0.4`.

### Privacy and design

- LinkedIn cards are hidden with CSS and data attributes, not deleted.
- No `fetch`, `XMLHttpRequest` or `sendBeacon` calls of its own, and no analytics or telemetry.
- Does not override site-wide functions such as `history` or `attachShadow`, and does not touch React internals.

### Testing

Version 3.0.4 passed a syntax check and 37 local unit tests built on a DOM/event test harness, including 4 targeted regression tests that fail on 3.0.3. These are not live LinkedIn integration tests, and the test files are not published in this repository.

---

## Türkçe

**Sürüm:** `3.0.4` · **Arayüz:** Türkçe · **Metin eşleştirmeleri:** Türkçe ve İngilizce

> **Doğrulama durumu:** Easy Apply takip kontrolünün bu sürümü canlı LinkedIn üzerinde henüz doğrulanmadı. Yerel testlerin geçmesi, tüm LinkedIn arayüzlerinde aynı sonucu garanti etmez. Script başvuruları otomatik göndermez.

## Özellikler

- **Reklam filtresi:** Tanınan sponsorlu içerikleri, reklam alanlarını ve bazı Premium tanıtımlarını gizler.
- **İş ilanı filtreleri:** İş sayfalarında görüntülenen ve başvurulan ilanları ayrı ayrı gizler.
- **Dikey panel:** Kontroller sağ tarafta, masaüstünde ekranın orta hizasında durur. Dar veya kısa ekranlarda üst tarafa geçer.
- **Tercihleri hatırlama:** Reklam, ilan ve hata ayıklama tercihleri tarayıcının `localStorage` alanında saklanır.
- **Easy Apply takip kontrolü:** Tanınan şirket takip kutusunu kapatmayı dener; kapalı durumu yeniden okunduktan sonra kutuyu ve güvenle ayrılabilen takip satırını gizler.
- **Dinamik sayfa desteği:** Sonradan eklenen içerikleri ve başvuru adımlarını izler. Değişken checkbox kimliklerini sabitlemez.

## Kurulum

Gerekenler: LinkedIn'e giriş yapılmış bir masaüstü tarayıcı ve [Tampermonkey](https://www.tampermonkey.net/). Diğer userscript yöneticileriyle uyumluluk doğrulanmadı.

1. **[Scripti kurmak için buraya tıkla](https://github.com/t4r1k255/LinkedIn-Guvenli-Toolkit-Reklam-Filtreleri-Easy-Apply/raw/main/LinkedIn-Guvenli-Toolkit.user.js)** ve Tampermonkey'in açtığı pencerede **Install / Yükle**'ye bas. Önceki Toolkit sürümü kuruluysa Tampermonkey onu günceller.
2. Eski ayrı LinkedIn scriptlerini ve diğer Toolkit kopyalarını kapat. **Yalnızca tek Toolkit sürümü açık kalsın.**
3. LinkedIn sekmesini yenile. Gerekirse `Ctrl+Shift+R` kullan; panelde `Toolkit 3.0.4` görünmelidir.

Elle kurmak istersen: Tampermonkey'de yeni script oluştur, [`LinkedIn-Guvenli-Toolkit.user.js`](./LinkedIn-Guvenli-Toolkit.user.js) dosyasının tamamını yapıştır ve kaydet.

Yenileme, açık başvuru formundaki kaydedilmemiş bilgileri sıfırlayabilir. Script oluşturma adımları için [Tampermonkey kurulum yönergelerine](https://www.tampermonkey.net/faq.php?locale=en&q=Q102) bakabilirsiniz.

## Kullanım

| Kontrol | İşlev | Yeni kurulumdaki varsayılan |
| --- | --- | --- |
| Reklam | Tanınan reklamları gizler/gösterir | Açık |
| Görüntülenen | Görüntülenen iş ilanlarını gizler/gösterir | Açık |
| Başvurulan | Başvurulan iş ilanlarını gizler/gösterir | Açık |
| 🐞 | Konsolda hata ayıklama kayıtlarını açar/kapatır | Kapalı |

Önceden kaydedilmiş tercihler varsa varsayılanların yerine onlar kullanılır. Paneldeki sayaçlar, o taramada gizlenen reklam alanlarını ve iş kartlarını gösterir; hesabın toplam geçmişini göstermez.

### Şirket takibi nasıl ele alınır?

Takip kontrolünün ayrı bir aç/kapa düğmesi yoktur. Desteklenen başvuru penceresinde otomatik çalışır:

1. Şirket takip kutusu; açıklama metni, erişilebilir etiketler veya bilinen input kimlikleriyle ayırt edilir. Son adımda tek checkbox bulunması tek başına yeterli sayılmaz.
2. Yeni arayüzde kapsayıcı, label ve input üzerinden sınırlı etkinleştirme denemeleri yapılır. Eski arayüzde doğrudan input yolu önce denenir.
3. Kutunun kapalı durumu en az `180 ms` sonra yeniden okunur. Doğrulanınca kutu kilitlenir ve takip satırı güvenle ayrılabiliyorsa gizlenir.
4. **Tanınan takip kontrolü kapalı olarak doğrulanamazsa**, Devam/Gönder işlemi durdurulur ve küçük bir bildirim gösterilir. Kontrol sürüyorsa bildirim kaybolduktan sonra düğmeye tekrar basmanız gerekir.

Bir kontrolde en fazla üç hedef denemesi, açık başvuru penceresi oturumunda toplam en fazla sekiz deneme yapılır. Yeniden takip seçmeye yönelik etkileşimler engellenir; seçili kutuyu kapatmaya çalışan etkileşim engellenmez.

**Script başvuru göndermez, başvuru sorularını yanıtlamaz ve mevcut takip listenizi tarayıp topluca takipten çıkarma işlemi yapmaz.**

## Teknik yaklaşım ve gizlilik

- LinkedIn'e ait kartlar fiziksel olarak silinmez; özel veri öznitelikleri ve CSS ile gizlenir.
- Tek `MutationObserver` kullanılır. Genel reklam/iş taramaları hız sınırlıdır; takip denetimlerinin ayrı zamanlaması vardır.
- Script `setInterval` kullanmaz; `history` veya `attachShadow` gibi site genelindeki işlevleri değiştirmez.
- Kendi `fetch`, `XMLHttpRequest` veya `sendBeacon` çağrıları yoktur. LinkedIn'in normal sayfa trafiğini engelleyen bir ağ filtresi değildir.
- Checkbox'ın `checked`/`aria-checked` durumu zorla yazılmaz; özel React internalleri çağrılmaz.
- Kaydedilen tercihler reklam, ilan ve hata ayıklama anahtarlarıdır. Harici analiz veya telemetri servisi eklenmemiştir.

## Bilinen sınırlamalar ve sorun giderme

### Panel görünmüyor veya eski sürüm yazıyor

Tampermonkey'de scriptin etkin olduğunu, adresin `https://www.linkedin.com/` altında bulunduğunu ve eski kopyaların kapalı olduğunu kontrol edin. Ardından sayfayı yenileyin. Scripti kapatmak, açık sayfada önceden kurulmuş olay dinleyicilerini kaldırmaz; yenileme gerekir.

### Takip kutusu hâlâ seçili

Yeşil arka planın veya tik işaretinin görünümü tek başına doğrulama değildir. Esas sinyal input'un güncel `checked` özelliğidir; `checked: true` sürüyorsa işlem başarılı değildir. HTML içindeki `checked=""` özniteliği tek başına güncel durumu göstermez.

LinkedIn'in farklı arayüz sürümleri, yeni metinleri veya DOM değişiklikleri tespiti bozabilir. Tanınmayan bir kontrol üzerinde korumanın devreye girdiği varsayılmamalıdır.

### Network bölümünde `invalid` istekleri var

Bu isteklerin kaynağı kesinleştirilmedi ve `3.0.4` bunları giderme garantisi vermez. İstek adından tek başına kaynak belirlenemez. Sorun bildirirken tam **Request URL**, ilk ilgili konsol hatası ve Toolkit kapalıyken yenilenen sayfada sorunun sürüp sürmediği yardımcı olur.

**Paylaşmadan önce e-posta, telefon, CV, Cookie, Authorization, oturum bilgileri ve gizli URL parametrelerini temizleyin. Tam HAR dosyası paylaşmanız gerekmez.**

## Testler

`3.0.4` için sözdizimi kontrolü ve **37 yerel birim testi** geçti. Dört hedefli regresyon testi eski `3.0.3` üzerinde başarısız, yeni sürümde başarılı sonuç verdi.

Testler DOM ve olay akışını modelleyen bir test düzeneği kullanır. **Gerçek tarayıcı, gerçek React veya canlı LinkedIn entegrasyon testi değildir.**

Test dosyaları bu repoda yayımlanmamıştır; sözdizimi kontrolünü yerelde şöyle yapabilirsin:

```bash
node --check LinkedIn-Guvenli-Toolkit.user.js
```

## Katkı

Sorun bildirirken script sürümünü, tarayıcı ve Tampermonkey sürümünü, sayfa türünü, beklenen/gerçek davranışı ve kişisel bilgilerden arındırılmış ilgili DOM parçasını ekleyin. Değişikliklerde mevcut testleri çalıştırın; yeni davranış için uygun regresyon testini genişletin.

## License · Lisans

Userscript meta verisinde lisans **MIT**, yazar **t4r1k255** olarak belirtilmiştir.

Bu proje LinkedIn'in resmî bir ürünü değildir.
