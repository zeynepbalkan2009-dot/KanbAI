const btn = document.getElementById('menuBtn');
const links = document.getElementById('navLinks');
btn?.addEventListener('click', () => links.classList.toggle('open'));
links?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => links.classList.remove('open')));
