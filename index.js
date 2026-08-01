const Discord = require('discord.js');
const { REST, Routes, SlashCommandBuilder } = require('discord.js');
const { Player } = require('discord-player');
const { DefaultExtractors, SpotifyExtractor } = require('@discord-player/extractor');
const { YoutubeiExtractor } = require('discord-player-youtubei');
const fs = require('fs');
require('dotenv').config();

const client = new Discord.Client({ intents: ["Guilds", "GuildMembers", "MessageContent", "GuildMessages", "GuildVoiceStates"] });

module.exports = client;

// --- discord-player ---
const THUMB = 'https://i.pinimg.com/564x/e3/a1/18/e3a11860705794fe49f20852b68ec5c1.jpg';
const player = new Player(client);

const infoEmbed = (title, description) => new Discord.EmbedBuilder()
    .setTitle(title)
    .setColor("Random")
    .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
    .setDescription(description)
    .setThumbnail(THUMB);

(async () => {
    // Carrega os extractors padrao, mas deixa o Spotify de fora para registra-lo
    // logo abaixo com as credenciais (evita registro duplicado).
    await player.extractors.loadMulti(DefaultExtractors.filter(e => e !== SpotifyExtractor));

    // Spotify: le apenas os METADADOS do link (musica/playlist) e faz o "bridge"
    // para o YouTube, que entrega o audio. As credenciais (app gratuito em
    // developer.spotify.com) evitam rate-limit e falhas em playlists.
    await player.extractors.register(SpotifyExtractor, {
        clientId: process.env.SPOTIFY_CLIENT_ID,
        clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    });

    // useYoutubeDL: usa o yt-dlp (binario, baixado pelo youtube-dl-exec) para
    // extrair o audio de forma confiavel, contornando o bloqueio de assinatura do YouTube.
    await player.extractors.register(YoutubeiExtractor, { useYoutubeDL: true, logLevel: 'NONE' });
    console.log('Extractors carregados');
})();

// Falha ao extrair/tocar uma faixa: avisa no canal em vez de sair calado.
player.events.on('playerError', (queue, error) => {
    console.error('Erro na reprodução:', error.message);
    const channel = queue.metadata?.channel;
    if (channel) channel.send({ embeds: [infoEmbed('Puts! 😢', 'Não consegui tocar essa faixa, vou pular para a próxima.')] });
});
player.events.on('error', (queue, error) => {
    console.error('Erro na fila:', error.message);
});
player.events.on('emptyQueue', (queue) => {
    const channel = queue.metadata?.channel;
    if (channel) channel.send({ embeds: [infoEmbed('Fila encerrada 🎶', 'A fila acabou e eu sai do canal. Até a próxima!')] });
});

client.login(process.env.TOKEN);

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

async function registerCommands() {
    // Monta a lista de slash a partir dos comandos carregados em client.commands,
    // aproveitando o mesmo name/description dos arquivos. Cada comando pode expor
    // um array `options` (ex.: play/skip) para os campos do slash.
    const slashCommands = client.commands.map(cmd => ({
        name: cmd.name,
        description: (cmd.description || 'Sem descrição').slice(0, 100),
        options: cmd.options || []
    }));

    // ping continua sendo tratado direto no index (não tem arquivo próprio).
    slashCommands.push({ name: 'ping', description: 'Ping simples' });

    try {
        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: slashCommands }
        );
        console.log('Slash registrado');
    } catch (err) {
        console.log(err);
    }
}

client.commands = new Discord.Collection();
client.aliases = new Discord.Collection();

client.categories = fs.readdirSync(`./commands/`);

client.on('clientReady', () => {
    console.log(`Logged in as ${client.user.username}!`);
    client.user.setActivity('Luiz Espalha Lixo', {
        name: 'Luiz Espalha Lixo',
        type: 'ActivityType.playing'
    });
});

fs.readdirSync('./commands/').forEach(local => {
    const comandos = fs.readdirSync(`./commands/${local}`).filter(arquivo => arquivo.endsWith('.js'));

    for (let file of comandos) {
        let push = require(`./commands/${local}/${file}`)

        if (push.name) {
            client.commands.set(push.name, push)
        }

        if (push.aliases && Array.isArray(push.aliases)) {
            push.aliases.forEach(x => client.aliases.set(x, push.name));
        }
    }
});

// Adaptador: faz uma interação de slash se comportar como a "message" que os
// comandos ja esperam (mesmo .author/.member/.channel e um .reply que devolve
// algo com .edit()). Assim o mesmo `run` atende tanto ! quanto /.
function makeSlashContext(interaction) {
    return {
        author: interaction.user,
        user: interaction.user,
        member: interaction.member,
        channel: interaction.channel,
        guild: interaction.guild,
        reply: async (payload) => {
            await interaction.reply(payload);
            return { edit: (p) => interaction.editReply(p) };
        }
    };
}

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'ping') {
        return interaction.reply(`Pong! ${client.ws.ping}ms`);
    }

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    // Converte as options do slash em um array `args`, no mesmo formato que o
    // caminho por prefixo entrega (ex.: play faz args.join(' ')).
    const args = interaction.options.data
        .filter(opt => opt.value !== undefined && opt.value !== null)
        .map(opt => String(opt.value));

    try {
        await command.run(client, makeSlashContext(interaction), args);
    } catch (err) {
        console.error('Erro:' + err);
    }
});
registerCommands();

client.on("messageCreate", async (message) => {
    let prefix = process.env.PREFIX;

    let validation = [
        message.author.bot,
        message.channel.type === Discord.ChannelType.DM,
        !message.content.toLowerCase().startsWith(prefix.toLowerCase()) || !message.content.startsWith(prefix)
    ];

    if (validation.some(value => value === true)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/g);

    let cmd = args.shift().toLowerCase()
    if (cmd.length === 0) return;

    let command = client.commands.get(cmd)
    if (!command) command = client.commands.get(client.aliases.get(cmd))

    try {
        command.run(client, message, args)
    } catch (err) {
        console.error('Erro:' + err);
    }
});
