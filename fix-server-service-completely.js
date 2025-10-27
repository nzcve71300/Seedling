const mysql = require('mysql2/promise');

async function fixServerServiceCompletely() {
    let connection;
    
    try {
        // Load environment variables
        require('dotenv').config();
        
        console.log('🔧 Completely fixing ServerService database issues...');
        
        // Create database connection
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'seedy',
            port: process.env.DB_PORT || 3306
        });
        
        console.log('✅ Connected to database');
        
        // Check current table structure
        console.log('\n📊 Current servers table structure:');
        const [columns] = await connection.execute('DESCRIBE servers');
        columns.forEach(col => {
            console.log(`   - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'}`);
        });
        
        // Check if server_name column exists
        const hasServerName = columns.some(col => col.Field === 'server_name');
        const hasName = columns.some(col => col.Field === 'name');
        
        console.log(`\n🔍 Column check:`);
        console.log(`   - server_name column exists: ${hasServerName}`);
        console.log(`   - name column exists: ${hasName}`);
        
        // Fix the server_name column issue
        if (!hasServerName && hasName) {
            console.log('\n🔧 Adding server_name column and copying data from name...');
            
            // Add server_name column
            await connection.execute('ALTER TABLE servers ADD COLUMN server_name VARCHAR(255) NULL');
            
            // Copy name to server_name
            await connection.execute('UPDATE servers SET server_name = name WHERE server_name IS NULL');
            
            console.log('✅ server_name column added and data copied');
        } else if (hasServerName && hasName) {
            console.log('\n🔧 Both columns exist, ensuring server_name has data...');
            
            // Update server_name from name where server_name is null
            await connection.execute('UPDATE servers SET server_name = name WHERE server_name IS NULL OR server_name = ""');
            
            console.log('✅ server_name column updated with data from name');
        }
        
        // Check current data
        console.log('\n📊 Current servers data:');
        const [servers] = await connection.execute('SELECT id, name, server_name FROM servers');
        
        if (servers.length === 0) {
            console.log('   - No servers found in database');
        } else {
            servers.forEach(server => {
                console.log(`   - ID: ${server.id}, name: "${server.name}", server_name: "${server.server_name}"`);
            });
        }
        
        // Test the problematic query
        console.log('\n🧪 Testing the problematic query...');
        try {
            const [testResult] = await connection.execute('SELECT * FROM servers ORDER BY server_name');
            console.log('✅ Query successful! ServerService should work now.');
            console.log(`📊 Found ${testResult.length} servers`);
        } catch (error) {
            console.log('❌ Query still failing:', error.message);
            
            // If still failing, let's check what's wrong
            console.log('\n🔍 Debugging query issue...');
            const [debugResult] = await connection.execute('SELECT server_name FROM servers LIMIT 1');
            console.log('Debug result:', debugResult);
        }
        
        console.log('\n🎉 ServerService fix completed!');
        console.log('💡 Now restart the bot: pm2 restart seedy-discord-bot');
        
    } catch (error) {
        console.error('❌ Failed to fix ServerService:', error);
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔌 Database connection closed');
        }
    }
}

// Run the fix
fixServerServiceCompletely();

