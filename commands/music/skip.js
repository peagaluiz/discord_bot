const Discord = require('discord.js');
const { useQueue } = require('discord-player');

const THUMB = 'https://i.pinimg.com/564x/e3/a1/18/e3a11860705794fe49f20852b68ec5c1.jpg';
const DICAS = '`!skip` → pula para a próxima faixa\n`!skip 4` → pula para a 4ª faixa da fila\n`!skip f` → pula a playlist inteira';

module.exports = {
    name: 'skip',
    description: 'Pula para próxima faixa. Use N para ir à faixa N ou f para pular a playlist.',
    options: [
        { name: 'posicao', description: 'Número da faixa (ex: 4) ou "f" para pular a playlist inteira', type: 3, required: false }
    ],
    run: async (client, interaction, args) => {
        let msg;
        try {
            const channel = interaction.member.voice.channel;
            if (!channel) {
                throw 'Voce precisa estar em um canal de voz para usar este comando!';
            }

            const queue = useQueue(channel.guild.id);
            const arg = (args[0] || '').toLowerCase();
            const current = queue?.currentTrack;

            // Mensagem inicial: faixa atual + playlist (se houver) + exemplos de uso
            let descAtual = `${interaction.author}, estou passando para próxima faixa, aguarde...`;
            if (current) {
                descAtual = `${interaction.author}, faixa atual:\n \`${current.title}\``;
                if (current.playlist) {
                    descAtual += `\n📃 Playlist: **${current.playlist.title}**`;
                }
            }

            let embed = new Discord.EmbedBuilder()
                .setTitle('Seguindo a fila 🙃')
                .setColor("Random")
                .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                .setDescription(descAtual)
                .setThumbnail(current?.thumbnail || THUMB)
                .addFields({ name: 'Dicas de uso', value: DICAS })
                .setFooter({ text: `Lembre, caso queira parar de ouvir, execute o comando !stop` });

            msg = await interaction.reply({ embeds: [embed] });

            let embedBody = {};

            if (!queue || !queue.isPlaying()) {
                embedBody = {
                    title: "Puts! 😢",
                    description: 'Parece que não tem nenhuma faixa tocando!',
                    footer: `Para adicionar mais faixas, execute o comando !play`,
                    thumbnail: THUMB
                };
            } else if (/^\d+$/.test(arg)) {
                // !skip N -> pula para a N-ésima faixa da fila (1-indexado)
                const n = parseInt(arg, 10);
                const target = queue.tracks.at(n - 1);

                if (n < 1 || !target) {
                    embedBody = {
                        title: "Ops! 🤔",
                        description: `Não existe a faixa \`${n}\` na fila. A fila tem \`${queue.tracks.size}\` faixa(s) em espera.`,
                        footer: `Confira a fila e tente de novo`,
                        thumbnail: THUMB
                    };
                } else {
                    queue.node.skipTo(n - 1);
                    embedBody = {
                        title: "Feito! ⏭️",
                        description: `Pulei para a \`${n}ª\` faixa da fila 😀:\n \`${target.title}\``,
                        footer: `Lembre, caso queira parar de ouvir, execute o comando !stop`,
                        thumbnail: target.thumbnail || THUMB
                    };
                }
            } else if (arg === 'f') {
                // !skip f -> pula a playlist atual inteira, indo para a próxima faixa fora dela
                const currentPl = current?.playlist;
                const upcoming = queue.tracks.toArray();
                const idx = currentPl
                    ? upcoming.findIndex(t => t.playlist?.id !== currentPl.id)
                    : (upcoming.length ? 0 : -1);

                if (idx === -1) {
                    // Nada fora da playlist -> encerra as faixas em espera e pula a atual
                    queue.tracks.clear();
                    queue.node.skip();
                    embedBody = {
                        title: "Feito! ⏭️",
                        description: currentPl
                            ? `Pulei a playlist **${currentPl.title}** inteira. Não há mais faixas fora dela.`
                            : `Pulei a faixa atual. Não há mais faixas na fila.`,
                        footer: `Para adicionar mais faixas, execute o comando !play`,
                        thumbnail: THUMB
                    };
                } else {
                    const target = upcoming[idx];
                    queue.node.skipTo(idx);
                    embedBody = {
                        title: "Feito! ⏭️",
                        description: currentPl
                            ? `Pulei a playlist **${currentPl.title}** e fui para 😀:\n \`${target.title}\``
                            : `Pulei para 😀:\n \`${target.title}\``,
                        footer: `Lembre, caso queira parar de ouvir, execute o comando !stop`,
                        thumbnail: target.thumbnail || THUMB
                    };
                }
            } else {
                // !skip -> próxima faixa
                const next = queue.tracks.at(0);
                queue.node.skip();
                embedBody = {
                    title: "Feito! ⏭️",
                    description: next
                        ? `Pulei para a próxima faixa 😀:\n \`${next.title}\``
                        : `Pulei a faixa atual. Não há mais faixas na fila.`,
                    footer: `Lembre, caso queira parar de ouvir, execute o comando !stop`,
                    thumbnail: next?.thumbnail || THUMB
                };
            }

            let embed_res = new Discord.EmbedBuilder()
                .setTitle(embedBody.title)
                .setColor("Random")
                .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                .setDescription(embedBody.description)
                .setThumbnail(embedBody.thumbnail)
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
