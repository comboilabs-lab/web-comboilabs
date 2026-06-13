/* =========================================================
   COMBOI LABS — Simulador de app móvil
   Hero de servicio-apps-moviles.html: navegación entre
   pantallas, notificación push simulada y reloj real.
   ========================================================= */
(function(){
  var sim = document.querySelector('.phone-sim');
  if(!sim) return;

  var hint = document.getElementById('simHint');
  var notifBadge = document.getElementById('notifBadge');
  var hasNavigated = false;

  function navigateTo(toScreen, direction){
    var current = sim.querySelector('.sim-screen.active');
    var next = document.getElementById('screen-' + toScreen);
    if(!next || current === next) return;

    if(!hasNavigated && hint){
      hasNavigated = true;
      hint.classList.add('hidden');
    }

    var isForward = direction !== 'back';

    next.style.transform = 'translateX(' + (isForward ? '100%' : '-100%') + ')';
    next.style.transition = 'none';
    next.classList.add('active');

    next.offsetHeight;

    next.style.transition = 'transform .25s ease-out';
    current.style.transition = 'transform .25s ease-out';
    next.style.transform = 'translateX(0)';
    current.style.transform = 'translateX(' + (isForward ? '-100%' : '100%') + ')';

    setTimeout(function(){
      current.classList.remove('active');
      current.style.transform = '';
      current.style.transition = '';
    }, 260);

    if(toScreen === '1' && notifBadge){
      var count = parseInt(notifBadge.textContent, 10);
      if(count > 0) notifBadge.textContent = count - 1;
    }
  }

  sim.querySelectorAll('.order-item, .action-btn').forEach(function(el){
    el.addEventListener('click', function(){
      navigateTo(el.getAttribute('data-to'), 'forward');
    });
  });
  sim.querySelectorAll('.back-btn').forEach(function(el){
    el.addEventListener('click', function(){
      navigateTo(el.getAttribute('data-to'), 'back');
    });
  });

  var pushNotif = document.getElementById('pushNotif');
  if(pushNotif){
    setTimeout(function(){
      pushNotif.classList.add('show');
      setTimeout(function(){ pushNotif.classList.remove('show'); }, 3500);
      if(notifBadge) notifBadge.textContent = parseInt(notifBadge.textContent, 10) + 1;
    }, 5000);

    pushNotif.addEventListener('click', function(){
      pushNotif.classList.remove('show');
      navigateTo('1', 'back');
    });
  }

  function updateTime(){
    var now = new Date();
    var el = document.getElementById('simTime');
    if(el){
      el.textContent = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
    }
  }
  updateTime();
  setInterval(updateTime, 60000);
})();
