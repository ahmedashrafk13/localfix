// Applies the saved theme before first paint to avoid a light/dark flash.
// Loaded as a file (not inline) so the Content-Security-Policy can stay strict.
(function () {
  try {
    var pref = localStorage.getItem('lf.theme') || 'system';
    var dark = pref === 'dark' || (pref === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (dark) document.documentElement.classList.add('dark');
  } catch (e) {}
})();
