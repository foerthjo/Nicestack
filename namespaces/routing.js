@client init(page, parameters={}, force=false) {
	if (force || location.pathname.slice(1).length == 0) {
		history.pushState(null, null, this.buildPath(page, parameters));
	}
}

@client buildPath(page, parameters) {
	let loc = page;
	let hash = true;
	for (let key in parameters) {
		loc += `${hash ? '#' : '&'}${key}=${parameters[key]}`;
		hash = false;
	}
	return loc;
}

@client nav(page, parameters={}) {
	history.pushState(null, null, this.buildPath(page, parameters));

	if (!this.handlers) this.handlers = {};
	let handler = this.handlers[page];
	if (!handler) handler = this.handlers['*'];
	if (handler) {
		handler(parameters);
	}
	this.currentState = location.pathname.slice(1) + location.hash;

	window.scrollTo(0, 0);
}

@client reload() {
	this.restore(true);
}

@client on(eventName, callback) {
	if (!this.handlers) this.handlers = {};
	this.handlers[eventName] = callback;
}

@client restore(force=false) {
	if (!force && this.currentState == location.pathname.slice(1) + location.hash) return console.log('routing prevented re-navigating to the page that is already loaded');
	
	let page = location.pathname.slice(1);
	let parameters = {};
	if (location.hash.includes("=")) location.hash.replace('#', '').split('&').forEach(p => {
		let [key, value] = p.split('=');
		parameters[key] = value;
	});
	else parameters = location.hash.replace("#", '');
	if (!this.handlers) this.handlers = {};
	let handler = this.handlers[page];
	if (!handler) handler = this.handlers['*'];
	if (handler) {
		handler(parameters);
	}
	this.currentState = location.pathname.slice(1) + location.hash;
}
