/* =========================================================
   COMBOI LABS — Modo oscuro / claro
   Toggle en el header, persistencia en localStorage y
   sincronización entre pestañas.
   ========================================================= */
(function(){
  var STORAGE_KEY = 'comboi_theme';
  var html = document.documentElement;
  var toggle = null;

  function applyTheme(theme){
    if(theme === 'dark'){
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
    updateToggle(theme);
    try { localStorage.setItem(STORAGE_KEY, theme); } catch(e){}
  }

  function updateToggle(theme){
    if(!toggle) return;
    var icon = toggle.querySelector('.theme-icon');
    if(theme === 'dark'){
      if(icon) icon.textContent = '☀';
      toggle.setAttribute('aria-label', 'Cambiar a modo claro');
    } else {
      if(icon) icon.textContent = '☽';
      toggle.setAttribute('aria-label', 'Cambiar a modo oscuro');
    }
  }

  function wireToggle(){
    toggle = document.getElementById('themeToggle');
    if(!toggle) return;

    updateToggle(html.classList.contains('dark') ? 'dark' : 'light');

    toggle.addEventListener('click', function(){
      var current = html.classList.contains('dark') ? 'dark' : 'light';
      applyTheme(current === 'dark' ? 'light' : 'dark');
    });
  }

  var saved = 'light';
  try { saved = localStorage.getItem(STORAGE_KEY) || 'light'; } catch(e){}
  applyTheme(saved);

  document.addEventListener('DOMContentLoaded', wireToggle);

  window.addEventListener('storage', function(e){
    if(e.key === STORAGE_KEY){
      applyTheme(e.newValue || 'light');
    }
  });

  window.comboiTheme = {
    apply: applyTheme,
    current: function(){ return html.classList.contains('dark') ? 'dark' : 'light'; },
    wireToggle: wireToggle
  };
})();
