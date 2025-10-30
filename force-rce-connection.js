const mysql = require('mysql2/promise');
const WebSocket = require('ws');

async function forceRCEConnection() {
    let connection;
    
    try {
        // Load environment variables
        require('dotenv').config();
        
        console.log('🔧 Forcing RCE Manager connection...');
        
        // Create database connection
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'seedy',
            port: process.env.DB_PORT || 3306
        });
        
        console.log('✅ Connected to database');
        
        // Get server details
        const [servers] = await connection.execute(
            'SELECT * FROM server_connections WHERE nickname = ?', 
            ['PveSeed']
        );
        
        if (servers.length === 0) {
            console.log('❌ PveSeed server not found in database');
            return;
        }
        
        const server = servers[0];
        console.log(`📊 Server: ${server.nickname} (${server.server_ip}:${server.rcon_port})`);
        
        // Test the RCON connection to make sure it works
        console.log('\n🧪 Testing RCON connection...');
        const wsUrl = `ws://${server.server_ip}:${server.rcon_port}/${server.rcon_password}`;
        
        const ws = new WebSocket(wsUrl);
        
        const connectionTest = new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                ws.close();
                reject(new Error('Connection timeout'));
            }, 10000);
            
            ws.on('open', () => {
                clearTimeout(timeout);
                console.log('✅ RCON connection successful!');
                
                // Send a test command
                ws.send('status');
                
                setTimeout(() => {
                    ws.close();
                    resolve(true);
                }, 2000);
            });
            
            ws.on('message', (data) => {
                console.log('📥 RCON response received');
            });
            
            ws.on('error', (error) => {
                clearTimeout(timeout);
                console.log('❌ RCON connection failed:', error.message);
                reject(error);
            });
        });
        
        try {
            await connectionTest;
            console.log('✅ RCON connection test successful!');
            
            // The real issue is that the RCE Manager service needs to be restarted
            // to load existing connections. Let's provide the solution:
            
            console.log('\n🎯 SOLUTION:');
            console.log('The RCE Manager service needs to be restarted to load existing connections.');
            console.log('\n🔄 Try one of these solutions:');
            console.log('\n1. RESTART THE BOT:');
            console.log('   pm2 restart seedy-discord-bot');
            console.log('\n2. OR RECONNECT THE SERVER:');
            console.log('   Use /disconnect-server PveSeed');
            console.log('   Then use /connect-server again');
            console.log('\n3. OR CHECK BOT LOGS:');
            console.log('   pm2 logs seedy-discord-bot');
            console.log('   Look for RCE Manager initialization messages');
            
        } catch (error) {
            console.log('❌ RCON connection test failed:', error.message);
            console.log('💡 This might be why the RCE Manager connection is failing');
        }
        
    } catch (error) {
        console.error('❌ Failed to force RCE connection:', error);
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔌 Database connection closed');
        }
    }
}

// Run the force connection
forceRCEConnection();


