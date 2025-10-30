const mysql = require('mysql2/promise');

// Database configuration
const dbConfig = {
    host: '127.0.0.1',
    port: 3306,
    database: 'seedy_discord_bot',
    user: 'seedybot',
    password: 'SEEDCommunityo2o8!'
};

async function addBattlePassDuration() {
    let connection;
    
    try {
        console.log('🔌 Connecting to database...');
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Connected to database');
        
        // Check if columns already exist
        const [columns] = await connection.execute(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'battlepass_config' 
            AND COLUMN_NAME IN ('duration_days', 'end_date')
        `, [dbConfig.database]);
        
        const existingColumns = columns.map(col => col.COLUMN_NAME);
        
        // Add duration_days column if it doesn't exist
        if (!existingColumns.includes('duration_days')) {
            console.log('📝 Adding duration_days column...');
            await connection.execute(`
                ALTER TABLE battlepass_config 
                ADD COLUMN duration_days INT NOT NULL DEFAULT 30
            `);
            console.log('✅ Added duration_days column');
        } else {
            console.log('ℹ️ duration_days column already exists');
        }
        
        // Add end_date column if it doesn't exist
        if (!existingColumns.includes('end_date')) {
            console.log('📝 Adding end_date column...');
            await connection.execute(`
                ALTER TABLE battlepass_config 
                ADD COLUMN end_date TIMESTAMP NULL
            `);
            console.log('✅ Added end_date column');
        } else {
            console.log('ℹ️ end_date column already exists');
        }
        
        // Update existing records to have end_date based on created_at + duration_days
        console.log('🔄 Updating existing battlepass records...');
        const [updateResult] = await connection.execute(`
            UPDATE battlepass_config 
            SET end_date = DATE_ADD(created_at, INTERVAL duration_days DAY)
            WHERE end_date IS NULL
        `);
        
        console.log(`✅ Updated ${updateResult.affectedRows} battlepass record(s)`);
        
        // Show current battlepass configs
        const [configs] = await connection.execute(`
            SELECT id, name, duration_days, created_at, end_date 
            FROM battlepass_config 
            WHERE is_active = TRUE
        `);
        
        if (configs.length > 0) {
            console.log('\n📊 Current Battle Pass Configurations:');
            configs.forEach(config => {
                console.log(`  ID: ${config.id}, Name: ${config.name}, Duration: ${config.duration_days} days`);
                console.log(`    Created: ${config.created_at}, Ends: ${config.end_date || 'Not set'}`);
            });
        } else {
            console.log('\nℹ️ No active battlepass configurations found');
        }
        
        console.log('\n🎉 Migration completed successfully!');
        
    } catch (error) {
        console.error('❌ Error running migration:', error);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔌 Database connection closed');
        }
    }
}

// Run the migration
addBattlePassDuration();


