var _failsafeRed = setTimeout(function () {
      var pantalla = document.getElementById('pantalla-carga');
      var app = document.getElementById('app');
      if (pantalla && pantalla.style.display !== 'none') {
        pantalla.classList.add('saliendo');
        setTimeout(function () {
          pantalla.style.display = 'none';
          if (app) app.classList.add('visible');
        }, 600);
      }
    }, 5000);

    /* Cancela el failsafe si auth.js cerró el loader antes */
    document.getElementById('pantalla-carga').addEventListener(
      'transitionend',
      function () { clearTimeout(_failsafeRed); },
      { once: true }
    );

    /* Inicializar librerías si cargaron correctamente */
    if (typeof lucide !== 'undefined') lucide.createIcons();

    if (typeof Choices !== 'undefined') {
      document.querySelectorAll('.campo-select').forEach(function (select) {
        new Choices(select, {
          searchEnabled: false,
          itemSelectText: '',
          shouldSort: false
        });
      });
    }
