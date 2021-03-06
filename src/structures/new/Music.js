const { googleAPIKey } = require('../../config/config.json');
const { MusicError } = require('./CustomErrors.js');
const promiseReflect = require('promise-reflect');
const yt = require('ytdl-core');
const YouTube = require('youtube-node');
const youtube = new YouTube();
youtube.setKey(googleAPIKey);
const search = require('youtube-search');
const youtubeApi = require('youtube-api');
const { RichEmbed } = require('discord.js');
const searchOptions = {
	maxResults: 10,
	key: googleAPIKey
};

class Music {
	constructor(Guild) {
		this.guild = Guild;
		this._queue = [];
		this.loop = false;
		this.playing = false;
		this.dispatcher = null;
	}

	playqueue(channel) {
		let { queue, guild, loop } = this;
		const { voiceConnection } = guild;
		let [CurrentSong] = queue;
		if (!voiceConnection || this.playing || queue.length === 0 || !CurrentSong) return;
		const { title, requestedBy, link, picture } = CurrentSong;
		this.dispatcher = voiceConnection.playStream(yt(link, { audioonly: true }));
		this.dispatcher.on('start', () => {
			voiceConnection.player.streamingData.pausedTime = 0;
			this.playing = true;
			const embed = new RichEmbed()
				.setDescription(`[${title}](${link})`)
				.setAuthor(requestedBy.tag, requestedBy.displayAvatarURL);
			if (picture) {
				embed.setImage(picture);
			}
			embed.setColor('RANDOM');
			channel.send({ embed });
		}
		);
		this.dispatcher.on('error', error => {
			channel.send('I had an error while trying to play the Current Song so i skipped it! if this happens more than 1 time please contact my DEV!');
			queue.shift();
			guild.client.log.error(`while trying to play a song this error occurred ${error.name}:${error.message}`);
			this.playing = false;
			this.dispatcher = null;
			return this.playqueue(channel);
		}
		);
		this.dispatcher.on('end', () => setTimeout(() => {
			const shifted = queue.shift();
			if (loop) queue.push(shifted);
			this.playing = false;
			this.dispatcher = null;
			this.playqueue(channel);
		}, 200));
	}

	async handlePlaylist(link, requestedBy, channel, messageToEdit) {
		const playlist = await this.getPlaylist(link, messageToEdit);
		const promises = [];
		for (const song of playlist) {
			const url = `https://www.youtube.com/watch?v=${song.resourceId.videoId}`;
			promises.push(this.getSongByUrl(url, requestedBy, messageToEdit));
		}
		const values = await Promise.all(promises.map(promiseReflect));
		let resolved = values.filter(value => value.status === 'resolved');
		let rejected = values.filter(value => value.status === 'rejected');
		resolved.map(song => this.queue.push(song.data));
		this.playqueue(channel);
		return `${resolved.length} Songs were added, ${rejected.length} could not be added due length, Copyright issues or it is Private`;
	}

	async handleSong(input, requestedBy, isUrl, channel, messageToEdit) {
		if (isUrl) {
			const Song = await this.getSongByUrl(input, requestedBy, messageToEdit);
			this.queue.push(Song);
			this.playqueue(channel);
			return Song;
		} else {
			const Song = await this.getSongByName(input, requestedBy, messageToEdit);
			this.queue.push(Song);
			this.playqueue(channel);
			return Song;
		}
	}

	async handleSongAsNext(input, requestedBy, isUrl, channel, messageToEdit) {
		if (isUrl) {
			const Song = await this.getSongByUrl(input, requestedBy, messageToEdit);
			this.queue.splice(1, 0, Song);
			this.playqueue(channel);
			return Song;
		} else {
			const Song = await this.getSongByName(input, requestedBy, messageToEdit);
			this.queue.splice(1, 0, Song);
			this.playqueue(channel);
			return Song;
		}
	}

	getSongByUrl(url, requestedBy, messageToEdit) {
		return new Promise((resolve, reject) => {
			const id = /(?:https?:\/{2})?(?:w{3}\.)?youtu(?:be)?\.(?:com|be)(?:\/watch\?v=|\/)([^\s&]+)/g.exec(url);
			if (!id) reject(new MusicError('this Link isn\'s a Youtube Video', messageToEdit));
			youtube.getById(id[1], (err, result) => {
				if (err) return reject(err);
				if (!result.items[0]) return reject(new MusicError('Song Unaviable', messageToEdit));
				const Song = new SongInfo(result.items[0], requestedBy);
				if (Song.length > 1800) return reject(new MusicError('Song is too long! the maximun limit is 30 minutes', messageToEdit));
				resolve(Song);
			});
		});
	}

	getSongByName(name, requestedBy, messageToEdit) {
		return new Promise((resolve, reject) => {
			search(name, searchOptions, async (err, result) => {
				if (err) reject(err);
				if (!result || !result[0]) reject(new MusicError('searching for that song failed', messageToEdit));
				let [song] = result;
				let index = 0;
				while (song.kind !== 'youtube#video') {
					index += 1;
					song = result[index];
					if (!song) reject(new MusicError('i found no song with that name. Please use a link instead!', messageToEdit));
				}
				try {
					const songInfo = await this.getSongByUrl(song.link, requestedBy, messageToEdit);
					resolve(songInfo);
				} catch (error) {
					reject(error);
				}
			});
		});
	}

	async getPlaylist(url, messageToEdit) {
		const id = /[&?]list=([a-z0-9_-]+)/i.exec(url);
		if (!id) throw new MusicError('this Link isn\'s a Youtube Playlist', messageToEdit);
		try {
			const playlistItems = await this.playlistInfo(googleAPIKey, id[1]);
			if (!playlistItems) throw new MusicError('Invalid playlist', messageToEdit);
			return playlistItems;
		} catch (error) {
			if (error instanceof MusicError) throw error;
			throw new MusicError('Playlist Url is not correctly formatted try another one!', messageToEdit);
		}
	}

	playlistInfoRecursive(playlistId, callStackSize, pageToken, currentItems, callback) {
		youtubeApi.playlistItems.list({
			part: 'snippet',
			pageToken,
			maxResults: 50,
			playlistId
		}, (err, data) => {
			if (err) return callback(err);
			for (const x in data.items) {
				currentItems.push(data.items[x].snippet);
			}
			if (data.nextPageToken) {
				this.playlistInfoRecursive(playlistId, callStackSize + 1, data.nextPageToken, currentItems, callback);
			} else {
				return callback(null, currentItems);
			}
		});
	}

	playlistInfo(apiKey, playlistId) {
		return new Promise((resolve, reject) => {
			youtubeApi.authenticate({
				type: 'key',
				key: apiKey
			});
			this.playlistInfoRecursive(playlistId, 0, null, [], (err, list) => {
				if (err) return reject(err);
				return resolve(list);
			});
		});
	}

	set queue(input) {
		this._queue = input;
	}

	get queue() {
		return this._queue;
	}
}

class SongInfo {
	constructor(info, requestedBy) {
		this.raw = info;
		this.requestedBy = requestedBy;
	}

	get id() {
		return this.raw.id;
	}

	get link() {
		return `https://www.youtube.com/watch?v=${this.id}`;
	}

	get title() {
		return this.raw.snippet.title;
	}

	get length() {
		return this.parseTime(this.raw.contentDetails.duration);
	}

	get picture() {
		return `https://img.youtube.com/vi/${this.id}/maxresdefault.jpg`;
	}

	parseTime(time) {
		if (!time) return null;
		const match = time.match(/P(\d+M)?(\d+W)?(\d+D)?T(\d+H)?(\d+M)?(\d+S)?/);

		const Month = parseInt(match[1]) || 0,
			Weeks = parseInt(match[2]) || 0,
			Days = parseInt(match[3]) || 0,
			Hours = parseInt(match[4]) || 0,
			minutes = parseInt(match[5]) || 0,
			Seconds = parseInt(match[6]) || 0;

		return Month * 2629744 + Weeks * 604800 + Days * 86400 + Hours * 3600 + minutes * 60 + Seconds; // eslint-disable-line no-mixed-operators
	}
}

module.exports = Music;
