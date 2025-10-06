const natural = require('natural');

class ZORPHelpService {
    constructor() {
        this.zorpKnowledge = this.initializeZORPKnowledge();
        this.tokenizer = new natural.WordTokenizer();
        this.stemmer = natural.PorterStemmer;
    }

    initializeZORPKnowledge() {
        return {
            'setup': {
                keywords: ['setup', 'install', 'installation', 'configure', 'configuration', 'start', 'begin'],
                content: `🌱 **ZORP Setup Guide**

**1. Installation:**
\`\`\`bash
npm install zorp-discord-bot
\`\`\`

**2. Basic Configuration:**
\`\`\`javascript
const { ZORP } = require('zorp-discord-bot');

const bot = new ZORP({
    token: 'YOUR_DISCORD_TOKEN',
    prefix: '!',
    ownerId: 'YOUR_USER_ID'
});
\`\`\`

**3. Starting the Bot:**
\`\`\`javascript
bot.start().then(() => {
    console.log('ZORP bot is online!');
});
\`\`\`

Need more help? Check our documentation: [ZORP Docs](https://zorp-docs.example.com)`,
                priority: 10
            },
            'commands': {
                keywords: ['command', 'commands', 'slash', 'interaction', 'create', 'add'],
                content: `🎮 **ZORP Commands**

**Creating Commands:**
\`\`\`javascript
bot.command('ping', (ctx) => {
    ctx.reply('Pong!');
});
\`\`\`

**Slash Commands:**
\`\`\`javascript
bot.slashCommand('ping', 'Ping the bot', (interaction) => {
    interaction.reply('Pong!');
});
\`\`\`

**Command with Arguments:**
\`\`\`javascript
bot.command('say <message>', (ctx) => {
    ctx.reply(ctx.args.message);
});
\`\`\`

**Command Categories:**
\`\`\`javascript
bot.category('utility', 'Utility commands');
bot.command('help <command>', { category: 'utility' }, (ctx) => {
    // Help logic
});
\`\`\``,
                priority: 9
            },
            'events': {
                keywords: ['event', 'events', 'listener', 'on', 'message', 'ready', 'join'],
                content: `📡 **ZORP Events**

**Message Events:**
\`\`\`javascript
bot.on('messageCreate', (message) => {
    console.log('New message:', message.content);
});
\`\`\`

**Member Events:**
\`\`\`javascript
bot.on('guildMemberAdd', (member) => {
    member.guild.channels.cache.get('WELCOME_CHANNEL_ID')
        .send(\`Welcome \${member.user.username}!\`);
});
\`\`\`

**Custom Events:**
\`\`\`javascript
bot.emit('customEvent', data);
bot.on('customEvent', (data) => {
    console.log('Custom event received:', data);
});
\`\`\``,
                priority: 8
            },
            'database': {
                keywords: ['database', 'db', 'sqlite', 'mysql', 'mongodb', 'data', 'store'],
                content: `💾 **ZORP Database**

**SQLite (Default):**
\`\`\`javascript
const user = await bot.db.get('users', { id: userId });
await bot.db.set('users', { id: userId, level: 5 });
\`\`\`

**Custom Database:**
\`\`\`javascript
bot.setDatabase(new CustomDatabase());
\`\`\`

**Database Models:**
\`\`\`javascript
bot.model('User', {
    id: 'TEXT PRIMARY KEY',
    level: 'INTEGER DEFAULT 1',
    xp: 'INTEGER DEFAULT 0'
});
\`\`\``,
                priority: 7
            },
            'permissions': {
                keywords: ['permission', 'permissions', 'role', 'admin', 'access'],
                content: `🔐 **ZORP Permissions**

**Role-based Permissions:**
\`\`\`javascript
bot.command('admin', { permissions: ['ADMINISTRATOR'] }, (ctx) => {
    ctx.reply('Admin command executed!');
});
\`\`\`

**Custom Permission Check:**
\`\`\`javascript
bot.command('utility', { 
    permissions: (member) => member.roles.cache.has('UTILITY_ROLE_ID')
}, (ctx) => {
    ctx.reply('Utility command!');
});
\`\`\`

**User-specific Permissions:**
\`\`\`javascript
bot.command('owner', { permissions: [process.env.OWNER_ID] }, (ctx) => {
    ctx.reply('Owner-only command!');
});
\`\`\``,
                priority: 6
            },
            'errors': {
                keywords: ['error', 'errors', 'bug', 'issue', 'problem', 'troubleshoot', 'fix'],
                content: `🐛 **ZORP Troubleshooting**

**Common Issues:**

1. **Bot not responding:**
   - Check your token is correct
   - Ensure bot has proper permissions
   - Verify intents are enabled

2. **Commands not working:**
   - Check command syntax
   - Verify permissions
   - Look at console for errors

3. **Database errors:**
   - Ensure database file permissions
   - Check connection strings
   - Verify table schemas

**Debug Mode:**
\`\`\`javascript
const bot = new ZORP({
    token: 'YOUR_TOKEN',
    debug: true
});
\`\`\`

**Error Handling:**
\`\`\`javascript
bot.on('error', (error) => {
    console.error('Bot error:', error);
});
\`\`\``,
                priority: 5
            }
        };
    }

    async searchZORPHelp(question) {
        const questionLower = question.toLowerCase();
        const tokens = this.tokenizer.tokenize(questionLower);
        const stemmedTokens = tokens.map(token => this.stemmer.stem(token));

        let bestMatch = null;
        let bestScore = 0;

        // Search through ZORP knowledge base
        for (const [topic, data] of Object.entries(this.zorpKnowledge)) {
            let score = 0;

            // Check keyword matches
            for (const keyword of data.keywords) {
                if (questionLower.includes(keyword)) {
                    score += 2;
                }
                
                // Check stemmed matches
                const stemmedKeyword = this.stemmer.stem(keyword);
                if (stemmedTokens.includes(stemmedKeyword)) {
                    score += 1;
                }
            }

            // Boost score for exact topic matches
            if (questionLower.includes(topic)) {
                score += 3;
            }

            // Apply priority multiplier
            score *= data.priority;

            if (score > bestScore) {
                bestScore = score;
                bestMatch = data;
            }
        }

        // Return help if we found a good match
        if (bestMatch && bestScore > 5) {
            return bestMatch.content;
        }

        // Check for general ZORP mentions
        if (this.isZORPRelated(question)) {
            return this.getGeneralZORPHelp();
        }

        return null; // No ZORP-related help found
    }

    isZORPRelated(question) {
        const zorpKeywords = [
            'zorp', 'bot', 'discord bot', 'discord.js', 'framework',
            'discord api', 'bot development', 'discord development'
        ];

        const questionLower = question.toLowerCase();
        return zorpKeywords.some(keyword => questionLower.includes(keyword));
    }

    getGeneralZORPHelp() {
        return `🌱 **Welcome to ZORP Help!**

ZORP is a powerful Discord bot framework that makes bot development easy and fun!

**Quick Start:**
- \`!zorp setup\` - Get setup instructions
- \`!zorp commands\` - Learn about commands
- \`!zorp events\` - Understand event handling
- \`!zorp database\` - Database integration
- \`!zorp permissions\` - Permission system

**Need more help?**
- 📚 [ZORP Documentation](https://zorp-docs.example.com)
- 💬 Ask in our support channel
- 🐛 Report issues on GitHub

Just ask me about any ZORP topic and I'll help you out! 🎮`;
    }

    // Method to add custom ZORP knowledge
    addZORPKnowledge(topic, keywords, content, priority = 5) {
        this.zorpKnowledge[topic] = {
            keywords: keywords,
            content: content,
            priority: priority
        };
    }

    // Method to get all available ZORP topics
    getZORPTopics() {
        return Object.keys(this.zorpKnowledge);
    }
}

module.exports = ZORPHelpService;
