@client toAgo(date) {
	return `vor ${this.timeAgoUnits(date, {
		seconds: ["Sekunde", "Sekunden"],
		minutes: ["Minute", "Minuten"],
		hours: ["Stunde", "Stunden"],
		days: ["Tag", "Tagen"],
		months: ["Monat", "Monaten"],
		years: ["Jahr", "Jahren"],
	})}`;
}

@client toTime(millis) {
	let hours = ((millis / 1000 / 60 / 60) % 24).toFixed(0);
	if (hours > 0) return this.unit(hours, ['Stunde', 'Stunden']);

	let minutes = ((millis / 1000 / 60) % 60).toFixed(0);
	if (minutes > 0) return this.unit(minutes, ['Minute', 'Minuten']);

	let seconds = ((millis / 1000) % 60).toFixed(0);
	if (seconds > 0) return this.unit(seconds, ['Sekunde', 'Sekunden']);

	return '1 Sekunde';
}

@client timeAgoUnits(date, units) {
	date = new Date(date);
	let duration = (new Date() - date) / 1000;
	if (duration < 60) return this.unit(Math.floor(duration), units.seconds);
	duration /= 60;
	if (duration < 60) return this.unit(Math.floor(duration), units.minutes);
	duration /= 60;
	if (duration < 24) return this.unit(Math.floor(duration), units.hours);
	duration /= 24;
	if (duration < 28) return this.unit(Math.floor(duration), units.days);
	if (duration / 28 < 13) return this.unit(Math.floor(duration * 12 / 365), units.months);
	return this.unit(Math.floor(duration / 365), units.years);
}

@client unit(value, unit) {
	if (value == 1) return `${value} ${unit[0]}`;
	return `${value} ${unit[1]}`;
}
