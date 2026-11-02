/* Nathan M portfolio: copy-email button + the Sound field hero.
   The hero is a grid of points rippling like a voice spectrum that gathers into a phone as the visitor scrolls.
   three.js loads only when WebGL works; the render loop pauses off-screen and in hidden tabs. */
(function () {
  'use strict';

  /* ---------- Copy email ---------- */
  (function () {
    var btn = document.getElementById('copy-email');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var text = btn.getAttribute('data-copy');
      var done = function () { btn.textContent = 'Copied'; setTimeout(function () { btn.textContent = 'Copy'; }, 1800); };
      var fallback = function () {
        var r = document.createRange(); r.selectNodeContents(document.getElementById('email'));
        var s = window.getSelection(); s.removeAllRanges(); s.addRange(r); btn.textContent = 'Selected';
        setTimeout(function () { btn.textContent = 'Copy'; }, 1800);
      };
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback);
        else fallback();
      } catch (e) { fallback(); }
    });
  })();

  /* ---------- Sound field ---------- */
  var stage = document.getElementById('stage');
  var track = document.getElementById('hero-track');
  var hero = track && track.querySelector('.hero');
  var cap = document.getElementById('cap');
  if (!stage) return;

  var RM = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var px = 0, py = 0;
  window.addEventListener('pointermove', function (e) { px = e.clientX / window.innerWidth - 0.5; py = e.clientY / window.innerHeight - 0.5; }, { passive: true });

  function webglOK() {
    try { var c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl'))); }
    catch (e) { return false; }
  }
  if (!webglOK()) return;

  function loadThree() {
    return new Promise(function (res, rej) {
      if (window.THREE) { res(window.THREE); return; }
      var s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
      s.crossOrigin = 'anonymous';
      s.async = true; s.onload = function () { res(window.THREE); }; s.onerror = rej;
      document.head.appendChild(s);
    });
  }

  /* 0 = sound field, 1 = phone. Pinned hero (large screens): progress through the scroll track.
     Stacked hero (phones): how far the stage has risen into the viewport. */
  function morphTarget() {
    var vh = window.innerHeight || 800;
    if (hero && getComputedStyle(hero).position === 'sticky') {
      var tr = track.getBoundingClientRect(), span = tr.height - vh;
      return span > 0 ? Math.max(0, Math.min(1, -tr.top / (span * 0.8))) : 0;
    }
    var r = stage.getBoundingClientRect();
    return Math.max(0, Math.min(1, (vh * 0.95 - (r.top + r.height / 2)) / (vh * 0.45)));
  }

  function build(T, renderer) {
    var small = stage.clientWidth < 520;
    var C = small ? 100 : 150, R = small ? 36 : 54, N = C * R;
    var pos = new Float32Array(N * 3), tgt = new Float32Array(N * 3), rnd = new Float32Array(N);
    var i, j, k = 0;
    for (j = 0; j < R; j++) for (i = 0; i < C; i++) {
      pos[k * 3] = (i / (C - 1) - 0.5) * 6.6; pos[k * 3 + 1] = 0; pos[k * 3 + 2] = (j / (R - 1) - 0.5) * 2.6; rnd[k] = Math.random(); k++;
    }
    /* phone target: rounded-rect outline + filled screen */
    var W = 1.55, H = 3.05, rad = 0.3, outline = Math.floor(N * 0.36);
    var segs = [W - 2 * rad, Math.PI * rad / 2, H - 2 * rad, Math.PI * rad / 2, W - 2 * rad, Math.PI * rad / 2, H - 2 * rad, Math.PI * rad / 2];
    var L = segs.reduce(function (a, b) { return a + b; }, 0);
    function perim(u) {
      var d = u * L, s = 0;
      while (d > segs[s]) { d -= segs[s]; s++; if (s > 7) { s = 7; break; } }
      var hw = W / 2, hh = H / 2, a;
      switch (s) {
        case 0: return [-hw + rad + d, hh];
        case 1: a = Math.PI / 2 - d / rad; return [hw - rad + Math.cos(a) * rad, hh - rad + Math.sin(a) * rad];
        case 2: return [hw, hh - rad - d];
        case 3: a = -d / rad; return [hw - rad + Math.cos(a) * rad, -hh + rad + Math.sin(a) * rad];
        case 4: return [hw - rad - d, -hh];
        case 5: a = -Math.PI / 2 - d / rad; return [-hw + rad + Math.cos(a) * rad, -hh + rad + Math.sin(a) * rad];
        case 6: return [-hw, -hh + rad + d];
        default: a = Math.PI - d / rad; return [-hw + rad + Math.cos(a) * rad, hh - rad + Math.sin(a) * rad];
      }
    }
    for (k = 0; k < outline; k++) {
      var p = perim(k / outline), ring = (k % 3) * 0.035;
      tgt[k * 3] = p[0] * (1 - ring * 0.6); tgt[k * 3 + 1] = p[1] * (1 - ring * 0.35); tgt[k * 3 + 2] = (Math.random() - 0.5) * 0.08;
    }
    var M = N - outline, sw = W - 0.26, sh = H - 0.5, gc = Math.round(Math.sqrt(M * sw / sh)), gr = Math.ceil(M / gc);
    for (var m = 0; m < M; m++) {
      k = outline + m;
      var col = m % gc, row = Math.floor(m / gc);
      tgt[k * 3] = -sw / 2 + (col + 0.5) / gc * sw + (Math.random() - 0.5) * 0.01;
      tgt[k * 3 + 1] = -sh / 2 - 0.05 + (row + 0.5) / gr * sh;
      tgt[k * 3 + 2] = 0.02;
    }
    var geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(pos, 3));
    geo.setAttribute('aTarget', new T.BufferAttribute(tgt, 3));
    geo.setAttribute('aRand', new T.BufferAttribute(rnd, 1));
    var U = { uTime: { value: 0 }, uMorph: { value: 0 }, uPx: { value: renderer.getPixelRatio() }, uA: { value: new T.Color(0x0E5A62) }, uB: { value: new T.Color(0xC9FAFB) } };
    var mat = new T.ShaderMaterial({
      uniforms: U, transparent: true, depthWrite: false, blending: T.AdditiveBlending,
      vertexShader: [
        'uniform float uTime; uniform float uMorph; uniform float uPx;',
        'attribute vec3 aTarget; attribute float aRand; varying float vH; varying float vA;',
        'void main(){',
        '  vec3 p = position; float x = p.x;',
        '  float env = exp(-x*x*0.11);',
        '  float spec = (0.55+0.45*sin(x*2.1+uTime*1.6))*(0.55+0.45*sin(x*4.7-uTime*2.4+1.3));',
        '  float wave = env*spec*cos(p.z*2.4-uTime*1.1)*1.25 + 0.06*sin(x*9.0+uTime*3.0);',
        '  p.y = wave;',
        '  vec3 t = aTarget; t.z += 0.06*sin(t.y*3.5 - uTime*2.2)*step(abs(t.x), 0.66);',
        '  float m = smoothstep(0.0, 1.0, clamp(uMorph*1.5 - aRand*0.5, 0.0, 1.0));',
        '  vec3 q = mix(p, t, m);',
        '  float edge = 1.0 - smoothstep(2.3, 3.3, abs(x));',
        '  vH = mix(clamp(wave*0.9+0.42, 0.0, 1.0), 0.5+0.45*sin(t.y*2.6-uTime*2.0), m);',
        '  vA = mix(edge, 1.0, m);',
        '  vec4 mv = modelViewMatrix*vec4(q,1.0);',
        '  gl_PointSize = (2.3+aRand*1.9)*uPx*(5.0 / -mv.z);',
        '  gl_Position = projectionMatrix*mv;',
        '}'].join('\n'),
      fragmentShader: [
        'uniform vec3 uA; uniform vec3 uB; varying float vH; varying float vA;',
        'void main(){ vec2 c = gl_PointCoord-0.5; float r = length(c); if(r>0.5) discard;',
        '  float a = smoothstep(0.5, 0.0, r);',
        '  gl_FragColor = vec4(mix(uA, uB, vH), a*(0.45+0.55*vH)*vA); }'].join('\n')
    });
    var scene = new T.Scene(), cam = new T.PerspectiveCamera(40, 1, 0.1, 50), group = new T.Group();
    group.add(new T.Points(geo, mat)); scene.add(group);
    var morph = 0, cx = 0, lastCap = -1;
    return {
      still: 2.2,
      resize: function (w, h) { cam.aspect = w / h; cam.updateProjectionMatrix(); },
      frame: function (t) {
        var target = morphTarget();
        if (RM) morph = target; else morph += (target - morph) * 0.08;
        U.uTime.value = t; U.uMorph.value = morph;
        cx += (px - cx) * 0.05;
        var e = morph * morph * (3 - 2 * morph);
        cam.position.set(cx * 0.8, 2.7 * (1 - e) + 0.05, 6.0 + 0.6 * e);
        cam.lookAt(0, -0.1 * (1 - e), 0);
        group.rotation.y = cx * 0.35 * (1 - e) + Math.sin(t * 0.6) * 0.12 * e;
        group.position.y = Math.sin(t * 0.9) * 0.04 * e;
        renderer.render(scene, cam);
        if (cap) { var o = Math.round(Math.max(0, 1 - morph * 2.5) * 100) / 100; if (o !== lastCap) { cap.style.opacity = o; lastCap = o; } }
      }
    };
  }

  function start(T) {
    var canvas = stage.querySelector('canvas'), r;
    try { r = new T.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: 'low-power' }); } catch (e) { return; }
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    r.setClearColor(0x000000, 0);
    var api = build(T, r);
    var t = api.still, last = 0, running = false, vis = true, raf = 0;
    function draw() { api.frame(t); }
    function size() { var w = stage.clientWidth, h = stage.clientHeight; if (!w || !h) return; r.setSize(w, h, false); api.resize(w, h); draw(); }
    function loop(now) { raf = 0; if (!running) return; t += Math.min(0.05, (now - last) / 1000); last = now; draw(); raf = requestAnimationFrame(loop); }
    function play() { if (RM || running || !vis || document.hidden) return; running = true; last = performance.now(); raf = requestAnimationFrame(loop); }
    function pause() { running = false; if (raf) { cancelAnimationFrame(raf); raf = 0; } }
    if ('ResizeObserver' in window) new ResizeObserver(size).observe(stage); else window.addEventListener('resize', size);
    size();
    new IntersectionObserver(function (en) { vis = en[0].isIntersecting; if (vis) play(); else pause(); }).observe(stage);
    document.addEventListener('visibilitychange', function () { if (document.hidden) pause(); else play(); });
    /* Reduced motion: no ambient animation; the still frame follows the scroll only */
    if (RM) window.addEventListener('scroll', function () { requestAnimationFrame(draw); }, { passive: true });
    stage.classList.add('live3d');
    play();
  }

  var io = new IntersectionObserver(function (en) {
    if (!en[0].isIntersecting) return;
    io.disconnect();
    loadThree().then(start, function () {});
  }, { rootMargin: '200px' });
  io.observe(stage);
})();
