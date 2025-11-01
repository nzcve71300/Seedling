const { REST, Routes } = require('discord.js');
require('dotenv').config();

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log('🔍 Fetching registered commands from Discord...\n');
        
        // Get all guild commands
        const data = await rest.get(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID)
        );

        console.log(`✅ Found ${data.length} registered commands in Discord:\n`);
        
        data.forEach((cmd, index) => {
            console.log(`${index + 1}. ${cmd.name}`);
            console.log(`   Description: ${cmd.description}`);
            console.log(`   ID: ${cmd.id}`);
            if (cmd.default_member_permissions) {
                console.log(`   Permission Level: ${cmd.default_member_permissions}`);
            }
            console.log('');
        });

        console.log(`\n📊 Total: ${data.length} commands registered in your guild`);
        
    } catch (error) {
        console.error('❌ Error fetching commands:', error);
        if (error.response && error.response.data) {
            console.error('Discord API Error Details:', JSON.stringify(error.response.data, null, 2));
        }
    }
})();

