const mysql = require('mysql2/promise');

async function connectExistingToRCE() {
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
        
        // Get server details from server_connections table
        const [rceServers] = await connection.execute(
            'SELECT * FROM server_connections WHERE nickname = ?', 
            ['PveSeed']
        );
        
        if (rceServers.length === 0) {
            console.log('❌ PveSeed server not found in server_connections table');
            console.log('💡 You need to run /connect-server command first');
            return;
        }
        
        const rceServer = rceServers[0];
        console.log(`📊 RCE Server: ${rceServer.nickname} (${rceServer.server_ip}:${rceServer.rcon_port})`);
        console.log(`📊 Status: ${rceServer.status}`);
        
        // The issue is that the RCE Manager doesn't automatically load existing connections
        // We need to either:
        // 1. Restart the bot after adding the server via /connect-server
        // 2. Or manually trigger the RCE Manager to connect
        
        console.log('\n🎯 SOLUTION:');
        console.log('The RCE Manager needs to be restarted to load existing connections.');
        console.log('\n🔄 Try this approach:');
        console.log('\n1. DISCONNECT the server:');
        console.log('   Use /disconnect-server PveSeed');
        console.log('\n2. RECONNECT the server:');
        console.log('   Use /connect-server with these details:');
        console.log('   - nickname: PveSeed');
        console.log('   - server_ip: 147.93.151.186');
        console.log('   - rcon_port: 28616');
        console.log('   - rcon_password: 6Y2U8XpS');
        console.log('\n3. This will properly connect the server to the RCE Manager');
        
        // Check if there are any other servers
        const [allServers] = await connection.execute(
            'SELECT nickname, status FROM server_connections'
        );
        
        console.log('\n📊 All servers in server_connections table:');
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
connectExistingToRCE();
