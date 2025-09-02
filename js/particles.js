// particles.js – floating dust particles (subtle, premium)
(() => {
  const canvas = document.createElement('canvas');
  canvas.id = 'dustCanvas';
  canvas.style.position = 'fixed';
  canvas.style.inset = '0';
  canvas.style.zIndex = '0';
  canvas.style.pointerEvents = 'none';
  document.body.prepend(canvas);
  const ctx = canvas.getContext('2d');
  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  // Increase density so particles remain visible behind widgets
  const NUM = Math.min(400, Math.floor((window.innerWidth * window.innerHeight) / 8000));
  const particles = Array.from({ length: NUM }).map(() => spawn());

  function spawn() {
    return {
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 0.9 + 0.2, // smaller motes
      a: Math.random() * Math.PI * 2,
      s: Math.random() * 0.35 + 0.05, // speed
      o: Math.random() * 0.5 + 0.18   // opacity
    };
  }

  function step(t) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    particles.forEach(p => {
      p.x += Math.cos(p.a) * p.s;
      p.y += Math.sin(p.a) * p.s * 0.6;
      p.a += (Math.random() - 0.5) * 0.02;
      if (p.x < -10 || p.x > canvas.width + 10 || p.y < -10 || p.y > canvas.height + 10) {
        Object.assign(p, spawn());
        if (Math.random() < 0.5) p.x = Math.random() * canvas.width, p.y = -8;
      }
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 6);
      grad.addColorStop(0, `rgba(255,255,255,${0.12 * p.o})`);
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 6, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
    requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
})();


