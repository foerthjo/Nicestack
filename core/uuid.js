function random() {
	let time = new Date().getTime();
	let uuid = '';

	chunk = generateChunk(8, time);
	uuid += chunk.id;
	time = chunk.time;
	uuid += '-';
	chunk = generateChunk(4, time);
	uuid += chunk.id;
	time = chunk.time;
	uuid += '-';
	uuid += generateDigit(time % 8, 1, 5);
	time = Math.floor(time / 8);
	chunk = generateChunk(3, time);
	uuid += chunk.id;
	time = chunk.time;
	uuid += '-';
	uuid += generateDigit(time % 8, 8, 4);
	time = Math.floor(time / 8);
	chunk = generateChunk(3, time);
	uuid += chunk.id;
	time = chunk.time;
	uuid += '-';
	chunk = generateChunk(12, time);
	uuid += chunk.id;
	time = chunk.time;

	return uuid;
}

function generateChunk(length, time) {
	let id = '';
	for (let i = 0; i < length; i++) {
		id += generateDigit(time % 8, 0, 16);
		time = Math.floor(time / 8);
	}
	return {id: id, time: time};
}

function generateDigit(time, offset, range) {
	return '0123456789abcdef'.charAt(((Math.random() * range + time) % range + offset));
}

function compress(uuid) {
	const uuidChars = '0123456789abcdef';
	const compressedChars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
	let num = 0;
	let compressed = '';
	for (let i = 0; i < uuid.length; i++) {
		if (uuid[i] != '-') {
			while (i < uuid.length && num < compressedChars.length) {
				num *= 16;
				num += uuidChars.indexOf(uuid[i]);
				i++;
			}
			while (num >= compressedChars.length) {
				let index = num % compressedChars.length;
				compressed += compressedChars.charAt(index);
				num = (num - index) / compressedChars.length;
			}
		}
	}
	while (num > 0) {
		let index = num % compressedChars.length;
		compressed += compressedChars.charAt(index);
		num = (num - index) / compressedChars.length;
	}
	return compressed;
}

function test() {
	let uuid = random();
	console.log(uuid, compress(uuid), compress(compress(uuid)));
}

exports.random = random;
exports.compress = compress;
exports.compressed = () => {return compress(random());};
exports.test = test;
