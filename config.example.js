module.exports = {
    // Bot ayarları
    token: "BOT_TOKEN_BURAYA", // Bot tokenini buraya yazın
    clientId: "BOT_CLIENT_ID", // Bot client ID'sini buraya yazın
    
    // Bot durumu ayarları
    status: {
        type: "WATCHING", // PLAYING, LISTENING, WATCHING, COMPETING
        name: "Durum Kontrolü | /durum-kontrol", // Bot aktivitesi
        status: "online" // online, idle, dnd, invisible
    },
    
    // Embed renkleri
    colors: {
        success: 0x00ff00,    // Yeşil
        error: 0xff0000,      // Kırmızı
        warning: 0xffff00,    // Sarı
        info: 0x0099ff,       // Mavi
        primary: 0x5865f2,    // Discord mavi
        secondary: 0x57f287   // Discord yeşil
    },
    
    // Emojiler
    emojis: {
        success: "✅",
        error: "❌",
        warning: "⚠️",
        info: "ℹ️",
        loading: "⏳",
        config: "📋",
        message: "📝",
        role: "👤",
        time: "⏰",
        check: "✅",
        cross: "❌"
    },
    
    // Durum kontrol ayarları
    statusControl: {
        defaultCheckInterval: 300000, // 5 dakika (millisaniye)
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
