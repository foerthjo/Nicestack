@client async instantiate(namespace, element, parameters={}) {
	if (!element) return;
	if (!window.components) window.components = [];
	
	if (namespace.prerender) namespace.prerender.call(element);

	if (element.htmlContent == undefined) element.htmlContent = element.innerHTML;
	element.innerHTML = '';

	components.forEach((c, i) => {
		if (!document.body.contains(c)) components[i] = null;
	});
	if (element.componentIndex == undefined) {
		for (let i = 0; i <= components.length; i++) {
			if (!components[i]) {
				components[i] = element;
				element.componentIndex = i;
				break;
			}
		}
	}
	if (!window.registeredStyles) window.registeredStyles = new Set();
	if (!registeredStyles.has(namespace.name)) {
		registeredStyles.add(namespace.name);
		if (namespace.style) {
			let styleElement = document.createElement('style');
			styleElement.innerHTML = namespace.style;
			document.body.append(styleElement);
		}
	}

	if (namespace.functions) namespace.functions.forEach(fn => {
		element[fn] = namespace[fn].bind(element);
	});

	let html = namespace.skeleton || '';
	if (namespace.render) html = namespace.render.call(element);
	await this.changeHTML(element, element, html);

	if (namespace.postrender) namespace.postrender.call(element);

	if (namespace.load) await namespace.load.call(element, parameters);
}

@client appendHTML(element, html, thisReference) {
	let div = document.createElement('div');
	this.changeHTML(thisReference, div, html);
	children = [...div.children];
	children.forEach(child => {
		element.insertAdjacentElement('afterbegin', child);
	})
	delete div;
}

@client async changeHTML(thisReference, element, html) {
	if (!thisReference || thisReference.componentIndex == undefined) console.log("[WARN]", element, 'you are changing html without providing a component reference');
	if (thisReference.componentIndex != undefined) html = html.replace(/@this/g, `components[${thisReference.componentIndex}]`);

	@*
	let virtual = document.createElement(element.tagName);
	[...element.getAttributeNames()].forEach(name => {
		virtual.setAttribute(name, element.getAttribute(name));
	});
	virtual.innerHTML = html;
	this.adjust(element, virtual);
	*@
	
	element.innerHTML = html;

	if (element.querySelectorAll) {
		// references to elements or subcomponents (which are elements themselves)
		element.querySelectorAll('[ref]').forEach(e => {
			thisReference[e.getAttribute('ref')] = e;
		});

		// data binding
		let uniqueVarNames = new Set();
		element.querySelectorAll('[var]').forEach(e => {
			let varName = e.getAttribute('var');
			if (thisReference[varName]) {
				e.innerText = thisReference[varName];
				e[varName] = thisReference[varName];
			}
			uniqueVarNames.add(varName);
		});

		uniqueVarNames.forEach(varName => {
			thisReference['__' + varName] = thisReference[varName];
			Object.defineProperty(thisReference, varName, {
				set: function(val) {
					thisReference['__' + varName] = val;
					element.querySelectorAll(`[var="${varName}"]`).forEach(e => {
						e.innerText = val;
					});
				},
				get: function() {
					return thisReference['__' + varName];
				},
				configurable: true,
			});
		});

		// onsubmit on form submission
		element.querySelectorAll('form').forEach(form => {
			form.setAttribute('onsubmit', `event.preventDefault();${form.getAttribute('onsubmit')||''}`);
		});
		
		// recursively instantiate components (this uses changeHTML, careful with recursive components!)
		let components = element.querySelectorAll('[comp]');
		for (let i = 0; i < components.length; i++) {
			let elem = components[i];
			let namespaceName = elem.getAttribute('comp');
			await getNamespace(namespaceName);
			await this.instantiate(window[namespaceName], elem);
		}
	}
}

@* possible memory leak*@
@client observe(template, callback) {
	if (typeof template != 'object') return;
	if (template.forEach) {
		['push', 'shift', 'unshift', 'pop', 'splice'].forEach(fn => {
			template[fn] = function(...parameters) {
				Array.prototype[fn].call(template, ...parameters);
				callback();
			};
		});
		template.forEach(item => {
			this.observe(item);
		});
	} else {
		for (let key in template) {
			if (typeof template[key] == 'object') {
				template[key] = this.observe(template[key], callback);
			}
		}
	}
	return new Proxy(template, {
		set(target, key, value) {
			if (template == target) {
				template[key] = value;
				callback();
			}
		}
	});
}

@client adjust(prev, curr) {
	if (prev.nodeType == 3) {
		if (curr.nodeType == 3) {
			if (prev.nodeValue != curr.nodeValue) prev.nodeValue = curr.nodeValue;
		} else {
			prev.replaceWith(document.createElement(curr.tagName));
			this.adjust(prev, curr);
		}
	} else {
		if (curr.nodeType == 3) {
			prev.replaceWith(document.createTextNode(curr.nodeValue));
			return;
		}

		if (prev.tagName != curr.tagName) {
			prev.replaceWith(curr);
			return;
		}

		[...prev.getAttributeNames()].forEach(name => {
			if (curr.getAttribute(name) == null) prev.removeAttribte(name);
		});

		[...curr.getAttributeNames()].forEach(name => {
			if (prev.getAttribute(name) != curr.getAttribute(name)) prev.setAttribute(name, curr.getAttribute(name));
		});

		let currChildren = [...curr.childNodes];
		[...prev.childNodes].forEach((child, i) => {
			if (currChildren[i] == null) {
				child.remove();
			}
		});

		let prevChildren = [...prev.childNodes];
		[...curr.childNodes].forEach((child, i) => {
			if (prevChildren[i] == null) {
				let element = document.createElement(curr.tagName);
				prev.appendChild(element);
				this.adjust(element, child);
			} else {
				this.adjust(prevChildren[i], child);
			}
		});
	}
}