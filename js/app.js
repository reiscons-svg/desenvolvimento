/* ============ PDP App — lógica de interface ============ */
(function () {
  "use strict";

  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ---------- Preferências (tema, fonte) ---------- */
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };

  const html = document.documentElement;
  let theme = store.get("pdp.theme", null);
  if (!theme) theme = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  let fontScale = store.get("pdp.font", 100);
  const FONT_STEPS = [85, 92, 100, 110, 120, 132, 145];

  function applyTheme() {
    html.setAttribute("data-theme", theme);
    $("#btn-theme").textContent = theme === "dark" ? "☀️" : "🌙";
    const meta = $('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "dark" ? "#10121c" : "#4f46e5");
    store.set("pdp.theme", theme);
  }
  function applyFont() {
    html.style.setProperty("--font-scale", fontScale + "%");
    store.set("pdp.font", fontScale);
    toast("Tamanho da letra: " + fontScale + "%");
  }
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(t._h);
    t._h = setTimeout(() => t.classList.remove("show"), 1600);
  }

  $("#btn-theme").addEventListener("click", () => { theme = theme === "dark" ? "light" : "dark"; applyTheme(); });
  $("#btn-font-up").addEventListener("click", () => {
    const i = FONT_STEPS.indexOf(fontScale);
    fontScale = FONT_STEPS[Math.min(i + 1, FONT_STEPS.length - 1)] || 145;
    applyFont();
  });
  $("#btn-font-down").addEventListener("click", () => {
    const i = FONT_STEPS.indexOf(fontScale);
    fontScale = FONT_STEPS[Math.max(i - 1, 0)] || 85;
    applyFont();
  });

  /* ---------- Menu hambúrguer (painel único abaixo do header) ---------- */
  const burger = $("#btn-hamburger");
  const panel = $("#menu-panel");
  function closeMenu() {
    panel.classList.remove("open");
    burger.classList.remove("open");
    burger.setAttribute("aria-expanded", "false");
  }
  burger.addEventListener("click", (e) => {
    e.stopPropagation();
    const open = panel.classList.toggle("open");
    burger.classList.toggle("open", open);
    burger.setAttribute("aria-expanded", String(open));
  });
  document.addEventListener("click", (e) => {
    if (panel.classList.contains("open") && !panel.contains(e.target) && e.target !== burger) closeMenu();
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeMenu(); });

  /* ---------- Progresso da trilha ---------- */
  let progress = store.get("pdp.progress", {});
  function saveProgress() { store.set("pdp.progress", progress); }
  function moduleDone(m) {
    return m.checklist.length > 0 && m.checklist.every((_, i) => progress[m.id + ":c" + i]);
  }

  /* ---------- Render: Início ---------- */
  function renderInicio() {
    $("#page-inicio").innerHTML = `
      <div class="hero">
        <h2>🌱 Plano de Desenvolvimento Pessoal</h2>
        <p>Um app educativo completo para você aprender e aplicar o método apresentado por
        André Arcas: como criar um plano de vida <strong>integrado</strong>, dimensão por dimensão,
        com premissas, visão, propósito e estratégia.</p>
        <div class="badges">
          <span class="badge">🎬 ${esc(VIDEO.autor)}</span>
          <span class="badge">📅 ${esc(VIDEO.data)}</span>
          <span class="badge">🧩 11 dimensões</span>
          <span class="badge">🧭 14 módulos</span>
          <span class="badge">📖 20 termos</span>
        </div>
      </div>

      <div class="card">
        <h3>🎬 Assista à referência</h3>
        <div class="video-wrap">
          <iframe src="${VIDEO.embed}" title="${esc(VIDEO.titulo)}" loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
        </div>
        <p class="muted">${esc(VIDEO.titulo)} — ${esc(VIDEO.autor)}. Use o menu ☰ acima para navegar por todo o conteúdo.</p>
      </div>

      <div class="grid-2">
        <div class="card">
          <h3>🧭 Trilha do Conhecimento</h3>
          <p>14 módulos progressivos que transformam o vídeo em prática: fundamentos, método Lifebook,
          as 11 dimensões da vida e a integração final do seu plano — com atividades, checklists,
          quiz de fixação e progresso salvo no seu dispositivo.</p>
          <div class="mod-actions"><a class="btn" href="#trilha">Começar a trilha →</a></div>
        </div>
        <div class="card">
          <h3>🗺️ Mapa Visual do Livro</h3>
          <p>A roda da vida interativa: as 11 dimensões do plano em um mapa radial clicável,
          com o fluxo do método em 6 passos. Abre em uma nova aba para você explorar à vontade.</p>
          <div class="mod-actions"><a class="btn" href="mapa.html" target="_blank" rel="noopener">Abrir o mapa ↗</a></div>
        </div>
      </div>

      <div class="card">
        <h3>⚡ Comece por aqui: as 4 camadas do método</h3>
        <div class="grid-2">
          <div class="concept"><strong>1. Premissas</strong><p>No que eu acredito sobre esta área da vida? Reescreva crenças limitantes.</p></div>
          <div class="concept"><strong>2. Visão 10/10</strong><p>Como seria o estado ideal desta área em 5–10 anos? Descreva com riqueza.</p></div>
          <div class="concept"><strong>3. Propósito</strong><p>Por que essa visão importa para mim? O combustível da longa duração.</p></div>
          <div class="concept"><strong>4. Estratégia</strong><p>Hábitos, metas SMART e métricas que traduzem a visão em rotina.</p></div>
        </div>
      </div>`;
  }

  /* ---------- Render: Resumo ---------- */
  function renderResumo() {
    $("#page-resumo").innerHTML = `
      <div class="hero"><h2>📝 Resumo — /summary</h2>
      <p>O conteúdo completo do vídeo, expandido: introdução, linha do tempo capítulo a capítulo e conclusão.</p></div>
      <div class="card">
        <h3>💡 A ideia central</h3>
        ${SUMMARY.intro.map((p) => `<p>${esc(p)}</p>`).join("")}
      </div>
      <div class="card">
        <h3>⏱️ Linha do tempo do vídeo</h3>
        <div class="timeline">
          ${SUMMARY.timeline.map((x) => `
            <div class="tl-item">
              <span class="tl-time">${esc(x.t)}</span>
              <h4>${esc(x.h)}</h4>
              <p>${esc(x.d)}</p>
            </div>`).join("")}
        </div>
      </div>
      <div class="card">
        <h3>🏁 Conclusão</h3>
        ${SUMMARY.conclusao.map((p) => `<p>${esc(p)}</p>`).join("")}
      </div>`;
  }

  /* ---------- Render: Pontos-chave ---------- */
  function renderKeypoints() {
    $("#page-pontos-chave").innerHTML = `
      <div class="hero"><h2>🔑 Pontos-Chave — /keypoints</h2>
      <p>As 12 ideias essenciais do vídeo, prontas para revisão rápida.</p></div>
      <div class="kp-grid">
        ${KEYPOINTS.map((k) => `
          <div class="kp">
            <div class="kp-icon">${k.icon}</div>
            <h4>${esc(k.t)}</h4>
            <p>${esc(k.d)}</p>
          </div>`).join("")}
      </div>`;
  }

  /* ---------- Render: Explicação ---------- */
  function renderExplain() {
    $("#page-explicacao").innerHTML = `
      <div class="hero"><h2>💡 Explicação — /explain</h2>
      <p>Análise aprofundada do método: por que funciona, como funciona e como aplicar.</p></div>
      ${EXPLAIN.map((s) => `
        <div class="card">
          <h3>🔎 ${esc(s.h)}</h3>
          ${s.p.map((p) => `<p>${esc(p)}</p>`).join("")}
        </div>`).join("")}`;
  }

  /* ---------- Render: Glossário ---------- */
  function renderGlossary() {
    $("#page-glossario").innerHTML = `
      <div class="hero"><h2>📖 Glossário — /glossary</h2>
      <p>Os 20 termos essenciais do universo do desenvolvimento pessoal e do método Lifebook.</p></div>
      <div class="gloss-list">
        ${GLOSSARY.map((g) => `
          <dl class="gloss"><dt>${esc(g.term)}</dt><dd>${esc(g.def)}</dd></dl>`).join("")}
      </div>`;
  }

  /* ---------- Render: Perguntas ---------- */
  function renderQuestions() {
    $("#page-perguntas").innerHTML = `
      <div class="hero"><h2>❓ Perguntas — /questions</h2>
      <p>As 12 dúvidas mais comuns sobre criar e manter um plano de desenvolvimento pessoal.</p></div>
      ${QUESTIONS.map((x) => `
        <details class="faq">
          <summary>${esc(x.q)}</summary>
          <div class="faq-a">${esc(x.a)}</div>
        </details>`).join("")}`;
  }

  /* ---------- Render: Trilha ---------- */
  function renderTrilha() {
    const doneCount = TRILHA.filter(moduleDone).length;
    const pct = Math.round((doneCount / TRILHA.length) * 100);
    $("#page-trilha").innerHTML = `
      <div class="hero"><h2>🧭 Trilha do Conhecimento</h2>
      <p>14 módulos progressivos, do fundamento ao plano completo. Cada módulo tem objetivos,
      conceitos, conteúdo expandido, atividades, checklist e quiz de fixação.</p></div>

      <div class="card progress-card">
        <h3 style="margin:0">📊 Seu progresso</h3>
        <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
        <span class="progress-num">${doneCount}/${TRILHA.length} módulos (${pct}%)</span>
      </div>

      ${TRILHA.map((m) => renderModule(m)).join("")}`;
    bindModules();
    bindChecklists();
    bindQuizzes();
  }

  function renderModule(m) {
    const done = moduleDone(m);
    return `
      <article class="module" id="mod-${m.id}">
        <div class="module-head" role="button" tabindex="0" aria-expanded="false">
          <div class="mod-num">${m.icon}</div>
          <div class="mod-info">
            <h3>Módulo ${m.num} — ${esc(m.titulo)}</h3>
            <div class="mod-meta">
              <span class="chip">⏱️ ${esc(m.duracao)}</span>
              <span class="chip">📈 ${esc(m.nivel)}</span>
              <span class="chip ${done ? "done" : ""}">${done ? "✔ concluído" : m.checklist.length + " itens de checklist"}</span>
            </div>
          </div>
          <span class="mod-caret">▼</span>
        </div>
        <div class="mod-body">
          <div class="mod-body-inner">
            <h4>🎯 Objetivos de aprendizagem</h4>
            <ul class="clean">${m.objetivos.map((o) => `<li>${esc(o)}</li>`).join("")}</ul>

            <h4>🧩 Conceitos essenciais</h4>
            ${m.conceitos.map((c) => `<div class="concept"><strong>${esc(c.t)}</strong><p>${esc(c.d)}</p></div>`).join("")}

            <h4>📚 Conteúdo expandido</h4>
            ${m.conteudo.map((p) => `<p>${esc(p)}</p>`).join("")}

            <h4>✍️ Atividades práticas</h4>
            <ul class="clean">${m.atividades.map((a) => `<li>${esc(a)}</li>`).join("")}</ul>

            <h4>✅ Checklist do módulo <span class="muted" style="font-weight:400;text-transform:none;letter-spacing:0">(toque para marcar)</span></h4>
            <ul class="clean check-list" data-mod="${m.id}">
              ${m.checklist.map((c, i) => `<li data-i="${i}" class="${progress[m.id + ":c" + i] ? "checked" : ""}">${esc(c)}</li>`).join("")}
            </ul>

            <div class="quiz" data-quiz="${m.id}">
              <div class="quiz-q">🧠 Quiz: ${esc(m.quiz.q)}</div>
              <div class="quiz-opts">
                ${m.quiz.opcoes.map((o, i) => `<button class="quiz-opt" data-i="${i}">${esc(o)}</button>`).join("")}
              </div>
              <div class="quiz-fb">💡 ${esc(m.quiz.explicacao)}</div>
            </div>
          </div>
        </div>
      </article>`;
  }

  function bindModules() {
    $$(".module-head").forEach((head) => {
      const toggle = () => {
        const mod = head.parentElement;
        const open = mod.classList.toggle("open");
        head.setAttribute("aria-expanded", String(open));
      };
      head.addEventListener("click", toggle);
      head.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } });
    });
  }

  function bindChecklists() {
    $$(".check-list li").forEach((li) => {
      li.addEventListener("click", () => {
        const modId = li.parentElement.getAttribute("data-mod");
        const i = li.getAttribute("data-i");
        progress[modId + ":c" + i] = !progress[modId + ":c" + i];
        li.classList.toggle("checked", !!progress[modId + ":c" + i]);
        saveProgress();
        refreshProgress();
      });
    });
  }

  function bindQuizzes() {
    $$(".quiz").forEach((qz) => {
      const modId = qz.getAttribute("data-quiz");
      const m = TRILHA.find((x) => x.id === modId);
      $$(".quiz-opt", qz).forEach((btn) => {
        btn.addEventListener("click", () => {
          const chosen = Number(btn.getAttribute("data-i"));
          $$(".quiz-opt", qz).forEach((b, i) => {
            b.disabled = true;
            if (i === m.quiz.correta) b.classList.add("right");
          });
          if (chosen !== m.quiz.correta) btn.classList.add("wrong");
          $(".quiz-fb", qz).classList.add("show");
          progress[modId + ":quiz"] = chosen === m.quiz.correta;
          saveProgress();
        });
      });
    });
  }

  function refreshProgress() {
    const doneCount = TRILHA.filter(moduleDone).length;
    const pct = Math.round((doneCount / TRILHA.length) * 100);
    const fill = $(".progress-fill");
    const num = $(".progress-num");
    if (fill) fill.style.width = pct + "%";
    if (num) num.textContent = doneCount + "/" + TRILHA.length + " módulos (" + pct + "%)";
    if (doneCount === TRILHA.length) toast("🎉 Parabéns! Trilha completa!");
  }

  /* ---------- Roteamento por hash ---------- */
  const PAGES = { inicio: renderInicio, resumo: renderResumo, "pontos-chave": renderKeypoints, explicacao: renderExplain, glossario: renderGlossary, perguntas: renderQuestions, trilha: renderTrilha };

  function route() {
    const name = (location.hash || "#inicio").replace("#", "");
    const page = PAGES[name] ? name : "inicio";
    PAGES[page]();
    $$(".page").forEach((p) => p.classList.remove("active"));
    $("#page-" + page).classList.add("active");
    $$(".menu-link").forEach((a) => a.classList.toggle("active", a.getAttribute("data-page") === page));
    closeMenu();
    window.scrollTo({ top: 0 });
  }
  window.addEventListener("hashchange", route);

  /* ---------- Init ---------- */
  applyTheme();
  html.style.setProperty("--font-scale", fontScale + "%");
  route();

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  }
})();
