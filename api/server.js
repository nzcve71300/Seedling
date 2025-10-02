const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const DatabaseService = require('../src/services/DatabaseService');

class APIServer {
    constructor() {
        this.app = express();
        this.port = process.env.API_PORT || 3001;
        this.db = new DatabaseService();
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
                process.env.WEBSITE_URL || 'http://localhost:5173',
                'https://seedyrust.netlify.app', // Your actual Netlify domain
                'http://localhost:3000', // For local development
                'http://localhost:5173'  // For Vite dev server
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
                const { title, excerpt, content, author, category, tags, featured, image, status } = req.body;
                
                // Validate required fields
                if (!title || !excerpt || !content || !author || !category) {
                    return res.status(400).json({ 
                        success: false, 
                        error: 'Title, excerpt, content, author, and category are required' 
                    });
                }
                
                const publishedAt = status === 'published' ? new Date().toISOString().replace('Z', '').replace('T', ' ') : null;
                
                const result = await this.db.run(`
                    INSERT INTO news_posts (title, excerpt, content, author, category, tags, featured, image, status, published_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [title, excerpt, content, author, category, tags ? JSON.stringify(tags) : null, featured || false, image || null, status || 'draft', publishedAt]);
                
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
                const { title, excerpt, content, author, category, tags, featured, image, status } = req.body;
                
                // Check if post exists
                const existingPost = await this.db.get(`
                    SELECT * FROM news_posts WHERE id = ?
                `, [req.params.id]);
                
                if (!existingPost) {
                    return res.status(404).json({ success: false, error: 'News post not found' });
                }
                
                // Handle published_at logic
                let publishedAt = existingPost.published_at;
                if (status === 'published' && existingPost.status !== 'published') {
                    publishedAt = new Date().toISOString().replace('Z', '').replace('T', ' ');
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
        
        // GET /api/servers/:id - Get specific server
        router.get('/:id', async (req, res) => {
            try {
                const server = await dbService.get(`
                    SELECT * FROM servers WHERE id = ?
                `, [req.params.id]);
                
                if (!server) {
                    return res.status(404).json({ success: false, error: 'Server not found' });
                }
                
                res.json({ success: true, data: server });
            } catch (error) {
                console.error('Error fetching server:', error);
                res.status(500).json({ success: false, error: 'Failed to fetch server' });
            }
        });
        
        // POST /api/servers - Create new server
        router.post('/', async (req, res) => {
            try {
                const { name, description, status, current_players, max_players, region, is_core, image } = req.body;
                
                if (!name || !description || !region) {
                    return res.status(400).json({ 
                        success: false, 
                        error: 'Name, description, and region are required' 
                    });
                }
                
                const result = await dbService.run(`
                    INSERT INTO servers (name, description, status, current_players, max_players, region, is_core, image)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `, [name, description, status || 'Online', current_players || 0, max_players || 100, region, is_core || false, image || null]);
                
                res.status(201).json({ 
                    success: true, 
                    data: { id: result.insertId, ...req.body },
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
                const { name, description, status, current_players, max_players, region, is_core, image } = req.body;
                
                // Check if server exists
                const existingServer = await dbService.run(`
                    SELECT * FROM servers WHERE id = ?
                `, [req.params.id]);
                
                if (existingServer.length === 0) {
                    return res.status(404).json({ success: false, error: 'Server not found' });
                }
                
                await dbService.run(`
                    UPDATE servers 
                    SET name = ?, description = ?, status = ?, current_players = ?, max_players = ?, region = ?, is_core = ?, image = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                `, [name, description, status, current_players, max_players, region, is_core, image, req.params.id]);
                
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

    async shutdown() {
        console.log('🛑 Shutting down API server...');
        if (this.server) {
            this.server.close();
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
