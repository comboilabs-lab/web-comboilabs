/* =========================================================
   COMBOI LABS — Editor de código en vivo
   Hero de servicio-desarrollo-web.html: dos textareas (HTML/CSS)
   con preview en un iframe sandbox, números de línea y pestañas.
   ========================================================= */
(function(){
  var htmlArea = document.getElementById('code-html');
  var cssArea = document.getElementById('code-css');
  var iframe = document.getElementById('livePreview');
  var statusEl = document.querySelector('.editor-status');
  var hintEl = document.getElementById('editorHint');
  if(!htmlArea || !cssArea || !iframe) return;

  var INITIAL_HTML =
'<div class="card">\n' +
'  <span class="badge">En progreso</span>\n' +
'  <h2>Panel de obras</h2>\n' +
'  <p>Gestiona tu equipo en tiempo real desde cualquier dispositivo.</p>\n' +
'  <button>Ver detalles →</button>\n' +
'</div>';

  var INITIAL_CSS =
'body {\n' +
'  font-family: sans-serif;\n' +
'  display: flex;\n' +
'  align-items: center;\n' +
'  justify-content: center;\n' +
'  min-height: 100vh;\n' +
'  margin: 0;\n' +
'  background: #F4F5F7;\n' +
'}\n\n' +
'.card {\n' +
'  background: white;\n' +
'  border-radius: 12px;\n' +
'  padding: 24px;\n' +
'  max-width: 280px;\n' +
'  box-shadow: 0 4px 24px rgba(0,0,0,.08);\n' +
'}\n\n' +
'.badge {\n' +
'  font-size: 11px;\n' +
'  background: #E8EAFF;\n' +
'  color: #2B3CFF;\n' +
'  padding: 4px 10px;\n' +
'  border-radius: 20px;\n' +
'}\n\n' +
'h2 {\n' +
'  margin: 12px 0 6px;\n' +
'  font-size: 18px;\n' +
'  color: #10131A;\n' +
'}\n\n' +
'p {\n' +
'  font-size: 14px;\n' +
'  color: #5A6172;\n' +
'  margin: 0 0 16px;\n' +
'}\n\n' +
'button {\n' +
'  background: #2B3CFF;\n' +
'  color: white;\n' +
'  border: none;\n' +
'  border-radius: 6px;\n' +
'  padding: 10px 18px;\n' +
'  font-size: 13px;\n' +
'  cursor: pointer;\n' +
'  width: 100%;\n' +
'}\n\n' +
'button:hover {\n' +
'  opacity: 0.88;\n' +
'}';

  htmlArea.value = INITIAL_HTML;
  cssArea.value = INITIAL_CSS;

  function updatePreview(){
    var doc = '<!DOCTYPE html>\n<html lang="es">\n<head>\n<meta charset="UTF-8">\n' +
      '<meta name="viewport" content="width=device-width,initial-scale=1">\n' +
      '<style>' + cssArea.value + '</style>\n</head>\n<body>' + htmlArea.value + '</body>\n</html>';
    iframe.srcdoc = doc;
  }

  function updateLineNumbers(paneId){
    var pane = document.getElementById(paneId);
    var textarea = pane.querySelector('.code-area');
    var lineNumbers = pane.querySelector('.line-numbers');
    var lines = textarea.value.split('\n').length;
    var html = '';
    for(var i = 1; i <= lines; i++) html += '<span>' + i + '</span>';
    lineNumbers.innerHTML = html;
  }

  var debounceTimer;
  var firstInput = true;

  [['code-html', 'pane-html'], ['code-css', 'pane-css']].forEach(function(pair){
    var textarea = document.getElementById(pair[0]);
    var paneId = pair[1];

    textarea.addEventListener('input', function(){
      if(firstInput){
        firstInput = false;
        if(hintEl) hintEl.classList.add('hidden');
        if(statusEl){
          statusEl.textContent = '● editando...';
          setTimeout(function(){ statusEl.textContent = '● live'; }, 1000);
        }
      }
      updateLineNumbers(paneId);
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(updatePreview, 300);
    });

    textarea.addEventListener('scroll', function(){
      document.getElementById(paneId).querySelector('.line-numbers').scrollTop = textarea.scrollTop;
    });

    textarea.addEventListener('keydown', function(e){
      if(e.key === 'Tab'){
        e.preventDefault();
        var start = e.target.selectionStart;
        var end = e.target.selectionEnd;
        e.target.value = e.target.value.slice(0, start) + '  ' + e.target.value.slice(end);
        e.target.selectionStart = e.target.selectionEnd = start + 2;
        updateLineNumbers(paneId);
        clearTimeout(debounceTimer);
        updatePreview();
      }
    });

    updateLineNumbers(paneId);
  });

  var tabs = document.querySelectorAll('.editor-tab');
  tabs.forEach(function(tab){
    tab.addEventListener('click', function(){
      tabs.forEach(function(t){ t.classList.remove('active'); });
      tab.classList.add('active');
      var target = tab.getAttribute('data-tab');
      document.getElementById('pane-html').classList.toggle('hidden', target !== 'html');
      document.getElementById('pane-css').classList.toggle('hidden', target !== 'css');
      updateLineNumbers(target === 'html' ? 'pane-html' : 'pane-css');
    });
  });

  updatePreview();
})();
