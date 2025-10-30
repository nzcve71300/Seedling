const mysql = require('mysql2/promise');
const WebSocket = require('ws');

async function fixServerConnection() {
    let connection;
    
    try {
        // Load environment variables
        require('dotenv').config();
        
        console.log('🔧 Fixing server connection for PveSeed...');
        
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
        console.log(`📊 Server details: ${server.server_ip}:${server.rcon_port}`);
        
        // Test RCON connection
        console.log('\n🧪 Testing RCON connection...');
        const wsUrl = `ws://${server.server_ip}:${server.rcon_port}/${server.rcon_password}`;
        console.log(`🔌 Connecting to: ${wsUrl.replace(server.rcon_password, '***')}`);
        
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
                console.log('📥 RCON response:', data.toString().substring(0, 100) + '...');
            });
            
            ws.on('error', (error) => {
                clearTimeout(timeout);
                console.log('❌ RCON connection failed:', error.message);
                reject(error);
            });
            
            ws.on('close', (code, reason) => {
                console.log(`🔌 Connection closed: ${code} ${reason}`);
            });
        });
        
        try {
            await connectionTest;
            console.log('✅ RCON connection test successful!');
            
            // Update server status to connected
            await connection.execute(
                'UPDATE server_connections SET status = ? WHERE nickname = ?',
                ['connected', 'PveSeed']
            );
            console.log('✅ Updated server status to connected');
            
            console.log('\n🎉 Server connection fixed!');
            console.log('💡 You can now use /daily-claim with server "PveSeed"');
            
        } catch (error) {
            console.log('❌ RCON connection test failed:', error.message);
            console.log('💡 The server might be offline or RCON might be disabled');
            
            // Update status to error
            await connection.execute(
                'UPDATE server_connections SET status = ? WHERE nickname = ?',
                ['error', 'PveSeed']
            );
            console.log('⚠️ Updated server status to error');
        }
        
    } catch (error) {
        console.error('❌ Failed to fix server connection:', error);
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔌 Database connection closed');
        }
    }
}

// Run the fix
fixServerConnection();


