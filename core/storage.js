const fs = require('fs');
const files = require('./files.js');
const uuid = require('./uuid.js');
const hashing = require('./hashing.js');
const crypt = require('./crypt.js');

let encryptionKey = '' + files.load('dbKey.key');

let databaseName = 'storage';

const cache = loadCache();

function loadCache() {
	let c = {};
	try {
		fs.readdirSync(databaseName + '/').forEach(folder => {
			try {
				let table = files.loadAll(databaseName + '/' + folder + '/');
				for (let key in table) {
					table[key] = JSON.parse(decrypt(table[key], key));
				}
				c[folder] = table;
			} catch (e) {}
		});
	} catch (e) {}
	return c;
}

function insert(table, obj) {
	let id = uuid.compress(uuid.random());
	let meta = {id, creationTime: new Date(), lastUpdateTime: new Date()};

	if (!cache[table]) cache[table] = {};
	cache[table][id] = {meta, obj};

	files.write(`${databaseName}/${table}/${id}.row`, encrypt(JSON.stringify({meta, obj}), id));

	return meta;
}

function store(table, id, obj) {
	if (!cache[table]) cache[table] = {};

	let {meta} = cache[table][id];
	if (!meta) meta = {id, creationTime: new Date(), lastUpdateTime: new Date()};

	meta.lastUpdateTime = new Date();
	cache[table][id] = {meta, obj};

	files.write(`${databaseName}/${table}/${id}.row`, encrypt(JSON.stringify({meta, obj}), id));
}

function load(table, id) {
	if (!cache[table]) cache[table] = {};
	if (cache[table][id] != undefined) return cache[table][id];
	return null;
}

function loadAll(table) {
	let objs = [];
	if (cache[table]) {
		for (let key in cache[table]) {
			objs.push(cache[table][key]);
		}
	}
	return objs;
}

function remove(table, id) {
	if (cache[table]) delete cache[table][id];
	files.remove(`${databaseName}/${table}/${id}.row`);
}

exports.insert = insert;
exports.update = store;
exports.store = store;
exports.load = load;
exports.remove = remove;
exports.loadAll = loadAll;

function encrypt(string, id) {
	return crypt.encrypt(encryptionKey, id, string);
}

function decrypt(string, id) {
	return crypt.decrypt(encryptionKey, id, string);
}
