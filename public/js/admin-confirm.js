// Asks before destructive admin forms submit.
document.querySelectorAll('form[data-confirm]').forEach((f) => {
  f.addEventListener('submit', (e) => {
    if (!confirm(f.dataset.confirm)) e.preventDefault();
  });
});
