const mysql = require('mysql2/promise');

async function testCooldown() {
    let connection;
    
    try {
        // Load environment variables
        require('dotenv').config();
        
        console.log('🧪 Testing cooldown system...');
        
        // Create database connection
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'seedy',
            port: process.env.DB_PORT || 3306
        });
        
        console.log('✅ Connected to database');
        
        // Check current cooldowns
        const [cooldowns] = await connection.execute(
            'SELECT * FROM user_spin_cooldowns WHERE user_id = ?',
            ['1252993829007528086']
        );
        
        console.log('\n📊 Current cooldowns:');
        if (cooldowns.length === 0) {
            console.log('   - No cooldowns found');
        } else {
            cooldowns.forEach(cd => {
                console.log(`   - Server: ${cd.server_nickname}, Last spin: ${cd.last_spin}`);
            });
        }
        
        // Check spin config
        const [configs] = await connection.execute('SELECT * FROM spin_config');
        console.log('\n📊 Spin configs:');
        if (configs.length === 0) {
            console.log('   - No spin configs found');
        } else {
            configs.forEach(config => {
                console.log(`   - Guild: ${config.guild_id}, Cooldown: ${config.cooldown_hours} hours`);
            });
        }
        
    } catch (error) {
        console.error('❌ Failed to test cooldown:', error);
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔌 Database connection closed');
        }
    }
}

// Run the test
testCooldown();

