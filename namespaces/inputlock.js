@client lock(area) {
	area.classList.add('lockedin');
}

@client unlock(area) {
	area.classList.remove('lockedin');
}
