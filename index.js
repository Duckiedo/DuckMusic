const { Client, GatewayIntentBits } = require('discord.js');
const { Player, QueryType } = require('discord-player');
const { DefaultExtractors } = require('@discord-player/extractor');
const { token, reddit } = require('./config.json');
const snoowrap = require('snoowrap');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

const player = new Player(client, {
    leaveOnEmpty: false,
    leaveOnEnd: false,
    leaveOnStop: false,
    volume: 100,
});

const redditClient = new snoowrap({
    userAgent: reddit.userAgent,
    clientId: reddit.clientId,
    clientSecret: reddit.clientSecret,
    refreshToken: reddit.refreshToken,
});

client.once('ready', async () => {
    console.log(`${client.user.tag} is online!`);
    try {
        await player.extractors.loadMulti(DefaultExtractors);
        console.log("Extractors loaded successfully!");
    } catch (error) {
        console.error("Error loading extractors:", error);
    }
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;

    try {
        console.log('Received interaction:', interaction);

   
        if (!interaction.guildId) {
            return interaction.reply({
                content: "❌ | This command can only be used in a server.",
                ephemeral: true,
            });
        }

    
        if (interaction.replied || interaction.deferred) {
            return; 
        }

        await interaction.deferReply();

        const command = interaction.commandName;
        let member = interaction.member;
        const channel = interaction.channel; 

      
        console.log('Channel:', channel);

   
        if (!channel) {
            console.error('Channel is undefined or null.');
            return interaction.followUp({
                content: "❌ | Channel information not found. This might be a DM interaction.",
                ephemeral: true,
            });
        }

     
        if (!member) {
            try {
                member = await interaction.guild.members.fetch(interaction.user.id);
            } catch (error) {
                console.error("Error fetching member:", error);
                return interaction.followUp({
                    content: "❌ | Could not find your member data.",
                    ephemeral: true,
                });
            }
        }

        // Play Command
        if (command === 'play') {
            const voiceChannel = member.voice.channel;
            if (!voiceChannel) {
                return interaction.followUp({
                    content: "❌ | You must be in a voice channel to use this command.",
                    ephemeral: true,
                });
            }

            const query = interaction.options.getString('query');
            if (!query || query.trim() === '') {
                return interaction.followUp({
                    content: "❌ | Please provide a valid song name or URL.",
                    ephemeral: true,
                });
            }

            const searchResult = await player
                .search(query, {
                    requestedBy: interaction.user,
                    searchEngine: QueryType.AUTO,
                })
                .catch((err) => {
                    console.error('Search error:', err);
                    return null;
                });

            if (!searchResult || !searchResult.tracks.length) {
                return interaction.followUp({
                    content: "❌ | No results found for your query.",
                });
            }

            const queue = player.nodes.create(interaction.guildId, { metadata: channel });

            try {
                if (!queue.connection) await queue.connect(voiceChannel);

                queue.addTrack(searchResult.tracks[0]);

                if (!queue.isPlaying()) await queue.node.play();

                return interaction.followUp({
                    content: `🎶 | Now playing: **${searchResult.tracks[0].title}**`,
                });
            } catch (error) {
                console.error("Playback error:", error);
                return interaction.followUp({
                    content: "❌ | An error occurred during playback. Please try again.",
                });
            }
        }

        // Skip Command
        if (command === 'skip') {
            const voiceChannel = member.voice.channel;
            if (!voiceChannel) {
                return interaction.followUp({
                    content: "❌ | You must be in a voice channel to use this command.",
                    ephemeral: true,
                });
            }

            const queue = player.nodes.get(interaction.guildId);

            if (!queue || !queue.node.isPlaying()) {
                return interaction.followUp({
                    content: "❌ | There's no music playing right now.",
                });
            }

            try {
                const currentTrack = queue.currentTrack;
                await queue.node.skip();
                return interaction.followUp({
                    content: `⏭️ | Skipped **${currentTrack.title}**.`,
                });
            } catch (error) {
                console.error("Skip error:", error);
                return interaction.followUp({
                    content: "❌ | Something went wrong while skipping the track.",
                });
            }
        }

        // Stop Command
        if (command === 'stop') {
            const voiceChannel = member.voice.channel;
            if (!voiceChannel) {
                return interaction.followUp({
                    content: "❌ | You must be in a voice channel to use this command.",
                    ephemeral: true,
                });
            }

            const queue = player.nodes.get(interaction.guildId);

            if (!queue || !queue.node.isPlaying()) {
                return interaction.followUp({
                    content: "❌ | There's no music playing right now.",
                });
            }

            try {
                queue.delete();
                return interaction.followUp({
                    content: "🛑 | Stopped the music and cleared the queue.",
                });
            } catch (error) {
                console.error("Stop error:", error);
                return interaction.followUp({
                    content: "❌ | Something went wrong while stopping the music.",
                });
            }
        }

        // Help Command
        if (command === 'help') {
            return interaction.followUp({
                content: "Here are the available commands:\n" +
                    "`/play <query>` - Play a song (type song name in query)\n" +
                    "`/skip` - Skip the current song\n" +
                    "`/stop` - Stop the music and clear the queue\n" +
                    "`/help` - Display this help message\n" +
                    "`/stats [user]` - Get stats about yourself or another user\n" +
                    "`/img <subreddit>` - Get a random image from a subreddit",
                ephemeral: true,
            });
        }

        // Stats Command
        if (command === 'stats') {
            const target = interaction.options.getUser('target') || interaction.user;

            let member = interaction.guild.members.cache.get(target.id);

           
            if (!member) {
                try {
                    member = await interaction.guild.members.fetch(target.id);
                } catch (error) {
                    console.error("Error fetching member:", error);
                    return interaction.followUp({
                        content: `❌ | Could not find information for the user.`,
                        ephemeral: true,
                    });
                }
            }

            const joinDate = member.joinedAt ? `<t:${Math.floor(member.joinedAt.getTime() / 1000)}:R>` : 'Unknown';
            const creationDate = `<t:${Math.floor(target.createdAt.getTime() / 1000)}:R>`;
            const lastActive = member.presence?.status || 'Offline';

            return interaction.followUp({
                content: `📊 **User Stats for ${target.tag}**:\n` +
                    `👤 **Account Created:** ${creationDate}\n` +
                    `📅 **Joined Server:** ${joinDate}\n` +
                    `🟢 **Status:** ${lastActive}`,
            });
        }

        // Img Command
        if (command === 'img') {
            const subreddit = interaction.options.getString('subreddit') || 'memes';

            try {
                const posts = await redditClient.getSubreddit(subreddit).getTop({ time: 'day', limit: 10 });

               
                const randomPost = posts[Math.floor(Math.random() * posts.length)];

          
                if (randomPost.url.match(/\.(jpeg|jpg|gif|png)$/)) {
                    return interaction.followUp({
                        content: randomPost.url,
                    });
                } else {
                    return interaction.followUp({
                        content: `❌ | No image found in the top posts of /r/${subreddit}.`,
                    });
                }
            } catch (error) {
                console.error('Error fetching image:', error);
                return interaction.followUp({
                    content: `❌ | Failed to fetch an image from /r/${subreddit}.`,
                });
            }
        }
    } catch (error) {
        console.error("General interaction handling error:", error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: "❌ | Something went wrong. Please try again later." });
        }
    }
});

client.login(token);
