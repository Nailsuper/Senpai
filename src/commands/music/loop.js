const Commands = require('../../structures/new/Command.js');
const info = {
	name: 'loop',
	description: 'loops or remove the loop from your current queue!',
	aliases: ['repeat'],
	examples: ['loop']
};

class LoopCommand extends Commands {
	constructor(client, group) {
		super(client, info, group);
	}

	async run(msg) {
		const { voiceConnection } = msg.guild;
		if (!voiceConnection) return msg.reply(`Im not in a Voice channel on this Server!`);
		const { musicLimited } = await msg.guild.getConfig();
		if (musicLimited) {
			const permissionLevel = await msg.member.getPermissionsLevel();
			if (permissionLevel > 3) return msg.reply("on this server the music feature is limited to music roles and since you don't have one you dont have permission to do this Command!");
		}
		const { queue, loop } = msg.guild.music;
		if (queue.length === 0) return msg.reply('You can`t loop an empty queue :eyes:');
		if (loop) {
			msg.guild.music.loop = false;
			msg.channel.send('stopping the loop!');
		} else if (!loop) {
			msg.guild.music.loop = true;
			msg.channel.send('looping the current queue!');
		}
	}
}

module.exports = LoopCommand;
