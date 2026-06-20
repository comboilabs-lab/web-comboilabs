/* =========================================================
   COMBOI LABS — terminal easter egg
   Ctrl+K / Cmd+K abre una terminal modal con comandos.
   Módulo autocontenido: inyecta su propio CSS y markup.
   ========================================================= */
(function(){

  var CSS = ''
    + '.cmb-term-overlay{position:fixed;inset:0;z-index:300;display:none;'
    + 'align-items:center;justify-content:center;padding:16px;'
    + 'background:rgba(16,19,26,.85);-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px)}'
    + '.cmb-term-overlay.show{display:flex}'
    + '.cmb-term-win{width:100%;max-width:560px;background:#10131A;border-radius:14px;'
    + 'overflow:hidden;box-shadow:0 24px 60px rgba(0,0,0,.45);font-family:\'Space Mono\',monospace}'
    + '.cmb-term-bar{display:flex;gap:7px;align-items:center;padding:11px 16px;border-bottom:1px solid #232838}'
    + '.cmb-term-bar i{width:11px;height:11px;border-radius:50%;display:inline-block}'
    + '.cmb-term-title{font-size:11px;color:#6B7390;margin-left:8px;letter-spacing:1px}'
    + '.cmb-term-output{padding:14px 16px;max-height:260px;overflow-y:auto;font-size:13px;'
    + 'line-height:1.7;color:#C8CDFF;white-space:pre-wrap;word-break:break-word}'
    + '.cmb-term-output .line{display:flex;gap:8px}'
    + '.cmb-term-output .ts{color:#6B7390;flex:none}'
    + '.cmb-term-output .txt{flex:1}'
    + '.cmb-term-output .err{color:#FF5F57}'
    + '.cmb-term-output .ok{color:#5BE0B3}'
    + '.cmb-term-output pre.banner{margin:0 0 6px;color:#5BE0B3;font-size:12px;line-height:1.3}'
    + '.cmb-term-inputrow{display:flex;gap:8px;align-items:center;padding:12px 16px;border-top:1px solid #232838}'
    + '.cmb-term-prompt{color:#5BE0B3;font-size:13px;flex:none}'
    + '.cmb-term-input{flex:1;background:transparent;border:none;outline:none;color:#C8CDFF;'
    + 'font-family:\'Space Mono\',monospace;font-size:13px}'
    + '.cmb-term-input::placeholder{color:#6B7390}';

  var COMMANDS = {
    help: 'lista todos los comandos disponibles',
    whoami: 'qué es Comboi Labs',
    servicios: 'nuestros servicios',
    proyectos: 'estado de los casos publicados',
    contacto: 'cómo hablar con nosotros',
    stack: 'con qué construimos',
    theme: 'cambia entre modo claro y oscuro (theme dark/light)',
    play: 'lanza el debug runner',
    clear: 'limpia la pantalla',
    exit: 'cierra la terminal'
  };

  var BANNER = '╔═╗╔═╗╔╦╗╔╗ ╔═╗╦\n'
    + '║  ║ ║║║║╠╩╗║ ║║  labs\n'
    + '╚═╝╚═╝╩ ╩╚═╝╚═╝╩\n\n'
    + 'v1.0.0 · escribe \'help\' para ver los comandos';

  var overlay, output, input, win;
  var cmdHistory = [];
  var historyIndex = -1;
  var isOpen = false;

  function pad(n){ return n < 10 ? '0' + n : '' + n; }
  function timestamp(){
    var d = new Date();
    return pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
  }

  function printLine(text, cls){
    var line = document.createElement('div');
    line.className = 'line';
    var ts = document.createElement('span');
    ts.className = 'ts';
    ts.textContent = timestamp();
    var txt = document.createElement('span');
    txt.className = 'txt' + (cls ? ' ' + cls : '');
    txt.textContent = text;
    line.appendChild(ts);
    line.appendChild(txt);
    output.appendChild(line);
    output.scrollTop = output.scrollHeight;
  }

  function printBanner(){
    var pre = document.createElement('pre');
    pre.className = 'banner';
    pre.textContent = BANNER;
    output.appendChild(pre);
    output.scrollTop = output.scrollHeight;
  }

  function buildUI(){
    var style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    overlay = document.createElement('div');
    overlay.className = 'cmb-term-overlay';
    overlay.id = 'cmbTermOverlay';

    win = document.createElement('div');
    win.className = 'cmb-term-win';
    win.setAttribute('role', 'dialog');
    win.setAttribute('aria-modal', 'true');
    win.setAttribute('aria-label', 'Terminal Comboi Labs');

    var bar = document.createElement('div');
    bar.className = 'cmb-term-bar';
    bar.innerHTML = '<i style="background:#FF5F57"></i><i style="background:#FEBC2E"></i>'
      + '<i style="background:#28C840"></i><span class="cmb-term-title">comboi@labs: ~</span>';

    output = document.createElement('div');
    output.className = 'cmb-term-output';
    output.id = 'cmbTermOutput';

    var inputRow = document.createElement('div');
    inputRow.className = 'cmb-term-inputrow';
    var prompt = document.createElement('span');
    prompt.className = 'cmb-term-prompt';
    prompt.textContent = '~/comboi $';
    input = document.createElement('input');
    input.className = 'cmb-term-input';
    input.id = 'cmbTermInput';
    input.autocomplete = 'off';
    input.spellcheck = false;
    inputRow.appendChild(prompt);
    inputRow.appendChild(input);

    win.appendChild(bar);
    win.appendChild(output);
    win.appendChild(inputRow);
    overlay.appendChild(win);
    document.body.appendChild(overlay);

    overlay.addEventListener('click', function(e){
      if(e.target === overlay) closeTerminal();
    });
    input.addEventListener('keydown', onInputKeydown);

    printBanner();
  }

  function openTerminal(){
    if(isOpen) return;
    isOpen = true;
    overlay.classList.add('show');
    document.body.classList.add('cmb-term-open');
    input.value = '';
    input.focus();
  }

  function closeTerminal(){
    if(!isOpen) return;
    isOpen = false;
    overlay.classList.remove('show');
    document.body.classList.remove('cmb-term-open');
  }

  function onInputKeydown(e){
    if(e.key === 'Escape'){
      closeTerminal();
      return;
    }
    if(e.key === 'ArrowUp'){
      e.preventDefault();
      if(cmdHistory.length){
        historyIndex = Math.max(0, (historyIndex < 0 ? cmdHistory.length : historyIndex) - 1);
        input.value = cmdHistory[historyIndex];
      }
      return;
    }
    if(e.key === 'ArrowDown'){
      e.preventDefault();
      if(historyIndex >= 0){
        historyIndex++;
        if(historyIndex >= cmdHistory.length){ historyIndex = -1; input.value = ''; }
        else { input.value = cmdHistory[historyIndex]; }
      }
      return;
    }
    if(e.key === 'Enter'){
      var raw = input.value.trim();
      input.value = '';
      historyIndex = -1;
      if(!raw) return;
      cmdHistory.push(raw);
      printLine('~/comboi $ ' + raw);
      runCommand(raw.toLowerCase());
      return;
    }
    // evita que espacios/flechas lleguen a otros listeners (juego, scroll…)
    e.stopPropagation();
  }

  function runCommand(cmd){
    switch(cmd){
      case 'help':
        Object.keys(COMMANDS).forEach(function(key){
          printLine(key + ' · ' + COMMANDS[key]);
        });
        break;
      case 'whoami':
        printLine('Comboi Labs · software a medida · Benissa, Alicante');
        printLine('→ desarrollo web a medida');
        printLine('→ apps móviles iOS y Android');
        printLine('→ agentes de IA');
        break;
      case 'servicios':
        printLine('desarrollo web a medida · servicio-desarrollo-web.html');
        printLine('apps móviles · servicio-apps-moviles.html');
        printLine('agentes de IA · servicio-agentes-ia.html');
        break;
      case 'proyectos':
        printLine('// TODO: publicar · en construcción · vuelve pronto');
        break;
      case 'contacto':
        printLine('hola@comboilabs.com');
        printLine('→ abriendo contacto...', 'ok');
        setTimeout(function(){ window.location.href = 'contacto.html'; }, 1000);
        break;
      case 'stack':
        printLine('frontend: react');
        printLine('lenguaje: typescript');
        printLine('backend: fastapi');
        printLine('bbdd: postgresql');
        printLine('movil: react-native');
        printLine('ia: claude-api');
        printLine('infra: docker');
        break;
      case 'theme dark':
        if(window.comboiTheme) window.comboiTheme.apply('dark');
        printLine('→ modo oscuro activado · ☽', 'ok');
        break;
      case 'theme light':
        if(window.comboiTheme) window.comboiTheme.apply('light');
        printLine('→ modo claro activado · ☀', 'ok');
        break;
      case 'theme':
        var current = window.comboiTheme ? window.comboiTheme.current() : 'light';
        printLine('→ tema actual: ' + (current === 'dark' ? 'oscuro' : 'claro'));
        break;
      case 'play':
        printLine('→ lanzando debug_runner.exe...', 'ok');
        setTimeout(function(){
          closeTerminal();
          launchDebugRunner();
        }, 300);
        break;
      case 'clear':
        output.innerHTML = '';
        break;
      case 'exit':
      case 'quit':
        printLine('// cerrando sesión · hasta pronto');
        setTimeout(closeTerminal, 400);
        break;
      default:
        printLine('command not found: ' + cmd + ' · prueba \'help\'', 'err');
    }
  }

  function launchDebugRunner(){
    var bento = document.getElementById('bento');
    if(bento){
      bento.scrollIntoView({ behavior: 'smooth', block: 'center' });
      window.dispatchEvent(new CustomEvent('comboi:play-debug-runner'));
    } else {
      try { sessionStorage.setItem('comboi_autoplay_debug_runner', '1'); } catch(e){}
      window.location.href = 'index.html#bento';
    }
  }

  function onGlobalKeydown(e){
    var isToggle = (e.key === 'k' || e.key === 'K') && (e.ctrlKey || e.metaKey);
    if(isToggle){
      e.preventDefault();
      if(isOpen) closeTerminal(); else openTerminal();
    }
  }

  buildUI();
  document.addEventListener('keydown', onGlobalKeydown);

  window.cmbTerminal = {
    open: openTerminal,
    close: closeTerminal,
    toggle: function(){ isOpen ? closeTerminal() : openTerminal(); }
  };
})();
