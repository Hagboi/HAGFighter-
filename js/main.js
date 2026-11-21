'use strict';
// ---------- boot + fixed-timestep loop ----------
(function () {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  canvas.tabIndex = 0;
  canvas.addEventListener('pointerdown', () => {
    canvas.focus();
    if (Game.scene instanceof TitleScene) Input.tap.add('Enter');
  });

  function resize() {
    const touch = Input.isTouch;
    const availH = innerHeight - (touch && innerHeight > innerWidth ? 190 : 0);
    const s = Math.max(1, Math.min(innerWidth / W, availH / H));
    canvas.style.width = Math.floor(W * s) + 'px';
    canvas.style.height = Math.floor(H * s) + 'px';
    const wrap = document.getElementById('wrap');
    wrap.style.alignItems = touch && innerHeight > innerWidth ? 'flex-start' : 'center';
    wrap.style.paddingTop = touch && innerHeight > innerWidth ? '40px' : '0';
  }

  Save.load();
  Input.init();
  addEventListener('resize', resize);
  resize();

  const start = () => {
    Game.go(new TitleScene());
    let last = performance.now(), acc = 0, saveT = 0;
    const STEP = 1000 / 60;
    function frame(now) {
      acc += Math.min(100, now - last);
      const dt = now - last;
      last = now;
      Save.tick(Math.min(dt, 1000) / 1000);
      saveT += dt;
      if (saveT > 5000) { saveT = 0; Save.save(); }
      let steps = 0;
      while (acc >= STEP && steps < 4) {
        Input.poll();
        Game.scene.update();
        acc -= STEP; steps++;
      }
      Game.scene.draw(ctx);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  };
  // wait briefly for the pixel font so text renders crisply
  const fontReady = document.fonts && document.fonts.load ? document.fonts.load('8px "Press Start 2P"') : Promise.resolve();
  Promise.race([fontReady, new Promise((r) => setTimeout(r, 1500))]).then(start, start);
  addEventListener('beforeunload', () => Save.save());
  addEventListener('visibilitychange', () => { if (document.hidden) Save.save(); });

  // expose for debugging / automated tests
  window.HAG = { Game, Save, Input, Match, CHAR, STAGES, DEBUG };
})();
