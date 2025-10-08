# 🎫 Complete Ticket System Guide

## What You'll Get

✅ **Beautiful HTML Transcripts** - Black & green themed, professional design  
✅ **5 Ticket Types** - Different buttons for different issues  
✅ **Modal Questions** - In-game name + issue description  
✅ **Private Channels** - User + admin role only  
✅ **Auto Transcripts** - Saved externally as HTML with clickable link  
✅ **Message Logging** - Every message saved in database  
✅ **1-Minute Close** - Channel deleted after countdown  
✅ **Status Indicators** - 🟩 active, 🏁 closed  
✅ **Transcript Channel** - Admin review with full conversation  

## Installation Steps

### 1. Create Database Tables

```bash
cd ~/Seedling
node create-ticket-tables.js
```

### 2. Add Environment Variables

Add these to your `.env` file:

```bash
nano .env
```

Add:
```env
SERVER_IP=34.141.211.185
TRANSCRIPT_PORT=3002
```

### 3. Start Transcript Server

```bash
pm2 start ecosystem.config.js
pm2 save
```

This starts 3 services:
- `seedy-discord-bot` (port: Discord)
- `seedy-api-server` (port: 3001)
- `seedy-transcript-server` (port: 3002) **← NEW**

### 4. Deploy Commands

```bash
node deploy-commands.js
```

### 5. Restart Everything

```bash
pm2 restart all
```

## Setup in Discord

### 1. Create Ticket Panel

```
/setup-ticket
  channel: #create-ticket
  role: @Support Team
  heading: 🎫 SEED Support System
  description: Click a button below to create a support ticket
```

### 2. Set Transcript Channel

```
/chan-set
  channel: #ticket-transcripts
  channel_type: Ticket Transcripts
```

## Ticket Types (5 Buttons)

1. **🌱 Seedy's Support Ticket** (Green)
2. **⚠️ Rule-breaking Ticket** (Red)
3. **💰 Real Money Seed Shop Errors** (Blue)
4. **🛒 Ingame Shop Errors** (Blue)
5. **⚖️ Dispute resolution Ticket** (Gray)

## How It Works

### User Creates Ticket

1. Click a ticket type button
2. Modal appears with 2 questions:
   - **"What's your in-game name?"**
   - **"How can we help?"**
3. Fill out and submit
4. Private channel created: `🟩ticket-1-username`
5. Green embed posted with:
   - Ticket info
   - In-game name
   - Issue description
   - Close button
6. Admin role gets pinged
7. All messages automatically logged to database

### Closing a Ticket

**Option 1: Use Command**
```
/ticket-close
```

**Option 2: Click Button**
Click the "🔒 Close Ticket" button on the ticket embed

**What Happens:**
1. Channel renamed: `🟩ticket-1` → `🏁ticket-1`
2. Message sent: "🔒 Ticket will close in 1 minute"
3. Bot generates HTML transcript
4. Bot saves to `Seedy/transcripts/ticket-1-username.html`
5. Bot posts transcript to transcript channel with:
   - Header embed (ticket info, users)
   - Full conversation in green/black code blocks
   - Footer with "View Full HTML Transcript" button
6. After 1 minute, channel is deleted

## Transcript Features

### In Discord

**Header Embed (Green):**
```
📜 username - Ticket #1
TICKET BACKUP COPY

👤 Ticket Owner: @user
🎫 Ticket Number: #1
📝 Ticket Type: Seedy's Support Ticket
🎮 In-Game Name: Player123
💬 Messages: 15
👥 Participants: 3

📊 Users in transcript:
10 - @Admin
3 - @User
2 - @Moderator
```

**Conversation (ANSI Green/Black):**
```ansi
[03:45 PM] Admin: Hello! How can I help you today?
[03:46 PM] User: I can't access the shop
[03:47 PM] Admin: Let me check that for you
[03:48 PM] User: Thank you!
[03:49 PM] Admin: Fixed! Try now
```

**Footer Embed (Green):**
```
✅ END OF TRANSCRIPT
Ticket: closed-1-username

[📄 View Full HTML Transcript] ← Clickable button
```

### HTML Transcript

**Theme:** Black background with green accents  
**Features:**
- 🎨 Professional gradient header (green)
- 📊 Ticket stats cards
- 💬 Message blocks with avatars
- 🕐 Timestamps on each message
- 👥 Participant cards with message counts
- 📈 Stats footer (messages, users, ticket ID)
- ✨ Hover effects and animations
- 📱 Mobile responsive

**Accessible at:**
`http://34.141.211.185:3002/ticket-1-username.html`

## Commands

### `/setup-ticket`
**Who:** Administrators only  
**Purpose:** Create the ticket panel  
**Options:**
- `channel` - Where to post the panel
- `role` - Admin role for ticket access
- `heading` - Panel title
- `description` - Panel description

### `/ticket-close`
**Who:** Anyone in ticket channel  
**Purpose:** Close the current ticket  
**No options required**

### `/chan-set`
**Who:** Administrators only  
**Purpose:** Configure channels  
**Options:**
- `channel` - The channel
- `channel_type` - Ticket Transcripts / Payment Logs / Audit Logs

## File Structure

```
Seedy/
├── migrations/
│   └── create-ticket-tables.sql
├── create-ticket-tables.js
├── setup-transcript-server.js ← HTTP server for transcripts
├── ecosystem.config.js ← Updated with transcript server
├── .env ← Add SERVER_IP and TRANSCRIPT_PORT
├── transcripts/ ← Auto-created, stores HTML files
│   └── ticket-1-username.html
├── src/
│   ├── services/
│   │   ├── TicketService.js
│   │   └── TranscriptService.js
│   └── commands/
│       ├── setup-ticket.js
│       ├── ticket-close.js
│       └── chan-set.js
```

## Accessing Transcripts

### Via Discord Button
Click "📄 View Full HTML Transcript" in the transcript channel

### Via Direct Link
`http://34.141.211.185:3002/ticket-NUMBER-username.html`

### Via File System
```bash
cd ~/Seedling/transcripts
ls -la
cat ticket-1-username.html
```

### Download to Local Computer
```bash
scp zanderdewet191@seed-discord-bot:~/Seedling/transcripts/ticket-1-username.html .
```

## Permissions

**Bot Needs:**
- Manage Channels (create/delete/rename)
- Manage Roles (set permissions)
- View Channels
- Send Messages
- Embed Links
- Read Message History
- Manage Messages

**Admin Role Gets:**
- View ticket channels
- Send messages
- Manage messages
- Access transcripts

## Troubleshooting

### Transcript button says "Disabled"
Your `.env` needs:
```env
SERVER_IP=34.141.211.185
TRANSCRIPT_PORT=3002
```

Then restart:
```bash
pm2 restart all
```

### Can't access transcript URL
Make sure transcript server is running:
```bash
pm2 status
```

Should show `seedy-transcript-server` as online.

### No transcripts in channel
1. Check `/chan-set` was used to set transcript channel
2. Check channel still exists
3. Check bot has Send Messages permission
4. Check logs: `pm2 logs seedy-discord-bot`

### Messages not logged
Check database:
```sql
SELECT * FROM ticket_messages WHERE ticket_id = X;
```

## Success! 🎉

Your ticket system is complete with:
- ✅ Beautiful black & green HTML transcripts
- ✅ Full conversation history
- ✅ Clickable links in Discord
- ✅ Professional design
- ✅ Message-by-message viewing

**Transcript URL:** `http://YOUR_SERVER_IP:3002/ticket-NUMBER-username.html`

