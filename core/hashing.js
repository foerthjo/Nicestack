const uuid = require('./uuid.js');

function newSalt() {
	return hash(uuid.random(), uuid.random());
}

function hash(password, salt) {
	let bytes = fixLength(stringToBytes(password + salt), 64);
	for (let i = 0; i < 24; i++) {
		bytes = hashOnceOld(bytes);
	}
	return bytesToString(bytes);
}

function stringToBytes(string) {
	let bytes = [];
	for (let i = 0; i < string.length; i++) {
		let charCode = string.charCodeAt(i);
		bytes.push(charCode & 255);
		/*
		while (charCode > 0) {
			bytes.push(charCode & 255);
			charCode = Math.floor(charCode / 255);
		}
		*/
	}
	return bytes;
}

function fixLength(bytes, length) {
	if (bytes.length == 0 && length != 0) {
		let fixed = [];
		for (let i = 0; i < length; i++) {
			fixed[i] = i & 255;
		}
		return fixed;
	}

	if (bytes.length > length) {
		let fixed = [];
		for (let i = 0; i < length; i++) {
			fixed[i] = 0;
		}
		for (let i = 0; i < bytes.length; i++) {
			fixed[i % length] = (fixed[i % length] + bytes[i]) & 255;
		}
		return fixed;
	}

	if (length > bytes.length) {
		let fixed = [];
		for (let i = 0; i < length; i++) {
			fixed[i] = bytes[i % bytes.length];
		}
		return fixed;
	}

	return bytes;
}

function hashOnceOld(bytes) {
	let hashed = [];
	for (let i = 0; i < bytes.length; i++) {
		hashed[i] = (bytes[i] + (i % bytes[i]) + 3) & 255;
		hashed[i] = (hashed[i] + bytes[bytes[i] % bytes.length]) & 255;
		hashed[i] = (hashed[i] + bytes[hashed[i] % bytes.length]) & 255;
	}
	return hashed;
}

function bytesToString(bytes) {
	let string = '';
	for (let i = 0; i < bytes.length; i++) {
		string += String.fromCharCode(bytes[i]);
	}
	return string;
}

exports.hash = hash;
exports.stringToBytes = stringToBytes;
exports.bytesToString = bytesToString;
exports.newSalt = newSalt;
