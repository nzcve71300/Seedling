const { EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder } = require('discord.js');

class ServerService {
    constructor(database) {
        this.database = database;
        this.servers = new Map(); // In-memory storage for servers
        this.initializeDatabase();
    }

    async initializeDatabase() {
        try {
            // Create servers table if it doesn't exist
            await this.database.run(`
                CREATE TABLE IF NOT EXISTS servers (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    server_name VARCHAR(255) NOT NULL,
                    server_id VARCHAR(255) NOT NULL,
                    server_type VARCHAR(100) NOT NULL,
                    game_type VARCHAR(100) NOT NULL,
                    team_size VARCHAR(50) NOT NULL,
                    last_wipe VARCHAR(50) NOT NULL,
                    next_wipe VARCHAR(50) NOT NULL,
                    bp_wipe VARCHAR(50) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            `);
            
            // Load existing servers from database
            await this.loadServers();
            console.log('✅ ServerService initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize ServerService:', error);
        }
    }

    async loadServers() {
        try {
            const servers = await this.database.all('SELECT * FROM servers ORDER BY server_name');
            this.servers.clear();
            
            servers.forEach(server => {
                this.servers.set(server.server_name, {
                    id: server.id,
                    server_name: server.server_name,
                    server_id: server.server_id,
                    server_type: server.server_type,
                    game_type: server.game_type,
                    team_size: server.team_size,
                    last_wipe: server.last_wipe,
                    next_wipe: server.next_wipe,
                    bp_wipe: server.bp_wipe,
                    created_at: server.created_at,
                    updated_at: server.updated_at
                });
            });
            
            console.log(`✅ Loaded ${this.servers.size} servers from database`);
        } catch (error) {
            console.error('❌ Failed to load servers:', error);
        }
    }

    async addServer(serverName, serverId, serverType, gameType, teamSize, lastWipe, nextWipe, bpWipe) {
        try {
            // Check if server already exists
            if (this.servers.has(serverName)) {
                throw new Error('Server with this name already exists');
            }

            // Insert into database
            const result = await this.database.run(`
                INSERT INTO servers (server_name, server_id, server_type, game_type, team_size, last_wipe, next_wipe, bp_wipe)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [serverName, serverId, serverType, gameType, teamSize, lastWipe, nextWipe, bpWipe]);

            // Add to in-memory storage
            const serverData = {
                id: result.insertId,
                server_name: serverName,
                server_id: serverId,
                server_type: serverType,
                game_type: gameType,
                team_size: teamSize,
                last_wipe: lastWipe,
                next_wipe: nextWipe,
                bp_wipe: bpWipe,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            this.servers.set(serverName, serverData);
            console.log(`✅ Added server: ${serverName}`);
            return serverData;
        } catch (error) {
            console.error('❌ Failed to add server:', error);
            throw error;
        }
    }

    async deleteServer(serverName) {
        try {
            if (!this.servers.has(serverName)) {
                throw new Error('Server not found');
            }

            // Delete from database
            await this.database.run('DELETE FROM servers WHERE server_name = ?', [serverName]);
            
            // Remove from in-memory storage
            this.servers.delete(serverName);
            console.log(`✅ Deleted server: ${serverName}`);
            return true;
        } catch (error) {
            console.error('❌ Failed to delete server:', error);
            throw error;
        }
    }

    async editServer(serverName, updates) {
        try {
            if (!this.servers.has(serverName)) {
                throw new Error('Server not found');
            }

            const currentServer = this.servers.get(serverName);
            const updatedServer = { ...currentServer, ...updates, updated_at: new Date().toISOString() };

            // Update database
            await this.database.run(`
                UPDATE servers 
                SET server_name = ?, server_id = ?, server_type = ?, game_type = ?, 
                    team_size = ?, last_wipe = ?, next_wipe = ?, bp_wipe = ?, updated_at = ?
                WHERE server_name = ?
            `, [
                updatedServer.server_name, updatedServer.server_id, updatedServer.server_type,
                updatedServer.game_type, updatedServer.team_size, updatedServer.last_wipe,
                updatedServer.next_wipe, updatedServer.bp_wipe, updatedServer.updated_at,
                serverName
            ]);

            // Update in-memory storage
            this.servers.delete(serverName);
            this.servers.set(updatedServer.server_name, updatedServer);
            
            console.log(`✅ Updated server: ${serverName} -> ${updatedServer.server_name}`);
            return updatedServer;
        } catch (error) {
            console.error('❌ Failed to edit server:', error);
            throw error;
        }
    }

    getServer(serverName) {
        return this.servers.get(serverName);
    }

    getAllServers() {
        return Array.from(this.servers.values());
    }

    getServerNames() {
        return Array.from(this.servers.keys());
    }

    createServerEmbed(serverData, color = 0x00ff00) {
        const embed = new EmbedBuilder()
            .setTitle(`🖥️ ${serverData.server_name}`)
            .setColor(color)
            .setTimestamp()
            .addFields(
                {
                    name: '**SERVER ID**',
                    value: serverData.server_id,
                    inline: false
                },
                {
                    name: '**SERVER TYPE**',
                    value: serverData.server_type,
                    inline: false
                },
                {
                    name: '**GAME TYPE**',
                    value: serverData.game_type,
                    inline: false
                },
                {
                    name: '**TEAM SIZE**',
                    value: serverData.team_size,
                    inline: false
                },
                {
                    name: '**LAST WIPE**',
                    value: serverData.last_wipe,
                    inline: false
                },
                {
                    name: '**NEXT WIPE**',
                    value: serverData.next_wipe,
                    inline: false
                },
                {
                    name: '**BP WIPE**',
                    value: serverData.bp_wipe,
                    inline: false
                }
            )
            .setFooter({ 
                text: 'Server Information • Powered by Seedy', 
                iconURL: 'https://i.imgur.com/ieP1fd5.jpeg' 
            });

        return embed;
    }

    createServerSelectMenu(customId = 'server_select') {
        const servers = this.getAllServers();
        
        if (servers.length === 0) {
            return null;
        }

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId(customId)
            .setPlaceholder('Select a server to view details...')
            .setMinValues(1)
            .setMaxValues(1);

        servers.forEach(server => {
            selectMenu.addOptions({
                label: server.server_name,
                description: `${server.server_type} • ${server.game_type} • Team Size: ${server.team_size}`,
                value: server.server_name
            });
        });

        return new ActionRowBuilder().addComponents(selectMenu);
    }

    getEmbedColors() {
        return [
            { name: 'Green', value: 0x00ff00 },
            { name: 'Red', value: 0xff0000 },
            { name: 'Blue', value: 0x0000ff },
            { name: 'Yellow', value: 0xffff00 },
            { name: 'Purple', value: 0x800080 },
            { name: 'Orange', value: 0xffa500 },
            { name: 'Pink', value: 0xffc0cb },
            { name: 'Cyan', value: 0x00ffff },
            { name: 'Magenta', value: 0xff00ff },
            { name: 'Lime', value: 0x00ff00 },
            { name: 'Gold', value: 0xffd700 },
            { name: 'Silver', value: 0xc0c0c0 },
            { name: 'Dark Green', value: 0x006400 },
            { name: 'Dark Blue', value: 0x000080 },
            { name: 'Dark Red', value: 0x8b0000 },
            { name: 'Teal', value: 0x008080 },
            { name: 'Navy', value: 0x000080 },
            { name: 'Maroon', value: 0x800000 },
            { name: 'Olive', value: 0x808000 },
            { name: 'Aqua', value: 0x00ffff }
        ];
    }
}

module.exports = ServerService;
