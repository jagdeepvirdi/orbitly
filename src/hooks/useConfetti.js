export function fireConfetti() {
  const colors = ['#6366f1', '#a855f7', '#f43f5e', '#f59e0b', '#10b981', '#eab308'];
  for (let i = 0; i < 90; i++) {
    const p = document.createElement('div');
    const sz = 6 + Math.random() * 8;
    p.style.cssText = `position:fixed;top:-20px;left:${Math.random() * 100}vw;width:${sz}px;height:${sz * 0.6}px;background:${colors[i % colors.length]};border-radius:2px;z-index:9999;pointer-events:none;animation:om-confetti ${1.6 + Math.random() * 1.6}s ${Math.random() * 0.5}s cubic-bezier(.3,.6,.5,1) forwards;`;
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 3800);
  }
}
