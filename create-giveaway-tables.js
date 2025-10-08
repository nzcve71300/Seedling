const mysql = require('mysql2/promise');
require('dotenv').config();

async function createGiveawayTables() {
    let connection;
    
    try {
        console.log('🔄 Creating giveaway tables...');
        
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
        const migrationSQL = fs.readFileSync(path.join(__dirname, 'migrations', 'create-giveaway-tables.sql'), 'utf8');
        
        // Split by semicolon and execute each statement
        const statements = migrationSQL.split(';').filter(stmt => stmt.trim());
        
        for (const statement of statements) {
            if (statement.trim()) {
                console.log(`📝 Executing: ${statement.trim().substring(0, 100)}...`);
                await connection.execute(statement.trim());
            }
        }

        console.log('✅ Migration completed successfully!');
        console.log('📊 Giveaway tables created:');
        console.log('   - giveaways (stores giveaway information)');
        console.log('   - giveaway_entries (stores user entries)');
        console.log('   - giveaway_winners (stores winners)');

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
    createGiveawayTables();
}

module.exports = createGiveawayTables;

