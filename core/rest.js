const http = require('http');

function requester(ip, port) {
	async function httpRequest(method, path, body=null) {
		return new Promise((resolve, reject) => {
			let req = http.request({host: ip, port, path, method}, (res) => {
				let data = '';
				res.on('data', (d) => {
					data += d;
				});
				res.on('end', () => {
					let object = null;
					if (data) try {
						object = JSON.parse(data);
					} catch (e) { console.log(e); }
					resolve(object);
				});
				res.on("error", (e) => {
					console.log(e);
					resolve(null);
				});
			});
			req.on("error", (e) => {
				console.log(e);
				resolve(null);
			});
			if (body != null) {
				req.write(JSON.stringify(body));
			}
			req.end();
		});
	}

	async function get(path, body) {
		return await httpRequest('GET', path, body);
	}
	async function post(path, body) {
		return await httpRequest('POST', path, body);
	}
	async function put(path, body) {
		return await httpRequest('PUT', path, body);
	}
	async function patch(path, body) {
		return await httpRequest('PATCH', path, body);
	}
	async function del(path, body) {
		return await httpRequest('DELETE', path, body);
	}

	return {
		ip, port,
		get, post, put, del, patch
	};
}

function api(port) {
	let methodHandlers = {
		GET: {},
		POST: {},
		PUT: {},
		PATCH: {},
		DELETE: {},
	};
	async function handleRequest(method, url, object) {
		let handlers = methodHandlers[method];
		if (handlers) {
			let handler = handlers[url];
			if (handler) {
				try {
					return await handler(object);
				} catch (e) { console.log(e); }
			}
		}
		return null;
	}

	function get(url, handler) { methodHandlers.GET[url] = handler; }
	function post(url, handler) { methodHandlers.POST[url] = handler; }
	function put(url, handler) { methodHandlers.PUT[url] = handler; }
	function patch(url, handler) { methodHandlers.PATCH[url] = handler; }
	function del(url, handler) { methodHandlers.DELETE[url] = handler; }

	let server = http.createServer((req, res) => {
		let data = '';
		req.on('data', (d) => {
			data += d;
		});
		req.on('end', async () => {
			let object = null;
			try {
				if (data) object = JSON.parse(data);
			} catch (e) { console.log(e); }
			
			if (object == null) object = {};

			let response = await handleRequest(req.method, req.url, object);
			if (response) {
				res.statusCode = 200;
				res.setHeader('Content-Type', 'application/json');
				if (response) res.write(JSON.stringify(response));
			} else {
				res.statusCode = 404;
			}
			res.end();
		});
		req.on("error", (e) => {
			console.log(e);
			res.statusCode = 500;
			res.end();
		});
	});
	try {
		server.listen(port, () => {
			console.log(`[+] ${port} REST API listening`);
		});
	} catch (e) { console.log(e); }

	function close() {
		console.log(`[-] ${port} REST API closing`);
		server.close();
	}

	return {
		get, post, put, del, patch, close
	};
}

exports.requester = requester;
exports.api = api;