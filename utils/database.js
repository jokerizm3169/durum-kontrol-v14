const fs = require('fs');
const path = require('path');

class Database {
    constructor() {
        this.dbPath = path.join(__dirname, 'database.json');
        this.ensureDatabase();
    }

    // Veritabanı dosyasının varlığını kontrol et ve oluştur
    ensureDatabase() {
        if (!fs.existsSync(this.dbPath)) {
            const initialData = {
                guilds: {},
                rules: {},
                statistics: {
                    totalChecks: 0,
                    roleChanges: 0,
                    setupsCompleted: 0
                }
            };
            this.writeData(initialData);
        }
    }

    // Veritabanını oku
    readData() {
        try {
            const rawData = fs.readFileSync(this.dbPath, 'utf8');
            return JSON.parse(rawData);
        } catch (error) {
            console.error('Veritabanı okuma hatası:', error);
            return {
                guilds: {},
                rules: {},
                statistics: {
                    totalChecks: 0,
                    roleChanges: 0,
                    setupsCompleted: 0
                }
            };
        }
    }

    // Veritabanına yaz
    writeData(data) {
        try {
            fs.writeFileSync(this.dbPath, JSON.stringify(data, null, 4), 'utf8');
            return true;
        } catch (error) {
            console.error('Veritabanı yazma hatası:', error);
            return false;
        }
    }

    // Sunucu ayarlarını al
    async getGuildSettings(guildId) {
        const data = this.readData();
        return data.guilds[guildId] || null;
    }

    // Sunucu ayarlarını kaydet
    async setGuildSettings(guildId, settings) {
        const data = this.readData();
        if (!data.guilds[guildId]) {
            data.guilds[guildId] = {
                isActive: true,
                logChannelId: null,
                createdAt: Date.now(),
                statistics: {
                    checks: 0,
                    roleChanges: 0,
                    setupsCompleted: 0
                }
            };
        }
        
        // Ayarları güncelle
        Object.assign(data.guilds[guildId], settings);
        return this.writeData(data);
    }

    // Sunucu aktiflik durumunu ayarla
    async setGuildActive(guildId, isActive) {
        return await this.setGuildSettings(guildId, { isActive });
    }

    // Log kanalını ayarla
    async setLogChannel(guildId, channelId) {
        return await this.setGuildSettings(guildId, { logChannelId: channelId });
    }

    // Yeni durum kontrol kuralı ekle
    async addRule(guildId, ruleData) {
        const data = this.readData();
        
        // Sunucu ayarlarını kontrol et
        if (!data.guilds[guildId]) {
            await this.setGuildSettings(guildId, {});
        }

        // Kural ID'si oluştur
        const ruleId = Date.now();
        
        const rule = {
            id: ruleId,
            guildId: guildId,
            statusMessage: ruleData.statusMessage,
            roleId: ruleData.roleId,
            checkInterval: ruleData.checkInterval,
            isActive: true,
            createdAt: Date.now(),
            lastCheck: null,
            statistics: {
                totalChecks: 0,
                roleAssignments: 0,
                roleRemovals: 0
            }
        };

        data.rules[ruleId] = rule;
        
        // İstatistikleri güncelle
        data.statistics.setupsCompleted++;
        if (data.guilds[guildId]) {
            data.guilds[guildId].statistics.setupsCompleted++;
        }

        const success = this.writeData(data);
        return success ? ruleId : false;
    }

    // Sunucunun kurallarını al
    async getGuildRules(guildId) {
        const data = this.readData();
        const guildRules = [];
        
        for (const [ruleId, rule] of Object.entries(data.rules)) {
            if (rule.guildId === guildId) {
                guildRules.push(rule);
            }
        }
        
        return guildRules;
    }

    // Tüm kuralları al
    async getAllRules() {
        const data = this.readData();
        const rulesByGuild = {};
        
        for (const [ruleId, rule] of Object.entries(data.rules)) {
            if (!rulesByGuild[rule.guildId]) {
                rulesByGuild[rule.guildId] = [];
            }
            rulesByGuild[rule.guildId].push(rule);
        }
        
        return rulesByGuild;
    }

    // Kural sil
    async deleteRule(guildId, ruleId) {
        const data = this.readData();
        
        if (data.rules[ruleId] && data.rules[ruleId].guildId === guildId) {
            delete data.rules[ruleId];
            return this.writeData(data);
        }
        
        return false;
    }

    // Kural güncelle
    async updateRule(ruleId, updates) {
        const data = this.readData();
        
        if (data.rules[ruleId]) {
            Object.assign(data.rules[ruleId], updates);
            return this.writeData(data);
        }
        
        return false;
    }

    // Kural son kontrol zamanını güncelle
    async updateRuleLastCheck(ruleId) {
        return await this.updateRule(ruleId, { lastCheck: Date.now() });
    }

    // Kural istatistiklerini güncelle
    async updateRuleStatistics(ruleId, type) {
        const data = this.readData();
        
        if (data.rules[ruleId]) {
            const rule = data.rules[ruleId];
            
            // Kural istatistikleri
            rule.statistics.totalChecks++;
            if (type === 'assign') {
                rule.statistics.roleAssignments++;
            } else if (type === 'remove') {
                rule.statistics.roleRemovals++;
            }
            
            // Genel istatistikler
            data.statistics.totalChecks++;
            if (type === 'assign' || type === 'remove') {
                data.statistics.roleChanges++;
            }
            
            // Sunucu istatistikleri
            if (data.guilds[rule.guildId]) {
                data.guilds[rule.guildId].statistics.checks++;
                if (type === 'assign' || type === 'remove') {
                    data.guilds[rule.guildId].statistics.roleChanges++;
                }
            }
            
            return this.writeData(data);
        }
        
        return false;
    }

    // Genel istatistikleri al
    async getStatistics() {
        const data = this.readData();
        return data.statistics;
    }

    // Sunucu istatistiklerini al
    async getGuildStatistics(guildId) {
        const data = this.readData();
        const guildData = data.guilds[guildId];
        
        if (!guildData) {
            return {
                checks: 0,
                roleChanges: 0,
                activeRules: 0
            };
        }
        
        // Aktif kuralları say
        let activeRules = 0;
        for (const rule of Object.values(data.rules)) {
            if (rule.guildId === guildId && rule.isActive) {
                activeRules++;
            }
        }
        
        return {
            checks: guildData.statistics.checks || 0,
            roleChanges: guildData.statistics.roleChanges || 0,
            activeRules: activeRules
        };
    }

    // Sunucu verilerini tamamen sil
    async resetGuild(guildId) {
        const data = this.readData();
        
        // Sunucu ayarlarını sil
        delete data.guilds[guildId];
        
        // Sunucunun kurallarını sil
        for (const [ruleId, rule] of Object.entries(data.rules)) {
            if (rule.guildId === guildId) {
                delete data.rules[ruleId];
            }
        }
        
        return this.writeData(data);
    }

    // Belirli bir kurala göre kontrol edilmesi gereken kullanıcıları al
    async getUsersToCheck(ruleId) {
        const data = this.readData();
        const rule = data.rules[ruleId];
        
        if (!rule || !rule.isActive) {
            return null;
        }
        
        // Son kontrol zamanını kontrol et
        const now = Date.now();
        const lastCheck = rule.lastCheck || 0;
        
        if (now - lastCheck < rule.checkInterval) {
            return null; // Henüz kontrol zamanı gelmemiş
        }
        
        return rule;
    }

    // Veritabanını temizle (sadece test amaçlı)
    async clearDatabase() {
        const initialData = {
            guilds: {},
            rules: {},
            statistics: {
                totalChecks: 0,
                roleChanges: 0,
                setupsCompleted: 0
            }
        };
        return this.writeData(initialData);
    }

    // Veritabanı backup oluştur
    async createBackup() {
        try {
            const data = this.readData();
            const backupPath = path.join(__dirname, `database_backup_${Date.now()}.json`);
            fs.writeFileSync(backupPath, JSON.stringify(data, null, 4), 'utf8');
            return backupPath;
        } catch (error) {
            console.error('Backup oluşturma hatası:', error);
            return false;
        }
    }

    // Veritabanı boyutunu al
    getSize() {
        try {
            const stats = fs.statSync(this.dbPath);
            return {
                bytes: stats.size,
                readable: this.formatBytes(stats.size)
            };
        } catch (error) {
            return { bytes: 0, readable: '0 B' };
        }
    }

    // Bytes'ı okunabilir formata çevir
    formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }
}

module.exports = Database;
