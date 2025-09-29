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
