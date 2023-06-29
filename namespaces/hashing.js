@client hash(password, salt) {
	let bytes = this.fixLength(this.stringToBytes(password + salt), 64);
	for (let i = 0; i < 24; i++) {
		bytes = this.hashOnce(bytes);
	}
	return this.bytesToString(bytes);
}

@client stringToBytes(string) {
	let bytes = [];
	for (let i = 0; i < string.length; i++) {
		let charCode = string.charCodeAt(i);
		bytes.push(charCode & 255);
	}
	return bytes;
}

@client fixLength(bytes, length) {
	if (bytes.length == 0 && length != 0) {
		let fixed = [];
		for (let i = 0; i < length; i++) {
			fixed[i] = i;
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

@client hashOnce(bytes) {
	let hashed = [];
	for (let i = 0; i < bytes.length; i++) {
		hashed[i] = bytes[i];
		hashed[i] = (hashed[i] + bytes[(i + 3) % bytes.length]) & 255;
		hashed[i] = (hashed[i] + bytes[(i + 5) % bytes.length]) & 255;
	}
	return hashed;
}

@client bytesToString(bytes) {
	let string = '';
	for (let i = 0; i < bytes.length; i++) {
		string += String.fromCharCode(bytes[i]);
	}
	return string;
}
