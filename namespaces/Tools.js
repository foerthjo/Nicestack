@client includesPathElement(path, element) {
	for (let i = 0; i < path.length; i++) {
		if (path[i] == element) return true;
	}
	return false;
}