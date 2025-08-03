const { EmbedBuilder } = require('discord.js');
const config = require('../config.js');

class StatusChecker {
    constructor(client, database) {
        this.client = client;
        this.db = database;
    }

    // Tüm sunucuları kontrol et
    async checkAllGuilds() {
        try {
            const allRules = await this.db.getAllRules();
            
            for (const [guildId, rules] of Object.entries(allRules)) {
                const guild = this.client.guilds.cache.get(guildId);
                if (!guild) continue;

                // Sunucu aktif mi kontrol et
                const guildSettings = await this.db.getGuildSettings(guildId);
                if (!guildSettings || !guildSettings.isActive) continue;

                for (const rule of rules) {
                    if (!rule.isActive) continue;
                    
                    // Kontrol zamanı geldi mi?
                    const shouldCheck = await this.db.getUsersToCheck(rule.id);
                    if (shouldCheck) {
                        await this.checkGuildRule(guild, rule);
                        await this.db.updateRuleLastCheck(rule.id);
                    }
                }
            }
        } catch (error) {
            console.error('Genel durum kontrol hatası:', error);
        }
    }

    // Belirli bir sunucu kuralını kontrol et
    async checkGuildRule(guild, rule) {
        try {
            // Tüm üyeleri getir
            await guild.members.fetch();
            
            const members = guild.members.cache.filter(member => !member.user.bot);
            let checkedCount = 0;
            let roleChanges = 0;

            for (const [memberId, member] of members) {
                try {
                    const result = await this.checkMemberAgainstRule(member, rule);
                    checkedCount++;
                    
                    if (result.roleChanged) {
                        roleChanges++;
                        
                        // Log mesajı gönder
                        await this.sendLogMessage(guild, member, rule, result);
                    }
                    
                } catch (error) {
                    console.error(`Üye kontrol hatası (${member.user.tag}):`, error);
                }
            }

            // İstatistikleri güncelle
            await this.db.updateRuleStatistics(rule.id, 'check');
            
            console.log(`✅ ${guild.name} - Kural ${rule.id}: ${checkedCount} üye kontrol edildi, ${roleChanges} rol değişikliği`);

        } catch (error) {
            console.error(`Sunucu kural kontrol hatası (${guild.name}):`, error);
        }
    }

    // Belirli bir üyeyi kurala göre kontrol et
    async checkMemberAgainstRule(member, rule) {
        try {
            const hasTargetRole = member.roles.cache.has(rule.roleId);
            const hasStatusMessage = this.checkMemberStatus(member, rule.statusMessage);

            let roleChanged = false;
            let action = null;
            let message = '';

            if (hasStatusMessage && !hasTargetRole) {
                // Durum mesajı var ama rol yok - rol ver
                try {
                    await member.roles.add(rule.roleId);
                    roleChanged = true;
                    action = 'assign';
                    message = `Rol verildi: Durum mesajı "${rule.statusMessage}" tespit edildi`;
                    await this.db.updateRuleStatistics(rule.id, 'assign');
                } catch (error) {
                    message = `Rol verilemedi: ${error.message}`;
                }
                
            } else if (!hasStatusMessage && hasTargetRole) {
                // Durum mesajı yok ama rol var - rol al
                try {
                    await member.roles.remove(rule.roleId);
                    roleChanged = true;
                    action = 'remove';
                    message = `Rol alındı: Durum mesajı "${rule.statusMessage}" bulunamadı`;
                    await this.db.updateRuleStatistics(rule.id, 'remove');
                } catch (error) {
                    message = `Rol alınamadı: ${error.message}`;
                }
            } else {
                message = hasStatusMessage ? 
                    `Durum uygun: Kullanıcının "${rule.statusMessage}" mesajı var ve rolü mevcut` :
                    `Durum uygun: Kullanıcının "${rule.statusMessage}" mesajı yok ve rolü yok`;
            }

            return {
                roleChanged,
                action,
                message,
                hasStatus: hasStatusMessage,
                hasRole: member.roles.cache.has(rule.roleId)
            };

        } catch (error) {
            console.error('Üye kural kontrol hatası:', error);
            return {
                roleChanged: false,
                action: null,
                message: `Kontrol hatası: ${error.message}`,
                hasStatus: false,
                hasRole: false
            };
        }
    }

    // Tek bir üyeyi kontrol et (manuel test için)
    async checkMember(member) {
        try {
            const guildRules = await this.db.getGuildRules(member.guild.id);
            const results = [];

            for (const rule of guildRules) {
                if (!rule.isActive) continue;
                
                const result = await this.checkMemberAgainstRule(member, rule);
                results.push({
                    ruleId: rule.id,
                    statusMessage: rule.statusMessage,
                    ...result
                });
            }

            return {
                success: true,
                message: `${results.length} kural kontrol edildi`,
                results: results
            };

        } catch (error) {
            console.error('Tek üye kontrol hatası:', error);
            return {
                success: false,
                message: `Kontrol hatası: ${error.message}`,
                results: []
            };
        }
    }

    // Üyenin durumunu kontrol et
    checkMemberStatus(member, targetMessage) {
        try {
            // Kullanıcının presence bilgisini al
            const presence = member.presence;
            if (!presence) return false;

            // Aktiviteleri kontrol et
            const activities = presence.activities;
            if (!activities || activities.length === 0) return false;

            // Custom status aktivitesini bul
            const customStatus = activities.find(activity => activity.type === 4); // CUSTOM_STATUS
            if (!customStatus) return false;

            // State (durum mesajı) kontrolü
            const statusText = customStatus.state;
            if (!statusText) return false;

            // Durum mesajını kontrol et (büyük/küçük harf duyarsız)
            return statusText.toLowerCase().includes(targetMessage.toLowerCase());

        } catch (error) {
            console.error('Durum kontrol hatası:', error);
            return false;
        }
    }

    // Log mesajı gönder
    async sendLogMessage(guild, member, rule, result) {
        try {
            const guildSettings = await this.db.getGuildSettings(guild.id);
            if (!guildSettings || !guildSettings.logChannelId) return;

            const logChannel = guild.channels.cache.get(guildSettings.logChannelId);
            if (!logChannel) return;

            const role = guild.roles.cache.get(rule.roleId);
            const roleName = role ? role.name : 'Silinmiş Rol';

            let color = config.colors.info;
            let actionText = '';
            let emoji = '';

            if (result.action === 'assign') {
                color = config.colors.success;
                actionText = 'Rol Verildi';
                emoji = '✅';
            } else if (result.action === 'remove') {
                color = config.colors.warning;
                actionText = 'Rol Alındı';
                emoji = '❌';
            }

            const logEmbed = new EmbedBuilder()
                .setColor(color)
                .setTitle(`${emoji} ${actionText}`)
                .addFields([
                    {
                        name: '👤 Kullanıcı',
                        value: `${member}`,
                        inline: true
                    },
                    {
                        name: '🎭 Rol',
                        value: `${role || roleName}`,
                        inline: true
                    },
                    {
                        name: '📝 Durum Mesajı',
                        value: `\`${rule.statusMessage}\``,
                        inline: true
                    },
                    {
                        name: '📋 Kural ID',
                        value: `\`${rule.id}\``,
                        inline: true
                    },
                    {
                        name: '📊 Mevcut Durum',
                        value: result.hasStatus ? '🟢 Var' : '🔴 Yok',
                        inline: true
                    },
                    {
                        name: '💬 Detay',
                        value: result.message,
                        inline: false
                    }
                ])
                .setFooter({ 
                    text: `Otomatik Durum Kontrolü`,
                    iconURL: this.client.user.displayAvatarURL()
                })
                .setTimestamp();

            await logChannel.send({ embeds: [logEmbed] });

        } catch (error) {
            console.error('Log mesajı gönderme hatası:', error);
        }
    }

    // Sunucu için detaylı durum raporu
    async getGuildStatusReport(guildId) {
        try {
            const guild = this.client.guilds.cache.get(guildId);
            if (!guild) throw new Error('Sunucu bulunamadı');

            const guildRules = await this.db.getGuildRules(guildId);
            const guildSettings = await this.db.getGuildSettings(guildId);

            await guild.members.fetch();
            const members = guild.members.cache.filter(member => !member.user.bot);

            const report = {
                guild: {
                    name: guild.name,
                    memberCount: members.size,
                    isActive: guildSettings?.isActive || false
                },
                rules: [],
                summary: {
                    totalRules: guildRules.length,
                    activeRules: 0,
                    membersWithRoles: 0,
                    membersWithStatus: 0
                }
            };

            for (const rule of guildRules) {
                if (!rule.isActive) continue;
                report.summary.activeRules++;

                const ruleReport = {
                    id: rule.id,
                    statusMessage: rule.statusMessage,
                    roleId: rule.roleId,
                    roleName: guild.roles.cache.get(rule.roleId)?.name || 'Silinmiş Rol',
                    membersWithRole: 0,
                    membersWithStatus: 0,
                    membersCorrect: 0,
                    membersNeedRoleAdd: 0,
                    membersNeedRoleRemove: 0
                };

                for (const [memberId, member] of members) {
                    const hasRole = member.roles.cache.has(rule.roleId);
                    const hasStatus = this.checkMemberStatus(member, rule.statusMessage);

                    if (hasRole) ruleReport.membersWithRole++;
                    if (hasStatus) ruleReport.membersWithStatus++;

                    if (hasStatus && hasRole) {
                        ruleReport.membersCorrect++;
                    } else if (hasStatus && !hasRole) {
                        ruleReport.membersNeedRoleAdd++;
                    } else if (!hasStatus && hasRole) {
                        ruleReport.membersNeedRoleRemove++;
                    }
                }

                report.rules.push(ruleReport);
                report.summary.membersWithRoles += ruleReport.membersWithRole;
                report.summary.membersWithStatus += ruleReport.membersWithStatus;
            }

            return report;

        } catch (error) {
            console.error('Durum raporu oluşturma hatası:', error);
            throw error;
        }
    }

    // Belirli bir kullanıcının tüm durum bilgilerini al
    async getUserStatusInfo(member) {
        try {
            const presence = member.presence;
            const activities = presence?.activities || [];
            
            const statusInfo = {
                user: {
                    id: member.id,
                    tag: member.user.tag,
                    displayName: member.displayName
                },
                presence: {
                    status: presence?.status || 'offline',
                    activities: activities.map(activity => ({
                        type: activity.type,
                        name: activity.name,
                        state: activity.state,
                        details: activity.details
                    }))
                },
                customStatus: null,
                roles: member.roles.cache.map(role => ({
                    id: role.id,
                    name: role.name,
                    position: role.position
                })).filter(role => role.id !== member.guild.id) // @everyone rolünü çıkar
            };

            // Custom status'u ayrı olarak al
            const customStatus = activities.find(activity => activity.type === 4);
            if (customStatus) {
                statusInfo.customStatus = {
                    state: customStatus.state,
                    emoji: customStatus.emoji
                };
            }

            return statusInfo;

        } catch (error) {
            console.error('Kullanıcı durum bilgisi alma hatası:', error);
            throw error;
        }
    }
}

module.exports = StatusChecker;
