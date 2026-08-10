/* Painel de capa com arte alternativa atrás.
   Clique/toque ou Enter/Espaço (com foco) alternam entre frente e verso. */
(function () {
  function toggle(el) {
    el.classList.toggle('flipped');
  }

  document.querySelectorAll('.cover-flip').forEach(function (el) {
    el.addEventListener('click', function () { toggle(el); });
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggle(el);
      }
    });
  });
})();
