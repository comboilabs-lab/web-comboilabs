/* =========================================================
   COMBOI LABS — Debug Runner
   Mini-juego del bento (solo home). Canvas 2D, sin imágenes.
   Estados: idle -> playing -> gameover -> idle
   ========================================================= */
(function(){

  var RECORD_KEY = 'comboi_debug_runner_record';
  var GROUND_OFFSET = 28;

  var tile, canvas, ctx, scoreEl, badgeEl, instructionsEl, touchJumpBtn, touchActionBtn;
  var W = 0, H = 0, groundY = 0;
  var SCALE = 1;
  var state = 'idle';
  var frame = 0;
  var score = 0;
  var record = 0;
  var player, obstacles, collectibles, floatTexts;
  var framesSinceSpawn, spawnInterval, obstaclesSinceCollectible, nextCollectibleAt;
  var gridOffset = 0;
  var rafId = null;
  var inView = false;
  var audioCtx = null;
  var idleJumpTimer = null;

  function randRange(min, max){ return min + Math.random() * (max - min); }
  function randInt(min, max){ return Math.floor(min + Math.random() * (max - min + 1)); }

  function getScale(){
    var w = window.innerWidth;
    if(w < 640) return 0.75;
    if(w < 920) return 0.88;
    return 1;
  }

  /* ---- inicio ---- */
  function init(){
    tile = document.querySelector('.tile.game');
    canvas = document.getElementById('gameCanvas');
    scoreEl = document.getElementById('grScore');
    badgeEl = tile ? tile.querySelector('.interactive-badge') : null;
    instructionsEl = document.getElementById('grInstructions');
    touchJumpBtn = document.getElementById('touchJump');
    touchActionBtn = document.getElementById('touchAction');
    if(!tile || !canvas || !canvas.getContext) return;
    ctx = canvas.getContext('2d');

    try { record = parseInt(localStorage.getItem(RECORD_KEY), 10) || 0; } catch(e){ record = 0; }

    var isTouch = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
    if(instructionsEl){
      instructionsEl.textContent = isTouch
        ? 'TAP · saltar · doble tap · doble saltar'
        : 'SPACE · saltar · doble SPACE · doble saltar';
    }

    resize();
    window.addEventListener('resize', function(){
      var wasActive = (state === 'playing' || state === 'gameover');
      resize();
      if(wasActive){
        state = 'idle';
        resetWorld();
        updateTouchUI();
      }
    });
    resetWorld();

    canvas.addEventListener('click', handleAction);
    document.addEventListener('keydown', function(e){
      if(e.code !== 'Space' && e.key !== ' ') return;
      var active = document.activeElement;
      if(active && (active.id === 'cmbTermInput' || active.id === 'chatInput')) return;
      if(inView) e.preventDefault();
      handleAction();
    });

    if(touchJumpBtn){
      touchJumpBtn.addEventListener('click', function(){
        ensureSound();
        if(state === 'playing') jump();
      });
    }
    if(touchActionBtn){
      touchActionBtn.addEventListener('click', function(){
        ensureSound();
        if(state === 'idle' || state === 'gameover'){ startGame(); }
      });
    }

    var touchStartY = null, touchStartTime = 0;
    canvas.addEventListener('touchstart', function(e){
      if(e.touches.length === 1){
        touchStartY = e.touches[0].clientY;
        touchStartTime = Date.now();
      }
    }, { passive:true });
    canvas.addEventListener('touchend', function(e){
      if(touchStartY === null) return;
      var dy = e.changedTouches[0].clientY - touchStartY;
      var dt = Date.now() - touchStartTime;
      touchStartY = null;
      if(dy < -30 && dt < 400){
        ensureSound();
        handleAction();
      }
    });

    updateTouchUI();

    window.addEventListener('comboi:play-debug-runner', function(){
      ensureSound();
      startGame();
    });

    if('IntersectionObserver' in window){
      var io = new IntersectionObserver(function(entries){
        entries.forEach(function(entry){
          inView = entry.isIntersecting;
          if(inView && rafId === null){ rafId = requestAnimationFrame(loop); }
          else if(!inView && rafId !== null){ cancelAnimationFrame(rafId); rafId = null; }
        });
      }, { threshold: 0.1 });
      io.observe(tile);
    } else {
      inView = true;
      rafId = requestAnimationFrame(loop);
    }

    try {
      if(sessionStorage.getItem('comboi_autoplay_debug_runner') === '1'){
        sessionStorage.removeItem('comboi_autoplay_debug_runner');
        startGame();
      }
    } catch(e){}

    idleJumpTimer = setInterval(function(){
      if(state === 'idle' && player.vy === 0) player.vy = -11 * Math.sqrt(SCALE);
    }, 3000);
  }

  function resize(){
    SCALE = getScale();
    var rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round(rect.width));
    canvas.height = Math.max(1, Math.round(rect.height));
    W = canvas.width; H = canvas.height;
    groundY = H - GROUND_OFFSET * SCALE;
    if(player) player.y = Math.min(player.y, groundY - player.h);
  }

  function resetWorld(){
    frame = 0; score = 0;
    obstacles = []; collectibles = []; floatTexts = [];
    framesSinceSpawn = 0;
    spawnInterval = randRange(900, 2200);
    obstaclesSinceCollectible = 0;
    nextCollectibleAt = randInt(3, 5);
    var w = 12 * SCALE, h = 14 * SCALE;
    player = { x: 30 * SCALE, y: groundY - h, w: w, h: h, vy: 0, jumps: 0, runFrame: 0, rotation: 0 };
    updateScoreUI();
  }

  /* ---- controles ---- */
  function handleAction(){
    ensureSound();
    if(state === 'idle' || state === 'gameover') startGame();
    else if(state === 'playing') jump();
  }

  function startGame(){
    if(idleJumpTimer !== null){ clearInterval(idleJumpTimer); idleJumpTimer = null; }
    if(tile) tile.classList.remove('idle-pulse');
    if(badgeEl) badgeEl.style.display = 'none';
    resize();
    resetWorld();
    state = 'playing';
    if(rafId === null && (inView || !('IntersectionObserver' in window))){
      rafId = requestAnimationFrame(loop);
    }
    updateTouchUI();
  }

  function jump(){
    var g = Math.sqrt(SCALE);
    if(player.jumps === 0){ player.vy = -11 * g; player.jumps = 1; playSound('jump'); }
    else if(player.jumps === 1){ player.vy = -9 * g; player.jumps = 2; playSound('jump'); }
  }

  function updateTouchUI(){
    if(!touchActionBtn) return;
    if(state === 'idle'){
      touchActionBtn.textContent = '▶ JUGAR';
      touchActionBtn.disabled = false;
    } else if(state === 'playing'){
      touchActionBtn.textContent = '▶ JUGAR';
      touchActionBtn.disabled = true;
    } else if(state === 'gameover'){
      touchActionBtn.textContent = '↺ REINICIAR';
      touchActionBtn.disabled = false;
    }
  }

  /* ---- loop principal ---- */
  function loop(){
    rafId = requestAnimationFrame(loop);
    ctx.clearRect(0, 0, W, H);
    drawBackground();

    if(state === 'idle'){ drawIdle(); }
    else if(state === 'playing'){ updatePlaying(); drawPlaying(); }
    else if(state === 'gameover'){ drawGameOver(); }

    frame++;
  }

  function drawBackground(){
    ctx.fillStyle = '#0A0D14';
    ctx.fillRect(0, 0, W, H);

    var speed = currentSpeed();
    gridOffset = (gridOffset + speed) % 20;
    ctx.fillStyle = '#1B2030';
    for(var x = -gridOffset; x < W; x += 20){
      for(var y = 12; y < groundY; y += 20){
        ctx.fillRect(x, y, 2, 2);
      }
    }
    ctx.fillRect(0, groundY, W, 2);
  }

  /* ---- idle ---- */
  function drawIdle(){
    if(player.vy !== 0 || player.y < groundY - player.h){
      player.vy += 0.55 * Math.sqrt(SCALE);
      player.y += player.vy;
      if(player.y >= groundY - player.h){
        player.y = groundY - player.h;
        player.vy = 0;
      }
    }

    var bob = (player.vy === 0) ? Math.sin(frame * 0.08) * 2 * SCALE : 0;
    drawPlayer(player.x, player.y + bob, 0, 0);

    if(Math.floor(frame / 30) % 2 === 0){
      ctx.fillStyle = '#2B3CFF';
      ctx.font = "12px 'Space Mono', monospace";
      ctx.textAlign = 'center';
      ctx.fillText('[ PULSA ESPACIO O CLICK PARA JUGAR ]', W / 2, H / 2);
      ctx.textAlign = 'left';
    }
  }

  /* ---- playing ---- */
  function currentSpeed(){
    return 1 + Math.floor(score / 10) * 0.15;
  }

  function updatePlaying(){
    player.vy += 0.55 * Math.sqrt(SCALE);
    player.y += player.vy;
    if(player.y >= groundY - player.h){
      player.y = groundY - player.h;
      player.vy = 0;
      player.jumps = 0;
    }
    player.runFrame++;
    player.rotation = Math.max(-15, Math.min(15, -player.vy * 1.4));

    var speed = currentSpeed();

    framesSinceSpawn++;
    if(framesSinceSpawn * (1000 / 60) >= spawnInterval){
      spawnObstacle();
      framesSinceSpawn = 0;
      var minInterval = score >= 30 ? 600 : 900;
      spawnInterval = randRange(minInterval, 2200);
    }

    for(var i = obstacles.length - 1; i >= 0; i--){
      var o = obstacles[i];
      o.x -= o.speed * speed;
      if(o.type === 'scope'){
        o.size = Math.min(28 * SCALE, o.size + 0.5 * SCALE);
        o.w = o.size; o.h = o.size; o.y = groundY - o.size;
      }
      if(o.x + o.w < 0) obstacles.splice(i, 1);
    }

    for(var j = collectibles.length - 1; j >= 0; j--){
      var c = collectibles[j];
      c.x -= speed * 3.5 * SCALE;
      if(c.x + c.w < 0) collectibles.splice(j, 1);
    }

    var pHit = shrink({ x: player.x, y: player.y, w: player.w, h: player.h });
    for(var k = 0; k < obstacles.length; k++){
      if(rectsOverlap(pHit, shrink(obstacles[k]))){
        gameOver();
        return;
      }
    }

    for(var m = collectibles.length - 1; m >= 0; m--){
      if(rectsOverlap(pHit, collectibles[m])){
        score += 5;
        floatTexts.push({ x: collectibles[m].x, y: collectibles[m].y, start: performance.now(), life: 600 });
        collectibles.splice(m, 1);
        playSound('commit');
      }
    }

    if(frame % 6 === 0) score += 1;
    updateScoreUI();
  }

  function shrink(r){
    return { x: r.x + 3, y: r.y + 3, w: r.w - 6, h: r.h - 6 };
  }

  function rectsOverlap(a, b){
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function spawnObstacle(){
    obstaclesSinceCollectible++;
    var r = Math.random();
    var o = { x: W + 10 };
    if(r < 0.5){
      o.type = 'bug'; o.w = 14 * SCALE; o.h = 14 * SCALE; o.y = groundY - o.h; o.speed = 4 * SCALE; o.color = '#FF5F57';
    } else if(r < 0.85){
      o.type = 'legacy'; o.w = 10 * SCALE; o.h = 24 * SCALE; o.y = groundY - o.h; o.speed = 3.5 * SCALE; o.color = '#FEBC2E';
    } else {
      o.size = 16 * SCALE; o.type = 'scope'; o.w = o.size; o.h = o.size; o.y = groundY - o.size; o.speed = 3 * SCALE; o.color = '#CC3A2E';
    }
    obstacles.push(o);

    if(obstaclesSinceCollectible >= nextCollectibleAt){
      var cw = 10 * SCALE;
      collectibles.push({ x: W + 30, y: H / 2 - cw / 2, w: cw, h: cw });
      obstaclesSinceCollectible = 0;
      nextCollectibleAt = randInt(3, 5);
    }
  }

  function drawPlaying(){
    obstacles.forEach(drawObstacle);
    collectibles.forEach(drawCollectible);
    drawPlayer(player.x, player.y, player.rotation, player.runFrame);
    drawFloatTexts();
  }

  function drawObstacle(o){
    ctx.fillStyle = o.color;
    if(o.type === 'bug'){
      ctx.fillRect(o.x, o.y, o.w, o.h);
      ctx.strokeStyle = '#10131A';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(o.x + 2, o.y + 2); ctx.lineTo(o.x + o.w - 2, o.y + o.h - 2);
      ctx.moveTo(o.x + o.w - 2, o.y + 2); ctx.lineTo(o.x + 2, o.y + o.h - 2);
      ctx.stroke();
    } else {
      ctx.fillRect(o.x, o.y, o.w, o.h);
    }
  }

  function drawCollectible(c){
    ctx.save();
    ctx.fillStyle = '#5BE0B3';
    ctx.translate(c.x + c.w / 2, c.y + c.h / 2);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
    ctx.restore();
  }

  function drawFloatTexts(){
    var now = performance.now();
    for(var i = floatTexts.length - 1; i >= 0; i--){
      var f = floatTexts[i];
      var p = (now - f.start) / f.life;
      if(p >= 1){ floatTexts.splice(i, 1); continue; }
      ctx.globalAlpha = 1 - p;
      ctx.fillStyle = '#5BE0B3';
      ctx.font = "10px 'Space Mono', monospace";
      ctx.fillText('+commit', f.x, f.y - p * 20);
      ctx.globalAlpha = 1;
    }
  }

  /* ---- personaje (cursor de terminal con piernas) ---- */
  function drawPlayer(x, y, rotation, runFrame){
    ctx.save();
    var w = player.w, h = player.h;
    var cx = x + w / 2, cy = y + h / 2;
    ctx.translate(cx, cy);
    ctx.rotate((rotation || 0) * Math.PI / 180);
    ctx.translate(-cx, -cy);

    ctx.fillStyle = '#2B3CFF';
    ctx.fillRect(x, y, w, h);

    var legW = (w / 3), legH = (h / 14) * 6, legH2 = (h / 14) * 7, legH3 = (h / 14) * 5;
    var legPhase = Math.floor((runFrame || 0) / 8) % 2;
    if(legPhase === 0){
      ctx.fillRect(x, y + h, legW, legH);
      ctx.fillRect(x + w - legW, y + h, legW, legH);
    } else {
      ctx.fillRect(x + w / 12, y + h, legW, legH2);
      ctx.fillRect(x + w - legW - w / 12, y + h, legW, legH3);
    }
    ctx.restore();
  }

  /* ---- game over ---- */
  function gameOver(){
    state = 'gameover';
    if(score > record){
      record = score;
      try { localStorage.setItem(RECORD_KEY, String(record)); } catch(e){}
    }
    playSound('gameover');
    updateTouchUI();
  }

  function drawGameOver(){
    drawPlayer(player.x, groundY - 6 * SCALE, 90, player.runFrame);

    ctx.textAlign = 'center';
    ctx.font = "13px 'Space Mono', monospace";
    ctx.fillStyle = '#FF5F57';
    ctx.fillText('// GAME OVER', W / 2, H / 2 - 24);
    ctx.fillStyle = '#C8CDFF';
    ctx.fillText('puntuación: ' + score, W / 2, H / 2);
    ctx.fillText('récord:     ' + record, W / 2, H / 2 + 18);
    ctx.fillText('[ ESPACIO para reiniciar ]', W / 2, H / 2 + 40);
    ctx.textAlign = 'left';
  }

  function updateScoreUI(){
    if(scoreEl) scoreEl.textContent = 'SCORE: ' + score;
  }

  /* ---- sonido (Web Audio, tras primera interacción) ---- */
  function ensureSound(){
    if(audioCtx) return;
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
    catch(e){ audioCtx = null; }
  }

  function playSound(type){
    if(!audioCtx) return;
    var o = audioCtx.createOscillator();
    var g = audioCtx.createGain();
    o.type = 'sine';
    o.connect(g); g.connect(audioCtx.destination);
    var now = audioCtx.currentTime;
    var dur;
    if(type === 'jump'){
      dur = 0.08;
      o.frequency.setValueAtTime(200, now);
      o.frequency.linearRampToValueAtTime(400, now + dur);
    } else if(type === 'commit'){
      dur = 0.12;
      o.frequency.setValueAtTime(500, now);
      o.frequency.linearRampToValueAtTime(700, now + dur);
    } else {
      dur = 0.3;
      o.frequency.setValueAtTime(300, now);
      o.frequency.linearRampToValueAtTime(100, now + dur);
    }
    g.gain.setValueAtTime(0.08, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur + 0.05);
    o.start(now);
    o.stop(now + dur + 0.05);
  }

  init();
})();
