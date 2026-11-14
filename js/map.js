/* ============ Mapa Visual do Livro — roda da vida interativa ============ */
(function () {
  "use strict";
  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* Tema (compartilha preferência com o app principal) */
  const html = document.documentElement;
  let theme = null;
  try { theme = JSON.parse(localStorage.getItem("pdp.theme")); } catch (e) {}
  if (!theme) theme = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  function applyTheme() {
    html.setAttribute("data-theme", theme);
    $("#btn-theme").textContent = theme === "dark" ? "☀️" : "🌙";
    try { localStorage.setItem("pdp.theme", JSON.stringify(theme)); } catch (e) {}
  }
  $("#btn-theme").addEventListener("click", () => { theme = theme === "dark" ? "light" : "dark"; applyTheme(); });
  applyTheme();

  /* ---------- Roda radial SVG ---------- */
  const NS = "http://www.w3.org/2000/svg";
  const svg = $("#wheel");
  const CX = 450, CY = 450;
  const R_INNER = 120, R_SEG = 155, R_OUTER = 300;

  function polar(cx, cy, r, deg) {
    const rad = (deg - 90) * Math.PI / 180;
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
  }
  function donutPath(r1, r2, a1, a2) {
    const [x1, y1] = polar(CX, CY, r2, a1);
    const [x2, y2] = polar(CX, CY, r2, a2);
    const [x3, y3] = polar(CX, CY, r1, a2);
    const [x4, y4] = polar(CX, CY, r1, a1);
    const large = (a2 - a1) > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${r2} ${r2} 0 ${large} 1 ${x2} ${y2} L ${x3} ${y3} A ${r1} ${r1} 0 ${large} 0 ${x4} ${y4} Z`;
  }

  const step = 360 / DIMENSIONS.length;
  DIMENSIONS.forEach((d, i) => {
    const a1 = i * step + 2, a2 = (i + 1) * step - 2;
    const g = document.createElementNS(NS, "g");
    g.setAttribute("class", "wheel-seg");
    g.setAttribute("data-id", d.id);

    const path = document.createElementNS(NS, "path");
    path.setAttribute("d", donutPath(R_SEG, R_OUTER, a1, a2));
    path.setAttribute("fill", d.cor);
    path.setAttribute("opacity", "0.88");
    g.appendChild(path);

    const mid = (a1 + a2) / 2;
    const [ex, ey] = polar(CX, CY, (R_SEG + R_OUTER) / 2 + 38, mid);
    const [ix, iy] = polar(CX, CY, (R_SEG + R_OUTER) / 2 - 22, mid);

    const emoji = document.createElementNS(NS, "text");
    emoji.setAttribute("class", "wheel-emoji");
    emoji.setAttribute("x", ix); emoji.setAttribute("y", iy + 8);
    emoji.setAttribute("text-anchor", "middle");
    emoji.textContent = d.icon;
    g.appendChild(emoji);

    const label = document.createElementNS(NS, "text");
    label.setAttribute("class", "wheel-label");
    label.setAttribute("x", ex); label.setAttribute("y", ey);
    label.setAttribute("text-anchor", "middle");
    label.textContent = d.nome;
    g.appendChild(label);

    g.addEventListener("click", () => selectDim(d.id));
    svg.appendChild(g);
  });

  /* Núcleo central */
  const core = document.createElementNS(NS, "g");
  const c1 = document.createElementNS(NS, "circle");
  c1.setAttribute("cx", CX); c1.setAttribute("cy", CY); c1.setAttribute("r", R_INNER);
  c1.setAttribute("fill", "url(#coreGrad)");
  const defs = document.createElementNS(NS, "defs");
  const grad = document.createElementNS(NS, "linearGradient");
  grad.setAttribute("id", "coreGrad"); grad.setAttribute("x1", "0"); grad.setAttribute("y1", "0"); grad.setAttribute("x2", "1"); grad.setAttribute("y2", "1");
  const s1 = document.createElementNS(NS, "stop"); s1.setAttribute("offset", "0%"); s1.setAttribute("stop-color", "#4f46e5");
  const s2 = document.createElementNS(NS, "stop"); s2.setAttribute("offset", "100%"); s2.setAttribute("stop-color", "#7c3aed");
  grad.appendChild(s1); grad.appendChild(s2); defs.appendChild(grad);
  svg.appendChild(defs);
  core.appendChild(c1);
  const t1 = document.createElementNS(NS, "text");
  t1.setAttribute("x", CX); t1.setAttribute("y", CY - 18);
  t1.setAttribute("text-anchor", "middle"); t1.setAttribute("fill", "#fff");
  t1.setAttribute("font-size", "34"); t1.textContent = "🌱";
  const t2 = document.createElementNS(NS, "text");
  t2.setAttribute("x", CX); t2.setAttribute("y", CY + 14);
  t2.setAttribute("text-anchor", "middle"); t2.setAttribute("fill", "#fff");
  t2.setAttribute("font-size", "17"); t2.setAttribute("font-weight", "800");
  t2.textContent = "MEU PDP";
  const t3 = document.createElementNS(NS, "text");
  t3.setAttribute("x", CX); t3.setAttribute("y", CY + 38);
  t3.setAttribute("text-anchor", "middle"); t3.setAttribute("fill", "rgba(255,255,255,.85)");
  t3.setAttribute("font-size", "11");
  t3.textContent = "11 dimensões integradas";
  core.appendChild(t1); core.appendChild(t2); core.appendChild(t3);
  svg.appendChild(core);

  /* Anel externo com o fluxo do método */
  const ring = document.createElementNS(NS, "circle");
  ring.setAttribute("cx", CX); ring.setAttribute("cy", CY); ring.setAttribute("r", R_OUTER + 42);
  ring.setAttribute("fill", "none");
  ring.setAttribute("stroke", "var(--border)");
  ring.setAttribute("stroke-width", "2");
  ring.setAttribute("stroke-dasharray", "6 8");
  svg.appendChild(ring);

  /* ---------- Painel de detalhe ---------- */
  function selectDim(id) {
    const d = DIMENSIONS.find((x) => x.id === id);
    $$(".wheel-seg").forEach((g) => g.classList.toggle("dim", g.getAttribute("data-id") !== id));
    $("#dim-detail").innerHTML = `
      <div class="card dim-detail-card" style="border-left-color:${d.cor}">
        <h3>${d.icon} ${esc(d.nome)} <span class="chip">Dimensão ${d.n} de 11</span></h3>
        <p class="muted">${esc(d.sub)}</p>
        <p>${esc(d.desc)}</p>
        <h4 style="margin:1rem 0 .4rem;font-size:.8rem;text-transform:uppercase;letter-spacing:.1em;color:${d.cor}">Práticas recomendadas</h4>
        <ul class="clean">${d.praticas.map((p) => `<li>${esc(p)}</li>`).join("")}</ul>
        <div class="quiz" style="margin-top:1rem">
          <div class="quiz-q">🔭 Pergunta-guia da visão 10/10</div>
          <p style="margin:0;font-size:.95rem">${esc(d.pergunta)}</p>
        </div>
        <div class="mod-actions">
          <a class="btn" href="index.html#trilha">Estudar na trilha →</a>
        </div>
      </div>`;
    $("#dim-detail").scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  /* ---------- Fluxo do método ---------- */
  $("#flow").innerHTML = METODO_FLOW.map((f) => `
    <div class="flow-step">
      <div class="fn">${f.n}</div>
      <h4>${esc(f.t)}</h4>
      <p>${esc(f.d)}</p>
    </div>`).join("");

  /* Seleção inicial */
  selectDim("corpo");
})();
