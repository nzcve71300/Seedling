const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// Load items from JSON file
let items = [];
try {
    const itemsPath = path.join(__dirname, '../data/items.json');
    const itemsData = fs.readFileSync(itemsPath, 'utf8');
    items = JSON.parse(itemsData);
    console.log(`✅ Loaded ${items.length} items from items.json`);
} catch (error) {
    console.error('Error loading items:', error);
}

// Get all items
router.get('/', async (req, res) => {
    try {
        const { search, category, limit = 100 } = req.query;
        
        let filteredItems = [...items];
        
        // Filter by search term
        if (search) {
            const searchLower = search.toLowerCase();
            filteredItems = filteredItems.filter(item => 
                item.displayName.toLowerCase().includes(searchLower) ||
                item.shortName.toLowerCase().includes(searchLower) ||
                item.category.toLowerCase().includes(searchLower)
            );
        }
        
        // Filter by category
        if (category) {
            filteredItems = filteredItems.filter(item => 
                item.category.toLowerCase() === category.toLowerCase()
            );
        }
        
        // Apply limit
        if (limit) {
            filteredItems = filteredItems.slice(0, parseInt(limit));
        }
        
        res.json({
            success: true,
            data: filteredItems
        });
    } catch (error) {
        console.error('Error getting items:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get items'
        });
    }
});

// Get item by short name
router.get('/:shortName', async (req, res) => {
    try {
        const { shortName } = req.params;
        const item = items.find(item => item.shortName === shortName);
        
        if (item) {
            res.json({
                success: true,
                data: item
            });
        } else {
            res.status(404).json({
                success: false,
                error: 'Item not found'
            });
        }
    } catch (error) {
        console.error('Error getting item:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get item'
        });
    }
});

// Get categories
router.get('/categories/list', async (req, res) => {
    try {
        const categories = [...new Set(items.map(item => item.category))].sort();
        
        res.json({
            success: true,
            data: categories
        });
    } catch (error) {
        console.error('Error getting categories:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get categories'
        });
    }
});

module.exports = router;
