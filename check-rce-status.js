const mysql = require('mysql2/promise');
const fs = require('fs');

async function checkRCEStatus() {
    let connection;
    
    try {
        // Load environment variables
        require('dotenv').config();
        
        console.log('🔍 Checking RCE Manager status...');
        
        // Create database connection
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'seedy',
            port: process.env.DB_PORT || 3306
        });
        
        console.log('✅ Connected to database');
        
        // Check server_connections table
        console.log('\n📊 Server Connections in Database:');
        const [connections] = await connection.execute('SELECT * FROM server_connections');
        
        if (connections.length === 0) {
            console.log('❌ No server connections found in database');
        } else {
            connections.forEach(conn => {
                console.log(`   - ${conn.nickname}: ${conn.server_ip}:${conn.rcon_port} (Status: ${conn.status || 'Unknown'})`);
            });
        }
        
        // Check if server_connections table exists
        console.log('\n🔍 Checking server_connections table structure:');
        try {
            const [columns] = await connection.execute('DESCRIBE server_connections');
            console.log('✅ server_connections table exists with columns:');
            columns.forEach(col => {
                console.log(`   - ${col.Field}: ${col.Type}`);
            });
        } catch (error) {
            console.log('❌ server_connections table does not exist or has issues:', error.message);
        }
        
        // Check if the specific server exists
        console.log('\n🎮 Checking for "Pve Seed" server:');
        const [pveSeed] = await connection.execute(
            'SELECT * FROM server_connections WHERE nickname = ?', 
            ['Pve Seed']
        );
        
        if (pveSeed.length === 0) {
            console.log('❌ "Pve Seed" server not found in server_connections table');
            console.log('💡 You may need to run /connect-server command again');
        } else {
            console.log('✅ "Pve Seed" server found:');
            const server = pveSeed[0];
            console.log(`   - Nickname: ${server.nickname}`);
            console.log(`   - IP: ${server.server_ip}`);
            console.log(`   - Port: ${server.rcon_port}`);
            console.log(`   - Status: ${server.status || 'Unknown'}`);
            console.log(`   - Created: ${server.created_at}`);
        }
        
    } catch (error) {
        console.error('❌ Failed to check RCE status:', error);
    } finally {
        if (connection) {
            await connection.end();
            console.log('\n🔌 Database connection closed');
        }
    }
}

// Run the check
checkRCEStatus();
