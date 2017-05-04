const fs = require("fs")
let cookies = JSON.parse(fs.readFileSync('./databases/cookies.json', 'utf8'));
exports.run = (client, msg) => {
    if (msg.mentions.users.size < 1) return msg.reply('You must mention someone for this Command.')
    if (!cookies[msg.mentions.users.first().id]) cookies[msg.mentions.users.first().id] = {'cookies': 0};
    cookies[msg.mentions.users.first().id].cookies++;
    msg.channel.send(`**${msg.mentions.users.first()} got a :cookie: from ${msg.author}**`)
    fs.writeFile('./databases/cookies.json', JSON.stringify(cookies), err => {
    if (err) console.error(err)
    });
    msg.channel.send(`${msg.mentions.users.first().username} has a total of ` + cookies[msg.mentions.users.first().id].cookies + ' Cookies!')
    console.log("[Command]     ", msg.author.username + "/" + msg.author.id, "(" + msg.content + ")")
}

exports.help = {
    'name': 'Cookie',
    'description': 'Give someone a Cookie',
    'usage': 'Cookie [@User]'
}
