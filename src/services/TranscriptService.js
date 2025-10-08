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
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: #2b2d31;
            color: #dbdee1;
            padding: 20px;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: #313338;
            border-radius: 8px;
            overflow: hidden;
        }
        .header {
            background: #00ff00;
            color: #000;
            padding: 30px;
        }
        .header h1 {
            font-size: 24px;
            margin-bottom: 10px;
        }
        .header .info {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-top: 20px;
        }
        .info-item {
            background: rgba(0, 0, 0, 0.2);
            padding: 10px;
            border-radius: 4px;
        }
        .info-label {
            font-size: 12px;
            opacity: 0.8;
            margin-bottom: 5px;
        }
        .info-value {
            font-size: 14px;
            font-weight: 600;
        }
        .messages {
            padding: 30px;
        }
        .message {
            margin-bottom: 20px;
            display: flex;
            gap: 15px;
        }
        .avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: linear-gradient(135deg, #00ff00, #00aa00);
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            flex-shrink: 0;
        }
        .message-content {
            flex: 1;
        }
        .message-header {
            display: flex;
            align-items: baseline;
            gap: 10px;
            margin-bottom: 5px;
        }
        .username {
            font-weight: 600;
            color: #00ff00;
        }
        .timestamp {
            font-size: 12px;
            color: #949ba4;
        }
        .message-text {
            color: #dbdee1;
            line-height: 1.5;
            word-wrap: break-word;
        }
        .footer {
            background: #1e1f22;
            padding: 20px 30px;
            text-align: center;
            color: #949ba4;
            font-size: 12px;
        }
        .users-list {
            margin-top: 20px;
            padding: 20px;
            background: #2b2d31;
            border-radius: 4px;
        }
        .users-list h3 {
            margin-bottom: 10px;
            color: #00ff00;
        }
        .user-item {
            padding: 5px 0;
            color: #b5bac1;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎫 Ticket #${ticket.ticket_number} - ${ticket.username}</h1>
            <div class="info">
                <div class="info-item">
                    <div class="info-label">Ticket Owner</div>
                    <div class="info-value">${ticket.username}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Ticket Type</div>
                    <div class="info-value">${ticket.ticket_type}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">In-Game Name</div>
                    <div class="info-value">${ticket.in_game_name || 'N/A'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Status</div>
                    <div class="info-value">${ticket.status === 'closed' ? '🏁 Closed' : '🟩 Open'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Created</div>
                    <div class="info-value">${new Date(ticket.created_at).toLocaleString()}</div>
                </div>
                ${ticket.closed_at ? `
                <div class="info-item">
                    <div class="info-label">Closed</div>
                    <div class="info-value">${new Date(ticket.closed_at).toLocaleString()}</div>
                </div>
                ` : ''}
            </div>
        </div>
        
        <div class="messages">
            <h2 style="margin-bottom: 20px; color: #00ff00;">💬 Conversation</h2>
            ${messages.map(msg => `
            <div class="message">
                <div class="avatar">${msg.username.substring(0, 2).toUpperCase()}</div>
                <div class="message-content">
                    <div class="message-header">
                        <span class="username">${msg.username}</span>
                        <span class="timestamp">${new Date(msg.sent_at).toLocaleString()}</span>
                    </div>
                    <div class="message-text">${this.escapeHtml(msg.content)}</div>
                </div>
            </div>
            `).join('')}
        </div>

        <div class="users-list">
            <h3>👥 Participants (${users.size})</h3>
            ${Array.from(users.entries()).map(([userId, data]) => `
            <div class="user-item">${data.count} messages - ${data.username}</div>
            `).join('')}
        </div>

        <div class="footer">
            <p>Transcript generated by SEED Ticket System</p>
            <p>Ticket ID: ${ticket.id} | Generated: ${new Date().toLocaleString()}</p>
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

            // In a production environment, you would upload this to a CDN or file hosting service
            // For now, we'll return a local file path that can be accessed via web server
            const transcriptUrl = `file://${filepath}`;

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

