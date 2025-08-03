# 🚀 Kurulum Rehberi

## 📋 Ön Gereksinimler

1. **Node.js v16.9.0+** yüklü olmalı
2. **Discord Developer Portal**'dan bot oluşturulmalı
3. **Git** yüklü olmalı (opsiyonel)

## 🔧 Adım Adım Kurulum

### 1. Projeyi İndirin

#### Git ile:
```bash
git clone https://github.com/jokerizm3169/durum-kontrol-v14.git
cd durum-kontrol-v14
```

#### Manuel İndirme:
- GitHub'dan ZIP olarak indirin
- Klasörü açın ve terminal/cmd açın

### 2. Bağımlılıkları Yükleyin

```bash
npm install
```

### 3. Config Dosyasını Oluşturun

```bash
cp config.example.js config.js
```

Veya `config.example.js` dosyasını kopyalayıp `config.js` olarak yeniden adlandırın.

### 4. Bot Bilgilerini Doldurun

`config.js` dosyasını açın ve aşağıdaki bilgileri doldurun:

```javascript
module.exports = {
    token: "BOT_TOKEN_BURAYA",     // Discord Bot Token
    clientId: "BOT_CLIENT_ID",     // Discord Bot Client ID
    // Diğer ayarlar varsayılan kalabilir
};
```

### 5. Bot Tokenini ve Client ID'sini Alma

#### Discord Developer Portal'dan:
1. [Discord Developer Portal](https://discord.com/developers/applications) açın
2. **"New Application"** tıklayın
3. Bot ismini girin ve oluşturun
4. **"Bot"** sekmesine gidin
5. **"Token"** bölümünden tokeninizi kopyalayın
6. **"General Information"** sekmesinden **"Application ID"**'yi kopyalayın

### 6. Bot Yetkilerini Ayarlayın

Bot için gerekli yetkiler:
- ✅ `Manage Roles` (Rolleri Yönet)
- ✅ `View Channels` (Kanalları Görüntüle)  
- ✅ `Send Messages` (Mesaj Gönder)
- ✅ `Use Slash Commands` (Slash Komutları Kullan)
- ✅ `Read Message History` (Mesaj Geçmişini Oku)
- ✅ `Embed Links` (Embed Bağlantıları)

### 7. Botu Sunucuya Ekleyin

1. **"OAuth2"** > **"URL Generator"** sekmesine gidin
2. **Scopes**: `bot` ve `applications.commands` seçin
3. **Bot Permissions**: Yukarıdaki yetkileri seçin
4. Oluşan URL'yi kopyalayın ve açın
5. Botunuzu sunucunuza ekleyin

### 8. Botu Başlatın

```bash
npm start
```

Veya geliştirme modu için:
```bash
npm run dev
```

## ✅ Başarılı Kurulum Kontrolü

Bot başarıyla çalışıyorsa console'da şunları görmelisiniz:

```
✅ Komut yüklendi: durum-kontrol
🔄 Slash komutları kaydediliyor...
✅ Slash komutları başarıyla kaydedildi!
🚀 Bot aktif: BotIsmi#1234
📊 Bot durumu ayarlandı: WATCHING Durum Kontrolü | /durum-kontrol
📁 Veritabanı dosyası oluşturuldu
📋 0 sunucunun durum kontrol kuralları yüklendi
🔄 Durum kontrol döngüsü başlatıldı
```

## 🎮 İlk Kullanım

1. Discord sunucunuzda `/durum-kontrol kur` yazın
2. Açılan kurulum menüsünden ayarları yapın
3. Kurulumu tamamlayın
4. Artık bot kullanıma hazır! 🎉

## ❌ Yaygın Hatalar ve Çözümleri

### "Invalid Token" Hatası
- Bot tokeninizi kontrol edin
- Token'da boşluk veya özel karakter olmamalı

### "Missing Permissions" Hatası  
- Bot yetkilerini kontrol edin
- Botun rolü hedef rollerden üstte olmalı

### "Command not found" Hatası
- Slash komutları kaydedilmesini bekleyin (1-2 dakika)
- Botu yeniden başlatın

### Port/EADDRINUSE Hatası
- Başka bir bot instance'ı çalışıyor olabilir
- Terminaldeki tüm Node.js işlemlerini kapatın

## 🆘 Destek

Sorun yaşıyorsanız:
1. Console loglarını kontrol edin
2. [GitHub Issues](https://github.com/jokerizm3169/durum-kontrol-v14/issues) açın
3. Hata mesajını ve adımları detaylı yazın

---

**💡 İpucu**: İlk kurulumda sorun yaşarsanız config.js dosyasını silip yeniden oluşturmayı deneyin!
