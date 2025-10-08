const mysql = require('mysql2/promise');
require('dotenv').config();

async function createTicketTables() {
    let connection;
    
    try {
        console.log('🔄 Creating ticket system tables...');
        
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
        const migrationSQL = fs.readFileSync(path.join(__dirname, 'migrations', 'create-ticket-tables.sql'), 'utf8');
        
        // Split by semicolon and execute each statement
        const statements = migrationSQL.split(';').filter(stmt => stmt.trim());
        
        for (const statement of statements) {
            if (statement.trim()) {
                console.log(`📝 Executing: ${statement.trim().substring(0, 100)}...`);
                await connection.execute(statement.trim());
            }
        }

        console.log('✅ Migration completed successfully!');
        console.log('📊 Ticket system tables created:');
        console.log('   - ticket_panels (stores ticket panel configurations)');
        console.log('   - tickets (stores ticket information)');
        console.log('   - ticket_messages (stores messages for transcripts)');
        console.log('   - channel_settings (stores channel configurations)');

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
    createTicketTables();
}

module.exports = createTicketTables;

