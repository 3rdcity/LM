// Phone menu: the toggle opens the nav links as a full-screen panel.
document.querySelectorAll('.menu-toggle').forEach((btn) => {
  const nav = btn.closest('.site-nav');
  const setOpen = (open) => {
    nav.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', String(open));
    btn.querySelector('.sr-only').textContent = open ? 'Close menu' : 'Menu';
    document.body.classList.toggle('menu-open', open);
  };
  btn.addEventListener('click', () => setOpen(!nav.classList.contains('open')));
  nav.querySelectorAll('.nav-links a').forEach((a) => a.addEventListener('click', () => setOpen(false)));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav.classList.contains('open')) {
      setOpen(false);
      btn.focus();
    }
  });
  // Rotating to a wide screen while open shouldn't leave the page locked.
  matchMedia('(min-width: 721px)').addEventListener('change', (e) => e.matches && setOpen(false));
});
