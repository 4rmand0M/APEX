/* ── Cursor ── */
    (function () {
      var punto = document.getElementById('cursor-punto');
      var posR = { x: 0, y: 0 };
      var posA = { x: 0, y: 0 };

      document.addEventListener('mousemove', function (e) {
        posR.x = e.clientX; posR.y = e.clientY;
        punto.style.left = e.clientX + 'px';
        punto.style.top = e.clientY + 'px';
      });

      (function loop() {
        posA.x += (posR.x - posA.x) * 0.13;
        posA.y += (posR.y - posA.y) * 0.13;
        anillo.style.left = posA.x + 'px';
        anillo.style.top = posA.y + 'px';
        requestAnimationFrame(loop);
      })();

      var sel = 'button, a';
      document.addEventListener('mouseover', function (e) {
        if (e.target.closest(sel)) document.body.classList.add('sobre-interactivo');
      });
      document.addEventListener('mouseout', function (e) {
        if (e.target.closest(sel)) document.body.classList.remove('sobre-interactivo');
      });
    })();

    /* ── Tema ── */
    var modoOscuro = true;
    function alternarTema() {
      modoOscuro = !modoOscuro;
      document.documentElement.setAttribute('data-tema', modoOscuro ? 'oscuro' : 'claro');
      document.getElementById('icono-luna').style.display = modoOscuro ? 'block' : 'none';
      document.getElementById('icono-sol').style.display = modoOscuro ? 'none' : 'block';
    }

    /* ── Índice activo al hacer scroll ── */
    (function () {
      var enlaces = document.querySelectorAll('.indice-enlace');
      var secciones = document.querySelectorAll('.seccion');

      window.addEventListener('scroll', function () {
        var desdeTop = window.scrollY + 100;
        secciones.forEach(function (sec) {
          if (sec.offsetTop <= desdeTop && (sec.offsetTop + sec.offsetHeight) > desdeTop) {
            enlaces.forEach(function (e) { e.classList.remove('activo'); });
            var enlaceActivo = document.querySelector('.indice-enlace[href="#' + sec.id + '"]');
            if (enlaceActivo) enlaceActivo.classList.add('activo');
          }
        });
      });
    })();
