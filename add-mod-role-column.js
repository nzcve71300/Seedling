const mysql = require('mysql2/promise');
require('dotenv').config();

async function addModRoleColumn() {
    let connection;
    
    try {
        console.log('🔄 Adding mod_role_id column to ticket_panels table...');
        
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
        const migrationSQL = fs.readFileSync(path.join(__dirname, 'migrations', 'add-mod-role.sql'), 'utf8');
        
        await connection.execute(migrationSQL.trim());

        console.log('✅ Migration completed successfully!');
        console.log('📊 Added mod_role_id column to ticket_panels table');

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
    addModRoleColumn();
}

module.exports = addModRoleColumn;

