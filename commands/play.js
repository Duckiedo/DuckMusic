const { ApplicationCommandOptionType } = require('discord.js');
const { useMainPlayer } = require('discord-player');
const { isInVoiceChannel } = require('../utils/voicechannel');
const { default: Conf } = await import('conf');

module.exports = {
    name: 'play',
    description: 'Play a song in your channel!',
    options: [
        {
            name: 'query',
            type: ApplicationCommandOptionType.String,
            description: 'The song you want to play',
            required: true,
        },
    ],
    async execute(interaction) {
        try {
            // Log interaction details
            console.log('Received interaction:', interaction);

            // Check if the interaction is in a guild
            if (!interaction.guildId) {
                return interaction.reply({
                    content: '❌ | This command can only be used in a server.',
                    ephemeral: true,
                });
            }

            // Check if the user is in a voice channel
            const inVoiceChannel = isInVoiceChannel(interaction);
            console.log('Is in voice channel:', inVoiceChannel);
            if (!inVoiceChannel) {
                return interaction.followUp({
                    content: '❌ | You must be in a voice channel to use this command.',
                    ephemeral: true,
                });
            }

            await interaction.deferReply();

            const player = useMainPlayer();
            const query = interaction.options.getString('query');
            console.log('Searching for track:', query);

            // Search for the track
            const searchResult = await player.search(query);
            console.log('Search Result:', searchResult);

            if (!searchResult.hasTracks()) {
                return interaction.followUp({ content: '❌ | No results were found!' });
            }

            // Set volume from config or default to 10
            const config = new Conf({ projectName: 'volume' });
            const volume = config.get('volume') || 10;

            // Play the track in the user's voice channel
            try {
                await player.play(interaction.member.voice.channel.id, searchResult, {
                    nodeOptions: {
                        metadata: {
                            channel: interaction.channel,
                            client: interaction.guild?.members.me,
                            requestedBy: interaction.user.username,
                        },
                        leaveOnEmptyCooldown: 300000,
                        leaveOnEmpty: true,
                        leaveOnEnd: false,
                        bufferingTimeout: 0,
                        volume: volume,
                    },
                });

                await interaction.followUp({
                    content: `⏱ | Loading your ${searchResult.playlist ? 'playlist' : 'track'}...`,
                });
            } catch (error) {
                console.error('Error during playback:', error);
                await interaction.editReply({
                    content: '❌ | An error has occurred while playing the track.',
                });
            }
        } catch (error) {
            console.error('General error during play command execution:', error);
            await interaction.reply({
                content: '❌ | There was an error trying to execute that command: ' + error.message,
                ephemeral: true,
            });
        }
    },
};
