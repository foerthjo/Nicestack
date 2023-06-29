function removeComments(file) {
	let tokens = tokenize(file, ['@*', '*@']);
	let text = '';
	while (tokens.length > 0) {
		if (tokens[0] == '@*') {
			readBrackets(tokens, '@*', '*@');
		} else {
			text += tokens.shift();
		}
	}
	return text;
}

function resolveDefines(file) {
	let tokens = tokenize(file, ['@define', '{', '}']);
	let names = [];
	let defines = {};
	while (tokens.length > 0) {
		if (tokens[0] == '@define') {
			tokens.shift(); // @define
			let name = tokens.shift().trim(); // name
			let content = readBrackets(tokens, '{', '}');
			defines[name] = content;
			names.push(name);
		} else {
			tokens.shift();
		}
	}

	names.forEach(name => {
		file = file.replace(new RegExp(name, 'g'), '(' + defines[name] + ')');
	});

	return file;
}

function replaceEscapeSequences(file) {
	let tokens = tokenize(file, ['@{', '}', ' ']);
	let text = '';
	while (tokens.length > 0) {
		if (tokens[0] == '@{') {
			tokens.shift(); // @{
			text += '${escapeHTML(' + tokens.shift() + ')}';
			tokens.shift(); // }
		} else {
			text += tokens.shift();
		}
	}
	return text;
}

function replaceIfs(file) {
	let tokens = tokenize(file, ['@if', '(', ')', '{', '}', 'else']);
	let text = '';
	while (tokens.length > 0) {
		if (tokens[0] == '@if') {
			tokens.shift(); // @if
			let condition = readBrackets(tokens, '(', ')');
			let trueContent = replaceIfs(readBrackets(tokens, '{', '}'));
			let falseContent = '';
			if (tokens[0] == 'else') {
				tokens.shift(); // else
				falseContent = replaceIfs(readBrackets(tokens, '{', '}'));
			}
			text += '${(' + condition + ') ? `' + trueContent + '` : `' + falseContent + '`}';
		} else {
			text += tokens.shift();
		}
	}
	return text;
}

function replaceFors(file) {
	let tokens = tokenize(file, ['@for', '(', ')', '{', '}']);
	let text = '';
	while (tokens.length > 0) {
		if (tokens[0] == '@for') {
			tokens.shift(); // @for
			let head = readBrackets(tokens, '(', ')');
			let body = replaceFors(readBrackets(tokens, '{', '}'));
			let [variable, array] = head.split(' in ');
			if (variable.includes(', ')) {
				let [varName, index] = variable.split(', ');
				text += '${' + array + '.map((' + varName + ', ' + index + ') => `' + body + '`).join(\'\')}';
			} else {
				text += '${' + array + '.map(' + variable + ' => `' + body + '`).join(\'\')}';
			}
		} else {
			text += tokens.shift();
		}
	}
	return text;
}

function replaceDataBindings(file) {
	let tokens = tokenize(file, ['§{', '}']);
	let text = '';
	while (tokens.length > 0) {
		if (tokens[0] == '§{') {
			let varName = readBrackets(tokens, '§{', '}');
			text += `<span var="${varName}">/</span>`;
		} else {
			text += tokens.shift();
		}
	}
	return text;
}

function replaceServercalls(file) {
	let tokens = tokenize(file, ['@server.', '(', ')']);
	let text = '';
	while (tokens.length > 0) {
		if (tokens[0] == '@server.') {
			tokens.shift(); // @server.
			let functionName = tokens.shift();
			let parameters = readBrackets(tokens, '(', ')');
			text += `callServer('${functionName}', ${parameters})`;
		} else {
			text += tokens.shift();
		}
	}
	return text;
}

function replaceFeatureFlags(file, featureFlags) {
	let tokens = tokenize(file, ['@feature', '{', '}']);
	file = '';
	while (tokens.length > 0) {
		let token = tokens.shift();
		if (token == '@feature' && tokens.length > 0) {
			token = tokens.shift();
			token = token.replace(/\s*/g, '');
			let features = token.split(',');
			if (!features.some(f => featureFlags[f] == false)) { // note that this is true if the feature is not listed in the feature flag file
				file += readBrackets(tokens, '{', '}');
			} else {
				readBrackets(tokens, '{', '}');
			}
		} else {
			file += token;
		}
	}
	return file;
}

function tokenize(text, separators) {
	let tokens = [text];
	separators.forEach(s => {
		let ts = [];
		tokens.forEach(t => {
			let split = t.split(s);
			split.forEach((item, i) => {
				if (item && (separators.includes(item) || !/^[\s]*$/.test(item))) ts.push(item);
				if (i < split.length - 1) {
					ts.push(s);
				}
			});
		});
		tokens = ts;
	});
	return tokens;
}

function readBrackets(tokens, opening, closing) {
	let inner = '';
	tokens.shift(); // opening
	let braces = 1;
	while (tokens.length > 0 && braces > 0) {
		let token = tokens.shift();
		if (token == opening) braces++;
		if (token == closing) braces--;
		if (braces > 0) inner += token;
	}
	return inner;
}

function getSections(sectionStart, openingBracket, closingBracket, file) {
	let tokens = tokenize(file, [sectionStart, openingBracket, closingBracket]);
	let sections = [];
	while (tokens.length > 0) {
		if (tokens[0] == sectionStart) {
			tokens.shift(); // sectionStart
			sections.push(readBrackets(tokens, openingBracket, closingBracket));
		} else {
			tokens.shift();
		}
	}
	return sections;
}

function getFunctions(start, file) {
	let tokens = tokenize(file, [start, 'async', '(', ')', '{', '}']);
	let functions = [];
	while (tokens.length > 0) {
		if (tokens[0] == start) {
			tokens.shift(); // start
			let f = {};
			if (tokens[0] == 'async') {
				f.async = true;
				tokens.shift(); // async
			}
			f.name = tokens.shift().replace(/\s/g, '');
			f.parameters = readBrackets(tokens, '(', ')');
			f.body = readBrackets(tokens, '{', '}');
			functions.push(f);
		} else {
			tokens.shift();
		}
	}
	return functions;
}

function compile(file, featureFlags) {
	file = removeComments(file);
	file = resolveDefines(file);
	if (featureFlags) file = replaceFeatureFlags(file, featureFlags);
	file = replaceEscapeSequences(file);
	file = replaceIfs(file);
	file = replaceFors(file);
	file = replaceDataBindings(file);
	file = replaceServercalls(file);
	let dependencies = getSections('@using', ' ', ';', file);
	let skeleton = getSections('@skeleton', '{', '}', file);
	let style = getSections('@style', '{', '}', file);
	let clientFunctions = getFunctions('@client', file);
	let serverFunctions = getFunctions('@server', file);

	let namespace = '';
	if (dependencies.length > 0) namespace += `this.dependencies = ${JSON.stringify(dependencies)};\n`;
	if (skeleton.length > 0) namespace += `this.skeleton = \`${skeleton.join('\n')}\`;\n`;
	if (style.length > 0) namespace += `this.style = \`${style.join('\n')}\`;\n`;
	if (clientFunctions.length > 0) namespace += `this.functions = ${JSON.stringify(clientFunctions.map(f => f.name))};\n`;
	if (clientFunctions.length > 0) namespace += clientFunctions.map(f => `this.${f.name} = ${f.async ? 'async ' : ''}function(${f.parameters}) {${f.body}};\n`).join('');
	return {namespace, serverFunctions};
}

exports.compile = compile;
