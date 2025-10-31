const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const commands = [];
const commandsPath = path.join(__dirname, 'src', 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

// Load all command files
for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    try {
        const command = require(filePath);
        
        if ('data' in command && 'execute' in command) {
            commands.push(command.data.toJSON());
            console.log(`✅ Loaded command: ${command.data.name}`);
        } else {
            console.log(`⚠️ Command at ${filePath} is missing required "data" or "execute" property.`);
        }
    } catch (error) {
        console.log(`❌ Failed to load command ${file}:`, error.message);
    }
}

// Construct and prepare an instance of the REST module
const rest = new REST().setToken(process.env.DISCORD_TOKEN);

// Deploy commands
(async () => {
    try {
        console.log(`\n📦 Prepared ${commands.length} commands for deployment`);
        console.log(`🚀 Started refreshing application (/) commands...`);

        // Deploy commands to specific guild (server)
        const data = await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
            { body: commands },
        );

        console.log(`✅ Successfully reloaded ${data.length} application (/) commands.`);
        console.log('🎉 Commands deployed successfully!');
        console.log('\n📋 Registered Commands:');
        data.forEach((cmd, index) => {
            console.log(`   ${index + 1}. ${cmd.name} - ${cmd.description}`);
        });
        
    } catch (error) {
        console.error('❌ Error deploying commands:', error);
        if (error.response && error.response.data) {
            console.error('Discord API Error Details:', JSON.stringify(error.response.data, null, 2));
        }
    }
})();
