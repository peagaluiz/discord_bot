const Discord = require('discord.js');
const { PermissionsBitField } = require('discord.js');

const THUMB = 'https://i.pinimg.com/564x/e3/a1/18/e3a11860705794fe49f20852b68ec5c1.jpg';

// Prefixos de comando considerados "lixo" a ser limpo (o meu ! e o m! do Jockie).
const PREFIXOS = ['!', 'm!'];
if (process.env.PREFIX && !PREFIXOS.includes(process.env.PREFIX)) PREFIXOS.push(process.env.PREFIX);

// Bots conhecidos alem do proprio: casa por tag exata (nome#discriminador) ou
// por inicio do nome, para pegar todas as instancias (Jockie Music tem varias).
const BOTS_CONHECIDOS_TAGS = ['Jockie Music#8158'];
const BOTS_CONHECIDOS_NOMES = ['jockie music'];

// Decide se uma mensagem entra na limpeza: minhas proprias, de bots conhecidos
// ou qualquer mensagem que comece com um dos prefixos de comando.
function ehLixo(message, client) {
    if (message.author.id === client.user.id) return true;

    if (message.author.bot) {
        const tag = `${message.author.username}#${message.author.discriminator}`;
        const nome = message.author.username.toLowerCase();
        if (BOTS_CONHECIDOS_TAGS.includes(tag)) return true;
        if (BOTS_CONHECIDOS_NOMES.some(n => nome.startsWith(n))) return true;
    }

    // Case-insensitive: pega tanto m! quanto M! / M!P etc.
    const conteudo = message.content.trim().toLowerCase();
    return PREFIXOS.some(p => conteudo.startsWith(p.toLowerCase()));
}

module.exports = {
    name: 'clear',
    description: 'Limpa as ultimas mensagens do bot e de comandos (! e m!) neste canal.',
    aliases: ['limpar', 'clean'],
    options: [
        { name: 'quantidade', description: 'Quantas mensagens verificar (1-100, padrao 100)', type: 4, required: false }
    ],
    run: async (client, interaction, args) => {
        let msg;
        try {
            const channel = interaction.channel;

            // So funciona em servidor (nao em DM).
            if (!channel.guild) {
                throw 'Esse comando so funciona em canais de servidor!';
            }

            // Quem executa precisa poder gerenciar mensagens.
            const membroPerms = interaction.member?.permissions;
            if (!membroPerms || !membroPerms.has(PermissionsBitField.Flags.ManageMessages)) {
                throw 'Voce precisa da permissao **Gerenciar Mensagens** para usar este comando!';
            }

            // O bot tambem precisa da permissao neste canal.
            const botPerms = channel.permissionsFor(client.user);
            if (!botPerms || !botPerms.has(PermissionsBitField.Flags.ManageMessages)) {
                throw 'Eu preciso da permissao **Gerenciar Mensagens** neste canal para limpar as mensagens!';
            }

            // Quantidade a verificar: 1-100 (limite do fetch da API), padrao 100.
            let limite = parseInt(args?.[0], 10);
            if (isNaN(limite)) limite = 100;
            limite = Math.max(1, Math.min(100, limite));

            const embedInicial = new Discord.EmbedBuilder()
                .setTitle('Limpando a bagunca 🧹')
                .setColor("Random")
                .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                .setDescription(`${interaction.author}, procurando lixo nas ultimas \`${limite}\` mensagens...`)
                .setThumbnail(THUMB);

            msg = await interaction.reply({ embeds: [embedInicial] });

            // Busca as mensagens e filtra apenas o que consideramos lixo.
            const mensagens = await channel.messages.fetch({ limit: limite });
            const alvos = mensagens.filter(m => ehLixo(m, client) && m.id !== msg.id && m.deletable);

            let embedBody;
            if (alvos.size === 0) {
                embedBody = {
                    title: 'Tudo limpo! ✨',
                    description: `${interaction.author}, nao encontrei nenhuma mensagem de bot ou comando para apagar.`
                };
            } else {
                // filterOld=true ignora mensagens com mais de 14 dias (nao podem ser
                // apagadas em massa) em vez de lancar erro.
                const apagadas = await channel.bulkDelete(alvos, true);

                const naoApagadas = alvos.size - apagadas.size;
                let desc = `${interaction.author}, apaguei \`${apagadas.size}\` mensagem(ns) de bot/comando 🗑️`;
                if (naoApagadas > 0) {
                    desc += `\n⚠️ \`${naoApagadas}\` mensagem(ns) tinham mais de 14 dias e nao puderam ser apagadas em massa.`;
                }
                embedBody = { title: 'Feito! 🧹', description: desc };
            }

            const embedRes = new Discord.EmbedBuilder()
                .setTitle(embedBody.title)
                .setColor("Random")
                .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                .setDescription(embedBody.description)
                .setThumbnail(THUMB);

            return msg.edit({ embeds: [embedRes] });
        } catch (error) {
            const embedError = new Discord.EmbedBuilder()
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
