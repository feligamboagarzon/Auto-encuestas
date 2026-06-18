/*
 * Simulador de Fuera de Lugar (offside) estilo VAR.
 * Vista cenital de media cancha. El ataque va de IZQUIERDA → DERECHA
 * (los atacantes intentan llegar al arco derecho que defienden los azules).
 *
 * Coordenadas del modelo en METROS:
 *   x: 0 (línea media, izquierda)  →  FIELD_W (línea de meta, derecha)
 *   y: 0 (arriba)                  →  FIELD_H (abajo)
 * "Más cerca del arco rival" = x MÁS GRANDE.
 */

const FIELD_W = 52.5; // media cancha (m)
const FIELD_H = 68;   // ancho de cancha (m)
const PLAYER_R_M = 1.7; // radio visual del jugador (m)
const BALL_R_M = 1.0;
const LEVEL_TOL = 0.35; // tolerancia (m) para considerar "en línea" (la igualdad habilita)

const canvas = document.getElementById('pitch');
const ctx = canvas.getContext('2d');
const verdictEl = document.getElementById('verdict');
const toggleLines = document.getElementById('toggleLines');
const toggleLive = document.getElementById('toggleLive');

let pxW = 0, pxH = 0; // tamaño del canvas en píxeles CSS

/* ---------------- Escenarios ---------------- */
function scenario(name) {
  // Plantillas de jugadores. id, equipo, x, y, etiqueta, arquero?
  const base = {
    offside: {
      players: [
        { id: 'gk', team: 'def', x: 50.5, y: 34, label: '1', gk: true },
        { id: 'd1', team: 'def', x: 40, y: 18 },
        { id: 'd2', team: 'def', x: 42, y: 34 }, // penúltimo → marca la línea
        { id: 'd3', team: 'def', x: 38, y: 50 },
        { id: 'a1', team: 'atk', x: 45, y: 28 }, // adelantado → offside
        { id: 'a2', team: 'atk', x: 40.5, y: 42 }, // habilitado
        { id: 'a3', team: 'atk', x: 36, y: 34, passer: true }, // lleva el balón
      ],
      ball: { x: 34, y: 34 },
    },
    onside: {
      players: [
        { id: 'gk', team: 'def', x: 50.5, y: 34, label: '1', gk: true },
        { id: 'd1', team: 'def', x: 44, y: 18 },
        { id: 'd2', team: 'def', x: 45, y: 34 },
        { id: 'd3', team: 'def', x: 43, y: 50 },
        { id: 'a1', team: 'atk', x: 42, y: 26 },
        { id: 'a2', team: 'atk', x: 41, y: 42 },
        { id: 'a3', team: 'atk', x: 35, y: 34, passer: true },
      ],
      ball: { x: 33, y: 34 },
    },
    level: {
      players: [
        { id: 'gk', team: 'def', x: 50.5, y: 34, label: '1', gk: true },
        { id: 'd1', team: 'def', x: 41, y: 18 },
        { id: 'd2', team: 'def', x: 43, y: 34 },
        { id: 'd3', team: 'def', x: 40, y: 50 },
        { id: 'a1', team: 'atk', x: 43, y: 26 }, // justo en línea → habilitado
        { id: 'a2', team: 'atk', x: 39, y: 44 },
        { id: 'a3', team: 'atk', x: 34, y: 34, passer: true },
      ],
      ball: { x: 32, y: 34 },
    },
  };
  // clon profundo
  return JSON.parse(JSON.stringify(base[name] || base.offside));
}

let state = scenario('offside');
let receiverId = null; // atacante seleccionado como receptor (tap)
let anim = null;       // animación del pase en curso

/* ---------------- Conversión de coordenadas ---------------- */
const toPxX = (xm) => (xm / FIELD_W) * pxW;
const toPxY = (ym) => (ym / FIELD_H) * pxH;
const toMx = (px) => (px / pxW) * FIELD_W;
const toMy = (py) => (py / pxH) * FIELD_H;
const playerRpx = () => (PLAYER_R_M / FIELD_W) * pxW;

/* ---------------- Lógica de offside ---------------- */
// Devuelve la x (en metros) de la línea de offside = penúltimo defensor.
function offsideLineX() {
  const defs = state.players.filter((p) => p.team === 'def');
  const xs = defs.map((p) => p.x).sort((a, b) => b - a); // descendente (más cerca del arco primero)
  // el último defensor es xs[0] (normalmente el arquero); el penúltimo es xs[1]
  return xs.length >= 2 ? xs[1] : (xs[0] ?? FIELD_W);
}

// Clasifica un atacante respecto a la línea y al balón.
// 'off' = posición de fuera de lugar, 'level' = en línea (habilitado), 'on' = habilitado.
function classifyAttacker(p, lineX, ballX) {
  const aheadOfBall = p.x > ballX + LEVEL_TOL;
  if (Math.abs(p.x - lineX) <= LEVEL_TOL) return 'level';
  if (p.x > lineX && aheadOfBall) return 'off';
  return 'on';
}

/* ---------------- Dibujo ---------------- */
function setupCanvas() {
  const rect = canvas.getBoundingClientRect();
  pxW = rect.width;
  pxH = rect.height;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(pxW * dpr);
  canvas.height = Math.round(pxH * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function drawPitch() {
  // franjas de césped
  const stripes = 7;
  for (let i = 0; i < stripes; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#0c7a40' : '#0b6e3b';
    ctx.fillRect(0, (pxH / stripes) * i, pxW, pxH / stripes + 1);
  }

  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 2;

  // línea media (borde izquierdo)
  ctx.beginPath();
  ctx.moveTo(2, 0); ctx.lineTo(2, pxH); ctx.stroke();

  // círculo central (mitad, sobre el borde izquierdo)
  ctx.beginPath();
  ctx.arc(2, pxH / 2, toPxX(9.15), -Math.PI / 2, Math.PI / 2);
  ctx.stroke();

  // línea de meta (derecha)
  ctx.beginPath();
  ctx.moveTo(pxW - 2, 0); ctx.lineTo(pxW - 2, pxH); ctx.stroke();

  // área grande (16.5 x 40.3)
  const boxW = toPxX(16.5);
  const boxTop = toPxY((FIELD_H - 40.3) / 2);
  const boxBot = toPxY((FIELD_H + 40.3) / 2);
  ctx.strokeRect(pxW - boxW, boxTop, boxW, boxBot - boxTop);

  // área chica (5.5 x 18.3)
  const smallW = toPxX(5.5);
  const smallTop = toPxY((FIELD_H - 18.3) / 2);
  const smallBot = toPxY((FIELD_H + 18.3) / 2);
  ctx.strokeRect(pxW - smallW, smallTop, smallW, smallBot - smallTop);

  // arco
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  const goalTop = toPxY((FIELD_H - 7.32) / 2);
  const goalH = toPxY(7.32);
  ctx.fillRect(pxW - 4, goalTop, 6, goalH);

  // punto de penal
  ctx.beginPath();
  ctx.arc(pxW - toPxX(11), pxH / 2, 2.5, 0, Math.PI * 2);
  ctx.fill();

  // flecha de dirección de ataque
  drawArrow();
}

function drawArrow() {
  const y = 16;
  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = 'rgba(255,212,0,0.95)';
  ctx.font = '600 12px -apple-system, Roboto, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText('Ataque →', 10, y);
  ctx.restore();
}

function drawOffsideLine(lineX) {
  if (!toggleLines.checked) return;
  const x = toPxX(lineX);
  ctx.save();
  ctx.setLineDash([8, 7]);
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#ff7a00';
  ctx.beginPath();
  ctx.moveTo(x, 0); ctx.lineTo(x, pxH); ctx.stroke();

  // etiqueta
  ctx.setLineDash([]);
  ctx.fillStyle = '#ff7a00';
  ctx.font = '700 11px -apple-system, Roboto, sans-serif';
  ctx.textBaseline = 'top';
  const label = 'Línea de offside';
  const tw = ctx.measureText(label).width;
  let lx = x + 5;
  if (lx + tw > pxW) lx = x - tw - 5;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(lx - 3, 2, tw + 6, 16);
  ctx.fillStyle = '#ffd400';
  ctx.fillText(label, lx, 4);
  ctx.restore();
}

function drawBall(animBall) {
  const b = animBall || state.ball;
  const x = toPxX(b.x), y = toPxY(b.y);
  const r = (BALL_R_M / FIELD_W) * pxW;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = '#111';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#fff';
  ctx.stroke();
}

function drawPlayer(p, lineX, ballX) {
  const x = toPxX(p.x), y = toPxY(p.y);
  const r = playerRpx();

  let fill = '#2f6fed'; // defensa
  let ring = null;
  if (p.gk) fill = '#f4a300';
  if (p.team === 'atk') {
    fill = '#e23b3b';
    const cls = classifyAttacker(p, lineX, ballX);
    if (toggleLive.checked || anim) {
      if (cls === 'off') ring = '#ff2d2d';
      else if (cls === 'level') ring = '#ffd400';
      else ring = '#37d67a';
    }
  }

  // sombra
  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.7, r * 0.9, r * 0.35, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fill();

  // anillo de estado (atacantes)
  if (ring) {
    ctx.beginPath();
    ctx.arc(x, y, r + 3.5, 0, Math.PI * 2);
    ctx.fillStyle = ring;
    ctx.fill();
  }

  // cuerpo
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.stroke();

  // marca del que lleva el balón / receptor
  if (p.id === receiverId) {
    ctx.beginPath();
    ctx.arc(x, y, r + 7, 0, Math.PI * 2);
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#fff';
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // etiqueta
  ctx.fillStyle = '#fff';
  ctx.font = '700 ' + Math.max(9, r * 0.9) + 'px -apple-system, Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const txt = p.label || (p.team === 'atk' ? 'A' : 'D');
  ctx.fillText(txt, x, y);
  ctx.textAlign = 'start';
}

function render() {
  if (!pxW) setupCanvas();
  ctx.clearRect(0, 0, pxW, pxH);
  drawPitch();

  const lineX = offsideLineX();
  const ballX = (anim ? anim.ball.x : state.ball.x);

  drawOffsideLine(lineX);

  // defensas primero, atacantes encima
  state.players.filter((p) => p.team === 'def').forEach((p) => drawPlayer(p, lineX, ballX));
  state.players.filter((p) => p.team === 'atk').forEach((p) => drawPlayer(p, lineX, ballX));

  drawBall(anim ? anim.ball : null);
}

/* ---------------- Interacción (mouse + táctil) ---------------- */
let dragging = null;
let dragMoved = false;
let pointerStart = null;

function eventPoint(e) {
  const rect = canvas.getBoundingClientRect();
  const t = e.touches ? e.touches[0] : e;
  return { px: t.clientX - rect.left, py: t.clientY - rect.top };
}

function hitTest(px, py) {
  const r = playerRpx() + 6;
  // de adelante hacia atrás: atacantes, luego defensas, luego balón
  const order = [...state.players].reverse();
  for (const p of order) {
    const dx = px - toPxX(p.x);
    const dy = py - toPxY(p.y);
    if (dx * dx + dy * dy <= r * r) return { type: 'player', ref: p };
  }
  const bdx = px - toPxX(state.ball.x);
  const bdy = py - toPxY(state.ball.y);
  const br = (BALL_R_M / FIELD_W) * pxW + 10;
  if (bdx * bdx + bdy * bdy <= br * br) return { type: 'ball', ref: state.ball };
  return null;
}

function onDown(e) {
  if (anim) return;
  const { px, py } = eventPoint(e);
  const hit = hitTest(px, py);
  if (hit) {
    dragging = hit;
    dragMoved = false;
    pointerStart = { px, py };
    hideVerdict();
    e.preventDefault();
  }
}

function onMove(e) {
  if (!dragging) return;
  const { px, py } = eventPoint(e);
  if (pointerStart) {
    const d = Math.hypot(px - pointerStart.px, py - pointerStart.py);
    if (d > 5) dragMoved = true;
  }
  let xm = Math.max(0.5, Math.min(FIELD_W - 0.5, toMx(px)));
  let ym = Math.max(0.5, Math.min(FIELD_H - 0.5, toMy(py)));
  dragging.ref.x = xm;
  dragging.ref.y = ym;
  render();
  e.preventDefault();
}

function onUp(e) {
  if (dragging && !dragMoved && dragging.type === 'player' && dragging.ref.team === 'atk') {
    // tap sobre un atacante → seleccionarlo como receptor del pase
    receiverId = dragging.ref.id;
    render();
  }
  dragging = null;
  pointerStart = null;
}

canvas.addEventListener('mousedown', onDown);
window.addEventListener('mousemove', onMove);
window.addEventListener('mouseup', onUp);
canvas.addEventListener('touchstart', onDown, { passive: false });
canvas.addEventListener('touchmove', onMove, { passive: false });
canvas.addEventListener('touchend', onUp);

/* ---------------- Pase + veredicto ---------------- */
function chosenReceiver() {
  const atks = state.players.filter((p) => p.team === 'atk' && !p.passer);
  if (receiverId) {
    const r = atks.find((p) => p.id === receiverId);
    if (r) return r;
  }
  // por defecto: el atacante más adelantado (mayor x)
  return atks.reduce((best, p) => (p.x > best.x ? p : best), atks[0]);
}

function passer() {
  return state.players.find((p) => p.passer) ||
    state.players.filter((p) => p.team === 'atk')
      .reduce((min, p) => (p.x < min.x ? p : min));
}

function doPass() {
  if (anim) return;
  const from = passer();
  const target = chosenReceiver();
  if (!target) return;
  receiverId = target.id;
  hideVerdict();

  const start = { x: from.x, y: from.y };
  const end = { x: target.x, y: target.y };
  const lineX = offsideLineX();
  const ballAtPassX = state.ball.x; // posición del balón en el momento del pase
  const cls = classifyAttacker(target, lineX, ballAtPassX);

  const t0 = performance.now();
  const dur = 650;
  anim = { ball: { x: start.x, y: start.y } };

  function step(now) {
    const t = Math.min(1, (now - t0) / dur);
    const e = 1 - Math.pow(1 - t, 2); // ease-out
    anim.ball.x = start.x + (end.x - start.x) * e;
    anim.ball.y = start.y + (end.y - start.y) * e;
    render();
    if (t < 1) {
      requestAnimationFrame(step);
    } else {
      anim = null;
      state.ball.x = end.x;
      state.ball.y = end.y;
      render();
      showVerdict(cls, target, lineX);
    }
  }
  requestAnimationFrame(step);
}

function showVerdict(cls, target, lineX) {
  verdictEl.classList.remove('hidden', 'off', 'on', 'level');
  const name = target.label ? 'Atacante ' + target.label : 'El atacante';
  if (cls === 'off') {
    verdictEl.classList.add('off');
    verdictEl.innerHTML = '🚩 ¡FUERA DE LUGAR! <small>' + name +
      ' estaba más adelantado que el penúltimo defensor cuando salió el pase.</small>';
  } else if (cls === 'level') {
    verdictEl.classList.add('level');
    verdictEl.innerHTML = '🟡 HABILITADO (en línea) <small>' + name +
      ' estaba a la misma altura del penúltimo defensor. La igualdad habilita ✅</small>';
  } else {
    verdictEl.classList.add('on');
    verdictEl.innerHTML = '✅ JUGADA LEGAL <small>' + name +
      ' estaba detrás (o a la altura) del penúltimo defensor o del balón.</small>';
  }
}

function hideVerdict() {
  verdictEl.classList.add('hidden');
}

/* ---------------- Controles ---------------- */
document.getElementById('passBtn').addEventListener('click', doPass);
document.getElementById('resetBtn').addEventListener('click', () => {
  state = scenario('offside');
  receiverId = null;
  anim = null;
  hideVerdict();
  render();
});
document.querySelectorAll('[data-scenario]').forEach((btn) => {
  btn.addEventListener('click', () => {
    state = scenario(btn.dataset.scenario);
    receiverId = null;
    anim = null;
    hideVerdict();
    render();
  });
});
toggleLines.addEventListener('change', render);
toggleLive.addEventListener('change', render);

/* ---------------- Init ---------------- */
function onResize() {
  setupCanvas();
  render();
}
window.addEventListener('resize', onResize);
window.addEventListener('orientationchange', () => setTimeout(onResize, 200));

setupCanvas();
render();
