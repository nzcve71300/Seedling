const mysql = require('mysql2/promise');
require('dotenv').config({ path: './.env' });

async function debugNotifications() {
    console.log('🔍 Starting Notification System Debug...\n');
    
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || '127.0.0.1',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'seedybot',
        password: process.env.DB_PASSWORD || 'SEEDCommunityo2o8!',
        database: process.env.DB_NAME || 'seedy_discord_bot',
    });

    try {
        // Check if notifications table exists
        console.log('1️⃣ Checking notifications table...');
        const [tables] = await connection.execute(`
            SELECT COUNT(*) as count 
            FROM information_schema.tables 
            WHERE table_schema = ? AND table_name = 'notifications'
        `, [process.env.DB_NAME || 'seedy_discord_bot']);
        
        if (tables[0].count > 0) {
            console.log('   ✅ Notifications table exists\n');
            
            // Get notification count
            const [notifCount] = await connection.execute('SELECT COUNT(*) as count FROM notifications');
            console.log(`   📊 Total notifications: ${notifCount[0].count}`);
            
            // Get unread notifications
            const [unreadCount] = await connection.execute(`
                SELECT COUNT(*) as count 
                FROM notifications 
                WHERE is_read = FALSE 
                AND (expires_at IS NULL OR expires_at > NOW())
            `);
            console.log(`   🔔 Unread notifications: ${unreadCount[0].count}\n`);
            
            // Show recent notifications
            const [recentNotifs] = await connection.execute(`
                SELECT id, user_id, type, title, is_read, created_at, expires_at
                FROM notifications 
                ORDER BY created_at DESC 
                LIMIT 5
            `);
            
            if (recentNotifs.length > 0) {
                console.log('   📋 Recent notifications:');
                recentNotifs.forEach(notif => {
                    console.log(`      - ID: ${notif.id}, User: ${notif.user_id}, Type: ${notif.type}`);
                    console.log(`        Title: ${notif.title}, Read: ${notif.is_read}, Created: ${notif.created_at}`);
                });
                console.log('');
            }
        } else {
            console.log('   ❌ Notifications table does NOT exist!\n');
        }

        // Check users table
        console.log('2️⃣ Checking users table...');
        const [userCount] = await connection.execute('SELECT COUNT(*) as count FROM users');
        console.log(`   📊 Total users: ${userCount[0].count}\n`);
        
        if (userCount[0].count === 0) {
            console.log('   ⚠️  No users found in database!');
            console.log('   💡 Users are added when they sign in with Discord on the website\n');
        } else {
            // Show users
            const [users] = await connection.execute('SELECT user_id, username, created_at FROM users LIMIT 10');
            console.log('   👥 Users in database:');
            users.forEach(user => {
                console.log(`      - ${user.username || 'No username'} (ID: ${user.user_id}) - Created: ${user.created_at}`);
            });
            console.log('');
        }

        // Test creating a notification
        console.log('3️⃣ Testing notification creation...');
        const testUserId = '709541995538022451'; // Your Discord user ID
        
        // Check if test user exists
        const [userExists] = await connection.execute(
            'SELECT * FROM users WHERE user_id = ?',
            [testUserId]
        );
        
        if (userExists.length === 0) {
            console.log(`   ⚠️  Test user ${testUserId} not found in users table`);
            console.log('   📝 Adding test user to database...');
            
            await connection.execute(
                'INSERT INTO users (user_id, username, balance) VALUES (?, ?, ?)',
                [testUserId, 'TestUser', 1000]
            );
            console.log('   ✅ Test user added\n');
        } else {
            console.log(`   ✅ Test user found: ${userExists[0].username || userExists[0].user_id}\n`);
        }
        
        // Create a test notification
        console.log('   📤 Creating test notification...');
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 1);
        
        const [result] = await connection.execute(`
            INSERT INTO notifications (user_id, type, title, message, link, expires_at)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [
            testUserId,
            'other',
            'Test Notification',
            'This is a test notification to verify the system is working!',
            '/news',
            expiresAt.toISOString().slice(0, 19).replace('T', ' ')
        ]);
        
        console.log(`   ✅ Test notification created with ID: ${result.insertId}\n`);
        
        // Verify notification was created
        const [testNotif] = await connection.execute(
            'SELECT * FROM notifications WHERE id = ?',
            [result.insertId]
        );
        
        if (testNotif.length > 0) {
            console.log('4️⃣ Verification:');
            console.log('   ✅ Notification successfully created and retrieved');
            console.log(`   📋 Details: ${testNotif[0].title} for user ${testNotif[0].user_id}\n`);
        }
        
        // Check notification count for test user
        const [userNotifs] = await connection.execute(`
            SELECT COUNT(*) as count 
            FROM notifications 
            WHERE user_id = ? 
            AND (expires_at IS NULL OR expires_at > NOW())
        `, [testUserId]);
        
        console.log(`5️⃣ Summary for user ${testUserId}:`);
        console.log(`   🔔 Active notifications: ${userNotifs[0].count}`);
        
        if (userNotifs[0].count > 0) {
            console.log('   ✅ You should see notifications in the bell icon on the website!\n');
        } else {
            console.log('   ⚠️  No active notifications found\n');
        }
        
    } catch (error) {
        console.error('❌ Error during debug:', error);
        console.error('Stack:', error.stack);
    } finally {
        await connection.end();
        console.log('🔌 Database connection closed');
    }
}

debugNotifications().catch(console.error);

