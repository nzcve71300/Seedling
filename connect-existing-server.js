const mysql = require('mysql2/promise');

async function connectExistingServer() {
    let connection;
    
    try {
        // Load environment variables
        require('dotenv').config();
        
        console.log('🔧 Connecting existing server to RCE Manager...');
        
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
        console.log(`📊 Current status: ${server.status}`);
        
        // The issue is that the RCE Manager needs to be initialized with the server
        // But we can't directly access the RCE Manager from here
        // Instead, let's check if there's a way to trigger a reconnection
        
        console.log('\n💡 The issue is that the RCE Manager service needs to be restarted');
        console.log('💡 to load the existing server connections.');
        console.log('\n🔄 Try this:');
        console.log('1. Run: pm2 restart seedy-discord-bot');
        console.log('2. Or use the /connect-server command again with the same details');
        console.log('3. Or check if there\'s a /reconnect-server command');
        
        // Let's also check if there are any other servers
        const [allServers] = await connection.execute(
            'SELECT nickname, status FROM server_connections'
        );
        
        console.log('\n📊 All servers in database:');
        allServers.forEach(s => {
            console.log(`   - ${s.nickname}: ${s.status}`);
        });
        
    } catch (error) {
        console.error('❌ Failed to connect existing server:', error);
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔌 Database connection closed');
        }
    }
}

// Run the connection
connectExistingServer();

