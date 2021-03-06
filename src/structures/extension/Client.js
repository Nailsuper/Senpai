const { Client, Collection } = require('discord.js');
const { version } = require('../../../package.json');
const DBHandler = require('../new/DBHandler.js');
const Log = require('../new/Log.js');

class SenpaiClient extends Client {
	constructor(options) {
		super(options);
		this.db = new DBHandler('Discord');
		this.config = require('../../config/config.json');
		this.version = version;
		this.commands = new Collection();
		this.aliases = new Collection();
		this.log = new Log(this.shard.id);
	}
}

module.exports = SenpaiClient;
