function escapeHTML(text) {
	if (!text.replace) return '';
	text = text.replace(/\r/g, '');
	text = text.replace(/&/g, '&amp;');
	text = text.replace(/</g, '&lt;');
	text = text.replace(/>/g, '&gt;');
	text = text.replace(/"/g, '&quot;');
	text = text.replace(/'/g, '&#39;');
	text = text.replace(/\n/g, '<br />');
	text = text.replace(/\t/g, '&#9;');
	return text;
}

exports.escapeHTML = escapeHTML;
