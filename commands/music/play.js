const Discord = require('discord.js');
const { useMainPlayer } = require('discord-player');

const THUMB = 'https://i.pinimg.com/564x/e3/a1/18/e3a11860705794fe49f20852b68ec5c1.jpg';

module.exports = {
    name: 'play',
    description: 'Adiciona uma faixa na fila.',
    options: [
        { name: 'musica', description: 'Nome ou link da música/playlist', type: 3, required: true }
    ],
    run: async (client, interaction, args) => {
        let msg;
        try {
            const channel = interaction.member.voice.channel;
            if (!channel) {
                throw 'Voce precisa estar em um canal de voz para usar este comando!';
            }

            const query = args.join(' ');
            if (!query) {
                throw 'Nenhum link ou palavra chave foi encontrada!';
            }

            const player = useMainPlayer();

            let embed = new Discord.EmbedBuilder()
                .setTitle('Pesquisando...⚙🔍')
                .setColor("Random")
                .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                .setDescription(`Oi ${interaction.author}, estou buscando por: \`${query}\`.`)
                .setThumbnail(THUMB)
                .setFooter({ text: `🤒Aguarde só mais um pouco...` });

            msg = await interaction.reply({ embeds: [embed] });

            // Guarda se já havia algo tocando para saber a mensagem certa
            const existingQueue = player.nodes.get(channel.guild.id);
            const wasActive = !!(existingQueue && existingQueue.isPlaying());

            const { track, searchResult } = await player.play(channel, query, {
                nodeOptions: {
                    metadata: { channel: interaction.channel },
                    leaveOnEmpty: true,
                    leaveOnEmptyCooldown: 60000,
                    leaveOnEnd: true,
                    leaveOnEndCooldown: 60000,
                }
            });

            const isPlaylist = !!searchResult.playlist;

            let embedBody = {};
            if (isPlaylist) {
                embedBody.title = "Playlist adicionada! 📃🎶";
                embedBody.description = `Adicionei a playlist **${searchResult.playlist.title}** com \`${searchResult.tracks.length}\` faixas à fila.`;
                embedBody.footer = `Tocando agora: ${track.title}`;
            } else if (wasActive) {
                embedBody.title = "Adicionado a fila!";
                embedBody.description = `Adicionei à fila o áudio:\n \`${track.title}\``;
                embedBody.footer = `Aguarde ou execute o comando !skip 😘`;
            } else {
                embedBody.title = "Encontrei! ⚙🔍";
                embedBody.description = `Busquei com minhas **anteninhas de vinil** e encontrei o audio:\n \`${track.title}\``;
                embedBody.footer = `🎶Conectando ao canal...`;
            }

            let embed_res = new Discord.EmbedBuilder()
                .setTitle(embedBody.title)
                .setColor("Random")
                .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                .setDescription(embedBody.description)
                .setThumbnail(track.thumbnail || THUMB)
                .setFooter({ text: embedBody.footer });

            return msg.edit({ embeds: [embed_res] });
        } catch (error) {
            let embedError = new Discord.EmbedBuilder()
                .setTitle('Algo deu errado aconteceu!')
                .setColor("Random")
                .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                .setDescription(`Oi ${interaction.author}.\n ${error?.message || error}`)
                .setFooter({ text: `Se atente ao erro e tente novamente...` });

            if (msg) return msg.edit({ embeds: [embedError] });
            return interaction.reply({ embeds: [embedError] });
        }
    }
}
