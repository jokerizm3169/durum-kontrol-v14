const { Client, GatewayIntentBits, Collection, REST, Routes, ActivityType } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config.js');

// Client oluşturma
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Collections oluşturma
client.commands = new Collection();
client.statusRules = new Collection(); // Durum kontrol kuralları
client.activeSetups = new Collection(); // Aktif kurulum işlemleri

// Komutları yükleme fonksiyonu
async function loadCommands() {
    const commandsPath = path.join(__dirname, 'komutlar');
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    const commands = [];

    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
            commands.push(command.data.toJSON());
            console.log(`✅ Komut yüklendi: ${command.data.name}`);
        } else {
            console.log(`⚠️ Komut yüklenemedi: ${file} - 'data' veya 'execute' özelliği eksik`);
        }
    }

    return commands;
}

// Slash komutları kaydetme fonksiyonu
async function registerCommands() {
    try {
        const commands = await loadCommands();
        
        const rest = new REST().setToken(config.token);
        
        console.log('🔄 Slash komutları kaydediliyor...');
        
        await rest.put(
            Routes.applicationCommands(config.clientId),
            { body: commands }
        );
        
        console.log('✅ Slash komutları başarıyla kaydedildi!');
    } catch (error) {
        console.error('❌ Slash komutları kaydedilirken hata:', error);
    }
}

// Bot hazır olduğunda
client.once('ready', async () => {
    console.log(`🚀 Bot aktif: ${client.user.tag}`);
    
    // Bot durumunu ayarlama
    const activityType = ActivityType[config.status.type] || ActivityType.Watching;
    client.user.setPresence({
        activities: [{
            name: config.status.name,
            type: activityType
        }],
        status: config.status.status
    });
    
    console.log(`📊 Bot durumu ayarlandı: ${config.status.type} ${config.status.name}`);
    
    // Veritabanı dosyasını kontrol et ve oluştur
    const dbPath = path.join(__dirname, 'utils', 'database.json');
    if (!fs.existsSync(dbPath)) {
        const initialData = {
            guilds: {},
            rules: {},
            statistics: {
                totalChecks: 0,
                roleChanges: 0,
                setupsCompleted: 0
            }
        };
        fs.writeFileSync(dbPath, JSON.stringify(initialData, null, 4));
        console.log('📁 Veritabanı dosyası oluşturuldu');
    }
    
    // Mevcut durum kontrol kurallarını yükle
    const Database = require('./utils/database.js');
    const db = new Database();
    const allRules = await db.getAllRules();
    
    for (const [guildId, rules] of Object.entries(allRules)) {
        client.statusRules.set(guildId, rules);
    }
    
    console.log(`📋 ${Object.keys(allRules).length} sunucunun durum kontrol kuralları yüklendi`);
    
    // Durum kontrol döngüsünü başlat
    startStatusCheck();
});

// Interaction handler
client.on('interactionCreate', async interaction => {
    try {
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            
            if (!command) {
                console.error(`❌ Komut bulunamadı: ${interaction.commandName}`);
                return;
            }
            
            await command.execute(interaction, client);
        }
        else if (interaction.isButton() || interaction.isStringSelectMenu() || interaction.isRoleSelectMenu() || interaction.isChannelSelectMenu() || interaction.isModalSubmit()) {
            // Component handler'ları burada çalışacak
            const Database = require('./utils/database.js');
            const ComponentHandler = require('./utils/componentHandler.js');
            
            const handler = new ComponentHandler(client, new Database());
            
            // Role select özel işlemi
            if (interaction.isRoleSelectMenu() && interaction.customId === 'setup_role_select') {
                const guildId = interaction.guild.id;
                const activeSetup = client.activeSetups.get(guildId);
                
                if (activeSetup && activeSetup.userId === interaction.user.id) {
                    await handler.handleRoleSelect(interaction, activeSetup);
                } else {
                    await interaction.reply({
                        content: '❌ Bu kurulumu sadece başlatan kişi tamamlayabilir!',
                        ephemeral: true
                    });
                }
            }
            // Channel select özel işlemi
            else if (interaction.isChannelSelectMenu() && interaction.customId === 'setup_channel_select') {
                const guildId = interaction.guild.id;
                const activeSetup = client.activeSetups.get(guildId);
                
                if (activeSetup && activeSetup.userId === interaction.user.id) {
                    await handler.handleChannelSelect(interaction, activeSetup);
                } else {
                    await interaction.reply({
                        content: '❌ Bu kurulumu sadece başlatan kişi tamamlayabilir!',
                        ephemeral: true
                    });
                }
            } else {
                await handler.handle(interaction);
            }
        }
    } catch (error) {
        console.error('❌ Interaction işlenirken hata:', error);
        
        const errorReply = {
            content: '❌ Bir hata oluştu! Lütfen daha sonra tekrar deneyiniz.',
            ephemeral: true
        };
        
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(errorReply);
        } else {
            await interaction.reply(errorReply);
        }
    }
});

// Durum kontrol fonksiyonu
async function startStatusCheck() {
    setInterval(async () => {
        try {
            const Database = require('./utils/database.js');
            const StatusChecker = require('./utils/statusChecker.js');
            
            const db = new Database();
            const checker = new StatusChecker(client, db);
            
            await checker.checkAllGuilds();
        } catch (error) {
            console.error('❌ Durum kontrol hatası:', error);
        }
    }, 60000); // Her dakika kontrol et
    
    console.log('🔄 Durum kontrol döngüsü başlatıldı');
}

// Hata yakalama
client.on('error', error => {
    console.error('❌ Discord.js hatası:', error);
});

process.on('unhandledRejection', error => {
    console.error('❌ Yakalanmamış Promise hatası:', error);
});

process.on('uncaughtException', error => {
    console.error('❌ Yakalanmamış hata:', error);
    process.exit(1);
});

// Bot başlatma
async function start() {
    try {
        await registerCommands();
        await client.login(config.token);
    } catch (error) {
        console.error('❌ Bot başlatılırken hata:', error);
        process.exit(1);
    }
}

start();
