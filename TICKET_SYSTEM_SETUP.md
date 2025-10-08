# 🎫 Ticket System Setup Guide

## Overview
A comprehensive ticket system with modal inputs, automatic transcript generation, and admin management.

## Features
✅ 5 Different ticket types with custom buttons  
✅ Modal popup asking for in-game name and issue description  
✅ Private ticket channels with proper permissions  
✅ Automatic category creation  
✅ Close button on every ticket  
✅ 1-minute countdown before deletion  
✅ Full conversation transcripts (HTML format)  
✅ Transcript channel for admin review  
✅ Channel status indicators (🟩 active, 🏁 closed)  
✅ Message logging for transcripts  
✅ Green themed embeds  

## Installation

### 1. Create Database Tables

```bash
cd ~/Seedling
node create-ticket-tables.js
```

This creates:
- `ticket_panels` - Panel configurations
- `tickets` - Ticket information
- `ticket_messages` - Message logs for transcripts
- `channel_settings` - Channel configurations

### 2. Deploy Commands

```bash
node deploy-commands.js
```

Registers:
- `/setup-ticket` - Set up the ticket panel
- `/ticket-close` - Close a ticket
- `/chan-set` - Configure channels

### 3. Restart Bot

```bash
pm2 restart seedy-discord-bot
```

## Commands

### `/setup-ticket`
Creates the ticket panel with 5 buttons.

**Options:**
- `channel` - Where to post the ticket panel
- `role` - Admin role that can view/manage tickets
- `heading` - Panel title
- `description` - Panel description

**Example:**
```
/setup-ticket
channel: #create-ticket
role: @Support Team
heading: 🎫 SEED Support System
description: Click a button below to create a support ticket
```

### `/ticket-close`
Closes the current ticket (use in ticket channel).

**What happens:**
1. Channel renamed to 🏁ticket-X-username
2. "Closing in 1 minute" message sent
3. Transcript generated
4. Transcript sent to configured channel
5. Channel deleted after 1 minute

### `/chan-set`
Configure channels for different purposes.

**Options:**
- `channel` - The channel to configure
- `channel_type` - What it's for (Ticket Transcripts, Payment Logs, Audit Logs)

**Example:**
```
/chan-set
channel: #ticket-transcripts
channel_type: Ticket Transcripts
```

## Ticket Types

The system includes 5 ticket button types:

1. **🌱 Seedy's Support Ticket** - General support (Green button)
2. **⚠️ Rule-breaking Ticket** - Report violations (Red button)
3. **💰 Real Money Seed Shop Errors** - Shop purchase issues (Blue button)
4. **🛒 Ingame Shop Errors** - In-game shop problems (Blue button)
5. **⚖️ Dispute resolution Ticket** - Resolve disputes (Gray button)

## How It Works

### Creating a Ticket

1. User clicks a ticket type button
2. Modal pops up with 2 questions:
   - "What's your in-game name?"
   - "How can we help?"
3. User fills out and submits
4. Bot creates private channel: `🟩ticket-123-username`
5. Bot posts green embed with:
   - Ticket number
   - Ticket type
   - In-game name
   - Help description
   - Close button
6. Bot pings user and admin role

### Ticket Channel Permissions

**User can:**
- View channel
- Send messages
- Read history
- Attach files

**Admin role can:**
- View channel
- Send messages
- Read history
- Attach files
- Manage messages

**Everyone else:**
- Cannot see the channel

### Message Logging

- Every message in a ticket channel is automatically logged
- Logs include:
  - User ID
  - Username
  - Message content
  - Timestamp

### Closing Process

1. User or admin clicks "Close Ticket" button (or uses `/ticket-close`)
2. Channel renamed: `🟩ticket-123` → `🏁ticket-123`
3. Bot sends: "🔒 Ticket Closing - Will delete in 1 minute"
4. Bot generates HTML transcript
5. Bot sends transcript to configured channel
6. After 1 minute, channel is deleted

### Transcript Generation

Transcripts are saved as HTML files in `Seedy/transcripts/` folder.

**Transcript includes:**
- Ticket owner
- Ticket type
- In-game name
- Status (open/closed)
- Created/closed timestamps
- Full conversation with timestamps
- Participant list with message counts

**Transcript Embed sent to channel:**
```
📜 username#0
TICKET BACKUP COPY

Ticket Owner: @user
Ticket Number: #123
Ticket Name: closed-123-username
Panel Name: Seedy's Support Ticket
Message Count: 42 messages
Participants: 3 users

Users in transcript:
15 - @User
12 - @Admin
10 - @Moderator

[View Transcript Button]
```

## File Structure

```
Seedy/
├── migrations/
│   └── create-ticket-tables.sql
├── create-ticket-tables.js
├── src/
│   ├── services/
│   │   ├── TicketService.js
│   │   └── TranscriptService.js
│   └── commands/
│       ├── setup-ticket.js
│       ├── ticket-close.js
│       └── chan-set.js
└── transcripts/  (created automatically)
    └── ticket-123-username.html
```

## Permissions Required

**Bot Permissions:**
- Manage Channels (create/delete ticket channels)
- Manage Roles (set channel permissions)
- View Channels
- Send Messages
- Embed Links
- Attach Files
- Read Message History
- Manage Messages

**User Permissions:**
- `/setup-ticket` - Administrator
- `/chan-set` - Administrator
- `/ticket-close` - Anyone in ticket channel

## Customization

### Change Ticket Types

Edit `Seedy/src/services/TicketService.js` around line 40:

```javascript
const row1 = new ActionRowBuilder()
    .addComponents(
        new ButtonBuilder()
            .setCustomId('ticket_YOUR_TYPE')
            .setLabel('Your Ticket Type')
            .setEmoji('🎯')
            .setStyle(ButtonStyle.Success)
    );
```

Also update the button handlers in `Seedy/src/index.js` around line 939.

### Change Colors

Embeds use green color (`0x00ff00`). To change:
- Edit `TicketService.js` embed colors
- Edit `TranscriptService.js` HTML template colors

### Change Transcript Storage

By default, transcripts are saved locally to `Seedy/transcripts/`.

To use external hosting:
1. Set up a web server or CDN
2. Modify `TranscriptService.js` `createTranscript()` method
3. Upload HTML files to your hosting
4. Return public URL instead of file path

## Troubleshooting

### Commands not showing
```bash
node deploy-commands.js
pm2 restart seedy-discord-bot
```

### Ticket panel not posting
- Check bot has Send Messages permission in channel
- Check bot has Embed Links permission
- Verify admin role exists

### Tickets not creating
- Check bot has Manage Channels permission
- Check bot has Manage Roles permission
- Verify database tables exist

### Transcripts not sent
- Use `/chan-set` to configure transcript channel
- Check bot has permissions in transcript channel
- Check `Seedy/transcripts/` directory exists

### Check logs
```bash
pm2 logs seedy-discord-bot
```

## Database Schema

### ticket_panels
```sql
id, guild_id, channel_id, message_id, admin_role_id, 
heading, description, category_id, created_at, updated_at
```

### tickets
```sql
id, ticket_number, guild_id, channel_id, user_id, username,
ticket_type, in_game_name, description, admin_role_id, status,
transcript_url, created_at, closed_at, closed_by
```

### ticket_messages
```sql
id, ticket_id, user_id, username, content, sent_at
```

### channel_settings
```sql
id, guild_id, channel_type, channel_id, created_at, updated_at
```

## Example Workflow

1. **Admin Setup:**
   ```
   /setup-ticket #create-ticket @Support "Support System" "Click to get help"
   /chan-set #transcripts ticket_transcripts
   ```

2. **User Creates Ticket:**
   - Clicks "Seedy's Support Ticket" button
   - Fills modal: IGN="Player123", Issue="Can't access shop"
   - New channel created: `🟩ticket-1-player123`

3. **Support Helps User:**
   - Admin and user chat in ticket channel
   - All messages logged automatically

4. **Close Ticket:**
   - Admin clicks "Close Ticket" button
   - Channel renamed: `🏁ticket-1-player123`
   - Countdown: "Closing in 1 minute"
   - Transcript generated
   - Posted to #transcripts
   - Channel deleted

## Success! 🎉

Your ticket system is now fully functional and ready to use!

**Key Features:**
- ✅ Professional ticket management
- ✅ Automatic transcripts
- ✅ Admin-only access
- ✅ Clean organization
- ✅ Full conversation history

Perfect for managing support, reports, and disputes in your Discord server!

