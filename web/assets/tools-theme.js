// Same appearance logic as the main site: the 'theme' value in localStorage is 'system' | 'light' | 'dark'.
(function () {
  var d = document.documentElement;
  function get() { try { return localStorage.getItem('theme'); } catch (e) { return null; } }
  function set(v) { try { localStorage.setItem('theme', v); } catch (e) { /* private mode: fine */ } }
  function resolve(mode) {
    if (mode === 'light' || mode === 'dark') return mode;
    try { return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; } catch (e) { return 'light'; }
  }
  function apply() {
    var mode = get(); if (mode !== 'light' && mode !== 'dark' && mode !== 'system') mode = 'system';
    var r = resolve(mode); d.setAttribute('data-theme', r); d.setAttribute('data-theme-mode', mode);
    var m = document.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute('content', r === 'dark' ? '#0b0f19' : '#f5f6f9');
    var b = document.getElementById('tt-theme'); if (b) { b.textContent = r === 'dark' ? '☾' : '☀'; b.setAttribute('aria-label', r === 'dark' ? 'Dark' : 'Light'); }
  }
  apply();
  document.addEventListener('DOMContentLoaded', function () {
    apply();
    var b = document.getElementById('tt-theme');
    if (b) b.addEventListener('click', function () { set(d.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'); apply(); });
  });
  try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', apply); } catch (e) { /* old browsers */ }
})();
