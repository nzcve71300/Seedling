const mysql = require('mysql2/promise');

async function manualClearCooldown() {
    let connection;
    
    try {
        // Load environment variables
        require('dotenv').config();
        
        console.log('🧹 Manually clearing cooldown...');
        
        // Create database connection
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'seedy',
            port: process.env.DB_PORT || 3306
        });
        
        console.log('✅ Connected to database');
        
        // Check current cooldowns before clearing
        const [beforeCooldowns] = await connection.execute(
            'SELECT * FROM user_spin_cooldowns WHERE user_id = ?',
            ['1252993829007528086']
        );
        
        console.log(`📊 Cooldowns before clearing: ${beforeCooldowns.length}`);
        
        // Clear the cooldown
        const result = await connection.execute(
            'DELETE FROM user_spin_cooldowns WHERE user_id = ? AND server_nickname = ?',
            ['1252993829007528086', 'PveSeed']
        );
        
        console.log(`🗑️ Deleted ${result[0].affectedRows} cooldown records`);
        
        // Check cooldowns after clearing
        const [afterCooldowns] = await connection.execute(
            'SELECT * FROM user_spin_cooldowns WHERE user_id = ?',
            ['1252993829007528086']
        );
        
        console.log(`📊 Cooldowns after clearing: ${afterCooldowns.length}`);
        
        if (afterCooldowns.length === 0) {
            console.log('✅ Cooldown successfully cleared!');
            console.log('💡 You should now be able to use /daily-claim');
        } else {
            console.log('❌ Cooldown still exists');
        }
        
    } catch (error) {
        console.error('❌ Failed to clear cooldown:', error);
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔌 Database connection closed');
        }
    }
}

// Run the manual clear
manualClearCooldown();

