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

  // TODO: mover a proxy FastAPI antes de producción en Hetzner
  // endpoint destino: POST /api/chat en el servidor
  var ANTHROPIC_API_KEY = "sk-ant-XXXXXXXXXX"; // sustituir por la key real

  var CHAT_SYSTEM_PROMPT = "Eres el agente de demostración de Comboi Labs, una empresa de desarrollo de software de Benissa (Alicante). Estás integrado en la home de su web para demostrar cómo funciona un agente de IA real.\n\n"
    + "Responde siempre en español, de forma breve (máximo 2-3 frases), directa y con un tono cercano pero profesional. Sin emojis en exceso.\n\n"
    + "Puedes responder sobre:\n"
    + "- Qué hace Comboi Labs (desarrollo web a medida, apps móviles, agentes de IA)\n"
    + "- Cómo funciona un agente de IA\n"
    + "- Precios orientativos (siempre \"depende del proyecto, en una llamada lo vemos\")\n"
    + "- Cómo contactar (hola@comboilabs.com o el formulario de contacto)\n\n"
    + "Si te preguntan algo fuera de ese ámbito, redirige con gracia hacia Comboi Labs.\n"
    + "Al final de cada respuesta, si tiene sentido, añade una pregunta de seguimiento corta.";

  var chatLive = false; // pasa a true cuando el visitante usa el chat real del bento

  /* ---- Navegación (una sola fuente de verdad) ---- */
  var NAV = [
    { key:'servicios', label:'Servicios', file:'servicios', ext:'.tsx', href:'servicios.html' },
    { key:'proyectos', label:'Proyectos', file:'proyectos', ext:'.json', href:'index.html#proyectos' },
    { key:'nosotros',  label:'Nosotros',  file:'nosotros',  ext:'.md',   href:'nosotros.html' }
  ];
  var ACTIVE = { home:null, servicios:'servicios', servicio:'servicios', nosotros:'nosotros', contacto:null };
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
            '<a href="contacto.html" class="btn small">Contacto →</a>'+
          '</nav>'+
          '<button class="menu-toggle" id="menuToggle" aria-label="Abrir menú" aria-expanded="false">☰</button>'+
        '</div>'+
      '</header>';
    wireMenu();
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
          '</div>'+
        '</div>'+
      '</footer>';
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

    // Terminal de deploy
    var termTile = bento.querySelector('.tile.term');
    if(termTile){
      var tLines = termTile.querySelectorAll('.t-line');
      if(reduced){ tLines.forEach(function(l){ l.classList.add('show'); }); }
      else {
        onInView(termTile, function(){
          tLines.forEach(function(l, i){
            setTimeout(function(){ l.classList.add('show'); }, 700 + i * 750);
          });
        });
      }
    }

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
      }

      addBubble(text, 'us');
      conversationHistory.push({ role: 'user', content: text });
      if(conversationHistory.length > 6) conversationHistory = conversationHistory.slice(-6);

      input.value = '';
      input.disabled = true;
      send.disabled = true;

      var typingBubble = addBubble('', 'them');
      typingBubble.innerHTML = '<span class="typing"><i></i><i></i><i></i></span>';

      fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true"
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          system: CHAT_SYSTEM_PROMPT,
          messages: conversationHistory
        })
      }).then(function(res){
        if(!res.ok) throw new Error('http ' + res.status);
        return res.json();
      }).then(function(data){
        var text = (data.content && data.content[0] && data.content[0].text) || '';
        conversationHistory.push({ role: 'assistant', content: text });
        if(conversationHistory.length > 6) conversationHistory = conversationHistory.slice(-6);
        typingBubble.innerHTML = '';
        streamReply(typingBubble, text);
      }).catch(function(){
        typingBubble.remove();
        addBubble('// error de conexión · reintenta', 'them error');
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
      els.forEach(function(el){ el.classList.add('ma-in'); });
      return;
    }

    var io = new IntersectionObserver(function(entries, obs){
      entries.forEach(function(entry){
        if(entry.isIntersecting){
          entry.target.classList.add('ma-in');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });

    els.forEach(function(el){ io.observe(el); });
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
  wireBentoChat();
  wireReveal();
  wireMicroAnimations();
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
