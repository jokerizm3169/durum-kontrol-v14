# 🤖 Durum Kontrol Bot v14 - Discord.js

[![Discord.js](https://img.shields.io/badge/discord.js-v14.14.1-blue.svg)](https://discord.js.org/)
[![Node.js](https://img.shields.io/badge/node.js-v16.9.0+-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Discord.js v14 ile geliştirilmiş gelişmiş durum kontrol bot altyapısı. Kullanıcıların özel durum mesajlarına göre otomatik rol verme/alma sistemi.

**🔗 GitHub Repository:** [https://github.com/jokerizm3169/durum-kontrol-v14](https://github.com/jokerizm3169/durum-kontrol-v14)

## ✨ Özellikler

### 🎯 Temel Özellikler
- **Otomatik Durum Kontrolü**: Kullanıcıların özel durum mesajlarını kontrol eder
- **Akıllı Rol Yönetimi**: Durum mesajına göre otomatik rol verir/alır
- **Gelişmiş Kurulum Sistemi**: İnteraktif embed menüleri ile kolay kurulum
- **Çoklu Kural Desteği**: Birden fazla durum kuralı tanımlayabilirsiniz
- **Detaylı Loglama**: Tüm rol değişikliklerini loglar

### 📊 Yönetim Özellikleri
- **İstatistikler**: Detaylı kontrol ve rol değişiklik istatistikleri
- **Test Sistemi**: Manuel kullanıcı durum testi
- **Duraklat/Başlat**: Sistemi geçici olarak durdurabilirsiniz
- **Sıfırlama**: Tüm ayarları temizleme imkanı

### 🔧 Gelişmiş Özellikler
- **Veritabanı Yönetimi**: JSON tabanlı yerel veritabanı
- **Hata Yönetimi**: Kapsamlı hata yakalama ve loglama
- **Yetki Kontrolü**: Administrator yetkisi gerektiren komutlar
- **Timeout Koruması**: Kurulum işlemlerinde zaman aşımı koruması

## 🚀 Kurulum

### Gereksinimler
- Node.js v16.9.0 veya üzeri
- Discord Bot Token
- Bot için gerekli yetkiler

### 1. Dosyaları İndirin
```bash
git clone <repository-url>
cd durum-kontrol-eztheboss
```

### 2. Bağımlılıkları Yükleyin
```bash
npm install
```

### 3. Bot Tokenini Ayarlayın
`config.js` dosyasını açın ve bot tokeninizi girin:
```javascript
module.exports = {
    token: "BOT_TOKEN_BURAYA", // Bot tokenini buraya yazın
    clientId: "BOT_CLIENT_ID", // Bot client ID'sini buraya yazın
    // ...
};
```

### 4. Botu Başlatın
```bash
npm start
```

## 📝 Bot Yetkilerini Ayarlama

Bot için gerekli yetkiler:
- `Manage Roles` (Rolleri Yönet)
- `View Channels` (Kanalları Görüntüle)
- `Send Messages` (Mesaj Gönder)
- `Use Slash Commands` (Slash Komutları Kullan)
- `Read Message History` (Mesaj Geçmişini Oku)
- `Embed Links` (Embed Bağlantıları)

## 🎮 Kullanım

### Temel Kurulum
1. `/durum-kontrol kur` komutunu kullanın
2. Açılan menüden ayarları yapın:
   - **Durum Mesajı**: Kontrol edilecek metin (örn: "AFK")
   - **Durum Rolü**: Verilecek rol
   - **Kontrol Aralığı**: Kontrol sıklığı (1-10 dakika)
3. "Kurulumu Tamamla" butonuna tıklayın

### Diğer Komutlar

#### `/durum-kontrol liste`
Mevcut tüm durum kontrol ayarlarını görüntüler.

#### `/durum-kontrol sil <kural-id>`
Belirtilen kurulum kuralını siler.

#### `/durum-kontrol durakla`
Durum kontrolünü geçici olarak durdurur.

#### `/durum-kontrol baslat`
Duraklatılmış durum kontrolünü başlatır.

#### `/durum-kontrol test <@kullanıcı>`
Belirtilen kullanıcının durumunu manuel kontrol eder.

#### `/durum-kontrol log-kanal <#kanal>`
Durum değişiklik loglarının gönderileceği kanalı ayarlar.

#### `/durum-kontrol istatistik`
Toplam kontrol sayısı, rol verme/alma işlemleri gibi istatistikleri gösterir.

#### `/durum-kontrol sifirla`
Tüm durum kontrol ayarlarını ve kurallarını temizler.

## ⚙️ Konfigürasyon

### config.js Ayarları

```javascript
module.exports = {
    // Bot ayarları
    token: "BOT_TOKEN_BURAYA",
    clientId: "BOT_CLIENT_ID",
    
    // Bot durumu ayarları
    status: {
        type: "WATCHING", // PLAYING, LISTENING, WATCHING, COMPETING
        name: "Durum Kontrolü | /durum-kontrol",
        status: "online" // online, idle, dnd, invisible
    },
    
    // Embed renkleri
    colors: {
        success: 0x00ff00,
        error: 0xff0000,
        warning: 0xffff00,
        info: 0x0099ff,
        primary: 0x5865f2,
        secondary: 0x57f287
    },
    
    // Durum kontrol ayarları
    statusControl: {
        defaultCheckInterval: 300000, // 5 dakika
        minCheckInterval: 60000,      // 1 dakika minimum
        maxCheckInterval: 600000,     // 10 dakika maksimum
        maxRulesPerGuild: 10          // Guild başına maksimum kural sayısı
    },
    
    // Timeout süreleri
    timeouts: {
        setupModal: 60000,     // 1 dakika
        interaction: 15000,    // 15 saniye
        collector: 300000      // 5 dakika
    }
};
```

## 📁 Proje Yapısı

```
durum-kontrol-eztheboss/
├── 📁 komutlar/
│   └── durum-kontrol.js         # Ana slash komutu
├── 📁 utils/
│   ├── database.js              # Veritabanı yönetimi
│   ├── componentHandler.js      # Button/Menu işlemleri
│   ├── statusChecker.js         # Durum kontrol mantığı
│   └── database.json            # JSON veritabanı (otomatik oluşur)
├── config.js                    # Bot konfigürasyonu
├── index.js                     # Ana bot dosyası
├── package.json                 # Node.js bağımlılıkları
└── README.md                    # Bu dosya
```

## 🔍 Nasıl Çalışır?

1. **Kurulum**: Kullanıcı `/durum-kontrol kur` komutu ile interaktif kurulum yapar
2. **Kayıt**: Ayarlar JSON veritabanına kaydedilir
3. **Kontrol Döngüsü**: Bot her dakika tüm sunucuları kontrol eder
4. **Durum Analizi**: Kullanıcıların özel durum mesajları kontrol edilir
5. **Rol İşlemleri**: Kurallara göre roller verilir/alınır
6. **Loglama**: Tüm değişiklikler log kanalına kaydedilir

## 🛠️ Geliştirme

### Scripts
- `npm start` - Botu çalıştır
- `npm run dev` - Geliştirme modunda çalıştır (nodemon ile)

### Debug
Bot detaylı console logları ile çalışır:
- ✅ Başarılı işlemler
- ⚠️ Uyarılar  
- ❌ Hatalar
- 📊 İstatistikler

## ⚠️ Önemli Notlar

- Bot sadece **özel durum mesajlarını** (custom status) kontrol eder
- Durum mesajı kontrolü **büyük/küçük harf duyarsızdır**
- Bot kendi rolünden **düşük** rolleri yönetebilir
- Tüm komutlar **Administrator** yetkisi gerektirir
- Kurulum sırasında **60 saniye** timeout vardır

## 🔒 Güvenlik

- Sadece yöneticiler komutları kullanabilir
- Kurulum işlemini sadece başlatan kişi tamamlayabilir
- Bot yetkilerini minimum tutun
- Veritabanı dosyasını düzenli olarak yedekleyin

## 📞 Destek

Herhangi bir sorun yaşarsanız:
1. Console loglarını kontrol edin
2. Bot yetkilerini kontrol edin
3. `/durum-kontrol test` ile manuel test yapın

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır.

---

**💡 İpucu**: Bot ilk çalıştırıldığında otomatik olarak slash komutları Discord'a kaydedilir. Bu işlem birkaç dakika sürebilir.

**🚀 Geliştirici**: EzTheBoss
