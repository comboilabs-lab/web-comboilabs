/* =========================================================
   COMBOI LABS — chrome + interacciones compartidas
   Inyecta header (3 variantes), footer y switcher, y arranca
   las animaciones. Detección de viewport por scroll (robusta
   en cualquier entorno; no depende de IntersectionObserver).
   ========================================================= */
(function(){
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var page = document.body.dataset.page || 'home';
  document.body.classList.add('js');

  // El system prompt, la API key y el ranking viven en funciones serverless de Vercel
  // (ver api/), nunca en el navegador. Mismo origen que la web: rutas relativas, sin URL que configurar.
  var CHAT_API_ENDPOINT = "/api/chat";

  var chatLive = false; // pasa a true cuando el visitante usa el chat real del bento

  /* ---- Llamada compartida al proxy del chat (bento + chat flotante) ---- */
  function requestChatReply(history){
    return fetch(CHAT_API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: history })
    }).then(function(res){
      if(!res.ok) throw new Error('http ' + res.status);
      return res.json();
    }).then(function(data){
      return data.text || '';
    });
  }

  /* ---- Navegación (una sola fuente de verdad) ---- */
  var NAV = [
    { key:'servicios', label:'Servicios', file:'servicios', ext:'.tsx', href:'servicios.html' },
    { key:'proyectos', label:'Proyectos', file:'proyectos', ext:'.json', href:'index.html#proyectos' },
    { key:'nosotros',  label:'Nosotros',  file:'nosotros',  ext:'.md',   href:'nosotros.html' }
  ];
  var ACTIVE = { home:null, servicios:'servicios', servicio:'servicios', nosotros:'nosotros', contacto:null, caso:'proyectos' };
  var activeKey = ACTIVE[page];

  /* ---- Detector de "en viewport" (scroll + rAF) ---- */
  var watchers = [];
  function checkWatchers(){
    var vh = window.innerHeight || document.documentElement.clientHeight;
    var still = [];
    for(var i=0;i<watchers.length;i++){
      var w = watchers[i];
      var r = w.el.getBoundingClientRect();
      if(r.top < vh * 0.9 && r.bottom > 0){ w.cb(); } else { still.push(w); }
    }
    watchers = still;
  }
  function onInView(el, cb){
    if(reduced){ cb(); return; }
    watchers.push({ el:el, cb:cb });
  }
  var ticking = false;
  function requestCheck(){
    if(ticking) return; ticking = true;
    requestAnimationFrame(function(){ ticking = false; checkWatchers(); });
  }
  window.addEventListener('scroll', requestCheck, { passive:true });
  window.addEventListener('resize', requestCheck);

  /* ---- Header ---- */
  var STORE = 'comboi-header';
  var variant = 'tabs';
  try { variant = localStorage.getItem(STORE) || 'tabs'; } catch(e){}

  function navHTML(){
    return NAV.map(function(it){
      var cur = it.key === activeKey ? ' aria-current="page"' : '';
      return '<a class="lnk" href="'+it.href+'"'+cur+'>'+it.label+
             '<span class="ext">'+it.ext+'</span></a>';
    }).join('');
  }

  function renderHeader(){
    var host = document.getElementById('site-header') || document.querySelector('header.site');
    if(!host) return;
    host.outerHTML =
      '<header class="site" data-header="'+variant+'">'+
        '<div class="wrap nav">'+
          '<a href="index.html" class="logo">'+
            '<span class="term-dots" aria-hidden="true"><i style="background:#FF5F57"></i><i style="background:#FEBC2E"></i><i style="background:#28C840"></i></span>'+
            '<img class="logo-img" src="assets/img/logo-comboi.png" alt="Comboi Labs">'+
            '<span class="head-caret" aria-hidden="true"></span>'+
          '</a>'+
          '<nav class="nav-links" id="navLinks" aria-label="Navegación principal">'+
            navHTML()+
            '<button class="theme-toggle" id="themeToggle" aria-label="Cambiar a modo oscuro">'+
              '<span class="theme-icon">☽</span>'+
            '</button>'+
            '<a href="contacto.html" class="btn small">Contacto →</a>'+
          '</nav>'+
          '<button class="menu-toggle" id="menuToggle" aria-label="Abrir menú" aria-expanded="false">☰</button>'+
        '</div>'+
      '</header>';
    wireMenu();
    if(window.comboiTheme) window.comboiTheme.wireToggle();
  }

  function wireMenu(){
    var toggle = document.getElementById('menuToggle');
    var links = document.getElementById('navLinks');
    if(!toggle || !links) return;
    toggle.addEventListener('click', function(){
      var open = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    links.addEventListener('click', function(e){
      if(e.target.closest('a')) links.classList.remove('open');
    });
  }

  /* ---- Switcher de variantes de header (preview) ---- */
  function renderSwitch(){
    var opts = [['tabs','pestañas'],['brackets','corchetes'],['terminal','terminal']];
    var el = document.createElement('div');
    el.className = 'hdr-switch';
    el.setAttribute('aria-label','Variante de cabecera');
    el.innerHTML = '<span class="lab">header:</span>' + opts.map(function(o){
      return '<button data-v="'+o[0]+'" aria-pressed="'+(o[0]===variant)+'">'+o[1]+'</button>';
    }).join('');
    document.body.appendChild(el);
    el.addEventListener('click', function(e){
      var b = e.target.closest('button'); if(!b) return;
      variant = b.dataset.v;
      try { localStorage.setItem(STORE, variant); } catch(err){}
      renderHeader();
      el.querySelectorAll('button').forEach(function(btn){
        btn.setAttribute('aria-pressed', btn.dataset.v === variant);
      });
    });
  }

  /* ---- Footer ---- */
  function renderFooter(){
    var host = document.getElementById('site-footer');
    if(!host) return;
    host.outerHTML =
      '<footer class="site">'+
        '<div class="wrap foot">'+
          '<span class="left">© 2026 COMBOI LABS · BENISSA · ALICANTE</span>'+
          '<div class="links">'+
            '<a href="servicios.html">Servicios</a>'+
            '<a href="index.html#proyectos">Proyectos</a>'+
            '<a href="nosotros.html">Nosotros</a>'+
            '<a href="contacto.html">Contacto</a>'+
          '</div>'+
        '</div>'+
        '<div class="statusbar">'+
          '<div class="wrap">'+
            '<span>⎇ main</span><span>UTF-8</span>'+
            '<span>TypeScript · React · FastAPI</span>'+
            '<span class="ok">✓ build passing</span>'+
            '<span>hecho_en_benissa</span>'+
            '<button type="button" class="term-hint" id="termHintBtn" title="Terminal secreta">⌨ Ctrl+K</button>'+
          '</div>'+
        '</div>'+
      '</footer>';
    var hintBtn = document.getElementById('termHintBtn');
    if(hintBtn){
      hintBtn.addEventListener('click', function(){
        if(window.cmbTerminal) window.cmbTerminal.open();
      });
    }
  }

  /* ---- Reveal al hacer scroll ---- */
  function wireReveal(){
    var els = document.querySelectorAll('.reveal');
    els.forEach(function(el){ onInView(el, function(){ el.classList.add('in'); }); });
  }

  /* ---- Hero: tecleo (solo si existe) ---- */
  function wireHeroTyping(){
    var termTyped = document.getElementById('termTyped');
    var h1Span = document.getElementById('typedH1');
    var h1Caret = document.getElementById('h1Caret');
    if(!termTyped || !h1Span) return;
    function typeInto(el, text, speed, done){
      var i = 0;
      (function tick(){
        el.textContent = text.slice(0, ++i);
        if(i < text.length) setTimeout(tick, speed);
        else if(done) done();
      })();
    }
    if(reduced) return;
    var termText = termTyped.textContent;
    var h1Text = h1Span.getAttribute('data-text');
    termTyped.textContent = '';
    h1Span.textContent = '';
    if(h1Caret) h1Caret.hidden = false;
    setTimeout(function(){
      typeInto(termTyped, termText, 38, function(){
        setTimeout(function(){
          typeInto(h1Span, h1Text, 60, function(){
            setTimeout(function(){ if(h1Caret) h1Caret.hidden = true; }, 2000);
          });
        }, 300);
      });
    }, 350);
  }

  /* ---- Bento de la home (solo si existe) ---- */
  function wireBento(){
    var bento = document.getElementById('bento');
    if(!bento) return;

    bento.querySelectorAll('.tile').forEach(function(t){
      onInView(t, function(){ t.classList.add('in'); });
    });

    // Contadores
    function countUp(el){
      var target = parseInt(el.getAttribute('data-count'), 10);
      if(reduced){ el.textContent = target; return; }
      var current = 0, step = Math.max(1, Math.round(target / 30));
      var timer = setInterval(function(){
        current += step;
        if(current >= target){ current = target; clearInterval(timer); }
        el.textContent = current;
      }, 40);
    }
    var darkTile = bento.querySelector('.tile.dark');
    if(darkTile){
      onInView(darkTile, function(){
        bento.querySelectorAll('[data-count]').forEach(countUp);
      });
    }

    // Chat demo
    var typing = document.getElementById('bubbleTyping');
    var reply = document.getElementById('bubbleReply');
    var them = bento.querySelector('.bubble.them');
    var chatTile = bento.querySelector('.tile.chat');
    if(typing && reply && them && chatTile){
      function chatLoop(){
        if(chatLive) return;
        them.classList.add('show');
        typing.classList.remove('show');
        reply.classList.remove('show');
        setTimeout(function(){ if(!chatLive) typing.classList.add('show'); }, 900);
        setTimeout(function(){
          if(chatLive) return;
          typing.classList.remove('show');
          typing.style.display = 'none';
          reply.classList.add('show');
        }, 2400);
        setTimeout(function(){ if(!chatLive){ typing.style.display = ''; chatLoop(); } }, 6500);
      }
      if(reduced){
        them.classList.add('show'); reply.classList.add('show'); typing.style.display = 'none';
      } else {
        onInView(chatTile, chatLoop);
      }
    }
  }

  /* ---- Panel de obra interactivo (tile dark): barras + registrar_parte ---- */
  function wireDarkTile(){
    var darkTile = document.querySelector('.tile.dark');
    if(!darkTile) return;
    var bars = darkTile.querySelectorAll('.bar');
    var addBtn = document.getElementById('addParteBtn');
    var output = document.getElementById('parteOutput');
    var kpiBox = darkTile.querySelector('.kpi.a');
    var kpiNum = kpiBox ? kpiBox.querySelector('.num') : null;
    if(!bars.length) return;

    var tooltip = document.createElement('div');
    tooltip.className = 'bar-tooltip';
    darkTile.appendChild(tooltip);
    var hideTimer;

    bars.forEach(function(bar){
      bar.addEventListener('click', function(){
        var d = bar.dataset;
        tooltip.textContent = d.day + ' · ' + d.partes + ' partes · ' + d.operarios + ' operarios · ' + d.inc + ' incidencias';
        var barRect = bar.getBoundingClientRect();
        var tileRect = darkTile.getBoundingClientRect();
        tooltip.style.left = (barRect.left - tileRect.left + barRect.width / 2) + 'px';
        tooltip.style.top = (barRect.top - tileRect.top - 32) + 'px';
        tooltip.style.transform = 'translateX(-50%)';
        tooltip.classList.add('show');
        clearTimeout(hideTimer);
        hideTimer = setTimeout(function(){ tooltip.classList.remove('show'); }, 2500);
      });
    });

    document.addEventListener('click', function(e){
      if(!e.target.classList.contains('bar')) tooltip.classList.remove('show');
    });

    if(addBtn && output && kpiNum){
      var registrations = 0;
      addBtn.addEventListener('click', function(){
        if(registrations >= 3) return;
        addBtn.disabled = true;
        output.textContent = '→ validando datos...';
        output.className = 'parte-output show';

        setTimeout(function(){
          output.textContent = '✓ parte registrado · obra #3 · 09:42';
          output.classList.add('ok');

          var current = parseInt(kpiNum.textContent, 10) || 0;
          kpiNum.textContent = current + 1;
          kpiBox.classList.add('flash');
          setTimeout(function(){ kpiBox.classList.remove('flash'); }, 600);

          var lastBar = bars[bars.length - 1];
          var currentHeight = parseFloat(lastBar.style.height) || 0;
          lastBar.style.height = Math.min(currentHeight + 6, 100) + '%';

          registrations++;

          setTimeout(function(){
            if(registrations >= 3){
              output.classList.remove('show', 'ok');
              addBtn.innerHTML = '<span class="prompt-char">//</span> límite demo alcanzado';
            } else {
              output.classList.remove('show', 'ok');
              addBtn.disabled = false;
            }
          }, 2000);
        }, 600);
      });
    }
  }

  /* ---- App móvil interactiva (tile mintbg): navegación entre pantallas ---- */
  function wireMintPhone(){
    var wrap = document.getElementById('phoneScreens');
    if(!wrap) return;
    var screens = wrap.querySelectorAll('.phone-screen');
    if(!screens.length) return;
    var current = 0;
    var resetTimer;

    function scheduleReset(){
      clearTimeout(resetTimer);
      if(current !== 0){
        resetTimer = setTimeout(function(){ goTo(0, 'back'); }, 4000);
      }
    }

    function goTo(index, dir){
      if(index === current || index < 0 || index >= screens.length) return;
      var incoming = screens[index];
      var outgoing = screens[current];
      incoming.style.transition = 'none';
      incoming.style.transform = dir === 'fwd' ? 'translateX(100%)' : 'translateX(-100%)';
      incoming.classList.add('current');
      outgoing.classList.remove('current');
      void incoming.offsetHeight; // forzar reflow
      incoming.style.transition = '';
      incoming.style.transform = '';
      current = index;
      scheduleReset();
    }

    screens.forEach(function(screen){
      screen.querySelectorAll('[data-nav]').forEach(function(row){
        row.addEventListener('click', function(){
          var nav = row.getAttribute('data-nav');
          if(nav === 'back') goTo(current - 1, 'back');
          else goTo(parseInt(nav, 10), 'fwd');
        });
      });
    });

    screens[0].classList.add('current');
  }

  /* ---- Chat real del bento (demo con la API de Claude) ---- */
  function wireBentoChat(){
    var chatTile = document.querySelector('.tile.chat');
    var chatDemo = document.getElementById('chatDemo');
    var input = document.getElementById('chatInput');
    var send = document.getElementById('chatSend');
    if(!chatTile || !chatDemo || !input || !send) return;

    var conversationHistory = [];

    function addBubble(text, who){
      var b = document.createElement('div');
      b.className = 'bubble ' + who;
      b.textContent = text;
      chatDemo.appendChild(b);
      requestAnimationFrame(function(){ b.classList.add('show'); });
      enforceMaxBubbles();
      return b;
    }

    function enforceMaxBubbles(){
      var bubbles = Array.prototype.slice.call(chatDemo.querySelectorAll('.bubble'));
      var excess = bubbles.length - 6;
      for(var i = 0; i < excess; i++){
        (function(old){
          old.classList.add('fade-out');
          setTimeout(function(){ old.remove(); }, 300);
        })(bubbles[i]);
      }
    }

    function streamReply(bubble, text){
      var i = 0;
      var timer = setInterval(function(){
        i++;
        bubble.textContent = text.slice(0, i);
        if(i >= text.length) clearInterval(timer);
      }, 20);
    }

    function sendMessage(){
      var text = input.value.trim();
      if(!text) return;

      if(!chatLive){
        chatLive = true;
        chatDemo.querySelectorAll('.bubble').forEach(function(b){ b.remove(); });
        var hint = chatTile.querySelector('.interact-hint');
        if(hint) hint.classList.add('hidden');
      }

      addBubble(text, 'us');
      conversationHistory.push({ role: 'user', content: text });
      if(conversationHistory.length > 6) conversationHistory = conversationHistory.slice(-6);

      input.value = '';
      input.disabled = true;
      send.disabled = true;

      var typingBubble = addBubble('', 'them');
      typingBubble.innerHTML = '<span class="typing"><i></i><i></i><i></i></span>';

      requestChatReply(conversationHistory).then(function(text){
        conversationHistory.push({ role: 'assistant', content: text });
        if(conversationHistory.length > 6) conversationHistory = conversationHistory.slice(-6);
        typingBubble.innerHTML = '';
        streamReply(typingBubble, text);
      }).catch(function(){
        typingBubble.remove();
        addBubble('// error de conexión · reintenta o escríbenos a hola@comboilabs.com', 'them error');
      }).then(function(){
        input.disabled = false;
        send.disabled = false;
        input.focus();
      });
    }

    send.addEventListener('click', sendMessage);
    input.addEventListener('keydown', function(e){
      if(e.key === 'Enter') sendMessage();
    });
  }

  /* ---- Chat flotante (disponible en todas las páginas) ---- */
  var FLOAT_CHAT_ICON_OPEN =
    '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>' +
      '<path d="M8.5 9 11 12 8.5 15" stroke-width="1.6"/>' +
      '<line x1="12" y1="15" x2="15" y2="15" stroke-width="1.6" class="fc-caret"/>' +
    '</svg>';
  var FLOAT_CHAT_ICON_CLOSE = '<span aria-hidden="true">✕</span>';

  function renderFloatingChat(){
    var wrap = document.createElement('div');
    wrap.className = 'float-chat';
    wrap.innerHTML =
      '<div class="float-chat-panel" id="floatChatPanel" hidden>' +
        '<div class="term-bar" aria-hidden="true">' +
          '<i style="background:#FF5F57"></i><i style="background:#FEBC2E"></i><i style="background:#28C840"></i>' +
          '<span class="term-title">agente_comboi.ts</span>' +
          '<button type="button" class="float-chat-close" id="floatChatClose" aria-label="Cerrar chat">✕</button>' +
        '</div>' +
        '<div class="float-chat-messages" id="floatChatMessages">' +
          '<div class="bubble them">Hola 👋 Soy el agente de Comboi Labs. Pregúntame lo que quieras sobre nuestros servicios.</div>' +
        '</div>' +
        '<div class="float-chat-input-row">' +
          '<input type="text" id="floatChatInput" placeholder="Escribe tu pregunta…" aria-label="Tu mensaje">' +
          '<button type="button" id="floatChatSend" aria-label="Enviar">→</button>' +
        '</div>' +
      '</div>' +
      '<button type="button" class="float-chat-toggle" id="floatChatToggle" aria-expanded="false" aria-controls="floatChatPanel" aria-label="Abrir chat">' +
        FLOAT_CHAT_ICON_OPEN +
      '</button>';
    document.body.appendChild(wrap);

    var toggle = wrap.querySelector('#floatChatToggle');
    var panel = wrap.querySelector('#floatChatPanel');
    var closeBtn = wrap.querySelector('#floatChatClose');
    var messages = wrap.querySelector('#floatChatMessages');
    var input = wrap.querySelector('#floatChatInput');
    var send = wrap.querySelector('#floatChatSend');
    var history = [];
    var open = false;

    function setOpen(v){
      open = v;
      panel.hidden = !open;
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.innerHTML = open ? FLOAT_CHAT_ICON_CLOSE : FLOAT_CHAT_ICON_OPEN;
      if(open) input.focus();
    }

    toggle.addEventListener('click', function(){ setOpen(!open); });
    closeBtn.addEventListener('click', function(){ setOpen(false); });

    function addBubble(text, who){
      var b = document.createElement('div');
      b.className = 'bubble ' + who;
      b.textContent = text;
      messages.appendChild(b);
      messages.scrollTop = messages.scrollHeight;
      return b;
    }

    function streamReply(bubble, text){
      var i = 0;
      var timer = setInterval(function(){
        i++;
        bubble.textContent = text.slice(0, i);
        messages.scrollTop = messages.scrollHeight;
        if(i >= text.length) clearInterval(timer);
      }, 16);
    }

    function sendMessage(){
      var text = input.value.trim();
      if(!text) return;

      addBubble(text, 'us');
      history.push({ role: 'user', content: text });
      if(history.length > 8) history = history.slice(-8);

      input.value = '';
      input.disabled = true;
      send.disabled = true;

      var typingBubble = addBubble('', 'them');
      typingBubble.innerHTML = '<span class="typing"><i></i><i></i><i></i></span>';

      requestChatReply(history).then(function(text){
        history.push({ role: 'assistant', content: text });
        if(history.length > 8) history = history.slice(-8);
        typingBubble.innerHTML = '';
        streamReply(typingBubble, text);
      }).catch(function(){
        typingBubble.remove();
        addBubble('// error de conexión · reintenta o escríbenos a hola@comboilabs.com', 'them error');
      }).then(function(){
        input.disabled = false;
        send.disabled = false;
        input.focus();
      });
    }

    send.addEventListener('click', sendMessage);
    input.addEventListener('keydown', function(e){
      if(e.key === 'Enter') sendMessage();
    });
  }

  /* ---- Placeholder con efecto typewriter en el input del chat ---- */
  function wireChatPlaceholder(){
    var input = document.getElementById('chatInput');
    if(!input) return;

    var texts = [
      'pregúntame qué hacemos...',
      '¿cuánto cuesta una app?',
      '¿qué es un agente de IA?'
    ];
    var stopped = false;

    function stop(){
      if(stopped) return;
      stopped = true;
      input.placeholder = '';
    }
    input.addEventListener('focus', stop);
    input.addEventListener('click', stop);
    input.addEventListener('input', stop);

    if(reduced){ input.placeholder = texts[0]; return; }

    var ti = 0;
    function cycle(){
      if(stopped) return;
      var text = texts[ti % texts.length];
      var i = 0;
      function typeStep(){
        if(stopped) return;
        i++;
        input.placeholder = text.slice(0, i);
        if(i < text.length) setTimeout(typeStep, 60);
        else setTimeout(eraseStep, 1800);
      }
      function eraseStep(){
        if(stopped) return;
        i--;
        input.placeholder = text.slice(0, i);
        if(i > 0) setTimeout(eraseStep, 30);
        else { ti++; setTimeout(cycle, 300); }
      }
      setTimeout(typeStep, 60);
    }
    cycle();
  }

  /* ---- Micro-animaciones v2: entrada específica por sección ---- */
  function wireMicroAnimations(){
    if(reduced) return;
    var els = document.querySelectorAll('.svc, .step, .tile, .tag, .proj');
    if(!els.length) return;

    document.querySelectorAll('.tags').forEach(function(group){
      group.querySelectorAll('.tag').forEach(function(tag, i){
        tag.style.setProperty('--ma-i', i);
      });
    });

    els.forEach(function(el){ el.classList.add('ma'); });

    if(!('IntersectionObserver' in window)){
      els.forEach(function(el){ el.classList.remove('ma'); el.classList.add('ma-in'); });
      return;
    }

    var io = new IntersectionObserver(function(entries, obs){
      entries.forEach(function(entry){
        if(entry.isIntersecting){
          entry.target.classList.remove('ma');
          entry.target.classList.add('ma-in');
          markTileWelcome(entry.target);
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });

    els.forEach(function(el){ io.observe(el); });
  }

  /* ---- Señales de bienvenida por tile (pulso de borde + badge "· click") ---- */
  function markTileWelcome(tile){
    if(!tile.matches('.tile.dark, .tile.chat, .tile.mintbg')) return;
    tile.classList.add('welcome-pulse');
    var hint = tile.querySelector('.interact-hint');
    if(hint) setTimeout(function(){ hint.classList.add('visible'); }, 400);
  }

  /* ---- Interactividad de los tiles principales del bento ---- */
  function wireTileInteractivity(){
    var bento = document.getElementById('bento');
    if(!bento) return;
    var mainTiles = bento.querySelectorAll('.tile.dark, .tile.chat, .tile.mintbg');

    mainTiles.forEach(function(tile, i){
      var hint = tile.querySelector('.interact-hint');
      function dismissHint(){
        if(hint) hint.classList.add('hidden');
      }
      tile.addEventListener('click', dismissHint, { once:true });
      tile.addEventListener('touchstart', dismissHint, { once:true, passive:true });

      // Si IntersectionObserver no está disponible, marcamos la bienvenida ya
      if(!('IntersectionObserver' in window)) markTileWelcome(tile);

      // Pista de "toca" en móvil: pulso suave al cargar, escalonado
      if(!reduced && window.matchMedia('(hover: none)').matches){
        setTimeout(function(){
          tile.classList.add('tap-hint');
          tile.addEventListener('animationend', function handler(){
            tile.classList.remove('tap-hint');
            tile.removeEventListener('animationend', handler);
          });
        }, (i + 1) * 200);
      }
    });
  }

  /* ---- Glow de cursor en tarjetas (.svc, .dcard, .step) ---- */
  function wireCardGlow(){
    if(reduced) return;
    var cards = document.querySelectorAll('.svc, .dcard, .step');
    cards.forEach(function(card){
      card.addEventListener('mousemove', function(e){
        var r = card.getBoundingClientRect();
        card.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100) + '%');
        card.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100) + '%');
      });
    });
  }

  /* ---- Parallax sutil del grid de fondo en el hero ---- */
  function wireHeroParallax(){
    if(reduced) return;
    var hero = document.querySelector('.hero, .page-hero');
    if(!hero) return;
    hero.addEventListener('mousemove', function(e){
      var r = hero.getBoundingClientRect();
      var px = ((e.clientX - r.left) / r.width - .5) * 16;
      var py = ((e.clientY - r.top) / r.height - .5) * 16;
      hero.style.setProperty('--px', px.toFixed(1));
      hero.style.setProperty('--py', py.toFixed(1));
    });
  }

  /* ---- Easter eggs globales ---- */
  function wireEasterEggs(){
    console.log("%c\n  ╔═╗╔═╗╔╦╗╔╗ ╔═╗╦\n  ║  ║ ║║║║╠╩╗║ ║║\n  ╚═╝╚═╝╩ ╩╚═╝╚═╝╩  labs\n", "color:#2B3CFF;font-family:monospace;font-size:12px");
    console.log("%c¿Curioseando el código? Nos caes bien. → hola@comboilabs.com", "color:#0B7A52;font-family:monospace;font-size:13px");
    var konami = [38,38,40,40,37,39,37,39,66,65], kIndex = 0;
    document.addEventListener('keydown', function(e){
      kIndex = (e.keyCode === konami[kIndex]) ? kIndex + 1 : 0;
      if(kIndex === konami.length){
        kIndex = 0;
        document.body.classList.add('comboi-mode');
        var toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = '> modo_comboi activado ✓';
        document.body.appendChild(toast);
        requestAnimationFrame(function(){ toast.classList.add('show'); });
        setTimeout(function(){
          toast.classList.remove('show');
          document.body.classList.remove('comboi-mode');
          setTimeout(function(){ toast.remove(); }, 400);
        }, 2600);
      }
    });
  }

  /* ---- Arranque ---- */
  renderHeader();
  renderFooter();
  renderSwitch();
  wireHeroTyping();
  wireBento();
  wireDarkTile();
  wireMintPhone();
  wireBentoChat();
  wireChatPlaceholder();
  renderFloatingChat();
  wireReveal();
  wireMicroAnimations();
  wireTileInteractivity();
  wireCardGlow();
  wireHeroParallax();
  wireEasterEggs();

  // Primeras comprobaciones de viewport (carga, fuentes, layout)
  checkWatchers();
  setTimeout(checkWatchers, 60);
  setTimeout(checkWatchers, 300);
  window.addEventListener('load', function(){ checkWatchers(); });

  // Failsafe: el contenido (.reveal) está siempre visible por CSS;
  // esto solo cubre las secuencias del bento si nunca entran en
  // viewport. No vaciamos 'watchers' para que el scroll las dispare.
  setTimeout(function(){
    document.querySelectorAll('.reveal:not(.in)').forEach(function(el){ el.classList.add('in'); });
  }, 2000);
  setTimeout(function(){
    document.querySelectorAll('.t-line:not(.show), .bubble:not(.show)').forEach(function(el){ el.classList.add('show'); });
    document.querySelectorAll('[data-count]').forEach(function(el){
      if(el.textContent === '0' || el.textContent === ''){ el.textContent = el.getAttribute('data-count'); }
    });
  }, 4000);
})();
