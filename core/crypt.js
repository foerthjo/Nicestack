const hashing = require('./hashing.js');

function encrypt(key, salt, plaintext) {
	key = adjustKeyLength(hashing.hash(key, salt), salt, plaintext.length);
	return hashing.bytesToString(xor(hashing.stringToBytes(plaintext), hashing.stringToBytes(key)));
}

function decrypt(key, salt, encrypted) {
	key = adjustKeyLength(hashing.hash(key, salt), salt, encrypted.length);
	return hashing.bytesToString(xor(hashing.stringToBytes(encrypted), hashing.stringToBytes(key)));
}

function xor(bytes, keybytes) {
	let result = [];
	for (let i = 0; i < bytes.length; i++) {
		result[i] = bytes[i] ^ keybytes[i];
	}
	return result;
}

function adjustKeyLength(key, salt, length) {
	let lastHash = null;
	let longKey = '';
	while (longKey.length < length) {
		if (lastHash != null) {
			lastHash = hashing.hash(key, salt);
		} else {
			lastHash = hashing.hash(key, lastHash);
		}
		longKey += lastHash;
	}
	return longKey;
}

function test() {
	let plaintext = "Some arbitrary text ?=)(/&%$§!\" that's longer than a typical hash and significantly longer than the key. Also, it repeats. Some arbitrary text that's longer than a typical hash and significantly longer than the key. Also, it repeats. Some arbitrary text that's longer than a typical hash and significantly longer than the key. Also, it repeats. Some arbitrary text that's longer than a typical hash and significantly longer than the key. Also, it repeats.";
	let salt = '48726c56-2e1e-12ea-8ce8-2477864b519c';

	let encrypted = encrypt('secret key', salt, plaintext);
	let encrypted2 = encrypt('other key', salt, encrypted);
	console.log('decrypted:')
	console.log(decrypt('secret key', salt, decrypt('other key', salt, encrypted2)));
	console.log('encrypted twice:')
	console.log(encrypted2);
	console.log('decrypted once:')
	console.log(decrypt('other key', salt, encrypted2));
	console.log('decrypted wrong order:')
	console.log(decrypt('other key', salt, decrypt('secret key', salt, encrypted2)));
}

exports.encrypt = encrypt;
exports.decrypt = decrypt;
exports.test = test;
