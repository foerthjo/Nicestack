@client getCache() {
	if (!this.cache) this.cache = {};
	return this.cache;
}

@client get(key) {
	let cache = this.getCache();
	let value = cache[key];
	if (value) return value;
	cache[key] = JSON.parse(localStorage.getItem(key));
	return cache[key];
}

@client set(key, value) {
	let cache = this.getCache();
	cache[key] = value;
	if (this.getCookiesAllowed()) localStorage.setItem(key, JSON.stringify(value));
}

@client getCookiesAllowed() {
	return this.get('cookiesAllowed');
}

@client setCookiesAllowed(allowed) {
	if (this.get('cookiesAllowed') !== allowed) {
		this.set('cookiesAllowed', allowed);
		window.cookiesAllowed = allowed;
		if (allowed === false) {
			localStorage.clear();
		} else {
			if (this.cache) {
				for (let key in this.cache) {
					localStorage.setItem(key, JSON.stringify(this.cache[key]));
				}
			}
		}
	}
}