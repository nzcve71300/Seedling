const mysql = require('mysql2/promise');
require('dotenv').config();

async function runMigration() {
    let connection;
    
    try {
        console.log('🔄 Running database migration to add RCON fields...');
        
        // Create database connection
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER || 'seedy_bot',
            password: process.env.DB_PASSWORD || 'SeedyBot2024!',
            database: process.env.DB_NAME || 'seedy_discord_bot'
        });

        console.log('✅ Connected to database');

        // Read and execute migration
        const fs = require('fs');
        const path = require('path');
        const migrationSQL = fs.readFileSync(path.join(__dirname, 'migrations', 'add-rcon-fields.sql'), 'utf8');
        
        // Split by semicolon and execute each statement
        const statements = migrationSQL.split(';').filter(stmt => stmt.trim());
        
        for (const statement of statements) {
            if (statement.trim()) {
                console.log(`📝 Executing: ${statement.trim()}`);
                await connection.execute(statement.trim());
            }
        }

        console.log('✅ Migration completed successfully!');
        console.log('📊 RCON fields added to servers table:');
        console.log('   - rcon_ip VARCHAR(255) NULL');
        console.log('   - rcon_port INT NULL');
        console.log('   - rcon_password VARCHAR(255) NULL');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔌 Database connection closed');
        }
    }
}

// Run migration if this file is executed directly
if (require.main === module) {
    runMigration();
}

module.exports = runMigration;
