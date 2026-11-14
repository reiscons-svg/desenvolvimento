/* ============ Gestão de Manutenção — lógica de interface ============ */
(function () {
  "use strict";

  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>\"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };

  const KEY = "manut.data.v1";
  const JANELA_DIAS = 90;

  /* ---------- Datas ---------- */
  const hojeISO = () => new Date().toISOString().slice(0, 10);
  function addDays(iso, n) {
    const d = new Date(iso + "T12:00:00");
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
  }
  function diffDias(a, b) {
    return Math.round((new Date(b + "T12:00:00") - new Date(a + "T12:00:00")) / 86400000);
  }
  function fmtBR(iso) {
    if (!iso) return "—";
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
  }
  function fmtMoeda(v) {
    return Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
  }

  /* ---------- Estado ---------- */
  let db = null;
  let filtroAtivos = "";
  let filtroOS = { texto: "", status: "", tipo: "" };

  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  function seed() {
    const h = hojeISO();
    return {
      seqOS: 13,
      ativos: [
        { id: "a1", codigo: "BOM-001", nome: "Compressor de parafuso 50 HP", categoria: "Utilidades", local: "Casa de máquinas", status: "operando", fabricante: "Atlas Copco", aquisicao: addDays(h, -1200), custo: 85000 },
        { id: "a2", codigo: "BOM-002", nome: "Bomba centrífuga de recirculação", categoria: "Processo", local: "Área de produção A", status: "operando", fabricante: "KSB", aquisicao: addDays(h, -800), custo: 22000 },
        { id: "a3", codigo: "PRE-010", nome: "Prensa hidráulica 100 t", categoria: "Produção", local: "Área de produção B", status: "manutencao", fabricante: "Schulman", aquisicao: addDays(h, -2200), custo: 310000 },
        { id: "a4", codigo: "EMP-004", nome: "Empilhadeira elétrica 2,5 t", categoria: "Logística", local: "Almoxarifado", status: "operando", fabricante: "Toyota", aquisicao: addDays(h, -500), custo: 140000 },
        { id: "a5", codigo: "CLP-007", nome: "CLP da linha de envase", categoria: "Automação", local: "Área de produção A", status: "operando", fabricante: "Siemens", aquisicao: addDays(h, -1500), custo: 48000 },
        { id: "a6", codigo: "GER-002", nome: "Gerador diesel 250 kVA", categoria: "Utilidades", local: "Subestação", status: "parado", fabricante: "Cummins", aquisicao: addDays(h, -3000), custo: 220000 }
      ],
      ordens: [
        { id: "o1", numero: 1, ativoId: "a1", tipo: "preventiva", titulo: "Troca de filtros e óleo", descricao: "Manutenção preventiva trimestral do compressor.", prioridade: "media", status: "concluida", abertura: addDays(h, -80), conclusao: addDays(h, -79), custo: 1800, paradaHoras: 3 },
        { id: "o2", numero: 2, ativoId: "a3", tipo: "corretiva", titulo: "Vazamento no circuito hidráulico", descricao: "Vazamento observado na mangueira principal.", prioridade: "alta", status: "concluida", abertura: addDays(h, -60), conclusao: addDays(h, -58), custo: 4200, paradaHoras: 16 },
        { id: "o3", numero: 3, ativoId: "a2", tipo: "corretiva", titulo: "Vibração excessiva no motor", descricao: "Possível desgaste de rolamentos.", prioridade: "alta", status: "concluida", abertura: addDays(h, -40), conclusao: addDays(h, -40), custo: 2600, paradaHoras: 8 },
        { id: "o4", numero: 4, ativoId: "a5", tipo: "preventiva", titulo: "Backup e inspeção do CLP", descricao: "Verificação de baterias e backup de programa.", prioridade: "media", status: "concluida", abertura: addDays(h, -30), conclusao: addDays(h, -30), custo: 900, paradaHoras: 2 },
        { id: "o5", numero: 5, ativoId: "a4", tipo: "corretiva", titulo: "Freio de serviço com ruído", descricao: "Ajuste e troca de pastilhas.", prioridade: "media", status: "concluida", abertura: addDays(h, -20), conclusao: addDays(h, -19), custo: 1500, paradaHoras: 5 },
        { id: "o6", numero: 6, ativoId: "a1", tipo: "corretiva", titulo: "Alta temperatura de descarga", descricao: "Verificar trocador e válvula de admissão.", prioridade: "alta", status: "em_andamento", abertura: addDays(h, -3), conclusao: null, custo: 0, paradaHoras: 0 },
        { id: "o7", numero: 7, ativoId: "a3", tipo: "preventiva", titulo: "Inspeção geral da prensa", descricao: "Checklist de segurança e lubrificação.", prioridade: "media", status: "em_andamento", abertura: addDays(h, -1), conclusao: null, custo: 0, paradaHoras: 0 },
        { id: "o8", numero: 8, ativoId: "a2", tipo: "preventiva", titulo: "Troca de selo mecânico", descricao: "Preventiva programada do selo da bomba.", prioridade: "baixa", status: "aberta", abertura: addDays(h, 0), conclusao: null, custo: 0, paradaHoras: 0 },
        { id: "o9", numero: 9, ativoId: "a6", tipo: "corretiva", titulo: "Bateria de partida fraca", descricao: "Substituir banco de baterias.", prioridade: "alta", status: "aberta", abertura: addDays(h, -6), conclusao: null, custo: 0, paradaHoras: 0 },
        { id: "o10", numero: 10, ativoId: "a4", tipo: "preventiva", titulo: "Revisão de 500 h", descricao: "Revisão programada da empilhadeira.", prioridade: "baixa", status: "aberta", abertura: addDays(h, -2), conclusao: null, custo: 0, paradaHoras: 0 },
        { id: "o11", numero: 11, ativoId: "a1", tipo: "corretiva", titulo: "Dreno automático entupido", descricao: "Limpeza do dreno do reservatório.", prioridade: "baixa", status: "concluida", abertura: addDays(h, -85), conclusao: addDays(h, -85), custo: 350, paradaHoras: 1 },
        { id: "o12", numero: 12, ativoId: "a5", tipo: "corretiva", titulo: "Sensor de nível com falha intermitente", descricao: "Trocar sensor e revisar conector.", prioridade: "media", status: "concluida", abertura: addDays(h, -70), conclusao: addDays(h, -69), custo: 1200, paradaHoras: 4 }
      ],
      planos: [
        { id: "p1", nome: "Preventiva trimestral do compressor", ativoId: "a1", periodicidadeDias: 90, ultimaExecucao: addDays(h, -88), ativo: true },
        { id: "p2", nome: "Inspeção mensal da bomba", ativoId: "a2", periodicidadeDias: 30, ultimaExecucao: addDays(h, -33), ativo: true },
        { id: "p3", nome: "Revisão semestral da prensa", ativoId: "a3", periodicidadeDias: 180, ultimaExecucao: addDays(h, -120), ativo: true },
        { id: "p4", nome: "Revisão de 500 h da empilhadeira", ativoId: "a4", periodicidadeDias: 120, ultimaExecucao: addDays(h, -60), ativo: true },
        { id: "p5", nome: "Checklist mensal do gerador", ativoId: "a6", periodicidadeDias: 30, ultimaExecucao: addDays(h, -10), ativo: true }
      ]
    };
  }

  function load() {
    db = store.get(KEY, null);
    if (!db || !Array.isArray(db.ativos)) {
      db = seed();
      save();
    }
  }
  function save() { store.set(KEY, db); }

  const ativoById = (id) => db.ativos.find((a) => a.id === id);
  const ativoNome = (id) => { const a = ativoById(id); return a ? `${a.codigo} — ${a.nome}` : "(ativo removido)"; };

  /* ---------- UI básica ---------- */
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(t._h);
    t._h = setTimeout(() => t.classList.remove("show"), 1800);
  }

  const STATUS_ATIVO = {
    operando: { label: "Operando", cls: "b-ok" },
    manutencao: { label: "Em manutenção", cls: "b-warn" },
    parado: { label: "Parado", cls: "b-bad" },
    desativado: { label: "Desativado", cls: "b-mute" }
  };
  const STATUS_OS = {
    aberta: { label: "Aberta", cls: "b-info" },
    em_andamento: { label: "Em andamento", cls: "b-warn" },
    concluida: { label: "Concluída", cls: "b-ok" },
    cancelada: { label: "Cancelada", cls: "b-mute" }
  };
  const PRIORIDADE = { alta: { label: "Alta", cls: "b-bad" }, media: { label: "Média", cls: "b-warn" }, baixa: { label: "Baixa", cls: "b-mute" } };
  const TIPO_OS = { corretiva: "Corretiva", preventiva: "Preventiva" };

  function badge(map, val) {
    const s = map[val] || { label: val || "—", cls: "b-mute" };
    return `<span class="badge ${s.cls}">${esc(s.label)}</span>`;
  }

  /* ---------- Modal ---------- */
  let modalSubmit = null;
  function openModal(titulo, bodyHTML, onSubmit) {
    $("#modal-title").textContent = titulo;
    $("#modal-form").innerHTML = bodyHTML + `
      <div class="modal-foot">
        <button type="button" class="btn secondary" id="modal-cancel">Cancelar</button>
        <button type="submit" class="btn">Salvar</button>
      </div>`;
    $("#modal-backdrop").hidden = false;
    modalSubmit = onSubmit;
    const first = $("#modal-form input, #modal-form select, #modal-form textarea");
    if (first) first.focus();
  }
  function closeModal() {
    $("#modal-backdrop").hidden = true;
    modalSubmit = null;
  }
  function fieldVal(form, name) {
    const el = form.elements[name];
    return el ? el.value.trim() : "";
  }
  function num(form, name) {
    const v = fieldVal(form, name);
    return v === "" ? 0 : Number(v);
  }

  $("#modal-close").addEventListener("click", closeModal);
  document.addEventListener("click", (e) => {
    if (e.target.id === "modal-backdrop") closeModal();
    if (e.target.id === "modal-cancel") closeModal();
  });
  $("#modal-form").addEventListener("submit", (e) => {
    e.preventDefault();
    if (modalSubmit && modalSubmit(e.target) !== false) closeModal();
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("#modal-backdrop").hidden) closeModal(); });

  /* ---------- Indicadores ---------- */
  function indicadores() {
    const h = hojeISO();
    const inicio = addDays(h, -JANELA_DIAS);
    const conclCorretivas = db.ordens.filter((o) => o.tipo === "corretiva" && o.status === "concluida" && o.conclusao >= inicio);
    const falhas = conclCorretivas.length;
    const paradaTotal = conclCorretivas.reduce((s, o) => s + Number(o.paradaHoras || 0), 0);
    const horasPeriodo = JANELA_DIAS * 24;
    const mtbf = falhas > 0 ? horasPeriodo / falhas : null;
    const mttr = falhas > 0 ? paradaTotal / falhas : null;
    const disp = mtbf != null && mttr != null ? (mtbf / (mtbf + mttr)) * 100 : null;
    const custoPeriodo = db.ordens.filter((o) => o.status === "concluida" && o.conclusao >= inicio)
      .reduce((s, o) => s + Number(o.custo || 0), 0);
    const abertas = db.ordens.filter((o) => o.status === "aberta" || o.status === "em_andamento").length;
    const atrasadas = db.ordens.filter((o) => (o.status === "aberta" || o.status === "em_andamento") && o.prioridade === "alta").length;
    return { falhas, mtbf, mttr, disp, custoPeriodo, abertas, atrasadas };
  }

  function planosVencendo() {
    const h = hojeISO();
    return db.planos
      .filter((p) => p.ativo)
      .map((p) => ({ ...p, proxima: addDays(p.ultimaExecucao, p.periodicidadeDias) }))
      .filter((p) => diffDias(h, p.proxima) <= 7)
      .sort((a, b) => a.proxima.localeCompare(b.proxima));
  }

  /* ---------- Dashboard ---------- */
  function renderDashboard() {
    const ind = indicadores();
    const operando = db.ativos.filter((a) => a.status === "operando").length;
    const venc = planosVencendo();
    const ultimas = [...db.ordens].sort((a, b) => b.abertura.localeCompare(a.abertura)).slice(0, 6);

    $("#tab-dashboard").innerHTML = `
      <div class="page-head">
        <div><h2>Dashboard</h2><div class="sub">Indicadores dos últimos ${JANELA_DIAS} dias</div></div>
        <button class="btn" data-acao="nova-os">+ Nova ordem</button>
      </div>
      <div class="cards">
        <div class="card"><div class="k">Ativos cadastrados</div><div class="v">${db.ativos.length}</div><div class="d">${operando} operando</div></div>
        <div class="card ${ind.abertas > 0 ? "warn" : "ok"}"><div class="k">OS em aberto</div><div class="v">${ind.abertas}</div><div class="d">${ind.atrasadas} de alta prioridade</div></div>
        <div class="card"><div class="k">Custo de manutenção</div><div class="v">${fmtMoeda(ind.custoPeriodo)}</div><div class="d">OS concluídas no período</div></div>
        <div class="card"><div class="k">MTBF</div><div class="v">${ind.mtbf == null ? "—" : Math.round(ind.mtbf) + " h"}</div><div class="d">${ind.falhas} falha(s) no período</div></div>
        <div class="card"><div class="k">MTTR</div><div class="v">${ind.mttr == null ? "—" : ind.mttr.toFixed(1) + " h"}</div><div class="d">Tempo médio de reparo</div></div>
        <div class="card ${ind.disp != null && ind.disp < 90 ? "bad" : "ok"}"><div class="k">Disponibilidade</div><div class="v">${ind.disp == null ? "—" : ind.disp.toFixed(1) + "%"}</div><div class="d">MTBF / (MTBF + MTTR)</div></div>
      </div>
      <div class="panel">
        <h3>📅 Preventivos vencendo (próximos 7 dias)</h3>
        ${venc.length === 0 ? `<div class="empty">Nenhum plano preventivo vencendo. Tudo em dia! ✅</div>` : `
        <div class="table-wrap"><table>
          <thead><tr><th>Plano</th><th>Ativo</th><th>Periodicidade</th><th>Próxima execução</th><th>Situação</th><th></th></tr></thead>
          <tbody>${venc.map((p) => {
            const atrasado = diffDias(hojeISO(), p.proxima) < 0;
            return `<tr>
              <td><strong>${esc(p.nome)}</strong></td>
              <td>${esc(ativoNome(p.ativoId))}</td>
              <td>a cada ${p.periodicidadeDias} dias</td>
              <td>${fmtBR(p.proxima)}</td>
              <td>${atrasado ? `<span class="badge b-bad">Atrasado</span>` : `<span class="badge b-warn">Vence em ${diffDias(hojeISO(), p.proxima)} d</span>`}</td>
              <td><button class="btn sm" data-acao="gerar-os-plano" data-id="${p.id}">Gerar OS</button></td>
            </tr>`;
          }).join("")}</tbody>
        </table></div>`}
      </div>
      <div class="panel">
        <h3>🧾 Últimas ordens de manutenção</h3>
        <div class="table-wrap"><table>
          <thead><tr><th>Nº</th><th>Ativo</th><th>Título</th><th>Tipo</th><th>Status</th><th>Abertura</th></tr></thead>
          <tbody>${ultimas.map((o) => `<tr>
            <td>#${o.numero}</td>
            <td>${esc(ativoNome(o.ativoId))}</td>
            <td>${esc(o.titulo)}</td>
            <td>${badge(TIPO_OS, o.tipo)}</td>
            <td>${badge(STATUS_OS, o.status)}</td>
            <td>${fmtBR(o.abertura)}</td>
          </tr>`).join("")}</tbody>
        </table></div>
      </div>`;
  }

  /* ---------- Ativos ---------- */
  function renderAtivos() {
    const lista = db.ativos.filter((a) => {
      const t = filtroAtivos.toLowerCase();
      return !t || `${a.codigo} ${a.nome} ${a.local} ${a.categoria}`.toLowerCase().includes(t);
    });
    const contagemOS = (id) => db.ordens.filter((o) => o.ativoId === id && o.status !== "cancelada").length;

    $("#tab-ativos").innerHTML = `
      <div class="page-head">
        <div><h2>Ativos</h2><div class="sub">Máquinas e equipamentos cadastrados</div></div>
        <button class="btn" data-acao="novo-ativo">+ Novo ativo</button>
      </div>
      <div class="panel">
        <div class="filters">
          <input id="busca-ativos" type="search" placeholder="Buscar por código, nome, local ou categoria…" value="${esc(filtroAtivos)}">
        </div>
        ${lista.length === 0 ? `<div class="empty">Nenhum ativo encontrado.</div>` : `
        <div class="table-wrap"><table>
          <thead><tr><th>Código</th><th>Ativo</th><th>Categoria</th><th>Local</th><th>Status</th><th>OS</th><th>Aquisição</th><th></th></tr></thead>
          <tbody>${lista.map((a) => `<tr>
            <td><strong>${esc(a.codigo)}</strong></td>
            <td>${esc(a.nome)}<div class="sub">${esc(a.fabricante || "")}</div></td>
            <td>${esc(a.categoria || "—")}</td>
            <td>${esc(a.local || "—")}</td>
            <td>${badge(STATUS_ATIVO, a.status)}</td>
            <td>${contagemOS(a.id)}</td>
            <td>${fmtBR(a.aquisicao)}</td>
            <td><div class="acoes">
              <button class="btn sm secondary" data-acao="editar-ativo" data-id="${a.id}">Editar</button>
              <button class="btn sm danger" data-acao="excluir-ativo" data-id="${a.id}">Excluir</button>
            </div></td>
          </tr>`).join("")}</tbody>
        </table></div>`}
      </div>`;

    const busca = $("#busca-ativos");
    busca.addEventListener("input", () => {
      filtroAtivos = busca.value;
      const pos = busca.selectionStart;
      renderAtivos();
      const novo = $("#busca-ativos");
      novo.focus();
      novo.setSelectionRange(pos, pos);
    });
  }

  function formAtivo(a) {
    const v = a || {};
    return `
      <div class="field-row">
        <div class="field"><label>Código *</label><input name="codigo" required value="${esc(v.codigo || "")}" placeholder="ex.: BOM-001"></div>
        <div class="field"><label>Status</label><select name="status">
          ${Object.entries(STATUS_ATIVO).map(([k, s]) => `<option value="${k}" ${v.status === k ? "selected" : ""}>${s.label}</option>`).join("")}
        </select></div>
      </div>
      <div class="field"><label>Nome do ativo *</label><input name="nome" required value="${esc(v.nome || "")}" placeholder="ex.: Compressor de parafuso 50 HP"></div>
      <div class="field-row">
        <div class="field"><label>Categoria</label><input name="categoria" value="${esc(v.categoria || "")}" placeholder="ex.: Utilidades"></div>
        <div class="field"><label>Localização</label><input name="local" value="${esc(v.local || "")}" placeholder="ex.: Casa de máquinas"></div>
      </div>
      <div class="field-row">
        <div class="field"><label>Fabricante</label><input name="fabricante" value="${esc(v.fabricante || "")}"></div>
        <div class="field"><label>Data de aquisição</label><input name="aquisicao" type="date" value="${esc(v.aquisicao || hojeISO())}"></div>
      </div>
      <div class="field"><label>Valor de aquisição (R$)</label><input name="custo" type="number" min="0" step="0.01" value="${v.custo != null ? v.custo : ""}"></div>`;
  }

  function salvarAtivo(form, id) {
    const dados = {
      codigo: fieldVal(form, "codigo"),
      nome: fieldVal(form, "nome"),
      categoria: fieldVal(form, "categoria"),
      local: fieldVal(form, "local"),
      status: fieldVal(form, "status"),
      fabricante: fieldVal(form, "fabricante"),
      aquisicao: fieldVal(form, "aquisicao"),
      custo: num(form, "custo")
    };
    if (id) {
      Object.assign(ativoById(id), dados);
      toast("Ativo atualizado.");
    } else {
      db.ativos.push({ id: uid(), ...dados });
      toast("Ativo cadastrado.");
    }
    save();
    render();
  }

  /* ---------- Ordens de manutenção ---------- */
  function renderOrdens() {
    const f = filtroOS;
    const lista = db.ordens
      .filter((o) => {
        const t = f.texto.toLowerCase();
        const okTexto = !t || `${o.numero} ${o.titulo} ${o.descricao} ${ativoNome(o.ativoId)}`.toLowerCase().includes(t);
        const okStatus = !f.status || o.status === f.status;
        const okTipo = !f.tipo || o.tipo === f.tipo;
        return okTexto && okStatus && okTipo;
      })
      .sort((a, b) => b.numero - a.numero);

    $("#tab-ordens").innerHTML = `
      <div class="page-head">
        <div><h2>Ordens de Manutenção</h2><div class="sub">Corretivas e preventivas — abertura, execução e custos</div></div>
        <button class="btn" data-acao="nova-os">+ Nova ordem</button>
      </div>
      <div class="panel">
        <div class="filters">
          <input id="busca-os" type="search" placeholder="Buscar por número, título ou ativo…" value="${esc(f.texto)}">
          <select id="filtro-status-os">
            <option value="">Todos os status</option>
            ${Object.entries(STATUS_OS).map(([k, s]) => `<option value="${k}" ${f.status === k ? "selected" : ""}>${s.label}</option>`).join("")}
          </select>
          <select id="filtro-tipo-os">
            <option value="">Todos os tipos</option>
            ${Object.entries(TIPO_OS).map(([k, l]) => `<option value="${k}" ${f.tipo === k ? "selected" : ""}>${l}</option>`).join("")}
          </select>
        </div>
        ${lista.length === 0 ? `<div class="empty">Nenhuma ordem encontrada.</div>` : `
        <div class="table-wrap"><table>
          <thead><tr><th>Nº</th><th>Ativo</th><th>Título</th><th>Tipo</th><th>Prioridade</th><th>Status</th><th>Abertura</th><th>Conclusão</th><th>Custo</th><th>Parada</th><th></th></tr></thead>
          <tbody>${lista.map((o) => `<tr>
            <td><strong>#${o.numero}</strong></td>
            <td>${esc(ativoNome(o.ativoId))}</td>
            <td>${esc(o.titulo)}</td>
            <td>${badge(TIPO_OS, o.tipo)}</td>
            <td>${badge(PRIORIDADE, o.prioridade)}</td>
            <td>${badge(STATUS_OS, o.status)}</td>
            <td>${fmtBR(o.abertura)}</td>
            <td>${fmtBR(o.conclusao)}</td>
            <td>${o.custo ? fmtMoeda(o.custo) : "—"}</td>
            <td>${o.paradaHoras ? o.paradaHoras + " h" : "—"}</td>
            <td><div class="acoes">
              <button class="btn sm secondary" data-acao="editar-os" data-id="${o.id}">Editar</button>
              ${o.status !== "concluida" && o.status !== "cancelada" ? `<button class="btn sm" data-acao="concluir-os" data-id="${o.id}">Concluir</button>` : ""}
              <button class="btn sm danger" data-acao="excluir-os" data-id="${o.id}">Excluir</button>
            </div></td>
          </tr>`).join("")}</tbody>
        </table></div>`}
      </div>`;

    const busca = $("#busca-os");
    busca.addEventListener("input", () => {
      filtroOS.texto = busca.value;
      const pos = busca.selectionStart;
      renderOrdens();
      const novo = $("#busca-os");
      novo.focus();
      novo.setSelectionRange(pos, pos);
    });
    $("#filtro-status-os").addEventListener("change", (e) => { filtroOS.status = e.target.value; renderOrdens(); });
    $("#filtro-tipo-os").addEventListener("change", (e) => { filtroOS.tipo = e.target.value; renderOrdens(); });
  }

  function formOS(o) {
    const v = o || {};
    const ativosOpts = db.ativos
      .filter((a) => a.status !== "desativado")
      .map((a) => `<option value="${a.id}" ${v.ativoId === a.id ? "selected" : ""}>${esc(a.codigo)} — ${esc(a.nome)}</option>`)
      .join("");
    return `
      <div class="field"><label>Ativo *</label><select name="ativoId" required>${ativosOpts}</select></div>
      <div class="field"><label>Título *</label><input name="titulo" required value="${esc(v.titulo || "")}" placeholder="ex.: Troca de rolamento do motor"></div>
      <div class="field"><label>Descrição</label><textarea name="descricao" rows="3" placeholder="Detalhes do serviço…">${esc(v.descricao || "")}</textarea></div>
      <div class="field-row">
        <div class="field"><label>Tipo *</label><select name="tipo">
          ${Object.entries(TIPO_OS).map(([k, l]) => `<option value="${k}" ${v.tipo === k ? "selected" : ""}>${l}</option>`).join("")}
        </select></div>
        <div class="field"><label>Prioridade</label><select name="prioridade">
          ${Object.entries(PRIORIDADE).map(([k, p]) => `<option value="${k}" ${(v.prioridade || "media") === k ? "selected" : ""}>${p.label}</option>`).join("")}
        </select></div>
      </div>
      <div class="field-row">
        <div class="field"><label>Status</label><select name="status">
          ${Object.entries(STATUS_OS).map(([k, s]) => `<option value="${k}" ${(v.status || "aberta") === k ? "selected" : ""}>${s.label}</option>`).join("")}
        </select></div>
        <div class="field"><label>Data de abertura</label><input name="abertura" type="date" value="${esc(v.abertura || hojeISO())}"></div>
      </div>
      <div class="field-row">
        <div class="field"><label>Data de conclusão</label><input name="conclusao" type="date" value="${esc(v.conclusao || "")}"></div>
        <div class="field"><label>Custo (R$)</label><input name="custo" type="number" min="0" step="0.01" value="${v.custo != null && v.custo !== 0 ? v.custo : ""}"></div>
      </div>
      <div class="field"><label>Tempo de parada (horas)</label><input name="paradaHoras" type="number" min="0" step="0.5" value="${v.paradaHoras || ""}"></div>`;
  }

  function salvarOS(form, id) {
    const dados = {
      ativoId: fieldVal(form, "ativoId"),
      titulo: fieldVal(form, "titulo"),
      descricao: fieldVal(form, "descricao"),
      tipo: fieldVal(form, "tipo"),
      prioridade: fieldVal(form, "prioridade"),
      status: fieldVal(form, "status"),
      abertura: fieldVal(form, "abertura"),
      conclusao: fieldVal(form, "conclusao") || null,
      custo: num(form, "custo"),
      paradaHoras: num(form, "paradaHoras")
    };
    if (id) {
      Object.assign(db.ordens.find((o) => o.id === id), dados);
      toast("Ordem atualizada.");
    } else {
      db.seqOS += 1;
      db.ordens.push({ id: uid(), numero: db.seqOS, ...dados });
      toast("Ordem #" + db.seqOS + " aberta.");
    }
    save();
    render();
  }

  function concluirOS(id) {
    const o = db.ordens.find((x) => x.id === id);
    if (!o) return;
    openModal(`Concluir ordem #${o.numero} — ${o.titulo}`, `
      <div class="field"><label>Data de conclusão</label><input name="conclusao" type="date" value="${hojeISO()}"></div>
      <div class="field-row">
        <div class="field"><label>Custo (R$)</label><input name="custo" type="number" min="0" step="0.01" value="${o.custo || ""}"></div>
        <div class="field"><label>Tempo de parada (horas)</label><input name="paradaHoras" type="number" min="0" step="0.5" value="${o.paradaHoras || ""}"></div>
      </div>`, (form) => {
      o.status = "concluida";
      o.conclusao = fieldVal(form, "conclusao") || hojeISO();
      o.custo = num(form, "custo");
      o.paradaHoras = num(form, "paradaHoras");
      if (o.tipo === "corretiva") {
        const a = ativoById(o.ativoId);
        if (a && a.status === "manutencao") a.status = "operando";
      }
      save();
      render();
      toast("Ordem #" + o.numero + " concluída.");
    });
  }

  /* ---------- Planos preventivos ---------- */
  function renderPlanos() {
    const h = hojeISO();
    const lista = db.planos.map((p) => ({ ...p, proxima: addDays(p.ultimaExecucao, p.periodicidadeDias) }))
      .sort((a, b) => a.proxima.localeCompare(b.proxima));

    $("#tab-planos").innerHTML = `
      <div class="page-head">
        <div><h2>Planos Preventivos</h2><div class="sub">Cronograma por periodicidade, com geração de OS</div></div>
        <button class="btn" data-acao="novo-plano">+ Novo plano</button>
      </div>
      <div class="panel">
        ${lista.length === 0 ? `<div class="empty">Nenhum plano preventivo cadastrado.</div>` : `
        <div class="table-wrap"><table>
          <thead><tr><th>Plano</th><th>Ativo</th><th>Periodicidade</th><th>Última execução</th><th>Próxima</th><th>Situação</th><th></th></tr></thead>
          <tbody>${lista.map((p) => {
            const dias = diffDias(h, p.proxima);
            const sit = !p.ativo ? `<span class="badge b-mute">Inativo</span>`
              : dias < 0 ? `<span class="badge b-bad">Atrasado ${Math.abs(dias)} d</span>`
              : dias <= 7 ? `<span class="badge b-warn">Vence em ${dias} d</span>`
              : `<span class="badge b-ok">Em dia</span>`;
            return `<tr>
              <td><strong>${esc(p.nome)}</strong></td>
              <td>${esc(ativoNome(p.ativoId))}</td>
              <td>a cada ${p.periodicidadeDias} dias</td>
              <td>${fmtBR(p.ultimaExecucao)}</td>
              <td>${fmtBR(p.proxima)}</td>
              <td>${sit}</td>
              <td><div class="acoes">
                <button class="btn sm" data-acao="gerar-os-plano" data-id="${p.id}" ${!p.ativo ? "disabled" : ""}>Gerar OS</button>
                <button class="btn sm secondary" data-acao="editar-plano" data-id="${p.id}">Editar</button>
                <button class="btn sm danger" data-acao="excluir-plano" data-id="${p.id}">Excluir</button>
              </div></td>
            </tr>`;
          }).join("")}</tbody>
        </table></div>`}
      </div>`;
  }

  function formPlano(p) {
    const v = p || {};
    const ativosOpts = db.ativos
      .filter((a) => a.status !== "desativado")
      .map((a) => `<option value="${a.id}" ${v.ativoId === a.id ? "selected" : ""}>${esc(a.codigo)} — ${esc(a.nome)}</option>`)
      .join("");
    return `
      <div class="field"><label>Nome do plano *</label><input name="nome" required value="${esc(v.nome || "")}" placeholder="ex.: Preventiva trimestral"></div>
      <div class="field"><label>Ativo *</label><select name="ativoId" required>${ativosOpts}</select></div>
      <div class="field-row">
        <div class="field"><label>Periodicidade (dias) *</label><input name="periodicidadeDias" type="number" min="1" required value="${v.periodicidadeDias || 30}"></div>
        <div class="field"><label>Última execução</label><input name="ultimaExecucao" type="date" value="${esc(v.ultimaExecucao || hojeISO())}"></div>
      </div>
      <div class="field"><label>Situação</label><select name="ativo">
        <option value="true" ${v.ativo !== false ? "selected" : ""}>Ativo</option>
        <option value="false" ${v.ativo === false ? "selected" : ""}>Inativo</option>
      </select></div>`;
  }

  function salvarPlano(form, id) {
    const dados = {
      nome: fieldVal(form, "nome"),
      ativoId: fieldVal(form, "ativoId"),
      periodicidadeDias: Math.max(1, num(form, "periodicidadeDias")),
      ultimaExecucao: fieldVal(form, "ultimaExecucao"),
      ativo: fieldVal(form, "ativo") === "true"
    };
    if (id) {
      Object.assign(db.planos.find((p) => p.id === id), dados);
      toast("Plano atualizado.");
    } else {
      db.planos.push({ id: uid(), ...dados });
      toast("Plano cadastrado.");
    }
    save();
    render();
  }

  function gerarOSPlano(id) {
    const p = db.planos.find((x) => x.id === id);
    if (!p) return;
    db.seqOS += 1;
    db.ordens.push({
      id: uid(), numero: db.seqOS, ativoId: p.ativoId, tipo: "preventiva",
      titulo: p.nome, descricao: `OS gerada automaticamente pelo plano preventivo "${p.nome}" (a cada ${p.periodicidadeDias} dias).`,
      prioridade: "media", status: "aberta", abertura: hojeISO(), conclusao: null, custo: 0, paradaHoras: 0
    });
    p.ultimaExecucao = hojeISO();
    save();
    render();
    toast(`OS preventiva #${db.seqOS} gerada a partir do plano.`);
  }

  /* ---------- Ações e navegação ---------- */
  let abaAtiva = "dashboard";

  function render() {
    if (abaAtiva === "dashboard") renderDashboard();
    if (abaAtiva === "ativos") renderAtivos();
    if (abaAtiva === "ordens") renderOrdens();
    if (abaAtiva === "planos") renderPlanos();
  }

  function trocarAba(aba) {
    abaAtiva = aba;
    $$(".tab").forEach((t) => t.classList.toggle("active", t.dataset.tab === aba));
    $$(".page").forEach((p) => p.classList.toggle("active", p.id === "tab-" + aba));
    render();
  }
  $$(".tab").forEach((t) => t.addEventListener("click", () => trocarAba(t.dataset.tab)));

  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-acao]");
    if (!btn) return;
    const acao = btn.dataset.acao;
    const id = btn.dataset.id;

    if (acao === "novo-ativo") openModal("Novo ativo", formAtivo(null), (f) => salvarAtivo(f, null));
    if (acao === "editar-ativo") openModal("Editar ativo", formAtivo(ativoById(id)), (f) => salvarAtivo(f, id));
    if (acao === "excluir-ativo") {
      const temOS = db.ordens.some((o) => o.ativoId === id) || db.planos.some((p) => p.ativoId === id);
      if (temOS && !confirm("Este ativo possui ordens ou planos vinculados. Excluir mesmo assim?")) return;
      if (!temOS && !confirm("Excluir este ativo?")) return;
      db.ativos = db.ativos.filter((a) => a.id !== id);
      save(); render(); toast("Ativo excluído.");
    }

    if (acao === "nova-os") {
      if (db.ativos.length === 0) { toast("Cadastre um ativo antes de abrir uma ordem."); trocarAba("ativos"); return; }
      openModal("Nova ordem de manutenção", formOS(null), (f) => salvarOS(f, null));
    }
    if (acao === "editar-os") openModal(`Editar ordem #${db.ordens.find((o) => o.id === id).numero}`, formOS(db.ordens.find((o) => o.id === id)), (f) => salvarOS(f, id));
    if (acao === "concluir-os") concluirOS(id);
    if (acao === "excluir-os") {
      if (!confirm("Excluir esta ordem de manutenção?")) return;
      db.ordens = db.ordens.filter((o) => o.id !== id);
      save(); render(); toast("Ordem excluída.");
    }

    if (acao === "novo-plano") {
      if (db.ativos.length === 0) { toast("Cadastre um ativo antes de criar um plano."); trocarAba("ativos"); return; }
      openModal("Novo plano preventivo", formPlano(null), (f) => salvarPlano(f, null));
    }
    if (acao === "editar-plano") openModal("Editar plano preventivo", formPlano(db.planos.find((p) => p.id === id)), (f) => salvarPlano(f, id));
    if (acao === "excluir-plano") {
      if (!confirm("Excluir este plano preventivo?")) return;
      db.planos = db.planos.filter((p) => p.id !== id);
      save(); render(); toast("Plano excluído.");
    }
    if (acao === "gerar-os-plano") gerarOSPlano(id);
  });

  /* ---------- Backup (exportar / importar / restaurar) ---------- */
  $("#btn-export").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(db, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `manutencao-backup-${hojeISO()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast("Backup exportado.");
  });

  $("#btn-import").addEventListener("click", () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";
    input.onchange = () => {
      const file = input.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const dados = JSON.parse(reader.result);
          if (!dados || !Array.isArray(dados.ativos)) throw new Error("formato inválido");
          db = dados;
          save(); render();
          toast("Dados importados com sucesso.");
        } catch (err) {
          toast("Arquivo inválido: " + err.message);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  });

  $("#btn-reset").addEventListener("click", () => {
    if (!confirm("Restaurar os dados de exemplo? Os dados atuais serão substituídos.")) return;
    db = seed();
    save(); render();
    toast("Dados de exemplo restaurados.");
  });

  /* ---------- Tema ---------- */
  const html = document.documentElement;
  let theme = store.get("manut.theme", null);
  if (!theme) theme = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  function applyTheme() {
    html.setAttribute("data-theme", theme);
    $("#btn-theme").textContent = theme === "dark" ? "☀️" : "🌙";
    const meta = $('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "dark" ? "#0e1418" : "#0e7490");
    store.set("manut.theme", theme);
  }
  $("#btn-theme").addEventListener("click", () => { theme = theme === "dark" ? "light" : "dark"; applyTheme(); });
  applyTheme();

  /* ---------- Inicialização ---------- */
  load();
  render();

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
})();
