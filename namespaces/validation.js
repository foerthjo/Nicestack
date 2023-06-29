@client invalid(fields, message, green) {
	if (fields.push) {
		for (let i in fields) {
			this.invalidSingle(fields[i], message, green);
		}
	} else {
		this.invalidSingle(fields, message, green);
	}

	return false;
}

@client invalidSingle(field, message, green) {
	let existing = document.querySelector(`#${field.getAttribute('ref')}_validmsg`);
	if (existing) {
		existing.innerHTML = message;
	} else {
		field.insertAdjacentHTML('afterend', `<p id="${field.getAttribute('ref')}_validmsg" class="${green ? 'valid' : 'invalid'}">${message}</p>`);
	}
	return false;
}

@client valid(field, message) {
	if (message != null) {
		this.invalidSingle(field, message, true);
		return true;
	}
	let existing = document.querySelector(`#${field.getAttribute('ref')}_validmsg`);
	if (existing)
		existing.remove();
	return true;
}

@client required(field, message="this field must not be empty") {
	if (field.value == null || field.value == '') return this.invalid(field, message);
	return this.valid(field);
}
