# 🎉 Giveaway System - Quick Start

## Setup (Run Once)

```bash
# 1. Create database tables
cd ~/Seedling
node create-giveaway-tables.js

# 2. Deploy commands to Discord
node deploy-commands.js

# 3. Restart bot
pm2 restart seedy-discord-bot
```

## Creating a Giveaway

1. Type `/g-create` in any channel
2. Fill out the modal:
   - **Name**: Elite Kit Giveaway
   - **Description**: Win 1x Elite Kit
   - **Winners**: 1
   - **Time**: 1d (1m=minutes, 1h=hours, 1d=days)
3. Click Submit
4. Bot posts giveaway with 🌱 button
5. Users click button to enter
6. Winners announced automatically when time expires

## Managing Giveaways

**End Early:**
```
/g-close <giveaway_name>
```

**Pick New Winners:**
```
/g-reroll <giveaway_name>
```

## Time Format Examples

- `5m` = 5 minutes
- `30m` = 30 minutes  
- `1h` = 1 hour
- `12h` = 12 hours
- `1d` = 1 day
- `7d` = 7 days

## What Users See

**Entry Confirmation DM:**
```
🎉 Successfully Entered!
Hello {User},
You successfully entered the giveaway for {Name}
```

**Winner DM:**
```
🎉 Congratulations! You Won!
Hello {User},
You won the giveaway: {Name}
```

## Features

✅ Modal input for easy creation  
✅ Live entry count updates  
✅ Automatic winner selection (super random)  
✅ DM notifications to winners  
✅ Support for multiple winners  
✅ Autocomplete for close/reroll commands  
✅ Beautiful green embeds  
✅ Entry tracking (no duplicates)  

## Troubleshooting

**Commands not showing:**
```bash
node deploy-commands.js
pm2 restart seedy-discord-bot
```

**Check bot status:**
```bash
pm2 status
pm2 logs seedy-discord-bot
```

That's it! Your giveaway system is ready to use! 🎉

