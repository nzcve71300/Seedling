const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function fixDatabaseSchema() {
    let connection;
    
    try {
        // Load environment variables
        require('dotenv').config();
        
        console.log('🔧 Fixing database schema conflicts...');
        
        // Create database connection
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'seedy',
            port: process.env.DB_PORT || 3306
        });
        
        console.log('✅ Connected to database');
        
        // Read and execute the fix script
        const fixSQL = fs.readFileSync(path.join(__dirname, 'fix-servers-table.sql'), 'utf8');
        
        // Split by semicolon and execute each statement
        const statements = fixSQL.split(';').filter(stmt => stmt.trim());
        
        for (const statement of statements) {
            if (statement.trim()) {
                console.log(`🔄 Executing: ${statement.trim().substring(0, 50)}...`);
                await connection.execute(statement);
            }
        }
        
        console.log('✅ Database schema fixed successfully');
        
        // Check the current table structure
        console.log('📊 Current servers table structure:');
        const [columns] = await connection.execute('DESCRIBE servers');
        columns.forEach(col => {
            console.log(`   - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'}`);
        });
        
        // Check if we have any servers
        const [servers] = await connection.execute('SELECT COUNT(*) as count FROM servers');
        console.log(`📈 Total servers in database: ${servers[0].count}`);
        
        // Check servers with RCON config
        const [rconServers] = await connection.execute(`
            SELECT COUNT(*) as count FROM servers 
            WHERE rcon_ip IS NOT NULL 
            AND rcon_port IS NOT NULL 
            AND rcon_password IS NOT NULL
        `);
        console.log(`🔌 Servers with RCON configuration: ${rconServers[0].count}`);
        
    } catch (error) {
        console.error('❌ Failed to fix database schema:', error);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔌 Database connection closed');
        }
    }
}

// Run the fix
fixDatabaseSchema();


