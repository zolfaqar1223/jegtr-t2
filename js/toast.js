// toast.js

export function showToast(message, type = 'info', timeout = 2000) {
	const cont = document.getElementById('toastContainer');
	if (!cont) return;
	const t = document.createElement('div');
	t.className = `toast ${type}`;
	t.textContent = message;
	cont.appendChild(t);
	setTimeout(() => {
		if (t.parentNode) t.parentNode.removeChild(t);
	}, timeout);
}
