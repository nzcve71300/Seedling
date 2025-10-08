const http = require('http');
const fs = require('fs').promises;
const path = require('path');

const PORT = 3002;
const TRANSCRIPTS_DIR = path.join(__dirname, 'transcripts');

const server = http.createServer(async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    // Parse URL
    const url = req.url;
    
    if (url === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<h1>SEED Ticket Transcripts</h1><p>Access transcripts at /transcript-filename.html</p>');
        return;
    }
    
    if (url.startsWith('/ticket-')) {
        try {
            const filename = url.substring(1); // Remove leading /
            const filepath = path.join(TRANSCRIPTS_DIR, filename);
            
            // Check if file exists
            await fs.access(filepath);
            
            // Read and serve file
            const content = await fs.readFile(filepath, 'utf8');
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(content);
            
        } catch (error) {
            res.writeHead(404, { 'Content-Type': 'text/html' });
            res.end('<h1>404 - Transcript Not Found</h1>');
        }
    } else {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>404 - Not Found</h1>');
    }
});

server.listen(PORT, () => {
    console.log(`📜 Transcript server running on port ${PORT}`);
    console.log(`🌐 Transcripts accessible at: http://YOUR_SERVER_IP:${PORT}/ticket-X-username.html`);
});

