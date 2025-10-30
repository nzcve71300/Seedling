const mysql = require('mysql2/promise');

// Database configuration
const dbConfig = {
    host: '127.0.0.1',
    port: 3306,
    database: 'seedy_discord_bot',
    user: 'seedybot',
    password: 'SEEDCommunityo2o8!'
};

async function fixBattlePassSchema() {
    let connection;
    
    try {
        console.log('🔌 Connecting to database...');
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Connected to database');
        
        // Check current column types
        const [columns] = await connection.execute(`
            SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'user_battlepass'
            AND COLUMN_NAME IN ('current_xp', 'total_xp', 'current_tier')
        `, [dbConfig.database]);
        
        console.log('\n📊 Current column types:');
        columns.forEach(col => {
            console.log(`  ${col.COLUMN_NAME}: ${col.COLUMN_TYPE}`);
        });
        
        // Fix current_xp if it's not INT
        const currentXpCol = columns.find(col => col.COLUMN_NAME === 'current_xp');
        if (currentXpCol && currentXpCol.DATA_TYPE !== 'int') {
            console.log('\n🔧 Fixing current_xp column type...');
            await connection.execute(`
                ALTER TABLE user_battlepass 
                MODIFY COLUMN current_xp INT NOT NULL DEFAULT 0
            `);
            console.log('✅ Fixed current_xp column');
        }
        
        // Fix total_xp if it's not INT
        const totalXpCol = columns.find(col => col.COLUMN_NAME === 'total_xp');
        if (totalXpCol && totalXpCol.DATA_TYPE !== 'int') {
            console.log('\n🔧 Fixing total_xp column type...');
            await connection.execute(`
                ALTER TABLE user_battlepass 
                MODIFY COLUMN total_xp INT NOT NULL DEFAULT 0
            `);
            console.log('✅ Fixed total_xp column');
        }
        
        // Fix current_tier if it's not INT
        const currentTierCol = columns.find(col => col.COLUMN_NAME === 'current_tier');
        if (currentTierCol && currentTierCol.DATA_TYPE !== 'int') {
            console.log('\n🔧 Fixing current_tier column type...');
            await connection.execute(`
                ALTER TABLE user_battlepass 
                MODIFY COLUMN current_tier INT NOT NULL DEFAULT 0
            `);
            console.log('✅ Fixed current_tier column');
        }
        
        console.log('\n🎉 Schema fix completed!');
        
    } catch (error) {
        console.error('❌ Error fixing schema:', error);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔌 Database connection closed');
        }
    }
}

// Run the fix
fixBattlePassSchema();


