const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, RoleSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ChannelSelectMenuBuilder, ChannelType } = require('discord.js');
const config = require('../config.js');

class ComponentHandler {
    constructor(client, database) {
        this.client = client;
        this.db = database;
    }

    async handle(interaction) {
        const customId = interaction.customId;

        try {
            if (customId.startsWith('setup_')) {
                await this.handleSetupComponents(interaction);
            } else if (customId.startsWith('reset_')) {
                await this.handleResetComponents(interaction);
            } else if (customId.startsWith('modal_')) {
                await this.handleModalComponents(interaction);
            }
        } catch (error) {
            console.error('Component handler hatası:', error);
            
            const errorMessage = {
                content: `${config.emojis.error} Bir hata oluştu! Lütfen tekrar deneyiniz.`,
                ephemeral: true
            };

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(errorMessage);
            } else {
                await interaction.reply(errorMessage);
            }
        }
    }

    async handleSetupComponents(interaction) {
        const customId = interaction.customId;
        const guildId = interaction.guild.id;

        // Aktif kurulum kontrolü
        const activeSetup = this.client.activeSetups.get(guildId);
        if (!activeSetup) {
            return await interaction.reply({
                content: `${config.emojis.error} Aktif bir kurulum bulunamadı! Lütfen \`/durum-kontrol kur\` komutu ile yeni bir kurulum başlatın.`,
                ephemeral: true
            });
        }

        // Yetki kontrolü
        if (activeSetup.userId !== interaction.user.id) {
            return await interaction.reply({
                content: `${config.emojis.error} Bu kurulumu sadece başlatan kişi tamamlayabilir!`,
                ephemeral: true
            });
        }

        switch (customId) {
            case 'setup_status_message':
                await this.handleStatusMessageSetup(interaction, activeSetup);
                break;
                
            case 'setup_status_role':
                await this.handleStatusRoleSetup(interaction, activeSetup);
                break;
                
            case 'setup_log_channel':
                await this.handleLogChannelSetup(interaction, activeSetup);
                break;
                
            case 'setup_check_interval':
                await this.handleCheckIntervalSetup(interaction, activeSetup);
                break;
                
            case 'setup_complete':
                await this.handleSetupComplete(interaction, activeSetup);
                break;
                
            case 'setup_cancel':
                await this.handleSetupCancel(interaction);
                break;
        }
    }

    async handleStatusMessageSetup(interaction, activeSetup) {
        const modal = new ModalBuilder()
            .setCustomId('modal_status_message')
            .setTitle('Durum Mesajı Ayarlama');

        const statusInput = new TextInputBuilder()
            .setCustomId('status_message_input')
            .setLabel('Durum Mesajı')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Örnek: AFK, Meşgul, Oyunda, Uyuyor...')
            .setRequired(true)
            .setMaxLength(100)
            .setMinLength(1);

        const actionRow = new ActionRowBuilder().addComponents(statusInput);
        modal.addComponents(actionRow);

        await interaction.showModal(modal);
    }

    async handleStatusRoleSetup(interaction, activeSetup) {
        // Sunucudaki rolleri al (botun rolünden düşük olanlar)
        const guild = interaction.guild;
        const botMember = guild.members.me;
        const botHighestRole = botMember.roles.highest;
        
        const availableRoles = guild.roles.cache
            .filter(role => 
                !role.managed && 
                role.id !== guild.id && 
                role.comparePositionTo(botHighestRole) < 0
            )
            .sort((a, b) => b.position - a.position)
            .first(25); // Discord limit 25 option

        if (availableRoles.length === 0) {
            return await interaction.reply({
                content: `${config.emojis.error} Ayarlanabilir rol bulunamadı! Botun yönetebileceği roller olmadığından emin olun.`,
                ephemeral: true
            });
        }

        const roleSelect = new RoleSelectMenuBuilder()
            .setCustomId('setup_role_select')
            .setPlaceholder('👤 Durum rolü seçin...')
            .setMinValues(1)
            .setMaxValues(1);

        const row = new ActionRowBuilder().addComponents(roleSelect);

        await interaction.reply({
            content: `${config.emojis.role} **Durum Rolü Seçimi**\n\nLütfen durum mesajına sahip olan kullanıcılara verilecek rolü seçin:`,
            components: [row],
            ephemeral: true
        });
    }

    async handleLogChannelSetup(interaction, activeSetup) {
        const channelSelect = new ChannelSelectMenuBuilder()
            .setCustomId('setup_channel_select')
            .setPlaceholder('📢 Log kanalı seçin...')
            .setChannelTypes(ChannelType.GuildText)
            .setMinValues(1)
            .setMaxValues(1);

        const row = new ActionRowBuilder().addComponents(channelSelect);

        await interaction.reply({
            content: `📢 **Log Kanalı Seçimi**\n\nLütfen durum değişiklikleri için log mesajlarının gönderileceği kanalı seçin:\n\n*Not: Bu ayar opsiyoneldir. Log kanalı seçmeden de kurulumu tamamlayabilirsiniz.*`,
            components: [row],
            ephemeral: true
        });
    }

    async handleCheckIntervalSetup(interaction, activeSetup) {
        const selectedInterval = interaction.values[0];
        const intervalText = this.getIntervalText(parseInt(selectedInterval));
        
        // Setup verilerini güncelle
        activeSetup.setupData.checkInterval = parseInt(selectedInterval);
        
        // Embed'i güncelle
        await this.updateSetupEmbed(interaction, activeSetup);
        
        await interaction.reply({
            content: `${config.emojis.success} Kontrol aralığı **${intervalText}** olarak ayarlandı!`,
            ephemeral: true
        });
    }

    async handleSetupComplete(interaction, activeSetup) {
        const setupData = activeSetup.setupData;
        
        // Tüm verilerin tamamlanıp tamamlanmadığını kontrol et
        if (!setupData.statusMessage || !setupData.statusRole || !setupData.checkInterval) {
            return await interaction.reply({
                content: `${config.emojis.error} Lütfen önce tüm ayarları tamamlayın!`,
                ephemeral: true
            });
        }

        try {
            // Veritabanına kaydet
            const ruleId = await this.db.addRule(interaction.guild.id, {
                statusMessage: setupData.statusMessage,
                roleId: setupData.statusRole.id,
                checkInterval: setupData.checkInterval
            });

            if (ruleId) {
                // Başarı embed'i
                const successEmbed = new EmbedBuilder()
                    .setColor(config.colors.success)
                    .setTitle(`${config.emojis.success} KURULUM BAŞARILI!`)
                    .setDescription([
                        '**Durum kontrol sistemi başarıyla kuruldu!**',
                        '',
                        '━━━━━━━━━━━━━━━━━━━━━━━━',
                        ''
                    ].join('\n'))
                    .addFields([
                        {
                            name: `${config.emojis.message} Durum Mesajı`,
                            value: `\`${setupData.statusMessage}\``,
                            inline: true
                        },
                        {
                            name: `${config.emojis.role} Durum Rolü`,
                            value: `${setupData.statusRole}`,
                            inline: true
                        },
                        {
                            name: `${config.emojis.time} Kontrol Aralığı`,
                            value: this.getIntervalText(setupData.checkInterval),
                            inline: true
                        },
                        {
                            name: '📋 Kural ID',
                            value: `\`${ruleId}\``,
                            inline: true
                        },
                        {
                            name: '📊 Durum',
                            value: '🟢 Aktif',
                            inline: true
                        },
                        {
                            name: '🎯 Sistem',
                            value: 'Çalışıyor',
                            inline: true
                        }
                    ])
                    .setFooter({ 
                        text: 'Sistem şimdi otomatik olarak kullanıcıları kontrol edecek',
                        iconURL: interaction.guild.iconURL() 
                    })
                    .setTimestamp();

                // Kurulum mesajını güncelle
                await interaction.update({
                    embeds: [successEmbed],
                    components: []
                });

                // Aktif kurulumu temizle
                this.client.activeSetups.delete(interaction.guild.id);

                // Log kanalına bildirim gönder (varsa)
                const guildSettings = await this.db.getGuildSettings(interaction.guild.id);
                if (guildSettings && guildSettings.logChannelId) {
                    const logChannel = interaction.guild.channels.cache.get(guildSettings.logChannelId);
                    if (logChannel) {
                        const logEmbed = new EmbedBuilder()
                            .setColor(config.colors.info)
                            .setTitle('🔧 Yeni Durum Kontrol Kuralı')
                            .setDescription([
                                `**${interaction.user.tag}** tarafından yeni bir durum kontrol kuralı oluşturuldu.`,
                                '',
                                `**Kural ID:** \`${ruleId}\``,
                                `**Durum Mesajı:** \`${setupData.statusMessage}\``,
                                `**Durum Rolü:** ${setupData.statusRole}`,
                                `**Kontrol Aralığı:** ${this.getIntervalText(setupData.checkInterval)}`
                            ].join('\n'))
                            .setTimestamp();

                        await logChannel.send({ embeds: [logEmbed] });
                    }
                }

            } else {
                throw new Error('Veritabanı kayıt hatası');
            }

        } catch (error) {
            console.error('Kurulum tamamlama hatası:', error);
            await interaction.reply({
                content: `${config.emojis.error} Kurulum kaydedilirken bir hata oluştu! Lütfen tekrar deneyiniz.`,
                ephemeral: true
            });
        }
    }

    async handleSetupCancel(interaction) {
        const guildId = interaction.guild.id;
        
        // Aktif kurulumu temizle
        this.client.activeSetups.delete(guildId);
        
        const cancelEmbed = new EmbedBuilder()
            .setColor(config.colors.error)
            .setTitle(`${config.emojis.cross} Kurulum İptal Edildi`)
            .setDescription([
                'Durum kontrol kurulumu iptal edildi.',
                '',
                'Yeni bir kurulum başlatmak için `/durum-kontrol kur` komutunu kullanabilirsiniz.'
            ].join('\n'))
            .setTimestamp();

        await interaction.update({
            embeds: [cancelEmbed],
            components: []
        });
    }

    async handleResetComponents(interaction) {
        const customId = interaction.customId;
        
        if (customId === 'reset_confirm') {
            try {
                await this.db.resetGuild(interaction.guild.id);
                
                const successEmbed = new EmbedBuilder()
                    .setColor(config.colors.success)
                    .setTitle(`${config.emojis.success} Sıfırlama Tamamlandı`)
                    .setDescription([
                        '**Tüm durum kontrol ayarları başarıyla temizlendi!**',
                        '',
                        '• Tüm durum kontrol kuralları silindi',
                        '• Log kanal ayarları temizlendi',
                        '• Sunucu istatistikleri sıfırlandı',
                        '',
                        'Yeni kurulum yapmak için `/durum-kontrol kur` komutunu kullanabilirsiniz.'
                    ].join('\n'))
                    .setTimestamp();

                await interaction.update({
                    embeds: [successEmbed],
                    components: []
                });

            } catch (error) {
                console.error('Sıfırlama hatası:', error);
                await interaction.reply({
                    content: `${config.emojis.error} Sıfırlama işlemi sırasında bir hata oluştu!`,
                    ephemeral: true
                });
            }
        } else if (customId === 'reset_cancel') {
            await interaction.update({
                content: `${config.emojis.info} Sıfırlama işlemi iptal edildi.`,
                embeds: [],
                components: []
            });
        }
    }

    async handleModalComponents(interaction) {
        const customId = interaction.customId;
        
        if (customId === 'modal_status_message') {
            const statusMessage = interaction.fields.getTextInputValue('status_message_input');
            const guildId = interaction.guild.id;
            
            // Aktif kurulum kontrolü
            const activeSetup = this.client.activeSetups.get(guildId);
            if (!activeSetup) {
                return await interaction.reply({
                    content: `${config.emojis.error} Aktif kurulum bulunamadı!`,
                    ephemeral: true
                });
            }

            // Setup verilerini güncelle
            activeSetup.setupData.statusMessage = statusMessage;
            
            // Embed'i güncelle
            await this.updateSetupEmbed(interaction, activeSetup);
            
            await interaction.reply({
                content: `${config.emojis.success} Durum mesajı **"${statusMessage}"** olarak ayarlandı!`,
                ephemeral: true
            });
        }
    }

    // Role select handler (interaction event'inde ayrı olarak handle edilecek)
    async handleRoleSelect(interaction, activeSetup) {
        const selectedRole = interaction.roles.first();
        
        // Setup verilerini güncelle
        activeSetup.setupData.statusRole = selectedRole;
        
        // Role select mesajını güncelle
        await interaction.update({
            content: `${config.emojis.success} Durum rolü ${selectedRole} olarak ayarlandı!`,
            components: []
        });
        
        // Ana kurulum mesajını bul ve güncelle
        await this.updateMainSetupMessage(interaction.guild.id, activeSetup);
    }

    // Channel select handler (interaction event'inde ayrı olarak handle edilecek)
    async handleChannelSelect(interaction, activeSetup) {
        try {
            const channelId = interaction.values[0];
            const selectedChannel = interaction.guild.channels.cache.get(channelId);
            
            if (!selectedChannel) {
                return await interaction.update({
                    content: `${config.emojis.error} Seçilen kanal bulunamadı!`,
                    components: []
                });
            }
            
            if (!selectedChannel.isTextBased()) {
                return await interaction.update({
                    content: `${config.emojis.error} Lütfen bir metin kanalı seçin!`,
                    components: []
                });
            }
            
            // Setup verilerini güncelle
            activeSetup.setupData.logChannel = selectedChannel;
            
            // Log kanalını veritabanına kaydet
            await this.db.setLogChannel(interaction.guild.id, selectedChannel.id);
            
            // Channel select mesajını güncelle
            await interaction.update({
                content: `${config.emojis.success} Log kanalı ${selectedChannel} olarak ayarlandı!`,
                components: []
            });
            
            // Ana kurulum mesajını bul ve güncelle
            await this.updateMainSetupMessage(interaction.guild.id, activeSetup);
            
        } catch (error) {
            console.error('Log kanalı seçimi hatası:', error);
            await interaction.update({
                content: `${config.emojis.error} Log kanalı seçilirken bir hata oluştu! Lütfen tekrar deneyiniz.`,
                components: []
            });
        }
    }

    async updateSetupEmbed(interaction, activeSetup) {
        try {
            const setupData = activeSetup.setupData;
            
            // Mevcut embed'i al ve güncelle
            let originalMessage;
            
            // Eğer interaction bir modal submit ise, channeldan ana setup mesajını bul
            if (interaction.isModalSubmit()) {
                const channel = interaction.channel;
                const messages = await channel.messages.fetch({ limit: 50 });
                originalMessage = messages.find(msg => 
                    msg.embeds.length > 0 && 
                    msg.embeds[0].title && 
                    msg.embeds[0].title.includes('DURUM KONTROL KURULUMU')
                );
            } else {
                originalMessage = interaction.message;
            }
            
            if (!originalMessage) {
                console.error('Ana kurulum mesajı bulunamadı');
                return;
            }
            
            const updatedEmbed = EmbedBuilder.from(originalMessage.embeds[0]);
            
            // Field'ları güncelle
            const fields = [
                {
                    name: `${config.emojis.message} Durum Mesajı`,
                    value: setupData.statusMessage ? `\`${setupData.statusMessage}\` ${config.emojis.check}` : 'Ayarlanmadı',
                    inline: true
                },
                {
                    name: `${config.emojis.role} Durum Rolü`,
                    value: setupData.statusRole ? `${setupData.statusRole} ${config.emojis.check}` : 'Ayarlanmadı',
                    inline: true
                },
                {
                    name: `${config.emojis.time} Kontrol Aralığı`,
                    value: setupData.checkInterval ? `${this.getIntervalText(setupData.checkInterval)} ${config.emojis.check}` : 'Ayarlanmadı',
                    inline: true
                }
            ];

            updatedEmbed.setFields(fields);

            // Kurulumu tamamla butonunu aktifleştir/deaktifleştir
            const allCompleted = setupData.statusMessage && setupData.statusRole && setupData.checkInterval;
            
            const components = originalMessage.components.map(row => {
                const newRow = ActionRowBuilder.from(row);
                
                // Kurulumu tamamla butonunu güncelle
                if (row.components.some(component => component.customId === 'setup_complete')) {
                    newRow.components.forEach(component => {
                        if (component.data.custom_id === 'setup_complete') {
                            component.setDisabled(!allCompleted);
                        }
                    });
                }
                
                return newRow;
            });

            // Mesajı güncelle
            await originalMessage.edit({
                embeds: [updatedEmbed],
                components: components
            });
            
        } catch (error) {
            console.error('Embed güncelleme hatası:', error);
        }
    }

    // Ana kurulum mesajını güncelleme fonksiyonu
    async updateMainSetupMessage(guildId, activeSetup) {
        try {
            const guild = this.client.guilds.cache.get(guildId);
            if (!guild) return;

            // Sunucudaki kanalları tara ve setup mesajını bul
            for (const [channelId, channel] of guild.channels.cache) {
                if (!channel.isTextBased()) continue;
                
                try {
                    const messages = await channel.messages.fetch({ limit: 50 });
                    const setupMessage = messages.find(msg => 
                        msg.embeds.length > 0 && 
                        msg.embeds[0].title && 
                        msg.embeds[0].title.includes('DURUM KONTROL KURULUMU') &&
                        msg.embeds[0].footer &&
                        msg.embeds[0].footer.text.includes('Tüm ayarları tamamladıktan sonra')
                    );

                    if (setupMessage) {
                        const setupData = activeSetup.setupData;
                        const updatedEmbed = EmbedBuilder.from(setupMessage.embeds[0]);
                        
                        // Field'ları güncelle
                        const fields = [
                            {
                                name: `${config.emojis.message} Durum Mesajı`,
                                value: setupData.statusMessage ? `\`${setupData.statusMessage}\` ${config.emojis.check}` : 'Ayarlanmadı',
                                inline: true
                            },
                            {
                                name: `${config.emojis.role} Durum Rolü`,
                                value: setupData.statusRole ? `${setupData.statusRole} ${config.emojis.check}` : 'Ayarlanmadı',
                                inline: true
                            },
                            {
                                name: `${config.emojis.time} Kontrol Aralığı`,
                                value: setupData.checkInterval ? `${this.getIntervalText(setupData.checkInterval)} ${config.emojis.check}` : 'Ayarlanmadı',
                                inline: true
                            }
                        ];

                        updatedEmbed.setFields(fields);

                        // Kurulumu tamamla butonunu aktifleştir/deaktifleştir
                        const allCompleted = setupData.statusMessage && setupData.statusRole && setupData.checkInterval;
                        
                        const components = setupMessage.components.map(row => {
                            const newRow = ActionRowBuilder.from(row);
                            
                            // Kurulumu tamamla butonunu güncelle
                            if (row.components.some(component => component.customId === 'setup_complete')) {
                                newRow.components.forEach(component => {
                                    if (component.data.custom_id === 'setup_complete') {
                                        component.setDisabled(!allCompleted);
                                    }
                                });
                            }
                            
                            return newRow;
                        });

                        await setupMessage.edit({
                            embeds: [updatedEmbed],
                            components: components
                        });
                        
                        return; // Mesaj bulundu ve güncellendi
                    }
                } catch (error) {
                    // Bu kanalda mesaj arama hatası, devam et
                    continue;
                }
            }
        } catch (error) {
            console.error('Ana setup mesajı güncelleme hatası:', error);
        }
    }

    getIntervalText(interval) {
        const minutes = interval / 1000 / 60;
        return `${minutes} Dakika`;
    }
}

module.exports = ComponentHandler;
