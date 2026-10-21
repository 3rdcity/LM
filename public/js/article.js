// Copy-link button on articles.
document.querySelectorAll('[data-copy]').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const note = btn.parentElement.querySelector('.copied');
    try {
      await navigator.clipboard.writeText(btn.dataset.copy);
      if (note) note.textContent = 'Link copied';
    } catch {
      if (note) note.textContent = btn.dataset.copy;
    }
    setTimeout(() => { if (note) note.textContent = ''; }, 2500);
  });
});
