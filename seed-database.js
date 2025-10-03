// Script to populate the Discord bot database with sample data for the SEED website
const DatabaseService = require('./src/services/DatabaseService');
require('dotenv').config();

async function seedDatabase() {
    const db = new DatabaseService();
    
    try {
        console.log('🌱 Starting database seeding...');
        
        // Initialize database connection
        await db.initialize();
        
        // Clear existing data
        console.log('🧹 Clearing existing data...');
        await db.execute('DELETE FROM kits');
        await db.execute('DELETE FROM kit_categories');
        await db.execute('DELETE FROM servers');
        await db.execute('DELETE FROM news_posts');
        await db.execute('DELETE FROM partners');
        
        // Insert kit categories
        console.log('📦 Adding kit categories...');
        const categories = [
            {
                name: 'Starter',
                description: 'Essential kits for new players',
                icon: '🚀',
                color: '#4CAF50',
                sort_order: 1
            },
            {
                name: 'Combat',
                description: 'Weapons and combat equipment',
                icon: '⚔️',
                color: '#F44336',
                sort_order: 2
            },
            {
                name: 'Building',
                description: 'Construction and building materials',
                icon: '🏗️',
                color: '#FF9800',
                sort_order: 3
            },
            {
                name: 'Resources',
                description: 'Raw materials and resources',
                icon: '⛏️',
                color: '#9C27B0',
                sort_order: 4
            },
            {
                name: 'VIP',
                description: 'Premium VIP kits',
                icon: '👑',
                color: '#FFD700',
                sort_order: 5
            }
        ];
        
        const categoryIds = {};
        for (const category of categories) {
            const result = await db.run(
                'INSERT INTO kit_categories (name, description, icon, color, sort_order, status) VALUES (?, ?, ?, ?, ?, ?)',
                [category.name, category.description, category.icon, category.color, category.sort_order, 'active']
            );
            categoryIds[category.name] = result.id;
            console.log(`✅ Added category: ${category.name}`);
        }
        
        // Insert servers
        console.log('🖥️ Adding servers...');
        const servers = [
            {
                name: '🌱 SEED 18x Modded',
                description: 'Experience the ultimate Rust adventure with 18x gather rates, custom loot tables, and exclusive events. Join our thriving community and dominate the wasteland!',
                status: 'Online',
                current_players: 45,
                max_players: 100,
                region: 'US East',
                is_core: true,
                image: 'https://i.imgur.com/4N4Jb8u.png'
            },
            {
                name: '🌱 SEED Vanilla',
                description: 'Pure Rust experience with vanilla rates. Perfect for players who want the authentic Rust experience with our amazing community.',
                status: 'Online',
                current_players: 23,
                max_players: 75,
                region: 'US West',
                is_core: false,
                image: 'https://i.imgur.com/4N4Jb8u.png'
            }
        ];
        
        const serverIds = {};
        for (const server of servers) {
            const result = await db.run(
                'INSERT INTO servers (name, description, status, current_players, max_players, region, is_core, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [server.name, server.description, server.status, server.current_players, server.max_players, server.region, server.is_core, server.image]
            );
            serverIds[server.name] = result.id;
            console.log(`✅ Added server: ${server.name}`);
        }
        
        // Insert kits
        console.log('📦 Adding kits...');
        const kits = [
            {
                name: 'Starter Kit',
                description: 'Perfect for new players starting their journey on SEED 18x Modded. Includes essential tools and resources to get you started.',
                category_id: categoryIds['Starter'],
                price: 5.00,
                currency: 'USD',
                items: JSON.stringify(['Stone Hatchet', 'Stone Pickaxe', 'Building Plan', 'Wood x500', 'Stone x300']),
                commands: JSON.stringify(['kit starter']),
                image: 'https://i.imgur.com/3ixafua.png',
                featured: true,
                status: 'active'
            },
            {
                name: 'Weapon Kit',
                description: 'Armed and dangerous! Get your hands on powerful weapons and ammunition to dominate the battlefield.',
                category_id: categoryIds['Combat'],
                price: 15.00,
                currency: 'USD',
                items: JSON.stringify(['AK-47', '5.56 Ammo x100', 'Metal Facemask', 'Roadsign Jacket', 'Bandages x5']),
                commands: JSON.stringify(['kit weapon']),
                image: 'https://i.imgur.com/3ixafua.png',
                featured: true,
                status: 'active'
            },
            {
                name: 'Building Kit',
                description: 'Everything you need to build the ultimate base. Includes high-quality building materials and tools.',
                category_id: categoryIds['Building'],
                price: 12.00,
                currency: 'USD',
                items: JSON.stringify(['Hammer', 'Building Plan', 'Metal Fragments x1000', 'Wood x2000', 'Stone x1500']),
                commands: JSON.stringify(['kit building']),
                image: 'https://i.imgur.com/3ixafua.png',
                featured: false,
                status: 'active'
            },
            {
                name: 'VIP Starter Kit',
                description: 'Premium starter kit with enhanced resources and exclusive items for VIP members.',
                category_id: categoryIds['VIP'],
                price: 25.00,
                currency: 'USD',
                items: JSON.stringify(['Metal Hatchet', 'Metal Pickaxe', 'Building Plan', 'Wood x1000', 'Stone x800', 'VIP Badge']),
                commands: JSON.stringify(['kit vip_starter']),
                image: 'https://i.imgur.com/3ixafua.png',
                featured: true,
                status: 'active'
            }
        ];
        
        for (const kit of kits) {
            await db.run(
                'INSERT INTO kits (name, description, category_id, price, currency, items, commands, image, featured, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [kit.name, kit.description, kit.category_id, kit.price, kit.currency, kit.items, kit.commands, kit.image, kit.featured, kit.status]
            );
            console.log(`✅ Added kit: ${kit.name}`);
        }
        
        // Insert news posts
        console.log('📰 Adding news posts...');
        const newsPosts = [
            {
                title: 'Welcome to SEED Gaming Network!',
                excerpt: 'Join our amazing community and experience the best Rust servers with exclusive features and events.',
                content: 'Welcome to SEED Gaming Network! We are excited to have you join our community. Our servers offer unique experiences with custom features, events, and a welcoming community. Get started today and discover why SEED is the best choice for Rust players.',
                author: 'SEED Team',
                category: 'Announcements',
                tags: JSON.stringify(['welcome', 'community', 'rust']),
                featured: true,
                status: 'published',
                published_at: new Date().toISOString().replace('Z', '').replace('T', ' ')
            },
            {
                title: 'New 18x Modded Server Launch!',
                excerpt: 'Our new 18x modded server is now live with custom loot tables and exclusive events.',
                content: 'We are proud to announce the launch of our new 18x modded server! This server features custom loot tables, exclusive events, and a thriving community. Join us today and experience Rust like never before.',
                author: 'SEED Team',
                category: 'Updates',
                tags: JSON.stringify(['server', 'launch', 'modded']),
                featured: false,
                status: 'published',
                published_at: new Date().toISOString().replace('Z', '').replace('T', ' ')
            }
        ];
        
        for (const post of newsPosts) {
            await db.run(
                'INSERT INTO news_posts (title, excerpt, content, author, category, tags, featured, status, published_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [post.title, post.excerpt, post.content, post.author, post.category, post.tags, post.featured, post.status, post.published_at]
            );
            console.log(`✅ Added news post: ${post.title}`);
        }
        
        // Insert partners
        console.log('🤝 Adding partners...');
        const partners = [
            {
                name: 'Discord Community',
                description: 'Join our Discord server for the latest updates, events, and community discussions.',
                website: 'https://discord.gg/jE5eagwWZT',
                logo: 'https://assets-global.website-files.com/6257adef93867e50d84d30e2/636e0a6cc3c481a15a141738_icon_clyde_white_RGB.png',
                discord: 'https://discord.gg/jE5eagwWZT',
                type: 'service',
                status: 'active',
                featured: true
            }
        ];
        
        for (const partner of partners) {
            await db.run(
                'INSERT INTO partners (name, description, website, logo, discord, type, status, featured) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [partner.name, partner.description, partner.website, partner.logo, partner.discord, partner.type, partner.status, partner.featured]
            );
            console.log(`✅ Added partner: ${partner.name}`);
        }
        
        console.log('🎉 Database seeding completed successfully!');
        
    } catch (error) {
        console.error('❌ Error seeding database:', error);
    } finally {
        await db.close();
    }
}

// Run the seeding
if (require.main === module) {
    seedDatabase();
}

module.exports = seedDatabase;
