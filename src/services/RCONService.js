const WebSocket = require('ws');

class RCONService {
    constructor() {
        this.connections = new Map();
        this.pollingIntervals = new Map();
        this.isPolling = false;
    }

    /**
     * Connect to a Rust server via RCON WebSocket
     * @param {string} ip - Server IP address
     * @param {number} port - RCON port
     * @param {string} password - RCON password
     * @returns {Promise<WebSocket>} - Connected WebSocket instance
     */
    async connectToServer(ip, port, password) {
        return new Promise((resolve, reject) => {
            const wsUrl = `ws://${ip}:${port}/${password}`;
            console.log(`🔌 Connecting to RCON: ${wsUrl.replace(password, '***')}`);
            
            const ws = new WebSocket(wsUrl);
            
            ws.on('open', () => {
                console.log(`✅ RCON connected to ${ip}:${port}`);
                resolve(ws);
            });
            
            ws.on('error', (error) => {
                console.error(`❌ RCON connection error for ${ip}:${port}:`, error.message);
                reject(error);
            });
            
            ws.on('close', (code, reason) => {
                console.log(`🔌 RCON connection closed for ${ip}:${port}: ${code} ${reason}`);
            });
            
            // Set timeout for connection
            setTimeout(() => {
                if (ws.readyState !== WebSocket.OPEN) {
                    ws.terminate();
                    reject(new Error('RCON connection timeout'));
                }
            }, 10000); // 10 second timeout
        });
    }

    /**
     * Send a command to the RCON server
     * @param {WebSocket} ws - WebSocket connection
     * @param {string} command - Command to send
     * @returns {Promise<string>} - Server response
     */
    async sendCommand(ws, command) {
        return new Promise((resolve, reject) => {
            if (ws.readyState !== WebSocket.OPEN) {
                reject(new Error('WebSocket not connected'));
                return;
            }

            const timeout = setTimeout(() => {
                reject(new Error('Command timeout'));
            }, 5000);

            ws.once('message', (data) => {
                clearTimeout(timeout);
                try {
                    const response = JSON.parse(data.toString());
                    resolve(response.Message || response);
                } catch (error) {
                    resolve(data.toString());
                }
            });

            ws.send(JSON.stringify({
                Identifier: Date.now(),
                Message: command,
                Name: 'WebRcon'
            }));
        });
    }

    /**
     * Get server info including player count
     * @param {string} ip - Server IP
     * @param {number} port - RCON port
     * @param {string} password - RCON password
     * @returns {Promise<Object>} - Server info object
     */
    async getServerInfo(ip, port, password) {
        try {
            console.log(`🔌 Getting server info for ${ip}:${port}...`);
            const ws = await this.connectToServer(ip, port, password);
            
            // Get server info
            console.log(`📤 Sending 'serverinfo' command to ${ip}:${port}`);
            const serverInfoResponse = await this.sendCommand(ws, 'serverinfo');
            console.log(`📥 Received response from ${ip}:${port}:`, serverInfoResponse);
            
            // Parse server info
            const serverInfo = this.parseServerInfo(serverInfoResponse);
            console.log(`✅ Parsed info for ${ip}:${port}:`, serverInfo);
            
            ws.close();
            
            return {
                success: true,
                data: serverInfo,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error(`❌ Failed to get server info for ${ip}:${port}:`, error.message);
            return {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Parse server info response from Rust RCON
     * @param {string} response - Raw server info response
     * @returns {Object} - Parsed server info
     */
    parseServerInfo(response) {
        try {
            console.log('🔍 Raw RCON response:', response);
            
            // Look for JSON in the response
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const jsonStr = jsonMatch[0];
                console.log('📋 Extracted JSON:', jsonStr);
                
                const serverData = JSON.parse(jsonStr);
                console.log('✅ Parsed server data:', serverData);
                
                return {
                    current_players: serverData.Players || 0,
                    max_players: serverData.MaxPlayers || 100,
                    status: serverData.Restarting ? 'Restarting' : 'Online',
                    queue: serverData.Queued || 0,
                    joining_players: serverData.Joining || 0,
                    hostname: serverData.Hostname || 'Unknown Server',
                    map: serverData.Map || 'Unknown Map',
                    uptime: serverData.Uptime || 0,
                    framerate: serverData.Framerate || 0,
                    memory: serverData.Memory || 0
                };
            }
            
            // Fallback to old parsing method if no JSON found
            const lines = response.split('\n');
            const info = {
                current_players: 0,
                max_players: 100,
                status: 'Online',
                queue: 0,
                joining_players: 0
            };

            for (const line of lines) {
                if (line.includes('players')) {
                    const match = line.match(/(\d+)\/(\d+)/);
                    if (match) {
                        info.current_players = parseInt(match[1]);
                        info.max_players = parseInt(match[2]);
                    }
                }
                
                if (line.includes('queue')) {
                    const match = line.match(/queue: (\d+)/);
                    if (match) {
                        info.queue = parseInt(match[1]);
                    }
                }
            }

            console.log('⚠️ Using fallback parsing, result:', info);
            return info;
        } catch (error) {
            console.error('❌ Error parsing server info:', error);
            return {
                current_players: 0,
                max_players: 100,
                status: 'Online',
                queue: 0,
                joining_players: 0
            };
        }
    }

    /**
     * Start polling all servers for player counts
     * @param {Array} servers - Array of server objects with RCON info
     * @param {Function} updateCallback - Callback function to update database
     */
    async startPolling(servers, updateCallback) {
        if (this.isPolling) {
            console.log('⚠️ RCON polling already running');
            return;
        }

        this.isPolling = true;
        console.log('🔄 Starting RCON polling for player counts...');

        // Filter servers that have RCON info
        const serversWithRCON = servers.filter(server => 
            server.rcon_ip && server.rcon_port && server.rcon_password
        );

        if (serversWithRCON.length === 0) {
            console.log('⚠️ No servers with RCON configuration found');
            this.isPolling = false;
            return;
        }

        console.log(`📊 Polling ${serversWithRCON.length} servers every 30 seconds`);

        // Poll immediately
        await this.pollAllServers(serversWithRCON, updateCallback);

        // Set up interval for polling
        const interval = setInterval(async () => {
            if (!this.isPolling) {
                clearInterval(interval);
                return;
            }
            await this.pollAllServers(serversWithRCON, updateCallback);
        }, 30000); // 30 seconds

        this.pollingIntervals.set('main', interval);
    }

    /**
     * Poll all servers and update database
     * @param {Array} servers - Servers to poll
     * @param {Function} updateCallback - Database update callback
     */
    async pollAllServers(servers, updateCallback) {
        console.log(`🔄 Polling ${servers.length} servers...`);
        
        const promises = servers.map(async (server) => {
            try {
                const result = await this.getServerInfo(
                    server.rcon_ip, 
                    server.rcon_port, 
                    server.rcon_password
                );

                if (result.success) {
                    console.log(`✅ ${server.name}: ${result.data.current_players}/${result.data.max_players} players`);
                    
                    // Update database
                    await updateCallback(server.id, {
                        current_players: result.data.current_players,
                        max_players: result.data.max_players,
                        status: result.data.status,
                        updated_at: new Date()
                    });
                } else {
                    console.error(`❌ ${server.name}: ${result.error}`);
                    
                    // Update status to offline on error
                    await updateCallback(server.id, {
                        status: 'Offline',
                        updated_at: new Date()
                    });
                }
            } catch (error) {
                console.error(`❌ Error polling ${server.name}:`, error.message);
                
                // Update status to offline on error
                await updateCallback(server.id, {
                    status: 'Offline',
                    updated_at: new Date()
                });
            }
        });

        await Promise.allSettled(promises);
        console.log('✅ RCON polling cycle completed');
    }

    /**
     * Stop RCON polling
     */
    stopPolling() {
        console.log('🛑 Stopping RCON polling...');
        this.isPolling = false;
        
        for (const [key, interval] of this.pollingIntervals) {
            clearInterval(interval);
            console.log(`✅ Stopped polling interval: ${key}`);
        }
        
        this.pollingIntervals.clear();
        console.log('✅ RCON polling stopped');
    }

    /**
     * Get polling status
     * @returns {Object} - Polling status info
     */
    getStatus() {
        return {
            isPolling: this.isPolling,
            activeIntervals: this.pollingIntervals.size,
            connections: this.connections.size
        };
    }
}

module.exports = RCONService;
