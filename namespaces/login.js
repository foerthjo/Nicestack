@client setToken(token) {
	if (token == null) {
		localStorage.removeItem('loginToken');
		this.token = null;
	} else {
		if (window.cookiesAllowed) localStorage.setItem('loginToken', token);
		this.token = token;
	}
}

@client setUserID(id) {
	if (id == null) {
		localStorage.removeItem('userID');
		this.userID = null;
	} else {
		if (window.cookiesAllowed) localStorage.setItem('userID', id);
		this.userID = id;
	}
}

@client getToken() {
	if (!this.token) this.token = localStorage.getItem('loginToken');
	return this.token;
}

@client getUserID() {
	if (!this.userID) this.userID = localStorage.getItem('userID');
	return this.userID;
}

@client setData(loginData) {
	if (!loginData) loginData = {};
	this.setToken(loginData.token);
	this.setUserID(loginData.userID);
}

@client getData() {
	let userID = this.getUserID();
	if (!userID) return null;
	let token = this.getToken();
	if (!token) return null;
	return {
		userID,
		token,
	};
}

@client storeCache() {
	this.setToken(this.token);
	this.setUserID(this.userID);
}

@client async isLoggedIn() {
	let loginData = this.getData();
	if (!loginData) return false;
	return !! (await callServer('login_isLoggedIn', {loginData}));
}

@server login_isLoggedIn({user}) {
	return user != null;
}