const mysql = require('mysql2/promise');
const readline = require('readline');

async function addServerWithRCON() {
    let connection;
    
    try {
        // Load environment variables
        require('dotenv').config();
        
        console.log('🎮 Adding server with RCON configuration...');
        
        // Create database connection
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'seedy',
            port: process.env.DB_PORT || 3306
        });
        
        console.log('✅ Connected to database');
        
        // Create readline interface for user input
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        const question = (prompt) => new Promise(resolve => rl.question(prompt, resolve));
        
        // Get server details from user
        console.log('\n📝 Enter server details:');
        const serverName = await question('Server name: ');
        const serverIp = await question('Server IP address: ');
        const rconPort = await question('RCON port (usually 28016): ');
        const rconPassword = await question('RCON password: ');
        const description = await question('Server description (optional): ');
        
        // Insert server into database
        await connection.execute(`
            INSERT INTO servers (
                name, 
                server_name, 
                rcon_ip, 
                rcon_port, 
                rcon_password, 
                description, 
                status, 
                current_players, 
                max_players, 
                region, 
                is_core
            ) VALUES (?, ?, ?, ?, ?, ?, 'Online', 0, 100, 'Unknown', false)
        `, [serverName, serverName, serverIp, parseInt(rconPort), rconPassword, description || 'Rust Server']);
        
        console.log('✅ Server added successfully!');
        console.log(`🎮 Server: ${serverName}`);
        console.log(`🔌 RCON: ${serverIp}:${rconPort}`);
        
        // Test RCON connection
        console.log('\n🧪 Testing RCON connection...');
        try {
            const WebSocket = require('ws');
            const wsUrl = `ws://${serverIp}:${rconPort}/${rconPassword}`;
            
            const ws = new WebSocket(wsUrl);
            
            const connectionTest = new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    ws.close();
                    reject(new Error('Connection timeout'));
                }, 5000);
                
                ws.on('open', () => {
                    clearTimeout(timeout);
                    console.log('✅ RCON connection successful!');
                    ws.close();
                    resolve();
                });
                
                ws.on('error', (error) => {
                    clearTimeout(timeout);
                    console.log('❌ RCON connection failed:', error.message);
                    reject(error);
                });
            });
            
            await connectionTest;
            
        } catch (error) {
            console.log('⚠️ RCON connection test failed, but server was added to database');
            console.log('💡 Make sure the server is running and RCON is enabled');
        }
        
    } catch (error) {
        console.error('❌ Failed to add server:', error);
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔌 Database connection closed');
        }
        process.exit(0);
    }
}

// Run the script
addServerWithRCON();

