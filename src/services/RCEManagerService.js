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
                    rcon_port INT NOT NULL,
                    rcon_password VARCHAR(255) NOT NULL,
                    status ENUM('connected', 'disconnected', 'error') DEFAULT 'disconnected',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    created_by VARCHAR(20) NOT NULL,
                    INDEX idx_nickname (nickname),
                    INDEX idx_status (status),
                    INDEX idx_server_ip (server_ip)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            `);
            
            console.log('✅ RCEManagerService database initialized');
        } catch (error) {
            console.error('❌ Failed to initialize RCEManagerService database:', error);
        }
    }

    async addServerConnection(nickname, serverIp, rconPort, rconPassword, createdBy) {
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
                INSERT INTO server_connections (nickname, server_ip, rcon_port, rcon_password, created_by)
                VALUES (?, ?, ?, ?, ?)
            `, [nickname, serverIp, rconPort, rconPassword, createdBy]);

            console.log(`✅ Added server connection: ${nickname} (${serverIp}:${rconPort})`);
            
            // Auto-connect the server
            try {
                await this.connectServer(nickname);
                console.log(`🔥${nickname} connected successfully`);
            } catch (connectError) {
                console.error(`❌ Failed to auto-connect ${nickname}:`, connectError.message);
                // Don't throw error here, server is still added to database
            }
            
            return {
                id: result.insertId,
                nickname,
                server_ip: serverIp,
                rcon_port: rconPort,
                rcon_password: rconPassword,
                status: 'connected',
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

            // Add server to RCE Manager using RCON
            this.rce.addServer({
                identifier: nickname,
                rcon: {
                    host: connection.server_ip,
                    port: connection.rcon_port,
                    password: connection.rcon_password
                },
                state: ['rcon_connected'],
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

    async sendRconCommand(nickname, command) {
        try {
            if (!this.isServerConnected(nickname)) {
                throw new Error(`Server ${nickname} is not connected`);
            }

            console.log(`🔥 Sending RCON command to ${nickname}: ${command}`);
            
            // Send command via RCE Manager
            const result = await this.rce.sendCommand(nickname, command);
            
            console.log(`🔥 RCON response from ${nickname}: ${result}`);
            return result;
        } catch (error) {
            console.error(`❌ Failed to send RCON command to ${nickname}:`, error);
            throw error;
        }
    }
}

module.exports = RCEManagerService;
