const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---- animated stat count-up ----
function animateStats(nodes){
  nodes.forEach(el=>{
    if(el.dataset.animated) return;
    el.dataset.animated = '1';
    const target = parseFloat(el.dataset.count);
    const suffix = el.dataset.suffix || '';
    const prefix = el.dataset.prefix || '';
    if(reduceMotion || isNaN(target)){ return; }
    const dur = 1100;
    const start = performance.now();
    function frame(now){
      const p = Math.min(1, (now-start)/dur);
      const eased = 1 - Math.pow(1-p, 3);
      el.textContent = prefix + Math.round(target*eased) + suffix;
      if(p < 1) requestAnimationFrame(frame);
      else el.textContent = prefix + target + suffix;
    }
    requestAnimationFrame(frame);
  });
}

// ---- scroll reveal ----
const revealEls = document.querySelectorAll('.reveal');
const io = new IntersectionObserver((entries)=>{
  entries.forEach(e=>{
    if(e.isIntersecting){
      e.target.classList.add('in');
      const stats = e.target.querySelectorAll('.stat-num[data-count]');
      if(stats.length) animateStats(stats);
    }
  });
},{threshold:0.18, rootMargin:'0px 0px -8% 0px'});
revealEls.forEach((el,i)=>{
  el.style.transitionDelay = (Math.min(i%6,5)*70)+'ms';
  io.observe(el);
});

// ---- reading progress bar ----
(function progressBar(){
  const bar = document.getElementById('progressBar');
  if(!bar) return;
  let ticking = false;
  function update(){
    ticking = false;
    const doc = document.documentElement;
    const scrollTop = doc.scrollTop || document.body.scrollTop;
    const height = doc.scrollHeight - doc.clientHeight;
    bar.style.width = (height > 0 ? (scrollTop/height)*100 : 0) + '%';
  }
  window.addEventListener('scroll', ()=>{
    if(!ticking){ requestAnimationFrame(update); ticking = true; }
  }, {passive:true});
  update();
})();

// ---- chart 01: interactive blank ----
(function blankFill(){
  const btn = document.getElementById('blankFill');
  if(!btn) return;
  const words = ['?','TASTE','JUDGMENT','CARE','MEANING','CONNECTION','?'];
  let i = 0;
  btn.addEventListener('click', ()=>{
    i = (i+1) % words.length;
    btn.style.opacity = '0';
    setTimeout(()=>{ btn.textContent = words[i]; btn.style.opacity = '1'; }, 120);
  });
})();

// ---- interlude 02: compass pulled toward the cursor ----
(function compass(){
  const wrap = document.querySelector('.compass-wrap');
  const needle = document.getElementById('compassNeedle');
  if(!wrap || !needle) return;
  const coarse = window.matchMedia('(pointer:coarse)').matches;
  if(coarse || reduceMotion) return; // markup already ships with a resting .idle sway
  needle.classList.remove('idle');
  let lastX = window.innerWidth/2, lastY = window.innerHeight/3, ticking = false;
  function update(){
    ticking = false;
    const rect = wrap.getBoundingClientRect();
    const cx = rect.left + rect.width/2, cy = rect.top + rect.height/2;
    const angle = Math.atan2(lastX-cx, -(lastY-cy)) * 180/Math.PI;
    needle.style.transform = 'rotate(' + angle + 'deg)';
  }
  window.addEventListener('mousemove', (e)=>{
    lastX = e.clientX; lastY = e.clientY;
    if(!ticking){ requestAnimationFrame(update); ticking = true; }
  }, {passive:true});
})();

// ---- final board: pick who is writing the future ----
(function finalChoice(){
  const wrap = document.getElementById('finalOpts');
  const caption = document.getElementById('finalCaption');
  if(!wrap || !caption) return;
  const notes = {
    us: 'Then every choice we make about how it is built still matters more than any output it produces.',
    ai: 'Then we have already decided the answer does not depend on who is asking.',
    rel: 'The line between the two is where the future is actually being written.'
  };
  const btns = wrap.querySelectorAll('.opt');
  function choose(btn){
    btns.forEach(o=>{ o.classList.remove('active'); o.classList.remove('hit'); });
    btn.classList.add('active');
    caption.classList.remove('show');
    caption.textContent = notes[btn.dataset.choice] || '';
    requestAnimationFrame(()=> caption.classList.add('show'));
  }
  btns.forEach(b=> b.addEventListener('click', ()=>choose(b)));
  const def = wrap.querySelector('.opt.hit');
  if(def) choose(def);
})();

// ---- opening monologue: simple click-driven controller (mirrors clayController) ----
(function monoController(){
  const outer = document.getElementById('monoOuter');
  const controls = document.getElementById('monoControls');
  if(!outer || !controls) return;
  const lines = outer.querySelectorAll('.mono-inner [data-mline]');
  const buttons = controls.querySelectorAll('.mono-btn');

  function setLine(n){
    lines.forEach(l=> l.classList.toggle('active', l.dataset.mline === String(n)));
    buttons.forEach(b=> b.classList.toggle('active', b.dataset.mline === String(n)));
  }

  buttons.forEach(b=> b.addEventListener('click', ()=> setLine(b.dataset.mline)));
  setLine(1);
})();

// ---- rail active state ----
const acts = document.querySelectorAll('[data-act]');
const ticks = document.querySelectorAll('.rail .tick');
const railIo = new IntersectionObserver((entries)=>{
  entries.forEach(e=>{
    if(e.isIntersecting){
      const n = e.target.getAttribute('data-act');
      ticks.forEach(t=> t.classList.toggle('active', t.dataset.rail === n));
    }
  });
},{threshold:0.5});
acts.forEach(a=>railIo.observe(a));

// ---- influence diagram: build satellite nodes + algorithm rays ----
(function buildDiagram(){
  const nodes = [
    {label:'HOME', angle:-90},
    {label:'SCHOOL', angle:-18},
    {label:'ALGORITHM', angle:54},
    {label:'MEDIA', angle:126},
    {label:'FRIENDS', angle:198}
  ];
  const cx=200, cy=200, r=150;
  const raysG = document.getElementById('rays');
  const spokesG = document.getElementById('spokes');
  const satG = document.getElementById('satellites');
  let algo = null;
  const rayByLabel = {};

  nodes.forEach(n=>{
    const rad = n.angle * Math.PI/180;
    n.x = cx + r*Math.cos(rad);
    n.y = cy + r*Math.sin(rad);
    if(n.label==='ALGORITHM') algo = n;
  });

  function highlight(label){
    Object.entries(rayByLabel).forEach(([l,ray])=>{
      if(label===null){ ray.style.opacity=''; ray.style.strokeWidth=''; }
      else if(label==='ALGORITHM'){ ray.style.opacity='1'; ray.style.strokeWidth='2'; }
      else{
        const on = l===label;
        ray.style.opacity = on ? '1' : '0.12';
        ray.style.strokeWidth = on ? '2.2' : '1';
      }
    });
  }

  nodes.forEach(n=>{
    // faint spoke from child center to every node
    const s = document.createElementNS('http://www.w3.org/2000/svg','line');
    s.setAttribute('x1',cx); s.setAttribute('y1',cy);
    s.setAttribute('x2',n.x); s.setAttribute('y2',n.y);
    spokesG.appendChild(s);

    // red ray from ALGORITHM to every other node (it is the only fully-connected one)
    if(n.label !== 'ALGORITHM'){
      const ray = document.createElementNS('http://www.w3.org/2000/svg','line');
      ray.setAttribute('x1',algo.x); ray.setAttribute('y1',algo.y);
      ray.setAttribute('x2',n.x); ray.setAttribute('y2',n.y);
      raysG.appendChild(ray);
      rayByLabel[n.label] = ray;
    }

    const isAlgo = n.label==='ALGORITHM';
    const circ = document.createElementNS('http://www.w3.org/2000/svg','circle');
    circ.setAttribute('cx',n.x); circ.setAttribute('cy',n.y);
    circ.setAttribute('r', isAlgo? 30 : 24);
    circ.setAttribute('fill', isAlgo? '#b8222c' : '#100f0e');
    circ.setAttribute('stroke', isAlgo? '#d4342f' : '#4a453e');
    circ.setAttribute('stroke-width','1.2');
    satG.appendChild(circ);

    const txt = document.createElementNS('http://www.w3.org/2000/svg','text');
    txt.setAttribute('x',n.x); txt.setAttribute('y', n.y+3);
    txt.setAttribute('text-anchor','middle');
    txt.setAttribute('class','node-label');
    txt.setAttribute('fill', isAlgo? '#efe9df' : '#8a8378');
    txt.setAttribute('font-size', isAlgo? '9' : '8');
    txt.textContent = n.label;
    satG.appendChild(txt);

    circ.addEventListener('mouseenter', ()=>highlight(n.label));
    circ.addEventListener('mouseleave', ()=>highlight(null));
    txt.style.cursor = 'pointer';
    txt.addEventListener('mouseenter', ()=>highlight(n.label));
    txt.addEventListener('mouseleave', ()=>highlight(null));
  });
})();

// ---- clay signature: simple click-driven 3-state controller (no scroll math) ----
(function clayController(){
  const outer = document.getElementById('clayOuter');
  const btns = document.getElementById('clayControls');
  if(!outer || !btns) return;
  const caps = outer.querySelectorAll('.clay-caption span');
  const buttons = btns.querySelectorAll('.clay-btn');

  function setState(n){
    outer.setAttribute('data-state', n);
    buttons.forEach(b=> b.classList.toggle('active', b.dataset.state === String(n)));
    caps.forEach(c=> c.classList.toggle('active', c.dataset.cap === String(n)));
  }

  buttons.forEach(b=> b.addEventListener('click', ()=> setState(b.dataset.state)));
  setState(1);
})();
