# Seedy Discord Bot

A comprehensive Discord bot with games, economy features, and website integration.

## Features

- 🎮 **Games**: Hangman, Tic-tac-toe, Connect 4, Battleship, Poker, Rummy, UNO
- 💰 **Economy**: Daily rewards, balance tracking, transactions
- 🛡️ **Moderation**: Warnings, profanity filter, invite blocking
- 📊 **Surveys**: Custom survey system with responses
- 🌐 **API**: REST API for website integration
- 🗄️ **Database**: MariaDB with full CRUD operations

## Prerequisites

- Node.js 16+ 
- MariaDB 10.3+
- PM2 (for production)

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/seedy-discord-bot.git
   cd seedy-discord-bot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up MariaDB**
   ```bash
   # Install MariaDB (Ubuntu/Debian)
   sudo apt update
   sudo apt install mariadb-server mariadb-client
   
   # Start and enable MariaDB
   sudo systemctl start mariadb
   sudo systemctl enable mariadb
   
   # Secure installation
   sudo mysql_secure_installation
   ```

4. **Create database and user**
   ```sql
   CREATE DATABASE seedy_discord_bot CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE USER 'seedy_bot'@'localhost' IDENTIFIED BY 'your_secure_password';
   GRANT ALL PRIVILEGES ON seedy_discord_bot.* TO 'seedy_bot'@'localhost';
   FLUSH PRIVILEGES;
   ```

5. **Configure environment**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

6. **Install PM2 globally**
   ```bash
   npm install -g pm2
   ```

## Configuration

Edit the `.env` file with your settings:

```env
# Discord Bot Configuration
DISCORD_TOKEN=your_discord_bot_token_here
CLIENT_ID=your_discord_client_id_here
GUILD_ID=your_guild_id_here

# MariaDB Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=seedy_bot
DB_PASSWORD=your_secure_password_here
DB_NAME=seedy_discord_bot

# API Configuration
API_PORT=3001
WEBSITE_URL=http://localhost:5173
```

## Running the Bot

### Development
```bash
# Run Discord bot only
npm run dev

# Run API server only
npm run api
```

### Production
```bash
# Start both services with PM2
pm2 start ecosystem.config.js

# View logs
pm2 logs

# Monitor
pm2 monit

# Restart services
pm2 restart all
```

## API Endpoints

The bot includes a REST API for website integration:

### Partners Management
- `GET /api/partners` - Get all partners
- `GET /api/partners/:id` - Get specific partner
- `POST /api/partners` - Create new partner
- `PUT /api/partners/:id` - Update partner
- `DELETE /api/partners/:id` - Delete partner

### Health Check
- `GET /health` - API health status

## Database Schema

The bot automatically creates the following tables:
- `users` - User economy data
- `transactions` - Transaction history
- `game_stats` - Game statistics
- `survey_config` - Survey configuration
- `survey_responses` - Survey responses
- `partners` - Partner management (for website)

## Discord Commands

- `/ping` - Test bot latency
- `/dbtest` - Test database connection
- `/balance` - Check user balance
- `/daily` - Claim daily reward
- `/leaderboard` - View economy leaderboard
- And many more game commands...

## Website Integration

The bot provides a REST API that can be consumed by your website for real-time data synchronization. The API includes CORS support and rate limiting for security.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For support, please open an issue on GitHub or contact the development team.