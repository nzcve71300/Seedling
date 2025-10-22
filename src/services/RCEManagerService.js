const { default: RCEManager, LogLevel } = require("rce.js");

class RCEManagerService {
    constructor(database) {
        this.database = database;
        this.rce = new RCEManager({
            logger: {
                level: LogLevel.Info
            }
        });
        this.connectedServers = new Map(); // Track connected servers
        this.initializeDatabase();
    }

    async initializeDatabase() {
        try {
            // Create server_connections table if it doesn't exist
            await this.database.run(`
                CREATE TABLE IF NOT EXISTS server_connections (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    nickname VARCHAR(255) NOT NULL UNIQUE,
                    server_ip VARCHAR(255) NOT NULL,
                    server_region ENUM('United States', 'Europe') NOT NULL,
                    status ENUM('connected', 'disconnected', 'error') DEFAULT 'disconnected',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    created_by VARCHAR(20) NOT NULL,
                    INDEX idx_nickname (nickname),
                    INDEX idx_status (status),
                    INDEX idx_region (server_region)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            `);
            
            console.log('✅ RCEManagerService database initialized');
        } catch (error) {
            console.error('❌ Failed to initialize RCEManagerService database:', error);
        }
    }

    async addServerConnection(nickname, serverIp, serverRegion, createdBy) {
        try {
            // Check if nickname already exists
            const existing = await this.database.get(
                'SELECT id FROM server_connections WHERE nickname = ?',
                [nickname]
            );

            if (existing) {
                throw new Error('A server connection with this nickname already exists');
            }

            // Insert new server connection
            const result = await this.database.run(`
                INSERT INTO server_connections (nickname, server_ip, server_region, created_by)
                VALUES (?, ?, ?, ?)
            `, [nickname, serverIp, serverRegion, createdBy]);

            console.log(`✅ Added server connection: ${nickname} (${serverIp})`);
            return {
                id: result.insertId,
                nickname,
                server_ip: serverIp,
                server_region: serverRegion,
                status: 'disconnected',
                created_by: createdBy
            };
        } catch (error) {
            console.error('❌ Failed to add server connection:', error);
            throw error;
        }
    }

    async removeServerConnection(nickname) {
        try {
            // Check if connection exists
            const connection = await this.database.get(
                'SELECT * FROM server_connections WHERE nickname = ?',
                [nickname]
            );

            if (!connection) {
                throw new Error('Server connection not found');
            }

            // Disconnect if currently connected
            if (this.connectedServers.has(nickname)) {
                await this.disconnectServer(nickname);
            }

            // Remove from database
            await this.database.run(
                'DELETE FROM server_connections WHERE nickname = ?',
                [nickname]
            );

            console.log(`✅ Removed server connection: ${nickname}`);
            return true;
        } catch (error) {
            console.error('❌ Failed to remove server connection:', error);
            throw error;
        }
    }

    async getAllServerConnections() {
        try {
            const connections = await this.database.all(
                'SELECT * FROM server_connections ORDER BY nickname'
            );
            return connections;
        } catch (error) {
            console.error('❌ Failed to get server connections:', error);
            return [];
        }
    }

    async getServerConnection(nickname) {
        try {
            const connection = await this.database.get(
                'SELECT * FROM server_connections WHERE nickname = ?',
                [nickname]
            );
            return connection;
        } catch (error) {
            console.error('❌ Failed to get server connection:', error);
            return null;
        }
    }

    async connectServer(nickname) {
        try {
            const connection = await this.getServerConnection(nickname);
            if (!connection) {
                throw new Error('Server connection not found');
            }

            if (this.connectedServers.has(nickname)) {
                throw new Error('Server is already connected');
            }

            // Add server to RCE Manager
            this.rce.addServer({
                identifier: nickname,
                rcon: {
                    host: connection.server_ip,
                    port: 28016, // Default Rust RCON port
                    password: "changeme" // Default password - should be configurable
                },
                state: [connection.server_region.toLowerCase().replace(' ', '_')],
                reconnection: {
                    enabled: true,
                    interval: 10_000, // 10 seconds
                    maxAttempts: -1 // unlimited
                },
                serverInfoFetching: {
                    enabled: true,
                    interval: 30_000 // 30 seconds
                }
            });

            // Update status in database
            await this.database.run(
                'UPDATE server_connections SET status = ? WHERE nickname = ?',
                ['connected', nickname]
            );

            this.connectedServers.set(nickname, connection);
            console.log(`✅ Connected to server: ${nickname} (${connection.server_ip})`);
            return true;
        } catch (error) {
            console.error('❌ Failed to connect to server:', error);
            
            // Update status to error
            try {
                await this.database.run(
                    'UPDATE server_connections SET status = ? WHERE nickname = ?',
                    ['error', nickname]
                );
            } catch (dbError) {
                console.error('❌ Failed to update error status:', dbError);
            }
            
            throw error;
        }
    }

    async disconnectServer(nickname) {
        try {
            if (!this.connectedServers.has(nickname)) {
                throw new Error('Server is not connected');
            }

            // Remove server from RCE Manager
            this.rce.removeServer(nickname);

            // Update status in database
            await this.database.run(
                'UPDATE server_connections SET status = ? WHERE nickname = ?',
                ['disconnected', nickname]
            );

            this.connectedServers.delete(nickname);
            console.log(`✅ Disconnected from server: ${nickname}`);
            return true;
        } catch (error) {
            console.error('❌ Failed to disconnect from server:', error);
            throw error;
        }
    }

    getConnectedServers() {
        return Array.from(this.connectedServers.keys());
    }

    isServerConnected(nickname) {
        return this.connectedServers.has(nickname);
    }

    // Get RCE Manager instance for advanced operations
    getRCEManager() {
        return this.rce;
    }
}

module.exports = RCEManagerService;
