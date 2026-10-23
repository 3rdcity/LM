// Home hero slideshow. Crossfades every few seconds, with dots, a pause
// button and swipe. Holds still for people who ask for reduced motion, and
// pauses while the pointer or keyboard focus is on it.
document.querySelectorAll('[data-slider]').forEach((hero) => {
  const slides = [...hero.querySelectorAll('.hero-photo')];
  const dots = [...hero.querySelectorAll('.slider-dot')];
  const pauseBtn = hero.querySelector('.slider-pause');
  if (slides.length < 2) return;

  const DELAY = 6000;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  let index = 0;
  let timer = null;
  let userPaused = reduce.matches;
  let hovering = false;
  let focused = false;

  function show(i) {
    index = (i + slides.length) % slides.length;
    slides.forEach((s, n) => {
      s.classList.toggle('is-active', n === index);
      if (n === index) s.removeAttribute('aria-hidden');
      else s.setAttribute('aria-hidden', 'true');
    });
    dots.forEach((d, n) => (n === index ? d.setAttribute('aria-current', 'true') : d.removeAttribute('aria-current')));
  }

  function schedule() {
    clearTimeout(timer);
    timer = null;
    if (userPaused || hovering || focused || document.hidden) return;
    timer = setTimeout(() => {
      show(index + 1);
      schedule();
    }, DELAY);
  }

  function setPaused(p) {
    userPaused = p;
    pauseBtn.setAttribute('aria-pressed', String(p));
    pauseBtn.setAttribute('aria-label', p ? 'Play slideshow' : 'Pause slideshow');
    schedule();
  }

  dots.forEach((d) => d.addEventListener('click', () => {
    show(Number(d.dataset.slide));
    schedule();
  }));
  pauseBtn.addEventListener('click', () => setPaused(!userPaused));

  hero.addEventListener('mouseenter', () => { hovering = true; schedule(); });
  hero.addEventListener('mouseleave', () => { hovering = false; schedule(); });
  hero.addEventListener('focusin', () => { focused = true; schedule(); });
  hero.addEventListener('focusout', (e) => {
    if (!hero.contains(e.relatedTarget)) { focused = false; schedule(); }
  });
  document.addEventListener('visibilitychange', schedule);
  reduce.addEventListener('change', (e) => setPaused(e.matches));

  // Swipe left or right on the photo to change slides.
  let startX = null;
  let startY = null;
  hero.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  }, { passive: true });
  hero.addEventListener('touchend', (e) => {
    if (startX === null) return;
    const dx = e.changedTouches[0].clientX - startX;
    const dy = e.changedTouches[0].clientY - startY;
    startX = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      show(index + (dx < 0 ? 1 : -1));
      schedule();
    }
  }, { passive: true });

  // Arrow keys move between slides when a slideshow control has focus.
  hero.querySelector('.slider-controls').addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    show(index + (e.key === 'ArrowRight' ? 1 : -1));
    dots[index].focus();
  });

  setPaused(userPaused);
});
