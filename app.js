(() => {
  "use strict";
  const STORAGE_KEY = "budgetzen-fcfa-v1";
  const $ = (id) => document.getElementById(id);
  const money = (value) => `${Math.round(Number(value) || 0).toLocaleString("fr-FR")} FCFA`;
  const todayISO = () => new Date().toISOString().slice(0, 10);
  const currentMonth = () => todayISO().slice(0, 7);
  const categories = [
    { name: "Loyer", icon: "🏠", budget: 150000 },
    { name: "Nourriture", icon: "🍲", budget: 90000 },
    { name: "Transport", icon: "🚌", budget: 30000 },
    { name: "Factures", icon: "💡", budget: 25000 },
    { name: "Famille", icon: "👨‍👩‍👧", budget: 30000 },
    { name: "Santé", icon: "🩺", budget: 15000 },
    { name: "Loisirs", icon: "🎉", budget: 20000 },
    { name: "Autres", icon: "📦", budget: 10000 }
  ];
  const incomeCategories = ["Salaire", "Commerce", "Activité secondaire", "Aide / transfert", "Remboursement", "Autre"];
  const defaultState = () => ({
    transactions: [],
    budgets: Object.fromEntries(categories.map(c => [c.name, c.budget])),
    goals: [],
    provisions: {},
    selectedMonth: currentMonth()
  });
  let state = loadState();
  let activeType = "expense";
  let deferredInstallPrompt = null;
  let toastTimer;

  function loadState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (parsed && Array.isArray(parsed.transactions) && parsed.budgets) {
        return { ...defaultState(), ...parsed };
      }
    } catch (error) { console.warn("BudgetZen: stockage illisible", error); }
    return defaultState();
  }
  function persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch (error) { showToast("Stockage local indisponible. Exportez une sauvegarde."); }
  }
  function monthTransactions() {
    return state.transactions.filter(t => (t.date || "").slice(0, 7) === state.selectedMonth);
  }
  function totals() {
    const tx = monthTransactions();
    const income = tx.filter(t => t.type === "income").reduce((s,t) => s + t.amount, 0);
    const expense = tx.filter(t => t.type === "expense").reduce((s,t) => s + t.amount, 0);
    const provision = Object.values(state.provisions[state.selectedMonth] || {}).reduce((s,v) => s + Number(v || 0), 0);
    const savings = state.goals.reduce((s,g) => s + Number(g.current || 0), 0);
    return { income, expense, provision, savings, available: income - expense - provision - savings };
  }
  function showToast(message) {
    const el = $("toast");
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 2700);
  }
  function iconFor(category) {
    return categories.find(c => c.name === category)?.icon || (incomeCategories.includes(category) ? "💰" : "📌");
  }
  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
  }
  function txMarkup(t, deletable = false) {
    const signed = t.type === "income" ? "+" : "−";
    return `<article class="transaction">
      <div class="tx-left"><div class="tx-icon">${iconFor(t.category)}</div><div><div class="tx-title">${escapeHTML(t.label)}</div><div class="tx-meta">${escapeHTML(t.category)} · ${escapeHTML(t.source || "—")} · ${escapeHTML(t.date || "")}</div>${t.note ? `<div class="tx-meta">${escapeHTML(t.note)}</div>` : ""}</div></div>
      <div class="tx-right"><div class="tx-amount ${t.type === "income" ? "positive" : "negative"}">${signed}${money(t.amount)}</div>${deletable ? `<button class="tx-delete" data-delete-tx="${escapeHTML(t.id)}">Supprimer</button>` : ""}</div>
    </article>`;
  }
  function renderSummary() {
    const t = totals();
    $("availableBalance").innerHTML = `${money(t.available).replace(" FCFA", "")} <small>FCFA</small>`;
    $("availableBalance").style.color = t.available < 0 ? "#ffd4c9" : "white";
    $("incomeTotal").textContent = money(t.income);
    $("expenseTotal").textContent = money(t.expense);
    $("provisionTotal").textContent = money(t.provision);
    $("savingsTotal").textContent = money(t.savings);
    const totalBudget = Object.values(state.budgets).reduce((s,v) => s + Number(v || 0), 0);
    const tx = monthTransactions().filter(x => x.type === "expense");
    $("categorySummary").innerHTML = categories.map(c => {
      const spent = tx.filter(x => x.category === c.name).reduce((s,x) => s + x.amount, 0);
      const limit = Number(state.budgets[c.name] || 0);
      const pct = limit ? Math.min(100, spent / limit * 100) : (spent ? 100 : 0);
      const over = spent > limit;
      const remaining = limit - spent;
      return `<article class="category-card"><div class="category-top"><div class="cat-identity"><div class="cat-emoji">${c.icon}</div><div><div class="cat-name">${escapeHTML(c.name)}</div><div class="cat-sub">${money(spent)} dépensés</div></div></div><div class="cat-budget">${money(limit)}</div></div><div class="progress"><span class="${over ? "over" : ""}" style="width:${pct}%"></span></div><div class="progress-foot"><span>${Math.round(pct)}% utilisé</span><span class="${over ? "over-text" : ""}">${over ? `Dépassement ${money(spent-limit)}` : `Reste ${money(remaining)}`}</span></div></article>`;
    }).join("");
    const latest = [...monthTransactions()].sort((a,b) => (b.date || "").localeCompare(a.date || "")).slice(0, 5);
    $("recentTransactions").innerHTML = latest.length ? latest.map(t => txMarkup(t)).join("") : `<div class="empty-state">Aucune opération ce mois-ci. Ajoutez votre premier revenu ou votre première dépense.</div>`;
    const alertLines = [];
    categories.forEach(c => {
      const spent = tx.filter(x => x.category === c.name).reduce((s,x) => s + x.amount, 0);
      const limit = Number(state.budgets[c.name] || 0);
      if (limit > 0 && spent > limit) alertLines.push(`${c.name} : plafond dépassé de ${money(spent-limit)}.`);
      else if (limit > 0 && spent >= limit * .8) alertLines.push(`${c.name} : ${Math.round(spent/limit*100)}% du budget utilisé.`);
    });
    if (t.available < 0) alertLines.unshift(`Solde disponible négatif de ${money(Math.abs(t.available))}.`);
    $("budgetAlerts").innerHTML = alertLines.length ? `<div class="alert">⚠️ <strong>À surveiller</strong><br>${alertLines.map(escapeHTML).join("<br>")}</div>` : "";
    renderChart();
  }
  function renderChart() {
    const tx = monthTransactions().filter(t => t.type === "expense");
    const daysInMonth = new Date(Number(state.selectedMonth.slice(0,4)), Number(state.selectedMonth.slice(5,7)), 0).getDate();
    const weeks = [0,0,0,0,0];
    tx.forEach(t => { const day = Number((t.date || "").slice(8,10)); if (day > 0) weeks[Math.min(4, Math.floor((day-1)/7))] += t.amount; });
    const max = Math.max(...weeks, 1);
    $("monthlyChart").innerHTML = weeks.map((v,i) => `<div class="chart-column"><div class="chart-bar" title="${money(v)}" style="height:${Math.max(3, v/max*105)}px"></div><span>${["1–7","8–14","15–21","22–28","29–"+daysInMonth][i]}</span></div>`).join("");
  }
  function renderTransactions() {
    const query = $("searchTransactions").value.trim().toLowerCase();
    const filter = $("typeFilter").value;
    const tx = monthTransactions().filter(t => (filter === "all" || t.type === filter) && `${t.label} ${t.category} ${t.source} ${t.note || ""}`.toLowerCase().includes(query)).sort((a,b) => (b.date || "").localeCompare(a.date || ""));
    $("allTransactions").innerHTML = tx.length ? tx.map(t => txMarkup(t, true)).join("") : `<div class="empty-state">Aucune opération correspondant à cette recherche.</div>`;
  }
  function renderBudgetFields() {
    const provision = state.provisions[state.selectedMonth] || {};
    $("budgetFields").innerHTML = `<div class="budget-field"><label>💰 Provision à réserver (total)</label><input id="monthlyProvision" type="number" min="0" step="1" value="${Number(provision.total || 0)}" aria-label="Provision mensuelle totale"></div>` + categories.map(c => `<div class="budget-field"><label>${c.icon} ${escapeHTML(c.name)}</label><input type="number" min="0" step="1" data-budget="${escapeHTML(c.name)}" value="${Number(state.budgets[c.name] || 0)}" aria-label="Budget ${escapeHTML(c.name)}"></div>`).join("");
  }
  function renderGoals() {
    $("goalList").innerHTML = state.goals.length ? state.goals.map(g => {
      const pct = g.target > 0 ? Math.min(100, g.current / g.target * 100) : 0;
      return `<article class="goal-card"><div class="row-between"><h3>🎯 ${escapeHTML(g.name)}</h3><span class="muted">${Math.round(pct)}%</span></div><div class="progress"><span style="width:${pct}%"></span></div><div class="goal-numbers"><span>${money(g.current)} épargnés</span><span>Objectif ${money(g.target)}</span></div><div class="goal-actions"><button data-add-goal="${escapeHTML(g.id)}">＋ Ajouter de l’épargne</button><button data-delete-goal="${escapeHTML(g.id)}">Supprimer</button></div></article>`;
    }).join("") : `<div class="panel empty-state">Aucun objectif pour l’instant. Créez-en un pour donner une direction à votre épargne.</div>`;
  }
  function renderAll() {
    $("monthPicker").value = state.selectedMonth;
    renderSummary();
    renderTransactions();
    renderBudgetFields();
    renderGoals();
  }
  function openTransaction(type) {
    activeType = type;
    $("dialogTitle").textContent = type === "income" ? "Ajouter un revenu" : "Ajouter une dépense";
    $("dialogEyebrow").textContent = type === "income" ? "ENTRÉE D’ARGENT" : "SORTIE D’ARGENT";
    const options = type === "income" ? incomeCategories : categories.map(c => c.name);
    $("txCategory").innerHTML = options.map(c => `<option>${escapeHTML(c)}</option>`).join("");
    $("txDate").value = todayISO();
    $("txLabel").value = "";
    $("txAmount").value = "";
    $("txNote").value = "";
    $("transactionDialog").showModal();
  }
  function saveTransaction(event) {
    event.preventDefault();
    const label = $("txLabel").value.trim();
    const amount = Number($("txAmount").value);
    if (!label || !Number.isFinite(amount) || amount <= 0 || !Number.isInteger(amount)) {
      showToast("Saisissez un libellé et un montant entier valide.");
      return;
    }
    state.transactions.push({
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      type: activeType, label, amount, category: $("txCategory").value,
      date: $("txDate").value || todayISO(), source: $("txSource").value,
      note: $("txNote").value.trim(), createdAt: new Date().toISOString()
    });
    persist(); $("transactionDialog").close(); renderAll();
    showToast(activeType === "income" ? "Revenu enregistré." : "Dépense enregistrée.");
  }
  function showView(name) {
    document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
    $(`view-${name}`).classList.remove("hidden");
    document.querySelectorAll(".tab").forEach(b => b.classList.toggle("active", b.dataset.tab === name));
    if (name === "budget") renderBudgetFields();
    if (name === "transactions") renderTransactions();
  }
  function exportData() {
    const blob = new Blob([JSON.stringify({ app: "BudgetZen FCFA", version: 1, exportedAt: new Date().toISOString(), state }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `budgetzen-sauvegarde-${state.selectedMonth}.json`; a.click();
    URL.revokeObjectURL(url); showToast("Sauvegarde exportée.");
  }
  async function importData(file) {
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      const incoming = data.state || data;
      if (!incoming || !Array.isArray(incoming.transactions) || !incoming.budgets || !Array.isArray(incoming.goals)) throw new Error("Format incorrect");
      if (!confirm("Restaurer cette sauvegarde ? Les données actuelles seront remplacées.")) return;
      state = { ...defaultState(), ...incoming };
      persist(); renderAll(); showToast("Sauvegarde restaurée.");
    } catch (e) { showToast("Fichier invalide ou illisible."); }
    $("importFile").value = "";
  }
  function bindEvents() {
    document.querySelectorAll("[data-open]").forEach(b => b.addEventListener("click", () => openTransaction(b.dataset.open)));
    document.querySelectorAll(".tab").forEach(b => b.addEventListener("click", () => showView(b.dataset.tab)));
    document.querySelectorAll("[data-tab-link]").forEach(b => b.addEventListener("click", () => showView(b.dataset.tabLink)));
    $("transactionForm").addEventListener("submit", saveTransaction);
    $("closeDialog").addEventListener("click", () => $("transactionDialog").close());
    $("monthPicker").addEventListener("change", e => { state.selectedMonth = e.target.value || currentMonth(); persist(); renderAll(); });
    $("budgetForm").addEventListener("submit", e => {
      e.preventDefault();
      document.querySelectorAll("[data-budget]").forEach(input => { state.budgets[input.dataset.budget] = Math.max(0, Number(input.value) || 0); });
      state.provisions[state.selectedMonth] = { total: Math.max(0, Number($("monthlyProvision").value) || 0) };
      persist(); renderAll(); showToast("Votre budget a été enregistré.");
    });
    $("goalForm").addEventListener("submit", e => {
      e.preventDefault();
      const name = $("goalName").value.trim(), target = Number($("goalTarget").value), current = Number($("goalCurrent").value || 0);
      if (!name || target <= 0 || current < 0) return showToast("Vérifiez les montants de votre objectif.");
      state.goals.push({ id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()), name, target, current });
      persist(); e.target.reset(); $("goalCurrent").value = "0"; renderAll(); showToast("Objectif ajouté.");
    });
    $("goalList").addEventListener("click", e => {
      const add = e.target.closest("[data-add-goal]");
      const del = e.target.closest("[data-delete-goal]");
      if (add) {
        const goal = state.goals.find(g => g.id === add.dataset.addGoal);
        if (!goal) return;
        const amount = prompt(`Combien ajouter à « ${goal.name} » ? (FCFA)`);
        if (amount === null) return;
        const n = Number(amount);
        if (!Number.isInteger(n) || n <= 0) return showToast("Montant invalide.");
        goal.current += n; persist(); renderAll(); showToast("Épargne mise à jour.");
      }
      if (del && confirm("Supprimer cet objectif d’épargne ?")) {
        state.goals = state.goals.filter(g => g.id !== del.dataset.deleteGoal); persist(); renderAll();
      }
    });
    $("allTransactions").addEventListener("click", e => {
      const button = e.target.closest("[data-delete-tx]");
      if (!button || !confirm("Supprimer cette opération ?")) return;
      state.transactions = state.transactions.filter(t => t.id !== button.dataset.deleteTx);
      persist(); renderAll(); showToast("Opération supprimée.");
    });
    $("searchTransactions").addEventListener("input", renderTransactions);
    $("typeFilter").addEventListener("change", renderTransactions);
    $("exportBtn").addEventListener("click", exportData);
    $("importBtn").addEventListener("click", () => $("importFile").click());
    $("importFile").addEventListener("change", e => importData(e.target.files[0]));
    $("clearMonthBtn").addEventListener("click", () => {
      if (!confirm(`Effacer toutes les opérations de ${state.selectedMonth} ? Cette action est irréversible sauf sauvegarde.`)) return;
      state.transactions = state.transactions.filter(t => (t.date || "").slice(0,7) !== state.selectedMonth);
      persist(); renderAll(); showToast("Opérations du mois effacées.");
    });
    window.addEventListener("beforeinstallprompt", event => {
      event.preventDefault(); deferredInstallPrompt = event; $("installBtn").hidden = false;
    });
    $("installBtn").addEventListener("click", async () => {
      if (!deferredInstallPrompt) { showToast("Sur iPhone : Safari → Partager → Sur l’écran d’accueil."); return; }
      deferredInstallPrompt.prompt(); await deferredInstallPrompt.userChoice; deferredInstallPrompt = null; $("installBtn").hidden = true;
    });
  }
  $("todayLabel").textContent = new Date().toLocaleDateString("fr-FR", { weekday:"long", day:"numeric", month:"long" }).toUpperCase();
  bindEvents();
  renderAll();
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(err => console.warn("SW registration failed", err)));
  }
})();
