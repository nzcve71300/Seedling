const fs = require('fs').promises;
const path = require('path');

class TranscriptService {
    constructor(bot) {
        this.bot = bot;
        this.database = bot.database;
        this.transcriptsDir = path.join(__dirname, '../../transcripts');
        this.ensureTranscriptsDir();
    }

    async ensureTranscriptsDir() {
        try {
            await fs.mkdir(this.transcriptsDir, { recursive: true });
        } catch (error) {
            console.error('Error creating transcripts directory:', error);
        }
    }

    /**
     * Save a message to the transcript
     */
    async saveMessage(ticketId, userId, username, content) {
        try {
            await this.database.pool.execute(
                'INSERT INTO ticket_messages (ticket_id, user_id, username, content) VALUES (?, ?, ?, ?)',
                [ticketId, userId, username, content]
            );
        } catch (error) {
            console.error('Error saving message to transcript:', error);
        }
    }

    /**
     * Get all messages for a ticket
     */
    async getMessages(ticketId) {
        const [messages] = await this.database.pool.execute(
            'SELECT * FROM ticket_messages WHERE ticket_id = ? ORDER BY sent_at ASC',
            [ticketId]
        );
        return messages;
    }

    /**
     * Generate HTML transcript
     */
    generateHTML(ticket, messages, users) {
        const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ticket #${ticket.ticket_number} - ${ticket.username}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Segoe UI', 'SF Pro Display', -apple-system, BlinkMacSystemFont, Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: #0a0a0a;
            color: #e8e8e8;
            padding: 20px;
            line-height: 1.6;
        }
        .container {
            max-width: 1400px;
            margin: 0 auto;
            background: linear-gradient(180deg, #1a1a1a 0%, #0f0f0f 100%);
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 8px 32px rgba(0, 255, 0, 0.1);
            border: 1px solid #00ff00;
        }
        .header {
            background: linear-gradient(135deg, #00ff00 0%, #00cc00 100%);
            color: #000;
            padding: 40px;
            border-bottom: 3px solid #00ff00;
        }
        .header h1 {
            font-size: 32px;
            font-weight: 700;
            margin-bottom: 15px;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        .header .info {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 20px;
            margin-top: 25px;
        }
        .info-item {
            background: rgba(0, 0, 0, 0.3);
            padding: 15px;
            border-radius: 8px;
            border-left: 3px solid #000;
        }
        .info-label {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            opacity: 0.8;
            margin-bottom: 8px;
            font-weight: 600;
        }
        .info-value {
            font-size: 16px;
            font-weight: 700;
            color: #000;
        }
        .conversation-header {
            background: #1a1a1a;
            padding: 20px 40px;
            border-bottom: 2px solid #00ff00;
        }
        .conversation-header h2 {
            font-size: 24px;
            color: #00ff00;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .conversation-header p {
            color: #888;
            margin-top: 5px;
            font-size: 14px;
        }
        .messages {
            padding: 30px 40px;
            background: #0f0f0f;
        }
        .message {
            margin-bottom: 24px;
            display: flex;
            gap: 16px;
            padding: 16px;
            background: #1a1a1a;
            border-radius: 12px;
            border-left: 4px solid #00ff00;
            transition: all 0.2s ease;
        }
        .message:hover {
            background: #222;
            box-shadow: 0 4px 12px rgba(0, 255, 0, 0.1);
            transform: translateX(4px);
        }
        .avatar {
            width: 48px;
            height: 48px;
            border-radius: 50%;
            background: linear-gradient(135deg, #00ff00 0%, #00aa00 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 800;
            font-size: 18px;
            color: #000;
            flex-shrink: 0;
            box-shadow: 0 0 20px rgba(0, 255, 0, 0.3);
            border: 2px solid #00ff00;
        }
        .message-content {
            flex: 1;
        }
        .message-header {
            display: flex;
            align-items: baseline;
            gap: 12px;
            margin-bottom: 8px;
        }
        .username {
            font-weight: 700;
            font-size: 16px;
            color: #00ff00;
            text-shadow: 0 0 10px rgba(0, 255, 0, 0.5);
        }
        .timestamp {
            font-size: 12px;
            color: #666;
            font-family: 'Courier New', monospace;
        }
        .message-text {
            color: #e8e8e8;
            line-height: 1.6;
            word-wrap: break-word;
            font-size: 15px;
            padding: 8px 0;
        }
        .users-section {
            background: #1a1a1a;
            padding: 30px 40px;
            border-top: 2px solid #00ff00;
        }
        .users-section h3 {
            font-size: 20px;
            color: #00ff00;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .users-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            gap: 15px;
        }
        .user-card {
            background: #0f0f0f;
            padding: 15px;
            border-radius: 8px;
            border: 1px solid #222;
            display: flex;
            align-items: center;
            gap: 12px;
            transition: all 0.2s ease;
        }
        .user-card:hover {
            border-color: #00ff00;
            background: #1a1a1a;
        }
        .user-avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: linear-gradient(135deg, #00ff00 0%, #00aa00 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 800;
            font-size: 16px;
            color: #000;
            flex-shrink: 0;
        }
        .user-info {
            flex: 1;
        }
        .user-name {
            font-weight: 600;
            color: #e8e8e8;
            margin-bottom: 4px;
        }
        .user-count {
            font-size: 12px;
            color: #00ff00;
        }
        .footer {
            background: #000;
            padding: 25px 40px;
            text-align: center;
            color: #666;
            font-size: 13px;
            border-top: 2px solid #00ff00;
        }
        .footer p {
            margin: 5px 0;
        }
        .footer .powered-by {
            color: #00ff00;
            font-weight: 600;
            margin-top: 10px;
        }
        .stats {
            display: flex;
            justify-content: center;
            gap: 30px;
            margin-top: 15px;
        }
        .stat {
            padding: 10px 20px;
            background: #1a1a1a;
            border-radius: 6px;
            border: 1px solid #00ff00;
        }
        .stat-value {
            font-size: 20px;
            font-weight: 700;
            color: #00ff00;
        }
        .stat-label {
            font-size: 11px;
            color: #888;
            text-transform: uppercase;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎫 Ticket #${ticket.ticket_number} - ${ticket.username}</h1>
            <div class="info">
                <div class="info-item">
                    <div class="info-label">👤 Ticket Owner</div>
                    <div class="info-value">${ticket.username}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">📝 Ticket Type</div>
                    <div class="info-value">${ticket.ticket_type}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">🎮 In-Game Name</div>
                    <div class="info-value">${ticket.in_game_name || 'Not Provided'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">📊 Status</div>
                    <div class="info-value">${ticket.status === 'closed' ? '🏁 Closed' : '🟩 Open'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">📅 Created</div>
                    <div class="info-value">${new Date(ticket.created_at).toLocaleString()}</div>
                </div>
                ${ticket.closed_at ? `
                <div class="info-item">
                    <div class="info-label">🔒 Closed</div>
                    <div class="info-value">${new Date(ticket.closed_at).toLocaleString()}</div>
                </div>
                ` : ''}
            </div>
        </div>
        
        <div class="conversation-header">
            <h2>💬 Conversation Transcript</h2>
            <p>${messages.length} messages • ${users.size} participants</p>
        </div>
        
        <div class="messages">
            ${messages.length === 0 ? '<p style="text-align: center; color: #666; padding: 40px;">No messages in this ticket.</p>' : messages.map(msg => `
            <div class="message">
                <div class="avatar">${msg.username.substring(0, 2).toUpperCase()}</div>
                <div class="message-content">
                    <div class="message-header">
                        <span class="username">${this.escapeHtml(msg.username)}</span>
                        <span class="timestamp">${new Date(msg.sent_at).toLocaleString('en-US', { 
                            month: 'short', 
                            day: 'numeric', 
                            hour: '2-digit', 
                            minute: '2-digit' 
                        })}</span>
                    </div>
                    <div class="message-text">${this.escapeHtml(msg.content)}</div>
                </div>
            </div>
            `).join('')}
        </div>

        <div class="users-section">
            <h3>👥 Participants</h3>
            <div class="users-grid">
            ${Array.from(users.entries()).map(([userId, data]) => `
                <div class="user-card">
                    <div class="user-avatar">${data.username.substring(0, 2).toUpperCase()}</div>
                    <div class="user-info">
                        <div class="user-name">${this.escapeHtml(data.username)}</div>
                        <div class="user-count">${data.count} message${data.count !== 1 ? 's' : ''}</div>
                    </div>
                </div>
            `).join('')}
            </div>
        </div>

        <div class="footer">
            <div class="stats">
                <div class="stat">
                    <div class="stat-value">${messages.length}</div>
                    <div class="stat-label">Messages</div>
                </div>
                <div class="stat">
                    <div class="stat-value">${users.size}</div>
                    <div class="stat-label">Users</div>
                </div>
                <div class="stat">
                    <div class="stat-value">#${ticket.ticket_number}</div>
                    <div class="stat-label">Ticket ID</div>
                </div>
            </div>
            <p class="powered-by">🌱 SEED Ticket System</p>
            <p>Generated: ${new Date().toLocaleString()}</p>
        </div>
    </div>
</body>
</html>`;

        return html;
    }

    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    /**
     * Create transcript and save to file
     */
    async createTranscript(ticketId) {
        try {
            // Get ticket info
            const [tickets] = await this.database.pool.execute(
                'SELECT * FROM tickets WHERE id = ?',
                [ticketId]
            );

            if (tickets.length === 0) {
                throw new Error('Ticket not found');
            }

            const ticket = tickets[0];

            // Get all messages
            const messages = await this.getMessages(ticketId);

            // Get unique users and message counts
            const users = new Map();
            messages.forEach(msg => {
                if (!users.has(msg.user_id)) {
                    users.set(msg.user_id, { username: msg.username, count: 0 });
                }
                users.get(msg.user_id).count++;
            });

            // Generate HTML
            const html = this.generateHTML(ticket, messages, users);

            // Save to file
            const filename = `ticket-${ticket.ticket_number}-${ticket.username.replace(/[^a-z0-9]/gi, '_')}.html`;
            const filepath = path.join(this.transcriptsDir, filename);
            await fs.writeFile(filepath, html, 'utf8');

            console.log(`✅ Transcript saved: ${filename}`);

            // Generate web-accessible URL
            // Change this to your server's IP address or domain
            const SERVER_IP = process.env.SERVER_IP || '34.141.211.185';
            const TRANSCRIPT_PORT = process.env.TRANSCRIPT_PORT || '3002';
            const transcriptUrl = `http://${SERVER_IP}:${TRANSCRIPT_PORT}/${filename}`;

            // Update ticket with transcript URL
            await this.database.pool.execute(
                'UPDATE tickets SET transcript_url = ? WHERE id = ?',
                [transcriptUrl, ticketId]
            );

            return {
                url: transcriptUrl,
                filename: filename,
                filepath: filepath,
                users: users,
                messageCount: messages.length
            };

        } catch (error) {
            console.error('Error creating transcript:', error);
            throw error;
        }
    }

    /**
     * Get transcript info for embed
     */
    async getTranscriptInfo(ticketId) {
        const [tickets] = await this.database.pool.execute(
            'SELECT * FROM tickets WHERE id = ?',
            [ticketId]
        );

        if (tickets.length === 0) {
            return null;
        }

        const ticket = tickets[0];
        const messages = await this.getMessages(ticketId);
        
        const users = new Map();
        messages.forEach(msg => {
            if (!users.has(msg.user_id)) {
                users.set(msg.user_id, { username: msg.username, count: 0 });
            }
            users.get(msg.user_id).count++;
        });

        return {
            ticket,
            messageCount: messages.length,
            users,
            transcript_url: ticket.transcript_url
        };
    }
}

module.exports = TranscriptService;

