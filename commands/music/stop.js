const Discord = require('discord.js');
const { useQueue } = require('discord-player');

const THUMB = 'https://i.pinimg.com/564x/e3/a1/18/e3a11860705794fe49f20852b68ec5c1.jpg';

module.exports = {
    name: 'stop',
    description: 'Remover todas as faixas da fila.',
    run: async (client, interaction, args) => {
        let msg;
        try {
            const channel = interaction.member.voice.channel;
            if (!channel) {
                throw 'Voce precisa estar em um canal de voz para usar este comando!';
            }

            let embed = new Discord.EmbedBuilder()
                .setTitle('Parando a fila 🥴')
                .setColor("Random")
                .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                .setDescription(`Positivo ${interaction.author}, estou parando a reprodução!`)
                .setThumbnail(THUMB)
                .setFooter({ text: `Limpando a fila ⚙️🎶...` });

            msg = await interaction.reply({ embeds: [embed] });

            const queue = useQueue(channel.guild.id);
            let embedBody = {};

            if (queue) {
                queue.delete();

                embedBody.title = "Feito! ⏸️";
                embedBody.description = `Removi todos os itens da fila e sai do canal 🙃`;
                embedBody.footer = `Caso queira voltar a ouvir, execute o comando !play`;
            } else {
                embedBody.title = "Puts! 😢";
                embedBody.description = 'Parece que não tem nenhuma faixa na fila!';
                embedBody.footer = `Para adicionar mais faixas, execute o comando !play`;
            }

            let embed_res = new Discord.EmbedBuilder()
                .setTitle(embedBody.title)
                .setColor("Random")
                .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                .setDescription(embedBody.description)
                .setThumbnail(THUMB)
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
