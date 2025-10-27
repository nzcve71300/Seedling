const mysql = require('mysql2/promise');
const WebSocket = require('ws');

async function manualRCEConnect() {
    let connection;
    
    try {
        // Load environment variables
        require('dotenv').config();
        
        console.log('🔧 Manually connecting server to RCE Manager...');
        
        // Create database connection
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'seedy',
            port: process.env.DB_PORT || 3306
        });
        
        console.log('✅ Connected to database');
        
        // Check if server exists
        const [servers] = await connection.execute(
            'SELECT * FROM server_connections WHERE nickname = ?', 
            ['Pve Seed']
        );
        
        if (servers.length === 0) {
            console.log('❌ "Pve Seed" server not found. Adding it now...');
            
            // Add the server to database
            await connection.execute(`
                INSERT INTO server_connections (nickname, server_ip, rcon_port, rcon_password, created_by, status)
                VALUES (?, ?, ?, ?, ?, ?)
            `, ['Pve Seed', '147.93.151.186', 28616, '6Y2U8XpS', 'manual', 'disconnected']);
            
            console.log('✅ Added "Pve Seed" server to database');
        } else {
            console.log('✅ "Pve Seed" server found in database');
        }
        
        // Test RCON connection manually
        console.log('\n🧪 Testing RCON connection manually...');
        const serverIp = '147.93.151.186';
        const rconPort = 28616;
        const rconPassword = '6Y2U8XpS';
        
        const wsUrl = `ws://${serverIp}:${rconPort}/${rconPassword}`;
        console.log(`🔌 Testing connection to: ${wsUrl.replace(rconPassword, '***')}`);
        
        const ws = new WebSocket(wsUrl);
        
        const connectionTest = new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                ws.close();
                reject(new Error('Connection timeout after 10 seconds'));
            }, 10000);
            
            ws.on('open', () => {
                clearTimeout(timeout);
                console.log('✅ RCON connection successful!');
                
                // Send a test command
                ws.send('status');
                
                setTimeout(() => {
                    ws.close();
                    resolve();
                }, 2000);
            });
            
            ws.on('message', (data) => {
                console.log('📥 Received response:', data.toString());
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
            console.log('✅ Manual RCON test successful!');
            
            // Update server status to connected
            await connection.execute(
                'UPDATE server_connections SET status = ? WHERE nickname = ?',
                ['connected', 'Pve Seed']
            );
            console.log('✅ Updated server status to connected');
            
        } catch (error) {
            console.log('❌ Manual RCON test failed:', error.message);
            console.log('💡 This might be why the RCE Manager connection is failing');
        }
        
    } catch (error) {
        console.error('❌ Failed to manually connect RCE:', error);
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔌 Database connection closed');
        }
    }
}

// Run the manual connection
manualRCEConnect();

