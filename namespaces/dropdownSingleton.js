@client show(html, thisReference, closeOnClick=true) {
	this.closeOnClick = closeOnClick;

	let cover = document.getElementById('dropdown_cover');
	if (!cover) {
		cover = document.createElement('div');
		cover.id = 'dropdown_cover';
		cover.classList.add('dropdown_cover');
		document.body.insertAdjacentElement('beforeend', cover);
		cover.addEventListener('click', (e) => {
			if (this.closeOnClick) {
				this.hide();
			}
		});
	}

	let menu = document.getElementById('dropdown_menu');
	if (!menu) {
		menu = document.createElement('div');
		menu.id = 'dropdown_menu';
		menu.classList.add('dropdown_menu');
		document.body.insertAdjacentElement('beforeend', menu);
		menu.addEventListener('click', (e) => {
			if (this.closeOnClick) {
				this.hide();
			}
		});
	}
	rendering.changeHTML(thisReference, menu, html);
	menu.classList.remove('hidden');
	cover.classList.remove('hidden');
}

@client hide() {
	let menu = document.getElementById('dropdown_menu');
	if (menu) menu.classList.add('hidden');

	let cover = document.getElementById('dropdown_cover');
	if (cover) cover.classList.add('hidden');
}
