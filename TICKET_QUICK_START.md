# 🎫 Ticket System - Quick Start

## Setup (Run Once)

```bash
# 1. Create database tables
cd ~/Seedling
node create-ticket-tables.js

# 2. Deploy commands
node deploy-commands.js

# 3. Restart bot
pm2 restart seedy-discord-bot
```

## Configure

### 1. Set up ticket panel:
```
/setup-ticket
  channel: #create-ticket
  role: @Support Team
  heading: 🎫 SEED Support System
  description: Click a button below to create a support ticket
```

### 2. Set transcript channel:
```
/chan-set
  channel: #ticket-transcripts
  channel_type: Ticket Transcripts
```

## Ticket Types (5 Buttons)

1. 🌱 **Seedy's Support Ticket** - General support
2. ⚠️ **Rule-breaking Ticket** - Report violations
3. 💰 **Real Money Seed Shop Errors** - Purchase issues
4. 🛒 **Ingame Shop Errors** - In-game problems
5. ⚖️ **Dispute resolution Ticket** - Resolve disputes

## How Users Create Tickets

1. Click a ticket button
2. Fill modal (IGN + Issue description)
3. Private channel created: `🟩ticket-123-username`
4. Admin role gets pinged
5. Support helps user
6. Close with button or `/ticket-close`
7. Channel deleted after 1 minute
8. Transcript saved

## Close Ticket

**In ticket channel:**
```
/ticket-close
```

OR click the "Close Ticket" button

**What happens:**
- 🏁 Channel renamed (closed status)
- ⏰ 1 minute countdown
- 📜 Transcript generated
- 📤 Sent to transcript channel
- 🗑️ Channel deleted

## Transcript Info

**Saved to:** `Seedy/transcripts/ticket-123-username.html`

**Includes:**
- Full conversation
- Timestamps
- Participant list
- Ticket details

**Posted to transcript channel with:**
- Ticket owner
- Ticket number
- Message count
- User list
- View button (when hosted)

## Features

✅ Modal input (IGN + description)  
✅ Private channels  
✅ Auto permissions  
✅ Close button  
✅ 1-minute deletion  
✅ Full transcripts  
✅ Status indicators (🟩/🏁)  
✅ Green embeds  
✅ Admin role ping  

## Troubleshooting

```bash
# View logs
pm2 logs seedy-discord-bot

# Redeploy commands
node deploy-commands.js

# Restart
pm2 restart seedy-discord-bot
```

That's it! Your ticket system is ready! 🎉

