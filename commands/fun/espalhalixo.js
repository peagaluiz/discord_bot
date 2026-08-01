const Discord = require('discord.js');

const THUMB = 'https://i.pinimg.com/564x/e3/a1/18/e3a11860705794fe49f20852b68ec5c1.jpg';

// GIFs do Luiz espalhando lixo. Basta adicionar novas URLs aqui para expandir.
const GIFS = [
    'https://media1.tenor.com/m/kGGvT9bLAY0AAAAd/espalha-lixo-luiz.gif',
    'https://media1.tenor.com/m/CW8ZLsBBrj8AAAAC/luiz-espalha-lixo-rato.gif',
    'https://images.uncyc.org/pt/7/7c/LuizPistoleiro.gif?20110624181532'
];

// Titulos do embed. Adicione novos livremente.
const TITULOS = [
    'Luiz atacou de novo! 🗑️',
    'Alerta de lixo! 🚮',
    'O Luiz espalhou lixo! 🐀',
    'Faxina reversa concluida ✅🗑️',
    'Aterro sanitario ambulante 🚛'
];

// Locais possiveis para o Luiz espalhar o lixo.
const LOCAIS = [
    'a casa',
    'o quarto',
    'o trabalho',
    'a sala',
    'a cozinha',
    'o carro',
    'a garagem',
    'o escritorio',
    'o banheiro',
    'a mochila',
    'a area de servico',
    'o closet'
];

// Frases dinamicas. Placeholders disponiveis:
//   {user}  -> mencao do usuario alvo
//   {qtd}   -> quantidade aleatoria de lixo
//   {local} -> local aleatorio
// Adicione novas frases a vontade seguindo o mesmo padrao.
const FRASES = [
    'Luiz invadiu {local} de {user} e espalhou {qtd} de lixo pela sala.',
    '{user} acordou e descobriu que o Luiz transformou seu quarto em um aterro sanitario.',
    'Luiz passou correndo e deixou {qtd} de lixo na porta de {user}.',
    '{user} tentou impedir, mas o Luiz ja tinha espalhado lixo pel{local} inteira.',
    'Luiz pulou a janela de {user} e despejou {qtd} de lixo n{local}.',
    'Ninguem viu, mas o Luiz cobriu {local} de {user} com {qtd} de lixo reciclavel (e nao reciclavel tambem).',
    '{user} saiu por 5 minutos e o Luiz aproveitou para entupir {local} com {qtd} de lixo.',
    'BREAKING: Luiz foi flagrado espalhando {qtd} de lixo n{local} de {user}.',
    'O Luiz olhou para {local} de {user}, sorriu, e largou {qtd} de lixo ali mesmo.',
    '{user} chamou a faxineira, mas o Luiz voltou e espalhou mais {qtd} de lixo n{local}.',
    'Com uma agilidade de rato, o Luiz cobriu {local} de {user} com {qtd} de lixo.',
    '{user} abriu a porta e uma avalanche de {qtd} de lixo caiu: obra do Luiz.'
];

// Sorteia um item de uma lista evitando repetir o ultimo escolhido (quando possivel).
function sortearSemRepetir(lista, estado, chave) {
    if (lista.length <= 1) return lista[0];
    let idx;
    do {
        idx = Math.floor(Math.random() * lista.length);
    } while (idx === estado[chave]);
    estado[chave] = idx;
    return lista[idx];
}

// Guarda o ultimo indice sorteado de cada lista para evitar repeticoes seguidas.
const ultimo = { gif: -1, titulo: -1, local: -1, frase: -1 };

// Gera uma quantidade de lixo aleatoria e variada (kg, sacolas, toneladas...).
function quantidadeAleatoria() {
    const unidades = [
        () => `${Math.floor(Math.random() * 90) + 5} kg`,
        () => `${Math.floor(Math.random() * 40) + 3} sacolas`,
        () => `${Math.floor(Math.random() * 12) + 2} toneladas`,
        () => `${Math.floor(Math.random() * 200) + 20} garrafas`,
        () => `${Math.floor(Math.random() * 15) + 2} sacos`,
        () => `um caminhao inteiro`
    ];
    return unidades[Math.floor(Math.random() * unidades.length)]();
}

// Extrai o ID de uma mencao (<@123>, <@!123>) ou de um ID puro; retorna null se nao houver.
function extrairId(arg) {
    if (!arg) return null;
    const match = String(arg).match(/\d{17,20}/);
    return match ? match[0] : null;
}

module.exports = {
    name: 'espalhalixo',
    description: 'O Luiz invade e espalha lixo por todo lugar do usuario marcado.',
    aliases: ['lixo', 'espalha'],
    options: [
        { name: 'usuario', description: 'Vitima do Luiz (se vazio, e voce mesmo)', type: 6, required: false }
    ],
    run: async (client, interaction, args) => {
        try {
            // Resolve o alvo: mencao/ID nos args ou, na falta, o proprio autor.
            const id = extrairId(args?.[0]);
            const alvo = id ? `<@${id}>` : `${interaction.author}`;

            const frase = sortearSemRepetir(FRASES, ultimo, 'frase')
                .replace(/{user}/g, alvo)
                .replace(/{qtd}/g, quantidadeAleatoria())
                .replace(/{local}/g, sortearSemRepetir(LOCAIS, ultimo, 'local'));

            const titulo = sortearSemRepetir(TITULOS, ultimo, 'titulo');
            const gif = sortearSemRepetir(GIFS, ultimo, 'gif');

            const embed = new Discord.EmbedBuilder()
                .setTitle(titulo)
                .setColor("Random")
                .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                .setDescription(frase)
                .setFooter({ text: `🐀 Luiz Espalha Lixo Corporation` });

            // Alguns hosts (Tenor) bloqueiam/ignoram o proxy de imagem do Discord, entao
            // o .setImage direto nem sempre renderiza. Para o GIF SEMPRE aparecer (igual
            // ao !cat), baixamos o arquivo e enviamos como anexo do proprio embed.
            try {
                const resp = await fetch(gif);
                const buffer = Buffer.from(await resp.arrayBuffer());
                const nomeArquivo = 'espalhalixo.gif';
                const anexo = new Discord.AttachmentBuilder(buffer, { name: nomeArquivo });
                embed.setImage(`attachment://${nomeArquivo}`);
                return interaction.reply({ embeds: [embed], files: [anexo] });
            } catch (e) {
                // Se o download falhar, cai para o metodo direto como fallback.
                embed.setImage(gif);
                return interaction.reply({ embeds: [embed] });
            }
        } catch (error) {
            const embedError = new Discord.EmbedBuilder()
                .setTitle('Algo deu errado aconteceu!')
                .setColor("Random")
                .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                .setDescription(`Oi ${interaction.author}.\n ${error?.message || error}`)
                .setFooter({ text: `Se atente ao erro e tente novamente...` });

            return interaction.reply({ embeds: [embedError] });
        }
    }
}
