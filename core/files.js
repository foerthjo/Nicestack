const fs = require('fs');

function load(path, convert=function(binary){return '' + binary}) {
	let content = null;
	try {
		content = convert(fs.readFileSync(path));
	} catch (e) {}
	return content;
}

function write(path, content) {
	try {
		fs.mkdirSync(path.split('/').slice(0, -1).reduce((acc, val, i) => i == 0 ? val : `${acc}/${val}`), {recursive: true});
		fs.writeFileSync(path, content);
	} catch (error) {
		console.log('could not write file "' + path + '"');
	}
}

function writeDirectory(path, object) {
	for (let key in object) {
		if (typeof object[key] == 'object') {
			writeDirectory(path + '/' + key, object[key]);
		}
		if (typeof object[key] == 'string') {
			writeBase64(path + '/' + key, object[key]);
		}
	}
}

function writeBase64(path, content) {
	try {
		fs.mkdirSync(path.split('/').slice(0, -1).reduce((acc, val, i) => i == 0 ? val : `${acc}/${val}`), {recursive: true});
		fs.writeFileSync(path, content, 'base64');
	} catch (error) {
		console.log('could not write file "' + path + '"');
	}
}

function readBase64(path) {
	try {
		return '' + fs.readFileSync(path, {encoding: "base64"});
	} catch (e) { console.log(e); }
	return null;
}

function readDirectory(path) {
	let dir = {};
	try {
		fs.readdirSync(path, {withFileTypes: true}).forEach(dirent => {
			if (dirent.isDirectory()) {
				dir[dirent.name] = readDirectory(path + '/' + dirent.name);
			} else {
				try {
					dir[dirent.name] = readBase64(path + '/' + dirent.name);
				} catch (e) { console.log(e); }
			}
		});
	} catch (e) { console.log(e); }
	return dir;
}

function remove(path) {
	try {
		fs.unlinkSync(path);
	} catch (e) {
		console.log(e);
	}
}

function removeDir(path) {
	try {
		fs.rmSync(path, {recursive: true, force: true});
	} catch (e) { console.log(e); }
}

function loadAll(path, convert=function(binary){return '' + binary}) {
	let files = {};
	try {
		fs.readdirSync(path).forEach(file => {
			files[file.split('.')[0]] = convert(load(path + file));
		});
	} catch (e) {
		// console.log(e);
	}
	return files;
}

exports.load = load;
exports.loadAll = loadAll;
exports.readDirectory = readDirectory;
exports.write = write;
exports.writeBase64 = writeBase64;
exports.writeDirectory = writeDirectory;
exports.remove = remove;
exports.removeDir = removeDir;