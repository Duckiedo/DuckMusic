const { SlashCommandBuilder } = require('@discordjs/builders');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const { clientId, token } = require('./config.json'); // No guildId needed for global commands

const commands = [
    new SlashCommandBuilder()
        .setName('play')
        .setDescription('Play a song')
        .addStringOption(option =>
            option.setName('query').setDescription('The song to play').setRequired(true)),
    new SlashCommandBuilder().setName('skip').setDescription('Skip the current song'),
    new SlashCommandBuilder().setName('stop').setDescription('Stop the music and clear the queue'),
    new SlashCommandBuilder().setName('help').setDescription('Displays information about the bot commands'),
    new SlashCommandBuilder().setName('stats').setDescription('Get stats about a user')
        .addUserOption(option =>
            option.setName('target').setDescription('The user to get stats for').setRequired(false)),
    new SlashCommandBuilder()
        .setName('img')
        .setDescription('Get a random image from a subreddit')
        .addStringOption(option =>
            option.setName('subreddit')
                .setDescription('The subreddit to get the image from')
                .setRequired(false)
        )
]
    .map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
    try {
        console.log('Started refreshing application (/) commands.');

        // Register commands globally
        await rest.put(Routes.applicationCommands(clientId), {
            body: commands,
        });

        console.log('Successfully reloaded application (/) commands globally.');
    } catch (error) {
        console.error(error);
    }
})();
