const http = require('http');
const fs = require('fs');
const files = require('./files');
const hashing = require('./hashing.js');
const preCompiler = require('./preCompiler');

const exposed = {};
const eventHandlers = {};
const routines = {};
const subscribers = {};

const sysOps = {};
const registeredNamespaces = {};
const protectedNamespaces = {};
const protectionKeys = new Set();
const injectedDependencies = {call};

const featureFlags = {};

function featureFlag(name, active) {
	featureFlags[name] = active;
}

on('namespace', (info) => {
	if (info.name) {
		if (info.key) {
			if (protectionKeys.has(info.key)) {
				return protectedNamespaces[info.name];
			}
		} else {
			return registeredNamespaces[info.name];
		}
	}
	return null;
});

let delay = 0;

function openHTTP(port) {
	let server = http.createServer((req, res) => {
		onRequest(req)
		.then((response) => {
			if (response && response.content) {
				res.statusCode = 200;
				if (response.type == "application/zip") {
					res.setHeader('Content-Type', response.type);
					res.setHeader('Content-Length', response.content.length);
					res.write(response.content, 'binary');
					res.end();
				} else {
					if (response.type) res.setHeader('Content-Type', response.type);
					res.end(response.content);
				}
			} else {
				res.statusCode = 404;
				res.end();
			}
		})
		.catch(e => {
			console.log(e);
			res.statusCode = 500;
			res.end();
		});
	});

	server.listen(port, () => {
		console.log(`intercept http server listening on port ${port}`);
	});
}

function exposePNG(url, image) {
	exposeImage(url, image, 'png');
}

function exposeImage(url, image, imageType) {
	exposed[url] = {type: 'image/' + imageType, content: fs.readFileSync(image)};
}

function exposeHTML(url, html) {
	exposed[url] = {type: 'text/html charset=utf-8', content: html};
}

function exposeText(url, file) {
	exposed[url] = {type: 'text/plain charset=utf-8', content: '' + fs.readFileSync(file)};
}

function exposeJSON(url, file) {
	exposed[url] = {type: 'text/json charset=utf-8', content: '' + fs.readFileSync(file)};
}

function exposeJS(url, file) {
	exposed[url] = {type: 'text/javascript charset=utf-8', content: '' + fs.readFileSync(file)};
}

function exposeCSS(url, file) {
	exposed[url] = {type: 'text/css charset=utf-8', content: '' + fs.readFileSync(file)};
}

function exposeZIP(url, file) {
	exposed[url] = {type: 'application/zip', content: fs.readFileSync(file)};
}

function on(event, callback) {
	eventHandlers[event] = callback;
}

function registerRoutine(key, callback) {
	routines[key] = callback;
}

function namespace(name, path) {
	n = files.load(path);
	compile(name, n, registeredNamespaces);
}

function namespaces(path) {
	let f = files.loadAll(path);
	for (key in f) {
		compile(key, f[key], registeredNamespaces);
	}
}

function protectedNamespace(name, path) {
	n = files.load(path);
	compile(name, n, protectedNamespaces);
}

function registerProtectionKey(key) {
	if (key) {
		protectionKeys.add(key);
	}
}

function injectDependencies(dependencies) {
	for (key in dependencies) {
		injectedDependencies[key] = dependencies[key];
	}
}

function compile(name, namespace, namespaceRegister) {
	let compiled = preCompiler.compile(namespace, featureFlags);
	namespaceRegister[name] = compiled.namespace;
	compiled.serverFunctions.forEach(fn => {
		registerServerCode(fn);
	});
}

function registerServerCode(fn) {
	try {
		new Function(`this.${fn.name} = ${fn.async ? 'async ' : ''}function(${fn.parameters}){${fn.body}};`).call(sysOps);
	} catch (e) {
		console.log(`Error in ${fn.name}`);
		console.log(e);
	}
	on(fn.name, async (parameters) => {
		return await call(sysOps[fn.name], parameters);
	});
}

function call(fn, parameters) {
	return fn.call(sysOps, parameters, injectedDependencies);
}

function update(event, callback) {
	let subs = subscribers[event];
	if (subs) {
		subs.forEach(sub => {
			if (typeof(callback) == 'string') {
				sub.resolve(eventHandlers[callback](sub.parameters));
			} else {
				sub.resolve(callback(subs.parameters));
			}
		});
	}
	delete subscribers[event];
}

async function onRequest(req) {
	if (delay > 0) {await new Promise(res => {setTimeout(res, delay);});}

	try {
		switch (req.method) {
			case 'GET': return await onGet(req.url.slice(1));
			case 'POST': return {type: 'text/json charset=utf-8', content: JSON.stringify({data: await handleRequest(await readRequest(req))})};
		}
	} catch (e) {
		console.log(e);
	}
}

async function handleRequest(request) {
	if (request == null) return null;
	if (request.requestType == 'intercept_bundle') {
		let bundle = [];
		for (let i = 0; i < request.info.length; i++) {
			let iterationResult = null;
			if (request.info[i].type == 'intercept_update') {
				let {eventname, id} = request.info[i];
				if (temporalCache[eventname]) {
					if (temporalCache[eventname][id]) {
						iterationResult = {
							data: temporalCache[eventname][id].map(item => item.data),
						};
						deleteTemporalCache(eventname, id);
					}
				}
			} else {
				let {event, hash, parameters} = request.info[i];
				handler = eventHandlers[event];
				if (handler) {
					try {
						for (let key in parameters) {
							let routine = routines[key];
							if (routine) {
								let result = await routine(parameters);
								if (result) for (let k in result) {
									parameters[k] = result[k];
								}
							}
						}
					} catch (e) {}
					try {
						let data = await handler(parameters);
						let newHash = hashing.hash(JSON.stringify(data), '').substring(0, 4);
						if (newHash != hash) {
							iterationResult = {data, hash: newHash};
						}
					} catch (e) {console.log(event, e);}
				}
			}
			bundle[i] = iterationResult;
		}
		return bundle;
		/*
		return await Promise.all(request.info.map(async ({event, hash, parameters}) => {
			handler = eventHandlers[event];
			if (handler) {
				try {
					for (let key in parameters) {
						let routine = routines[key];
						if (routine) {
							let result = await routine(parameters);
							if (result) for (let k in result) {
								parameters[k] = result[k];
							}
						}
					}
				} catch (e) {}
				try {
					let data = handler(parameters);
					let newHash = hashing.hash(JSON.stringify(data), '').substring(0, 4);
					if (newHash != hash) {
						console.log(event, data);
						return {data, hash: newHash};
					}
				} catch (e) {console.log(event, e);}
				return null;
			}
		}));
		*/
	}

	if (request.requestType == 'intercept_subscription') {
		let subs = subscribers[request.info.event];
		if (!subs) {
			subs = [];
			subscribers[request.info.event] = subs;
		}

		return new Promise(res => {
			subs.push({
				resolve: res,
				parameters: request.info.parameters,
			});
		});
	}

	handler = eventHandlers[request.requestType];
	if (handler) {
		let parameters = request.info;
		try {
			for (let key in parameters) {
				let routine = routines[key];
				if (routine) {
					let result = await routine(parameters);
					for (let k in result) {
						parameters[k] = result[k];
					}
				}
			}
		} catch (e) {}
		try {
			return await handler(parameters);
		} catch (e) {console.log(request.requestType, e);}
	}
}

async function onGet(url) {
	let data = exposed[url];
	if (data && data.content && data.type) {
		return data;
	}

	data = exposed['*'];
	if (data && data.content && data.type) {
		return data;
	}
}

async function readRequest(req) {
	return new Promise((res, rej) => {
		let data = '';
		req.on('data', (d) => {
			data += d;
		});
		req.on('end', () => {
			let object = null;
			try {
				object = JSON.parse(data);
			} catch (e) {
				res(null);
				return;
			}

			if (object) {
				res(object);
			} else {
				res(null);
			}
		});
	});
}

function writeResponse(res, data) {
	if (data) {
		res.statusCode = 200;
		res.setHeader('Content-Type', 'text/json; charset=utf-8');
		res.end(JSON.stringify({data}));
	} else {
		res.end();
	}
}

const temporalCache = {};
function send(eventname, id, data) {
	if (!temporalCache[eventname]) temporalCache[eventname] = {};
	if (!temporalCache[eventname][id]) temporalCache[eventname][id] = [];
	temporalCache[eventname][id].push({
		timestamp: new Date(),
		data,
	});
}

function deleteTemporalCache(eventname, id) {
	if (temporalCache[eventname]) {
		delete temporalCache[eventname][id];
		if (Object.keys(temporalCache[eventname]).length == 0) {
			delete temporalCache[eventname];
		}
	}
}

setInterval(() => {
	let now = new Date();
	Object.keys(temporalCache).forEach(eventname => {
		Object.keys(temporalCache[eventname]).forEach(id => {
			temporalCache[eventname][id] = temporalCache[eventname][id].filter(item => now - item.timestamp < 1500);
			if (temporalCache[eventname][id].length == 0) {
				deleteTemporalCache(eventname, id);
			}
		});
	});
}, 1000);

exports.openHTTP = openHTTP;

exports.exposeImage = exposeImage;
exports.exposePNG = exposePNG;
exports.exposeHTML = exposeHTML;
exports.exposeText = exposeText;
exports.exposeJSON = exposeJSON;
exports.exposeZIP = exposeZIP;
exports.exposeJS = exposeJS;
exports.exposeCSS = exposeCSS;

exports.on = on;
exports.routine = registerRoutine;

exports.namespaces = namespaces;
exports.namespace = namespace;
exports.inject = injectDependencies;

exports.update = update;
exports.send = send;

// exports.readRequest = readRequest;
exports.writeResponse = writeResponse;

exports.protectedNamespace = protectedNamespace;
exports.registerProtectionKey = registerProtectionKey;
exports.featureFlag = featureFlag;

exports.simulateDelay = (d) => delay = d;
