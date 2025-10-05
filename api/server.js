const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config();

const DatabaseService = require('../src/services/DatabaseService');

class APIServer {
    constructor() {
        this.app = express();
        this.port = process.env.API_PORT || 3001;
        this.db = new DatabaseService();
        
        // Initialize Discord client for roles fetching
        this.discordClient = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMembers
            ]
        });
        
        this.discordReady = false;
        this.initializeDiscord();
    }

    async initializeDiscord() {
        try {
            this.discordClient.on('ready', () => {
                console.log('✅ Discord client ready for API server');
                this.discordReady = true;
            });

            this.discordClient.on('error', (error) => {
                console.error('❌ Discord client error:', error);
                this.discordReady = false;
            });

            await this.discordClient.login(process.env.DISCORD_TOKEN);
        } catch (error) {
            console.error('❌ Failed to initialize Discord client:', error);
            this.discordReady = false;
        }
    }

    async initialize() {
        try {
            console.log('🚀 Starting API Server...');
            
            // Initialize database
            await this.db.initialize();
            console.log('✅ Database initialized for API');
            
            // Setup middleware
            this.setupMiddleware();
            
            // Setup routes
            this.setupRoutes();
            
            // Start server
            this.server = this.app.listen(this.port, () => {
                console.log(`✅ API Server running on port ${this.port}`);
                console.log(`📡 API Base URL: http://localhost:${this.port}/api`);
            });
            
        } catch (error) {
            console.error('❌ Failed to initialize API server:', error);
            throw error;
        }
    }

    setupMiddleware() {
        // Security middleware
        this.app.use(helmet());
        
        // CORS configuration
        this.app.use(cors({
            origin: [
                process.env.WEBSITE_URL || 'http://localhost:8081',
                'https://seedrust.netlify.app', // Production SEED website
                'http://localhost:3000', // For local development
                'http://localhost:5173',  // For Vite dev server
                'http://localhost:8081'   // For SEED website local
            ],
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization']
        }));
        
        // Rate limiting
        const limiter = rateLimit({
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 100, // limit each IP to 100 requests per windowMs
            message: 'Too many requests from this IP, please try again later.'
        });
        this.app.use('/api/', limiter);
        
        // Logging
        this.app.use(morgan('combined'));
        
        // Body parsing
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
        
        // Health check endpoint
        this.app.get('/health', (req, res) => {
            res.json({ 
                status: 'healthy', 
                timestamp: new Date().toISOString(),
                uptime: process.uptime()
            });
        });
    }

    setupRoutes() {
        // API routes
        this.app.use('/api/partners', this.createPartnersRouter());
        this.app.use('/api/images', this.createImagesRouter());
        this.app.use('/api/news', this.createNewsRouter());
        this.app.use('/api/servers', this.createServersRouter());
        this.app.use('/api/kit-categories', this.createKitCategoriesRouter());
        this.app.use('/api/kits', this.createKitsRouter());
        this.app.use('/api/roles', this.createRolesRouter());
        
        // 404 handler - Fixed wildcard route
        this.app.use('/*', (req, res) => {
            res.status(404).json({ error: 'Endpoint not found' });
        });
        
        // Error handler
        this.app.use((error, req, res, next) => {
            console.error('API Error:', error);
            res.status(500).json({ 
                error: 'Internal server error',
                message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
            });
        });
    }

    createPartnersRouter() {
        const router = express.Router();
        
        // GET /api/partners - Get all partners
        router.get('/', async (req, res) => {
            try {
                const partners = await this.db.all(`
                    SELECT * FROM partners 
                    ORDER BY created_at DESC
                `);
                res.json({ success: true, data: partners });
            } catch (error) {
                console.error('Error fetching partners:', error);
                res.status(500).json({ success: false, error: 'Failed to fetch partners' });
            }
        });
        
        // GET /api/partners/:id - Get specific partner
        router.get('/:id', async (req, res) => {
            try {
                const partner = await this.db.get(`
                    SELECT * FROM partners WHERE id = ?
                `, [req.params.id]);
                
                if (!partner) {
                    return res.status(404).json({ success: false, error: 'Partner not found' });
                }
                
                res.json({ success: true, data: partner });
            } catch (error) {
                console.error('Error fetching partner:', error);
                res.status(500).json({ success: false, error: 'Failed to fetch partner' });
            }
        });
        
        // POST /api/partners - Create new partner
        router.post('/', async (req, res) => {
            try {
                const { name, description, website, logo, discord, type, status } = req.body;
                
                // Validate required fields
                if (!name || !description || !website) {
                    return res.status(400).json({ 
                        success: false, 
                        error: 'Name, description, and website are required' 
                    });
                }
                
                const result = await this.db.run(`
                    INSERT INTO partners (name, description, website, logo, discord, type, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `, [name, description, website, logo || null, discord || null, type || 'service', status || 'active']);
                
                const newPartner = await this.db.get(`
                    SELECT * FROM partners WHERE id = ?
                `, [result.id]);
                
                res.status(201).json({ success: true, data: newPartner });
            } catch (error) {
                console.error('Error creating partner:', error);
                res.status(500).json({ success: false, error: 'Failed to create partner' });
            }
        });
        
        // PUT /api/partners/:id - Update partner
        router.put('/:id', async (req, res) => {
            try {
                const { name, description, website, logo, discord, type, status } = req.body;
                
                // Check if partner exists
                const existingPartner = await this.db.get(`
                    SELECT * FROM partners WHERE id = ?
                `, [req.params.id]);
                
                if (!existingPartner) {
                    return res.status(404).json({ success: false, error: 'Partner not found' });
                }
                
                await this.db.run(`
                    UPDATE partners 
                    SET name = ?, description = ?, website = ?, logo = ?, discord = ?, type = ?, status = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                `, [name, description, website, logo || null, discord || null, type, status, req.params.id]);
                
                const updatedPartner = await this.db.get(`
                    SELECT * FROM partners WHERE id = ?
                `, [req.params.id]);
                
                res.json({ success: true, data: updatedPartner });
            } catch (error) {
                console.error('Error updating partner:', error);
                res.status(500).json({ success: false, error: 'Failed to update partner' });
            }
        });
        
        // DELETE /api/partners/:id - Delete partner
        router.delete('/:id', async (req, res) => {
            try {
                const result = await this.db.run(`
                    DELETE FROM partners WHERE id = ?
                `, [req.params.id]);
                
                if (result.changes === 0) {
                    return res.status(404).json({ success: false, error: 'Partner not found' });
                }
                
                res.json({ success: true, message: 'Partner deleted successfully' });
            } catch (error) {
                console.error('Error deleting partner:', error);
                res.status(500).json({ success: false, error: 'Failed to delete partner' });
            }
        });
        
        return router;
    }

    createImagesRouter() {
        const router = express.Router();
        const dbService = this.db; // Capture the dbService reference
        
        // GET /api/images - Get all images
        router.get('/', async (req, res) => {
            try {
                const images = await dbService.all('SELECT * FROM images WHERE status = "active" ORDER BY created_at DESC');
                res.json({ success: true, data: images });
            } catch (error) {
                console.error('Error fetching images:', error);
                res.status(500).json({ success: false, error: 'Failed to fetch images' });
            }
        });

        // GET /api/images/:id - Get single image
        router.get('/:id', async (req, res) => {
            const { id } = req.params;
            try {
                const image = await dbService.get('SELECT * FROM images WHERE id = ? AND status = "active"', [id]);
                if (image) {
                    res.json({ success: true, data: image });
                } else {
                    res.status(404).json({ success: false, error: 'Image not found' });
                }
            } catch (error) {
                console.error(`Error fetching image ${id}:`, error);
                res.status(500).json({ success: false, error: 'Failed to fetch image' });
            }
        });

        // POST /api/images - Create new image
        router.post('/', async (req, res) => {
            const { name, url, type, category, tags, size, description } = req.body;
            if (!name || !url) {
                return res.status(400).json({ success: false, error: 'Name and URL are required' });
            }
            try {
                const result = await dbService.run(
                    'INSERT INTO images (name, url, type, category, tags, size, description) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [name, url, type || 'url', category || 'general', tags ? JSON.stringify(tags) : null, size, description]
                );
                const newImage = await dbService.get('SELECT * FROM images WHERE id = ?', [result.id]);
                res.status(201).json({ success: true, data: newImage });
            } catch (error) {
                console.error('Error creating image:', error);
                res.status(500).json({ success: false, error: 'Failed to create image' });
            }
        });

        // PUT /api/images/:id - Update image
        router.put('/:id', async (req, res) => {
            const { id } = req.params;
            const { name, url, type, category, tags, size, description, status } = req.body;
            if (!name || !url) {
                return res.status(400).json({ success: false, error: 'Name and URL are required' });
            }
            try {
                const result = await dbService.run(
                    'UPDATE images SET name = ?, url = ?, type = ?, category = ?, tags = ?, size = ?, description = ?, status = ? WHERE id = ?',
                    [name, url, type, category, tags ? JSON.stringify(tags) : null, size, description, status || 'active', id]
                );
                if (result.changes > 0) {
                    const updatedImage = await dbService.get('SELECT * FROM images WHERE id = ?', [id]);
                    res.json({ success: true, data: updatedImage });
                } else {
                    res.status(404).json({ success: false, error: 'Image not found' });
                }
            } catch (error) {
                console.error(`Error updating image ${id}:`, error);
                res.status(500).json({ success: false, error: 'Failed to update image' });
            }
        });

        // DELETE /api/images/:id - Delete image
        router.delete('/:id', async (req, res) => {
            const { id } = req.params;
            try {
                const result = await dbService.run('DELETE FROM images WHERE id = ?', [id]);
                if (result.changes > 0) {
                    res.json({ success: true, message: 'Image deleted successfully' });
                } else {
                    res.status(404).json({ success: false, error: 'Image not found' });
                }
            } catch (error) {
                console.error(`Error deleting image ${id}:`, error);
                res.status(500).json({ success: false, error: 'Failed to delete image' });
            }
        });
        
        return router;
    }

    createNewsRouter() {
        const router = express.Router();
        
        // GET /api/news - Get all published news posts
        router.get('/', async (req, res) => {
            try {
                const posts = await this.db.all(`
                    SELECT * FROM news_posts 
                    WHERE status = 'published'
                    ORDER BY published_at DESC, created_at DESC
                `);
                res.json({ success: true, data: posts });
            } catch (error) {
                console.error('Error fetching news posts:', error);
                res.status(500).json({ success: false, error: 'Failed to fetch news posts' });
            }
        });
        
        // GET /api/news/:id - Get specific news post
        router.get('/:id', async (req, res) => {
            try {
                const post = await this.db.get(`
                    SELECT * FROM news_posts WHERE id = ? AND status = 'published'
                `, [req.params.id]);
                
                if (!post) {
                    return res.status(404).json({ success: false, error: 'News post not found' });
                }
                
                res.json({ success: true, data: post });
            } catch (error) {
                console.error('Error fetching news post:', error);
                res.status(500).json({ success: false, error: 'Failed to fetch news post' });
            }
        });
        
        // POST /api/news - Create new news post (admin only)
        router.post('/', async (req, res) => {
            try {
                const { title, excerpt, content, author, category, tags, featured, image, status, published_at } = req.body;
                
                // Validate required fields
                if (!title || !excerpt || !content || !author || !category) {
                    return res.status(400).json({ 
                        success: false, 
                        error: 'Title, excerpt, content, author, and category are required' 
                    });
                }
                
                // Handle published_at - use the one from frontend if provided, or create new one if status is published
                let publishedAt = null;
                if (published_at) {
                    // Convert ISO string to MySQL datetime format
                    publishedAt = new Date(published_at).toISOString().replace('T', ' ').replace('Z', '').substring(0, 19);
                } else if (status === 'published') {
                    publishedAt = new Date().toISOString().replace('T', ' ').replace('Z', '').substring(0, 19);
                }
                
                const result = await this.db.run(`
                    INSERT INTO news_posts (title, excerpt, content, author, category, tags, featured, image, status, published_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [title || null, excerpt || null, content || null, author || null, category || null, tags ? JSON.stringify(tags) : null, featured || false, image || null, status || 'draft', publishedAt]);
                
                const newPost = await this.db.get(`
                    SELECT * FROM news_posts WHERE id = ?
                `, [result.id]);
                
                res.status(201).json({ success: true, data: newPost });
            } catch (error) {
                console.error('Error creating news post:', error);
                res.status(500).json({ success: false, error: 'Failed to create news post' });
            }
        });
        
        // PUT /api/news/:id - Update news post (admin only)
        router.put('/:id', async (req, res) => {
            try {
                const { title, excerpt, content, author, category, tags, featured, image, status, published_at } = req.body;
                
                // Check if post exists
                const existingPost = await this.db.get(`
                    SELECT * FROM news_posts WHERE id = ?
                `, [req.params.id]);
                
                if (!existingPost) {
                    return res.status(404).json({ success: false, error: 'News post not found' });
                }
                
                // Handle published_at logic
                let publishedAt = existingPost.published_at;
                if (published_at) {
                    // Convert ISO string to MySQL datetime format
                    publishedAt = new Date(published_at).toISOString().replace('T', ' ').replace('Z', '').substring(0, 19);
                } else if (status === 'published' && existingPost.status !== 'published') {
                    publishedAt = new Date().toISOString().replace('T', ' ').replace('Z', '').substring(0, 19);
                } else if (status !== 'published') {
                    publishedAt = null;
                }
                
                await this.db.run(`
                    UPDATE news_posts 
                    SET title = ?, excerpt = ?, content = ?, author = ?, category = ?, tags = ?, featured = ?, image = ?, status = ?, published_at = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                `, [title, excerpt, content, author, category, tags ? JSON.stringify(tags) : null, featured, image, status, publishedAt, req.params.id]);
                
                const updatedPost = await this.db.get(`
                    SELECT * FROM news_posts WHERE id = ?
                `, [req.params.id]);
                
                res.json({ success: true, data: updatedPost });
            } catch (error) {
                console.error('Error updating news post:', error);
                res.status(500).json({ success: false, error: 'Failed to update news post' });
            }
        });
        
        // DELETE /api/news/:id - Delete news post (admin only)
        router.delete('/:id', async (req, res) => {
            try {
                const result = await this.db.run(`
                    DELETE FROM news_posts WHERE id = ?
                `, [req.params.id]);
                
                if (result.changes === 0) {
                    return res.status(404).json({ success: false, error: 'News post not found' });
                }
                
                res.json({ success: true, message: 'News post deleted successfully' });
            } catch (error) {
                console.error('Error deleting news post:', error);
                res.status(500).json({ success: false, error: 'Failed to delete news post' });
            }
        });
        
        return router;
    }

    createServersRouter() {
        const router = express.Router();
        const dbService = this.db;
        
        // GET /api/servers - Get all servers
        router.get('/', async (req, res) => {
            try {
                const servers = await dbService.all(`
                    SELECT * FROM servers ORDER BY is_core DESC, created_at ASC
                `);
                
                res.json({ success: true, data: servers });
            } catch (error) {
                console.error('Error fetching servers:', error);
                res.status(500).json({ success: false, error: 'Failed to fetch servers' });
            }
        });
        
        // GET /api/servers/:id - Get specific server with live data
        router.get('/:id', async (req, res) => {
            try {
                const server = await dbService.get(`
                    SELECT * FROM servers WHERE id = ?
                `, [req.params.id]);
                
                if (!server) {
                    return res.status(404).json({ success: false, error: 'Server not found' });
                }
                
                // Return server data with live player count info
                res.json({ 
                    success: true, 
                    server: {
                        ...server,
                        last_updated: new Date().toISOString(),
                        live_data: true
                    }
                });
            } catch (error) {
                console.error('Error fetching server:', error);
                res.status(500).json({ success: false, error: 'Failed to fetch server' });
            }
        });
        
        // POST /api/servers - Create new server
        router.post('/', async (req, res) => {
            try {
                const { name, description, status, current_players, max_players, region, is_core, image, rcon_ip, rcon_port, rcon_password } = req.body;
                
                if (!name || !description || !region) {
                    return res.status(400).json({ 
                        success: false, 
                        error: 'Name, description, and region are required' 
                    });
                }
                
                const result = await dbService.run(`
                    INSERT INTO servers (name, description, status, current_players, max_players, region, is_core, image, rcon_ip, rcon_port, rcon_password)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [name, description, status || 'Online', current_players || 0, max_players || 100, region, is_core || false, image || null, rcon_ip || null, rcon_port || null, rcon_password || null]);
                
                res.status(201).json({ 
                    success: true, 
                    data: { id: result.id, ...req.body },
                    message: 'Server created successfully' 
                });
            } catch (error) {
                console.error('Error creating server:', error);
                res.status(500).json({ success: false, error: 'Failed to create server' });
            }
        });
        
        // PUT /api/servers/:id - Update server
        router.put('/:id', async (req, res) => {
            try {
                const { name, description, status, current_players, max_players, region, is_core, image, rcon_ip, rcon_port, rcon_password } = req.body;
                
                // Check if server exists
                const existingServer = await dbService.run(`
                    SELECT * FROM servers WHERE id = ?
                `, [req.params.id]);
                
                if (existingServer.length === 0) {
                    return res.status(404).json({ success: false, error: 'Server not found' });
                }
                
                await dbService.run(`
                    UPDATE servers 
                    SET name = ?, description = ?, status = ?, current_players = ?, max_players = ?, region = ?, is_core = ?, image = ?, rcon_ip = ?, rcon_port = ?, rcon_password = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                `, [name, description, status, current_players, max_players, region, is_core, image, rcon_ip, rcon_port, rcon_password, req.params.id]);
                
                res.json({ 
                    success: true, 
                    data: { id: req.params.id, ...req.body },
                    message: 'Server updated successfully' 
                });
            } catch (error) {
                console.error('Error updating server:', error);
                res.status(500).json({ success: false, error: 'Failed to update server' });
            }
        });
        
        // DELETE /api/servers/:id - Delete server
        router.delete('/:id', async (req, res) => {
            try {
                const result = await dbService.run(`
                    DELETE FROM servers WHERE id = ?
                `, [req.params.id]);
                
                if (result.changes === 0) {
                    return res.status(404).json({ success: false, error: 'Server not found' });
                }
                
                res.json({ success: true, message: 'Server deleted successfully' });
            } catch (error) {
                console.error('Error deleting server:', error);
                res.status(500).json({ success: false, error: 'Failed to delete server' });
            }
        });
        
        return router;
    }

    createKitCategoriesRouter() {
        const router = express.Router();
        const dbService = this.db;
        
        // GET /api/kit-categories - Get all kit categories
        router.get('/', async (req, res) => {
            try {
                const categories = await dbService.all(`
                    SELECT * FROM kit_categories ORDER BY sort_order ASC, name ASC
                `);
                
                res.json({ success: true, data: categories });
            } catch (error) {
                console.error('Error fetching kit categories:', error);
                res.status(500).json({ success: false, error: 'Failed to fetch kit categories' });
            }
        });
        
        // GET /api/kit-categories/:id - Get specific kit category
        router.get('/:id', async (req, res) => {
            try {
                const category = await dbService.get(`
                    SELECT * FROM kit_categories WHERE id = ?
                `, [req.params.id]);
                
                if (!category) {
                    return res.status(404).json({ success: false, error: 'Kit category not found' });
                }
                
                res.json({ success: true, data: category });
            } catch (error) {
                console.error('Error fetching kit category:', error);
                res.status(500).json({ success: false, error: 'Failed to fetch kit category' });
            }
        });
        
        // POST /api/kit-categories - Create new kit category
        router.post('/', async (req, res) => {
            try {
                const { name, description, icon, color, sort_order, status } = req.body;
                
                if (!name) {
                    return res.status(400).json({ success: false, error: 'Name is required' });
                }
                
                const result = await dbService.run(`
                    INSERT INTO kit_categories (name, description, icon, color, sort_order, status)
                    VALUES (?, ?, ?, ?, ?, ?)
                `, [name || null, description || null, icon || null, color || '#3B82F6', sort_order || 0, status || 'active']);
                
                const newCategory = await dbService.get(`
                    SELECT * FROM kit_categories WHERE id = ?
                `, [result.id]);
                
                res.json({ success: true, data: newCategory });
            } catch (error) {
                console.error('Error creating kit category:', error);
                res.status(500).json({ success: false, error: 'Failed to create kit category' });
            }
        });
        
        // PUT /api/kit-categories/:id - Update kit category
        router.put('/:id', async (req, res) => {
            try {
                const { name, description, icon, color, sort_order, status } = req.body;
                
                await dbService.run(`
                    UPDATE kit_categories 
                    SET name = ?, description = ?, icon = ?, color = ?, sort_order = ?, status = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                `, [name, description, icon, color, sort_order, status, req.params.id]);
                
                const updatedCategory = await dbService.get(`
                    SELECT * FROM kit_categories WHERE id = ?
                `, [req.params.id]);
                
                res.json({ success: true, data: updatedCategory });
            } catch (error) {
                console.error('Error updating kit category:', error);
                res.status(500).json({ success: false, error: 'Failed to update kit category' });
            }
        });
        
        // DELETE /api/kit-categories/:id - Delete kit category
        router.delete('/:id', async (req, res) => {
            try {
                const result = await dbService.run(`
                    DELETE FROM kit_categories WHERE id = ?
                `, [req.params.id]);
                
                if (result.changes === 0) {
                    return res.status(404).json({ success: false, error: 'Kit category not found' });
                }
                
                res.json({ success: true, message: 'Kit category deleted successfully' });
            } catch (error) {
                console.error('Error deleting kit category:', error);
                res.status(500).json({ success: false, error: 'Failed to delete kit category' });
            }
        });
        
        return router;
    }

    createKitsRouter() {
        const router = express.Router();
        const dbService = this.db;
        
        // GET /api/kits - Get all kits with category info
        router.get('/', async (req, res) => {
            try {
                const kits = await dbService.all(`
                    SELECT k.*, kc.name as category_name, kc.color as category_color
                    FROM kits k
                    LEFT JOIN kit_categories kc ON k.category_id = kc.id
                    ORDER BY k.featured DESC, k.created_at DESC
                `);
                
                res.json({ success: true, data: kits });
            } catch (error) {
                console.error('Error fetching kits:', error);
                res.status(500).json({ success: false, error: 'Failed to fetch kits' });
            }
        });
        
        // GET /api/kits/:id - Get specific kit
        router.get('/:id', async (req, res) => {
            try {
                const kit = await dbService.get(`
                    SELECT k.*, kc.name as category_name, kc.color as category_color
                    FROM kits k
                    LEFT JOIN kit_categories kc ON k.category_id = kc.id
                    WHERE k.id = ?
                `, [req.params.id]);
                
                if (!kit) {
                    return res.status(404).json({ success: false, error: 'Kit not found' });
                }
                
                res.json({ success: true, data: kit });
            } catch (error) {
                console.error('Error fetching kit:', error);
                res.status(500).json({ success: false, error: 'Failed to fetch kit' });
            }
        });
        
        // POST /api/kits - Create new kit
        router.post('/', async (req, res) => {
            try {
                const { name, description, category_id, price, currency, items, commands, image, featured, status } = req.body;
                
                if (!name || !description || !category_id) {
                    return res.status(400).json({ success: false, error: 'Name, description, and category are required' });
                }
                
                const result = await dbService.run(`
                    INSERT INTO kits (name, description, category_id, price, currency, items, commands, image, featured, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [name, description, category_id, price || 0, currency || 'USD', items, commands || null, image || null, featured || false, status || 'draft']);
                
                const newKit = await dbService.get(`
                    SELECT k.*, kc.name as category_name, kc.color as category_color
                    FROM kits k
                    LEFT JOIN kit_categories kc ON k.category_id = kc.id
                    WHERE k.id = ?
                `, [result.id]);
                
                res.json({ success: true, data: newKit });
            } catch (error) {
                console.error('Error creating kit:', error);
                res.status(500).json({ success: false, error: 'Failed to create kit' });
            }
        });
        
        // PUT /api/kits/:id - Update kit
        router.put('/:id', async (req, res) => {
            try {
                const { name, description, category_id, price, currency, items, commands, image, featured, status } = req.body;
                
                await dbService.run(`
                    UPDATE kits 
                    SET name = ?, description = ?, category_id = ?, price = ?, currency = ?, items = ?, commands = ?, image = ?, featured = ?, status = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                `, [name, description, category_id, price, currency, items, commands, image, featured, status, req.params.id]);
                
                const updatedKit = await dbService.get(`
                    SELECT k.*, kc.name as category_name, kc.color as category_color
                    FROM kits k
                    LEFT JOIN kit_categories kc ON k.category_id = kc.id
                    WHERE k.id = ?
                `, [req.params.id]);
                
                res.json({ success: true, data: updatedKit });
            } catch (error) {
                console.error('Error updating kit:', error);
                res.status(500).json({ success: false, error: 'Failed to update kit' });
            }
        });
        
        // DELETE /api/kits/:id - Delete kit
        router.delete('/:id', async (req, res) => {
            try {
                const result = await dbService.run(`
                    DELETE FROM kits WHERE id = ?
                `, [req.params.id]);
                
                if (result.changes === 0) {
                    return res.status(404).json({ success: false, error: 'Kit not found' });
                }
                
                res.json({ success: true, message: 'Kit deleted successfully' });
            } catch (error) {
                console.error('Error deleting kit:', error);
                res.status(500).json({ success: false, error: 'Failed to delete kit' });
            }
        });
        
        return router;
    }

    createRolesRouter() {
        const router = express.Router();
        
        // GET /api/roles/:guildId - Get Discord roles for a guild
        router.get('/:guildId', async (req, res) => {
            try {
                const { guildId } = req.params;
                
                console.log(`📋 Fetching roles for guild: ${guildId}`);
                console.log(`🔍 Discord client ready: ${this.discordReady}`);
                console.log(`🔍 Discord client logged in: ${this.discordClient.user ? 'Yes' : 'No'}`);
                console.log(`🔍 Available guilds: ${this.discordClient.guilds.cache.size}`);
                
                if (!this.discordReady) {
                    console.error('❌ Discord client not ready');
                    return res.status(503).json({ 
                        success: false, 
                        error: 'Discord client not ready' 
                    });
                }
                
                // Get the guild
                const guild = this.discordClient.guilds.cache.get(guildId);
                if (!guild) {
                    console.error(`❌ Guild not found in cache: ${guildId}`);
                    console.log(`🔍 Available guild IDs: ${Array.from(this.discordClient.guilds.cache.keys()).join(', ')}`);
                    return res.status(404).json({ 
                        success: false, 
                        error: 'Guild not found' 
                    });
                }
                
                // Fetch all roles
                console.log(`🔄 Fetching roles for guild: ${guild.name}`);
                await guild.roles.fetch();
                
                // Filter out @everyone role and format the response
                const roles = guild.roles.cache
                    .filter(role => role.id !== guild.id) // Exclude @everyone role
                    .map(role => ({
                        id: role.id,
                        name: role.name,
                        color: role.hexColor,
                        position: role.position,
                        managed: role.managed,
                        mentionable: role.mentionable,
                        permissions: role.permissions.toArray()
                    }))
                    .sort((a, b) => b.position - a.position); // Sort by position (highest first)
                
                console.log(`✅ Found ${roles.length} roles for guild ${guildId}`);
                
                res.json({ 
                    success: true, 
                    data: roles
                });
            } catch (error) {
                console.error('Error fetching Discord roles:', error);
                res.status(500).json({ 
                    success: false, 
                    error: 'Failed to fetch Discord roles',
                    details: error.message
                });
            }
        });
        
        return router;
    }

    createNewsRouter() {
        const router = express.Router();
        
        // GET /api/news - Get all news posts
        router.get('/', async (req, res) => {
            try {
                const news = await this.db.all(`
                    SELECT * FROM news_posts 
                    ORDER BY created_at DESC
                `);
                
                res.json({ success: true, data: news });
            } catch (error) {
                console.error('Error fetching news:', error);
                res.status(500).json({ success: false, error: 'Failed to fetch news' });
            }
        });
        
        // GET /api/news/:id - Get specific news post
        router.get('/:id', async (req, res) => {
            try {
                const news = await this.db.get(`
                    SELECT * FROM news_posts WHERE id = ?
                `, [req.params.id]);
                
                if (!news) {
                    return res.status(404).json({ success: false, error: 'News post not found' });
                }
                
                res.json({ success: true, data: news });
            } catch (error) {
                console.error('Error fetching news post:', error);
                res.status(500).json({ success: false, error: 'Failed to fetch news post' });
            }
        });
        
        // POST /api/news - Create news post
        router.post('/', async (req, res) => {
            try {
                const { title, excerpt, content, author, category, tags, featured, image, status, published_at } = req.body;
                
                // Handle published_at - convert ISO string to MySQL datetime format
                let formattedPublishedAt = null;
                if (published_at) {
                    formattedPublishedAt = new Date(published_at).toISOString().replace('T', ' ').replace('Z', '').substring(0, 19);
                } else if (status === 'published') {
                    formattedPublishedAt = new Date().toISOString().replace('T', ' ').replace('Z', '').substring(0, 19);
                }
                
                const result = await this.db.run(`
                    INSERT INTO news_posts (title, excerpt, content, author, category, tags, featured, image, status, published_at, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                `, [title || null, excerpt || null, content || null, author || null, category || null, tags || null, featured || 0, image || null, status || 'draft', formattedPublishedAt]);
                
                const newNews = await this.db.get(`
                    SELECT * FROM news_posts WHERE id = ?
                `, [result.id]);
                
                res.json({ success: true, data: newNews });
            } catch (error) {
                console.error('Error creating news post:', error);
                res.status(500).json({ success: false, error: 'Failed to create news post' });
            }
        });
        
        // PUT /api/news/:id - Update news post
        router.put('/:id', async (req, res) => {
            try {
                const { title, excerpt, content, author, category, tags, featured, image, status, published_at } = req.body;
                
                // Check if news post exists
                const existingNews = await this.db.get(`
                    SELECT * FROM news_posts WHERE id = ?
                `, [req.params.id]);
                
                if (!existingNews) {
                    return res.status(404).json({ success: false, error: 'News post not found' });
                }
                
                // Handle published_at - convert ISO string to MySQL datetime format
                let formattedPublishedAt = existingNews.published_at;
                if (published_at) {
                    formattedPublishedAt = new Date(published_at).toISOString().replace('T', ' ').replace('Z', '').substring(0, 19);
                } else if (status === 'published' && existingNews.status !== 'published') {
                    formattedPublishedAt = new Date().toISOString().replace('T', ' ').replace('Z', '').substring(0, 19);
                } else if (status !== 'published') {
                    formattedPublishedAt = null;
                }
                
                await this.db.run(`
                    UPDATE news_posts 
                    SET title = ?, excerpt = ?, content = ?, author = ?, category = ?, tags = ?, featured = ?, image = ?, status = ?, published_at = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                `, [title, excerpt, content, author, category, tags || null, featured || 0, image || null, status, formattedPublishedAt, req.params.id]);
                
                const updatedNews = await this.db.get(`
                    SELECT * FROM news_posts WHERE id = ?
                `, [req.params.id]);
                
                res.json({ success: true, data: updatedNews });
            } catch (error) {
                console.error('Error updating news post:', error);
                res.status(500).json({ success: false, error: 'Failed to update news post' });
            }
        });
        
        // DELETE /api/news/:id - Delete news post
        router.delete('/:id', async (req, res) => {
            try {
                const result = await this.db.run(`
                    DELETE FROM news_posts WHERE id = ?
                `, [req.params.id]);
                
                if (result.changes === 0) {
                    return res.status(404).json({ success: false, error: 'News post not found' });
                }
                
                res.json({ success: true, message: 'News post deleted successfully' });
            } catch (error) {
                console.error('Error deleting news post:', error);
                res.status(500).json({ success: false, error: 'Failed to delete news post' });
            }
        });
        
        return router;
    }

    createImagesRouter() {
        const router = express.Router();
        
        // GET /api/images - Get all images
        router.get('/', async (req, res) => {
            try {
                const images = await this.db.all(`
                    SELECT * FROM images 
                    ORDER BY created_at DESC
                `);
                
                res.json({ success: true, data: images });
            } catch (error) {
                console.error('Error fetching images:', error);
                res.status(500).json({ success: false, error: 'Failed to fetch images' });
            }
        });
        
        // GET /api/images/:id - Get specific image
        router.get('/:id', async (req, res) => {
            try {
                const image = await this.db.get(`
                    SELECT * FROM images WHERE id = ?
                `, [req.params.id]);
                
                if (!image) {
                    return res.status(404).json({ success: false, error: 'Image not found' });
                }
                
                res.json({ success: true, data: image });
            } catch (error) {
                console.error('Error fetching image:', error);
                res.status(500).json({ success: false, error: 'Failed to fetch image' });
            }
        });
        
        // POST /api/images - Create image
        router.post('/', async (req, res) => {
            try {
                const { name, url, type, category, tags, size, description, status } = req.body;
                
                const result = await this.db.run(`
                    INSERT INTO images (name, url, type, category, tags, size, description, status, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                `, [name, url, type, category, tags || null, size || null, description || null, status]);
                
                const newImage = await this.db.get(`
                    SELECT * FROM images WHERE id = ?
                `, [result.lastID]);
                
                res.json({ success: true, data: newImage });
            } catch (error) {
                console.error('Error creating image:', error);
                res.status(500).json({ success: false, error: 'Failed to create image' });
            }
        });
        
        // PUT /api/images/:id - Update image
        router.put('/:id', async (req, res) => {
            try {
                const { name, url, type, category, tags, size, description, status } = req.body;
                
                // Check if image exists
                const existingImage = await this.db.get(`
                    SELECT * FROM images WHERE id = ?
                `, [req.params.id]);
                
                if (!existingImage) {
                    return res.status(404).json({ success: false, error: 'Image not found' });
                }
                
                await this.db.run(`
                    UPDATE images 
                    SET name = ?, url = ?, type = ?, category = ?, tags = ?, size = ?, description = ?, status = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                `, [name, url, type, category, tags || null, size || null, description || null, status, req.params.id]);
                
                const updatedImage = await this.db.get(`
                    SELECT * FROM images WHERE id = ?
                `, [req.params.id]);
                
                res.json({ success: true, data: updatedImage });
            } catch (error) {
                console.error('Error updating image:', error);
                res.status(500).json({ success: false, error: 'Failed to update image' });
            }
        });
        
        // DELETE /api/images/:id - Delete image
        router.delete('/:id', async (req, res) => {
            try {
                const result = await this.db.run(`
                    DELETE FROM images WHERE id = ?
                `, [req.params.id]);
                
                if (result.changes === 0) {
                    return res.status(404).json({ success: false, error: 'Image not found' });
                }
                
                res.json({ success: true, message: 'Image deleted successfully' });
            } catch (error) {
                console.error('Error deleting image:', error);
                res.status(500).json({ success: false, error: 'Failed to delete image' });
            }
        });
        
        return router;
    }

    async shutdown() {
        console.log('🛑 Shutting down API server...');
        if (this.server) {
            this.server.close();
        }
        if (this.discordClient) {
            this.discordClient.destroy();
        }
        await this.db.close();
    }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Received SIGINT, shutting down API server...');
    if (global.apiServer) {
        await global.apiServer.shutdown();
    }
});

process.on('SIGTERM', async () => {
    console.log('\n🛑 Received SIGTERM, shutting down API server...');
    if (global.apiServer) {
        await global.apiServer.shutdown();
    }
});

// Start the API server
const apiServer = new APIServer();
global.apiServer = apiServer;
apiServer.initialize();
