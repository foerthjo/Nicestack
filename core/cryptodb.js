const files = require('./files.js');
const uuid = require('./uuid.js');
const crypt = require('./crypt.js');

let encryptionKey = '' + files.load('dbKey.key');

function store(table, id, object) {
	id = this.ensureCompression(id);
	object.lastUpdateTime = new Date();
	if (!object.creationTime) object.creationTime = new Date();

	try {
		files.write(`${this.name}/${table}/${id}.row`, this.encrypt(JSON.stringify(object), id));
	} catch (e) {}

	return {id, creationTime: object.creationTime, lastUpdateTime: object.lastUpdateTime};
}

function buildPartitionPath(table, idList) {
	let path = `${this.name}/${table}/`;
	if (idList.length) {
		for (let i = 0; i < idList.length; i++) {
			path += this.ensureCompression(idList[i]) + '/';
		}
	}
	return path;
}

function storePartitioned(table, idList, id, object) {
	id = this.ensureCompression(id);
	object.lastUpdateTime = new Date();
	if (!object.creationTime) object.creationTime = new Date();

	let path = this.buildPartitionPath(table, idList);

	try {
		files.write(path + id + '.row', this.encrypt(JSON.stringify(object), id));
	} catch (e) {}

	return {id, creationTime: object.creationTime, lastUpdateTime: object.lastUpdateTime};
}

function remove(table, id) {
	id = this.ensureCompression(id);
	files.remove(`${this.name}/${table}/${id}.row`);
}

function insert(table, object) {
	let id = uuid.compressed();
	object.lastUpdateTime = new Date();
	object.creationTime = new Date();

	try {
		files.write(`${this.name}/${table}/${id}.row`, this.encrypt(JSON.stringify(object), id));
	} catch (e) {}

	return id;
}

function load(table, id) {
	id = this.ensureCompression(id);
	let object = null;
	try {
		object = files.load(`${this.name}/${table}/${id}.row`, bin => {return JSON.parse(this.decrypt('' + bin, id));});
		if (object != null) object.id = id;
	} catch (e) {console.log(e);}
	return object;
}

function loadPartition(table, idList) {
	let path = this.buildPartitionPath(table, idList);

	let objs = [];
	try {
		let map = files.loadAll(path);
		for (let key in map) {
			map[key] = JSON.parse(this.decrypt(map[key], key));
			if (map[key] != null) map[key].id = key;
			objs.push(map[key]);
		}
	} catch (e) {}

	return objs;
}

function loadPartitioned(table, idList, id) {
	let path = this.buildPartitionPath(table, idList);
	id = this.ensureCompression(id);

	let object = null;
	try {
		object = files.load(`${path}${id}.row`, bin => {return JSON.parse(this.decrypt('' + bin, id));});
		if (object != null) object.id = id;
	} catch (e) {console.log(e);}
	return object;
}

function loadAll(table) {
	let all = [];
	try {
		let map = files.loadAll(`${this.name}/${table}/`);
		for (let key in map) {
			map[key] = JSON.parse(this.decrypt(map[key], key));
			if (map[key] != null) map[key].id = key;
			all.push(map[key]);
		}
	} catch (e) {console.log(e);}
	return all;
}

function analysis() {
	let tables = files.loadAll(`${this.name}/`);
	for (let table in tables) {
		let structure = {};
		let map = files.loadAll(`${this.name}/${table}/`);
		for (let key in map) {
			map[key] = JSON.parse(this.decrypt(map[key], key));
			for (let name in map[key]) {
				structure[name] = typeof map[key][name];
			}
		}
		tables[table] = structure;
	}
	return tables;
}

function ensureCompression(string) {
	if (!string) return null;

	for (let i = 0; i < string.length; i++) {
		if (!'0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'.includes(string.charAt(i))) {
			return compress(string);
		}
	}
	return string;

	function compress(string) {
		const compressedChars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
		let num = 0;
		let compressed = '';
		for (let i = 0; i < string.length; i++) {
			while (i < string.length && num < compressedChars.length) {
				num *= 256;
				num += string.charCodeAt(i);
				i++;
			}
			while (num >= compressedChars.length) {
				let index = num % compressedChars.length;
				compressed += compressedChars.charAt(index);
				num = (num - index) / compressedChars.length;
			}
		}
		while (num > 0) {
			let index = num % compressedChars.length;
			compressed += compressedChars.charAt(index);
			num = (num - index) / compressedChars.length;
		}
		return compressed;
	}
}

function encrypt(string, id) {
	if (this.shouldEncrypt) return crypt.encrypt(encryptionKey, id, string);
	return string;
}

function decrypt(string, id) {
	if (this.shouldEncrypt) return crypt.decrypt(encryptionKey, id, string);
	return string;
}

function createDB(name, shouldEncrypt=true) {
	return {
		name, // v
		shouldEncrypt,
		buildPartitionPath, // v
		store, // v
		storePartitioned, // v
		remove, // v
		insert, // v
		load, // v
		loadPartition, // v
		loadPartitioned, // v
		loadAll, // v

		ensureCompression, // v

		encrypt, // v
		decrypt, // v

		analysis, // v
	};
}

function test() {
	let testDB = createDB('test_db');

	let obj1 = {name: 'obj1', value: 'content'};
	let {id, creationTime, lastUpdateTime} = testDB.insert('objects', obj1);
	console.log(obj1, testDB.load('objects', id));

	setTimeout(() => {
		obj1.value = 'new content';
		testDB.store('objects', id, obj1);
		console.log(obj1, testDB.load('objects', id));

		testDB.remove('objects', id);
		console.log(null, testDB.load('objects', id));

		testDB.store('name_to_object', 'name-1', id);
		console.log(id, testDB.load('name_to_object', 'name-1'));
	}, 1000);
}

module.exports = {
	test,
	createDB,
}
