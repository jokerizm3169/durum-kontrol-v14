const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, RoleSelectMenuBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../config.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('durum-kontrol')
        .setDescription('Durum kontrol sistemi yönetimi')
        .addSubcommand(subcommand =>
            subcommand
                .setName('kur')
                .setDescription('Durum kontrol sistemi kurulum menüsünü açar')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('liste')
                .setDescription('Mevcut tüm durum kontrol ayarlarını görüntüler')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('sil')
                .setDescription('Belirtilen kurulum kuralını siler')
                .addIntegerOption(option =>
                    option
                        .setName('kural-id')
                        .setDescription('Silinecek kuralın ID\'si')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('durakla')
                .setDescription('Durum kontrolünü geçici olarak durdurur')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('baslat')
                .setDescription('Duraklatılmış durum kontrolünü başlatır')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('test')
                .setDescription('Belirtilen kullanıcının durumunu manuel kontrol eder')
                .addUserOption(option =>
                    option
                        .setName('kullanici')
                        .setDescription('Test edilecek kullanıcı')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('log-kanal')
                .setDescription('Durum değişiklik loglarının gönderileceği kanalı ayarlar')
                .addChannelOption(option =>
                    option
                        .setName('kanal')
                        .setDescription('Log kanalı')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('istatistik')
                .setDescription('Toplam kontrol sayısı, rol verme/alma işlemleri gibi istatistikleri gösterir')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('sifirla')
                .setDescription('Tüm durum kontrol ayarlarını ve kurallarını temizler')
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction, client) {
        const subcommand = interaction.options.getSubcommand();

        // Yetki kontrolü
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return await interaction.reply({
                content: `${config.emojis.error} Bu komutu kullanmak için **Yönetici** yetkisine sahip olmanız gerekiyor!`,
                ephemeral: true
            });
        }

        switch (subcommand) {
            case 'kur':
                await handleSetup(interaction, client);
                break;
            case 'liste':
                await handleList(interaction, client);
                break;
            case 'sil':
                await handleDelete(interaction, client);
                break;
            case 'durakla':
                await handlePause(interaction, client);
                break;
            case 'baslat':
                await handleStart(interaction, client);
                break;
            case 'test':
                await handleTest(interaction, client);
                break;
            case 'log-kanal':
                await handleLogChannel(interaction, client);
                break;
            case 'istatistik':
                await handleStatistics(interaction, client);
                break;
            case 'sifirla':
                await handleReset(interaction, client);
                break;
        }
    }
};

// Kurulum fonksiyonu
async function handleSetup(interaction, client) {
    const guildId = interaction.guild.id;
    
    // Aktif kurulum kontrolü
    if (client.activeSetups.has(guildId)) {
        return await interaction.reply({
            content: `${config.emojis.warning} Bu sunucuda zaten aktif bir kurulum bulunuyor! Lütfen önce mevcut kurulumu tamamlayın veya iptal edin.`,
            ephemeral: true
        });
    }

    // Aktif kurulum işaretleme
    client.activeSetups.set(guildId, {
        userId: interaction.user.id,
        startTime: Date.now(),
        setupData: {
            statusMessage: null,
            statusRole: null,
            checkInterval: null,
            logChannel: null
        }
    });

    // Kurulum embed'i
    const setupEmbed = new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle(`${config.emojis.config} DURUM KONTROL KURULUMU`)
        .setDescription('━━━━━━━━━━━━━━━━━━━━━━━━\n\nDurum kontrol sistemini kurmak için aşağıdaki ayarları yapın:\n\n━━━━━━━━━━━━━━━━━━━━━━━━')
        .addFields([
            {
                name: `${config.emojis.message} Durum Mesajı`,
                value: 'Ayarlanmadı',
                inline: true
            },
            {
                name: `${config.emojis.role} Durum Rolü`,
                value: 'Ayarlanmadı',
                inline: true
            },
            {
                name: `${config.emojis.time} Kontrol Aralığı`,
                value: 'Ayarlanmadı',
                inline: true
            },
            {
                name: `📢 Log Kanalı`,
                value: 'Ayarlanmadı (Opsiyonel)',
                inline: true
            }
        ])
        .setFooter({ 
            text: 'Tüm ayarları tamamladıktan sonra kurulumu bitirebilirsiniz',
            iconURL: interaction.guild.iconURL() 
        })
        .setTimestamp();

    // Butonlar - İlk satır
    const firstRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('setup_status_message')
                .setLabel('Durum Mesajı Ayarla')
                .setEmoji('🔤')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('setup_status_role')
                .setLabel('Durum Rolü Seç')
                .setEmoji('👤')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('setup_log_channel')
                .setLabel('Log Kanalı Seç')
                .setEmoji('📢')
                .setStyle(ButtonStyle.Secondary)
        );

    // Dropdown menü - İkinci satır
    const secondRow = new ActionRowBuilder()
        .addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('setup_check_interval')
                .setPlaceholder('⏰ Kontrol Aralığı Seçin')
                .addOptions([
                    {
                        label: '1 Dakika',
                        description: 'Her 1 dakikada bir kontrol et',
                        value: '60000',
                        emoji: '⚡'
                    },
                    {
                        label: '3 Dakika',
                        description: 'Her 3 dakikada bir kontrol et',
                        value: '180000',
                        emoji: '🔥'
                    },
                    {
                        label: '5 Dakika',
                        description: 'Her 5 dakikada bir kontrol et (Önerilen)',
                        value: '300000',
                        emoji: '⭐'
                    },
                    {
                        label: '10 Dakika',
                        description: 'Her 10 dakikada bir kontrol et',
                        value: '600000',
                        emoji: '🕒'
                    }
                ])
        );

    // Onay butonları - Üçüncü satır
    const thirdRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('setup_complete')
                .setLabel('Kurulumu Tamamla')
                .setEmoji('✅')
                .setStyle(ButtonStyle.Success)
                .setDisabled(true), // Başta deaktif
            new ButtonBuilder()
                .setCustomId('setup_cancel')
                .setLabel('İptal Et')
                .setEmoji('❌')
                .setStyle(ButtonStyle.Danger)
        );

    await interaction.reply({
        embeds: [setupEmbed],
        components: [firstRow, secondRow, thirdRow],
        ephemeral: false
    });

    // Timeout ayarlama
    setTimeout(() => {
        if (client.activeSetups.has(guildId)) {
            client.activeSetups.delete(guildId);
        }
    }, config.timeouts.setupModal);
}

// Diğer fonksiyonları içe aktarma için dosyaları böleceğiz
async function handleList(interaction, client) {
    const Database = require('../utils/database.js');
    const db = new Database();
    
    try {
        const guildRules = await db.getGuildRules(interaction.guild.id);
        const guildSettings = await db.getGuildSettings(interaction.guild.id);
        
        if (!guildRules || guildRules.length === 0) {
            return await interaction.reply({
                content: `${config.emojis.info} Bu sunucuda henüz durum kontrol kuralı bulunmuyor. \`/durum-kontrol kur\` komutu ile kurulum yapabilirsiniz.`,
                ephemeral: true
            });
        }

        const embed = new EmbedBuilder()
            .setColor(config.colors.info)
            .setTitle(`${config.emojis.config} Durum Kontrol Ayarları`)
            .setDescription(`**${interaction.guild.name}** sunucusunun durum kontrol ayarları:`)
            .setTimestamp();

        // Genel ayarlar
        if (guildSettings) {
            embed.addFields([
                {
                    name: '🔧 Genel Ayarlar',
                    value: [
                        `**Durum:** ${guildSettings.isActive ? '🟢 Aktif' : '🔴 Pasif'}`,
                        `**Log Kanalı:** ${guildSettings.logChannelId ? `<#${guildSettings.logChannelId}>` : 'Ayarlanmamış'}`,
                        `**Toplam Kural:** ${guildRules.length}`
                    ].join('\n'),
                    inline: false
                }
            ]);
        }

        // Kuralları listele
        let rulesText = '';
        guildRules.forEach((rule, index) => {
            const interval = rule.checkInterval / 1000 / 60; // Dakikaya çevir
            rulesText += [
                `**${index + 1}.** \`ID: ${rule.id}\``,
                `📝 **Mesaj:** ${rule.statusMessage}`,
                `👤 **Rol:** <@&${rule.roleId}>`,
                `⏰ **Aralık:** ${interval} dakika`,
                `📊 **Durum:** ${rule.isActive ? '🟢' : '🔴'}`,
                '━━━━━━━━━━━━━━━━━━'
            ].join('\n');
        });

        if (rulesText.length > 1024) {
            // Eğer çok uzunsa sayfalama yap
            rulesText = rulesText.substring(0, 1000) + '\n...\n*Ve daha fazlası*';
        }

        embed.addFields([
            {
                name: '📋 Durum Kontrol Kuralları',
                value: rulesText || 'Kural bulunamadı',
                inline: false
            }
        ]);

        await interaction.reply({
            embeds: [embed],
            ephemeral: true
        });

    } catch (error) {
        console.error('Liste komutunda hata:', error);
        await interaction.reply({
            content: `${config.emojis.error} Ayarlar alınırken bir hata oluştu!`,
            ephemeral: true
        });
    }
}

async function handleDelete(interaction, client) {
    const ruleId = interaction.options.getInteger('kural-id');
    const Database = require('../utils/database.js');
    const db = new Database();

    try {
        const result = await db.deleteRule(interaction.guild.id, ruleId);
        
        if (result) {
            await interaction.reply({
                content: `${config.emojis.success} **ID: ${ruleId}** numaralı durum kontrol kuralı başarıyla silindi!`,
                ephemeral: true
            });
        } else {
            await interaction.reply({
                content: `${config.emojis.error} **ID: ${ruleId}** numaralı kural bulunamadı!`,
                ephemeral: true
            });
        }
    } catch (error) {
        console.error('Kural silme hatası:', error);
        await interaction.reply({
            content: `${config.emojis.error} Kural silinirken bir hata oluştu!`,
            ephemeral: true
        });
    }
}

async function handlePause(interaction, client) {
    const Database = require('../utils/database.js');
    const db = new Database();

    try {
        await db.setGuildActive(interaction.guild.id, false);
        
        await interaction.reply({
            content: `${config.emojis.success} Durum kontrol sistemi **duraklatıldı**! Tekrar başlatmak için \`/durum-kontrol baslat\` komutunu kullanın.`,
            ephemeral: true
        });
    } catch (error) {
        console.error('Duraklatma hatası:', error);
        await interaction.reply({
            content: `${config.emojis.error} Sistem duraklatılırken bir hata oluştu!`,
            ephemeral: true
        });
    }
}

async function handleStart(interaction, client) {
    const Database = require('../utils/database.js');
    const db = new Database();

    try {
        await db.setGuildActive(interaction.guild.id, true);
        
        await interaction.reply({
            content: `${config.emojis.success} Durum kontrol sistemi **başlatıldı**! Sistem şimdi aktif olarak çalışıyor.`,
            ephemeral: true
        });
    } catch (error) {
        console.error('Başlatma hatası:', error);
        await interaction.reply({
            content: `${config.emojis.error} Sistem başlatılırken bir hata oluştu!`,
            ephemeral: true
        });
    }
}

async function handleTest(interaction, client) {
    const user = interaction.options.getUser('kullanici');
    
    try {
        const member = await interaction.guild.members.fetch(user.id);
        const Database = require('../utils/database.js');
        const StatusChecker = require('../utils/statusChecker.js');
        
        const db = new Database();
        const checker = new StatusChecker(client, db);
        
        const result = await checker.checkMember(member);
        
        const embed = new EmbedBuilder()
            .setColor(config.colors.info)
            .setTitle(`${config.emojis.info} Durum Test Sonucu`)
            .setDescription(`**${user.tag}** kullanıcısının durum testi:`)
            .addFields([
                {
                    name: '👤 Kullanıcı',
                    value: `${user}`,
                    inline: true
                },
                {
                    name: '📱 Mevcut Durum',
                    value: member.presence?.status || 'Bilinmiyor',
                    inline: true
                },
                {
                    name: '🎮 Aktivite',
                    value: member.presence?.activities[0]?.name || 'Yok',
                    inline: true
                },
                {
                    name: '📊 Test Sonucu',
                    value: result.message || 'Test tamamlandı',
                    inline: false
                }
            ])
            .setTimestamp();

        await interaction.reply({
            embeds: [embed],
            ephemeral: true
        });

    } catch (error) {
        console.error('Test hatası:', error);
        await interaction.reply({
            content: `${config.emojis.error} Kullanıcı durumu test edilirken bir hata oluştu!`,
            ephemeral: true
        });
    }
}

async function handleLogChannel(interaction, client) {
    const channel = interaction.options.getChannel('kanal');
    
    if (!channel.isTextBased()) {
        return await interaction.reply({
            content: `${config.emojis.error} Lütfen bir metin kanalı seçin!`,
            ephemeral: true
        });
    }

    const Database = require('../utils/database.js');
    const db = new Database();

    try {
        await db.setLogChannel(interaction.guild.id, channel.id);
        
        await interaction.reply({
            content: `${config.emojis.success} Log kanalı ${channel} olarak ayarlandı!`,
            ephemeral: true
        });
    } catch (error) {
        console.error('Log kanal ayarlama hatası:', error);
        await interaction.reply({
            content: `${config.emojis.error} Log kanalı ayarlanırken bir hata oluştu!`,
            ephemeral: true
        });
    }
}

async function handleStatistics(interaction, client) {
    const Database = require('../utils/database.js');
    const db = new Database();

    try {
        const stats = await db.getStatistics();
        const guildStats = await db.getGuildStatistics(interaction.guild.id);

        const embed = new EmbedBuilder()
            .setColor(config.colors.info)
            .setTitle(`${config.emojis.info} Durum Kontrol İstatistikleri`)
            .addFields([
                {
                    name: '🌐 Genel İstatistikler',
                    value: [
                        `📊 **Toplam Kontrol:** ${stats.totalChecks}`,
                        `🔄 **Rol Değişiklikleri:** ${stats.roleChanges}`,
                        `✅ **Tamamlanan Kurulumlar:** ${stats.setupsCompleted}`
                    ].join('\n'),
                    inline: true
                },
                {
                    name: '🏠 Sunucu İstatistikleri',
                    value: [
                        `📊 **Bu Sunucu Kontrolleri:** ${guildStats.checks}`,
                        `🔄 **Bu Sunucu Rol Değişiklikleri:** ${guildStats.roleChanges}`,
                        `📋 **Aktif Kurallar:** ${guildStats.activeRules}`
                    ].join('\n'),
                    inline: true
                }
            ])
            .setTimestamp();

        await interaction.reply({
            embeds: [embed],
            ephemeral: true
        });

    } catch (error) {
        console.error('İstatistik hatası:', error);
        await interaction.reply({
            content: `${config.emojis.error} İstatistikler alınırken bir hata oluştu!`,
            ephemeral: true
        });
    }
}

async function handleReset(interaction, client) {
    // Onay sistemi
    const confirmEmbed = new EmbedBuilder()
        .setColor(config.colors.warning)
        .setTitle(`${config.emojis.warning} DİKKAT!`)
        .setDescription([
            '**Bu işlem geri alınamaz!**',
            '',
            'Bu sunucudaki **tüm durum kontrol ayarları** silinecek:',
            '• Tüm durum kontrol kuralları',
            '• Log kanal ayarları',
            '• Sunucu istatistikleri',
            '',
            'Bu işlemi yapmak istediğinizden emin misiniz?'
        ].join('\n'));

    const confirmRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('reset_confirm')
                .setLabel('Evet, Sıfırla')
                .setEmoji('✅')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('reset_cancel')
                .setLabel('İptal Et')
                .setEmoji('❌')
                .setStyle(ButtonStyle.Secondary)
        );

    await interaction.reply({
        embeds: [confirmEmbed],
        components: [confirmRow],
        ephemeral: true
    });
}
