# 🎉 Giveaway System Setup Guide

## Overview
A comprehensive giveaway system with modal inputs, button interactions, automatic winner selection using cryptographically secure random number generation, and Discord DM notifications.

## Features
✅ Interactive modal for creating giveaways  
✅ Automatic winner selection with cryptographically secure randomness  
✅ DM notifications to winners and entrants  
✅ Support for multiple winners  
✅ Flexible time formats (minutes, hours, days)  
✅ Automatic giveaway ending and winner announcement  
✅ Early close and reroll functionality  
✅ Entry tracking and live updates  
✅ Beautiful green embeds  

## Installation Steps

### 1. Create Database Tables

Run the migration script to create the necessary database tables:

```bash
cd ~/Seedling
node create-giveaway-tables.js
```

This will create three tables:
- `giveaways` - Stores giveaway information
- `giveaway_entries` - Stores user entries
- `giveaway_winners` - Stores winners

### 2. Deploy Commands

The new commands need to be registered with Discord:

```bash
node deploy-commands.js
```

This will register:
- `/g-create` - Create a new giveaway
- `/g-close` - Close an active giveaway early
- `/g-reroll` - Reroll winners for a giveaway

### 3. Restart the Bot

```bash
pm2 restart seedy-discord-bot
```

## Commands

### `/g-create`
Creates a new giveaway with an interactive modal.

**Modal Fields:**
- **Giveaway Name**: The title of your giveaway (e.g., "Elite Kit Giveaway")
- **Description**: What you're giving away (e.g., "5x Elite Kits for SEED PvE Server")
- **Max Winners**: How many winners to pick (e.g., 1, 5, 10)
- **Time**: When the giveaway ends
  - `1m` = 1 minute
  - `30m` = 30 minutes
  - `1h` = 1 hour
  - `12h` = 12 hours
  - `1d` = 1 day
  - `7d` = 7 days

**What Happens:**
1. You fill out the modal
2. Bot creates a green embed in the current channel
3. Users click the 🌱 button to enter
4. Bot sends DM confirmation to each entrant
5. When time expires, bot picks random winners
6. Winners get DM notifications
7. Announcement posted in giveaway channel

### `/g-close <giveaway_name>`
Ends an active giveaway early.

**Usage:**
1. Type `/g-close` and start typing the giveaway name
2. Autocomplete will show active giveaways
3. Select the giveaway to close
4. Bot immediately picks winners and announces them

### `/g-reroll <giveaway_name>`
Picks new winners for an ended giveaway.

**Usage:**
1. Type `/g-reroll` and start typing the giveaway name
2. Autocomplete will show ended giveaways
3. Select the giveaway to reroll
4. Bot picks new random winners and announces them
5. New winners get DM notifications

## How It Works

### Entry Process
1. User clicks the 🌱 button on giveaway embed
2. Bot checks if giveaway is active
3. Bot checks if user already entered
4. Bot adds entry to database
5. Bot updates embed with new entry count
6. Bot sends confirmation DM to user:
   ```
   🎉 Successfully Entered!
   Hello {Username},
   
   You successfully entered the giveaway for {Giveaway Name}
   ```

### Winner Selection
- Uses `crypto.randomBytes()` for cryptographically secure random number generation
- Truly random and fair selection
- No duplicates - each user can only win once per giveaway
- Respects max_winners setting

### Automatic Ending
- Bot schedules timer when giveaway is created
- When time expires, bot automatically:
  1. Marks giveaway as ended
  2. Picks random winners
  3. Saves winners to database
  4. Sends DM to each winner
  5. Posts announcement in giveaway channel
  6. Updates original embed to show winners

### Bot Restart Handling
- On bot startup, loads all active giveaways
- Reschedules timers for each active giveaway
- If giveaway time has passed, ends immediately

## Database Schema

### giveaways
```sql
id INT AUTO_INCREMENT PRIMARY KEY
giveaway_name VARCHAR(255) - Name of the giveaway
description TEXT - What's being given away
max_winners INT - Number of winners to pick
channel_id VARCHAR(255) - Channel where giveaway is posted
message_id VARCHAR(255) - Message ID of giveaway embed
guild_id VARCHAR(255) - Server ID
creator_id VARCHAR(255) - User who created it
end_time DATETIME - When giveaway ends
status ENUM('active', 'ended', 'cancelled')
created_at DATETIME
updated_at DATETIME
```

### giveaway_entries
```sql
id INT AUTO_INCREMENT PRIMARY KEY
giveaway_id INT - References giveaway
user_id VARCHAR(255) - Discord user ID
username VARCHAR(255) - Discord username
entered_at DATETIME - When they entered
```

### giveaway_winners
```sql
id INT AUTO_INCREMENT PRIMARY KEY
giveaway_id INT - References giveaway
user_id VARCHAR(255) - Discord user ID
username VARCHAR(255) - Discord username
won_at DATETIME - When they won
notified BOOLEAN - Whether DM was sent
```

## Example Usage

### Creating a Simple Giveaway
```
/g-create
Name: Elite Kit Giveaway
Description: Win 1x Elite Kit for SEED PvE
Max Winners: 1
Time: 1d
```

### Creating a Multi-Winner Giveaway
```
/g-create
Name: Community Appreciation
Description: 10x Players get 1000 in-game coins
Max Winners: 10
Time: 3d
```

### Short Duration Giveaway
```
/g-create
Name: First 5 to Enter
Description: Quick giveaway for active members
Max Winners: 5
Time: 5m
```

## Features in Detail

### Green Embeds
All giveaway embeds use green color (#00ff00) for consistency:
- Giveaway creation confirmation
- Active giveaway embed
- Entry confirmation DM
- Winner announcement
- Winner notification DM

### Entry Button
- Emoji: 🌱 (seed)
- Label: "Enter Giveaway"
- Style: Success (green)
- Disabled when giveaway ends

### DM Notifications

**Entry Confirmation:**
```
🎉 Successfully Entered!

Hello {Username},

You successfully entered the giveaway for {Giveaway Name}

🎁 Prize: {Description}
```

**Winner Notification:**
```
🎉 Congratulations! You Won!

Hello {Username},

You won the giveaway: {Giveaway Name}

🎁 Prize: {Description}
```

**Reroll Winner Notification:**
```
🎉 Congratulations! You Won! (Reroll)

Hello {Username},

You won the rerolled giveaway: {Giveaway Name}

🎁 Prize: {Description}
```

### Channel Announcements

**Winner Announcement:**
```
🎉 Giveaway Ended: {Giveaway Name}

Winners:
@User1, @User2, @User3

🎁 Prize: {Description}

Congratulations to all winners!
```

**No Entries:**
```
🎉 Giveaway Ended: {Giveaway Name}

No winners could be determined as there were no valid entries.

Better luck next time!
```

## Permissions

### Required Bot Permissions
- Send Messages
- Embed Links
- Add Reactions
- Use External Emojis
- Read Message History

### Required User Permissions
- `/g-create`: Administrator
- `/g-close`: Administrator
- `/g-reroll`: Administrator

### User Requirements for Entering
- Must have DMs enabled (for confirmation)
- Must be in the server
- Can only enter once per giveaway

## Troubleshooting

### Bot not responding to /g-create
1. Check if commands are deployed: `node deploy-commands.js`
2. Restart bot: `pm2 restart seedy-discord-bot`
3. Check bot has Administrator permission

### Giveaway not ending automatically
1. Check bot is running: `pm2 status`
2. Check server time matches bot time
3. Check database connection
4. Restart bot to reload active giveaways

### Users not receiving DMs
1. User must have DMs enabled from server members
2. User must not have bot blocked
3. Check bot has Send Messages permission

### Entry button not working
1. Check database connection
2. Check giveaway is still active
3. Check user hasn't already entered
4. Check bot logs: `pm2 logs seedy-discord-bot`

### Winners not announced
1. Check bot has Send Messages permission in channel
2. Check there were entries in giveaway
3. Check database for winners: 
   ```sql
   SELECT * FROM giveaway_winners WHERE giveaway_id = X;
   ```

## Files Created

- `Seedy/migrations/create-giveaway-tables.sql` - Database schema
- `Seedy/create-giveaway-tables.js` - Migration runner script
- `Seedy/src/services/GiveawayService.js` - Core giveaway logic
- `Seedy/src/commands/g-create.js` - Create command
- `Seedy/src/commands/g-close.js` - Close command
- `Seedy/src/commands/g-reroll.js` - Reroll command
- `Seedy/src/index.js` - Updated with giveaway handlers

## Security Features

✅ **Cryptographically Secure Random Selection**
- Uses `crypto.randomBytes()` for true randomness
- Not predictable or exploitable
- Fair for all participants

✅ **Entry Validation**
- Checks giveaway is active
- Prevents duplicate entries
- Validates user permissions

✅ **Database Constraints**
- Foreign key relationships
- Unique entry constraint
- Proper indexing for performance

✅ **Administrator Only**
- Only admins can create/close/reroll
- Prevents abuse

## Support

If you encounter any issues:
1. Check bot logs: `pm2 logs seedy-discord-bot`
2. Check database connection
3. Verify all commands are deployed
4. Restart the bot

## Success! 🎉

Your giveaway system is now fully functional and ready to use. Enjoy running awesome giveaways for your community!

