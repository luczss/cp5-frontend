const THEME_KEY = 'techflow-theme';
const systemDark = window.matchMedia('(prefers-color-scheme: dark)');

const TEAM_BY_CATEGORY = {
  Desenvolvimento: 'Plataforma', Design: 'Design', Dados: 'Dados', Infraestrutura: 'Infra', Marketing: 'Growth'
};
const CURRENT_USER = 'Marina Duarte';

const projects = [
  { id: 1, name: 'Portal do Cliente v2', owner: 'Marina Duarte', category: 'Desenvolvimento', priority: 'Alta', deadline: '2026-11-20', status: 'Em andamento', progress: 68, done: 34, total: 50, description: 'Nova área logada com histórico de chamados, faturas e status de entregas em tempo real.' },
  { id: 2, name: 'Migração para Cloud', owner: 'Rafael Nogueira', category: 'Infraestrutura', priority: 'Alta', deadline: '2026-12-05', status: 'Em andamento', progress: 41, done: 19, total: 46, description: 'Transferência dos serviços legados para containers, com janela de corte planejada para dezembro.' },
  { id: 3, name: 'Redesign do App Mobile', owner: 'Camila Prado', category: 'Design', priority: 'Média', deadline: '2026-11-12', status: 'Em revisão', progress: 88, done: 29, total: 33, description: 'Novo fluxo de onboarding e navegação inferior.' },
  { id: 4, name: 'Painel de Métricas de Vendas', owner: 'Bruno Tavares', category: 'Dados', priority: 'Média', deadline: '2027-01-15', status: 'Em andamento', progress: 27, done: 9, total: 34, description: 'Consolidação das métricas comerciais em um único painel.' },
  { id: 5, name: 'Campanha de Lançamento Q4', owner: 'Helena Ribeiro', category: 'Marketing', priority: 'Baixa', deadline: '2026-10-30', status: 'Em revisão', progress: 92, done: 22, total: 24, description: 'Peças, e-mails e página de destino do lançamento de fim de ano.' },
  { id: 6, name: 'Guia do Design System', owner: 'Camila Prado', category: 'Design', priority: 'Baixa', deadline: '2026-09-18', status: 'Concluído', progress: 100, done: 28, total: 28, description: 'Documentação de componentes, tokens e regras de uso.' },
  { id: 7, name: 'API de Pagamentos', owner: 'Rafael Nogueira', category: 'Desenvolvimento', priority: 'Alta', deadline: '2026-09-30', status: 'Concluído', progress: 100, done: 41, total: 41, description: 'Integração com adquirentes, conciliação e webhooks de estorno.' }
];

const filters = { query: '', status: 'all', owner: null };
let nextId = projects.length + 1;
let toastTimer;

const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
const escapeHtml = (text) => text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const normalize = (text) => text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const formatDate = (iso) => iso.split('-').reverse().join('/');
const todayIso = () => new Date().toISOString().slice(0, 10);

/* ---------- Tema ---------- */
function getThemePreference() {
  const saved = localStorage.getItem(THEME_KEY);
  return ['light', 'dark', 'system'].includes(saved) ? saved : 'system';
}

function applyTheme(preference) {
  const isDark = preference === 'dark' || (preference === 'system' && systemDark.matches);
  document.documentElement.classList.toggle('dark', isDark);
}

function initTheme() {
  const preference = getThemePreference();
  applyTheme(preference);
  $$('input[name="theme"]').forEach((radio) => {
    radio.checked = radio.value === preference;
    radio.addEventListener('change', () => {
      localStorage.setItem(THEME_KEY, radio.value);
      applyTheme(radio.value);
    });
  });
  systemDark.addEventListener('change', () => {
    if (getThemePreference() === 'system') applyTheme('system');
  });
}

/* ---------- Sidebar ---------- */
function setSidebar(open) {
  $('#sidebar').classList.toggle('-translate-x-full', !open);
  $('#sidebar-overlay').classList.toggle('hidden', !open);
  $('#sidebar-toggle').setAttribute('aria-expanded', String(open));
  document.body.classList.toggle('overflow-hidden', open && window.innerWidth < 1024);
}

function initSidebar() {
  $('#sidebar-toggle').addEventListener('click', () => setSidebar(true));
  $('#sidebar-close').addEventListener('click', () => setSidebar(false));
  $('#sidebar-overlay').addEventListener('click', () => setSidebar(false));
  window.addEventListener('resize', () => { if (window.innerWidth >= 1024) setSidebar(false); });
  $$('[data-status]').forEach((button) => button.addEventListener('click', () => {
    filters.status = button.dataset.status;
    render();
    setSidebar(false);
  }));
}

/* ---------- Dropdown do usuário ---------- */
function setUserMenu(open) {
  $('#user-menu').classList.toggle('is-open', open);
  $('#user-button').setAttribute('aria-expanded', String(open));
}

function initUserMenu() {
  const button = $('#user-button');
  const menu = $('#user-menu');
  button.addEventListener('click', (event) => {
    event.stopPropagation();
    setUserMenu(!menu.classList.contains('is-open'));
  });
  document.addEventListener('click', (event) => {
    if (!menu.contains(event.target)) setUserMenu(false);
  });
  $$('[data-user-action]').forEach((item) => item.addEventListener('click', () => {
    const action = item.dataset.userAction;
    setUserMenu(false);
    if (action === 'new') openModal();
    if (action === 'mine') { filters.owner = CURRENT_USER; render(); }
    if (action === 'clear') { Object.assign(filters, { query: '', status: 'all', owner: null }); $('#search').value = ''; render(); }
  }));
}

/* ---------- Indicadores e projetos ---------- */
function updateIndicators() {
  const active = projects.filter((p) => p.status !== 'Concluído');
  const done = projects.length - active.length;
  const pending = projects.reduce((sum, p) => sum + (p.total - p.done), 0);
  const teams = new Set(projects.map((p) => TEAM_BY_CATEGORY[p.category]));
  $('#kpi-active').textContent = active.length;
  $('#kpi-active-note').textContent = `${projects.length} projetos no portfólio`;
  $('#kpi-done').textContent = done;
  $('#kpi-done-note').textContent = `${Math.round((done / projects.length) * 100)}% do portfólio`;
  $('#kpi-tasks').textContent = pending;
  $('#kpi-tasks-note').textContent = `em ${active.filter((p) => p.total > p.done).length} projetos ativos`;
  $('#kpi-teams').textContent = teams.size;
  $('#kpi-teams-note').textContent = [...teams].join(', ');
  $('#summary-line').textContent = `${active.length} projetos ativos e ${pending} tarefas em aberto.`;
  ['Em andamento', 'Em revisão', 'Concluído'].forEach((status) => {
    $(`[data-count="${status}"]`).textContent = projects.filter((p) => p.status === status).length;
  });
  $('[data-count="all"]').textContent = projects.length;
}

const PRIORITY_STYLE = {
  Alta: 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300',
  Média: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  Baixa: 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300'
};

function projectCard(project, isFirst) {
  const wide = project.priority === 'Alta';
  const size = isFirst && wide ? 'sm:col-span-2 xl:row-span-2' : wide ? 'sm:col-span-2' : '';
  const bar = project.status === 'Concluído' ? 'bg-emerald-500' : 'bg-teal-600 dark:bg-teal-400';
  const description = wide ? `<p class="mt-3 text-sm leading-relaxed text-stone-600 dark:text-stone-400">${escapeHtml(project.description)}</p>` : '';
  const pending = project.total - project.done;
  return `
  <article class="group flex flex-col justify-between gap-5 rounded-xl border border-stone-200 bg-white p-5 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-teal-600/50 dark:border-stone-800 dark:bg-stone-900 dark:hover:border-teal-500/50 ${size}">
    <div>
      <div class="flex flex-wrap items-center justify-between gap-2">
        <span class="text-xs font-semibold text-stone-500 dark:text-stone-400">${escapeHtml(project.category)} · ${escapeHtml(TEAM_BY_CATEGORY[project.category])}</span>
        <span class="rounded-full px-2 py-0.5 text-xs font-semibold ${PRIORITY_STYLE[project.priority]}">${project.priority}</span>
      </div>
      <div class="mt-3 flex items-start justify-between gap-3">
        <h3 class="text-base font-bold leading-snug ${wide ? 'sm:text-lg' : ''}">${escapeHtml(project.name)}</h3>
        <svg class="icon h-4 w-4 shrink-0 translate-y-1 text-teal-600 opacity-0 transition duration-200 group-hover:translate-y-0 group-hover:opacity-100 dark:text-teal-400" aria-hidden="true"><use href="#i-arrow"/></svg>
      </div>
      ${description}
    </div>
    <div>
      <div class="mb-1.5 flex items-center justify-between text-xs">
        <span class="font-semibold">${project.status}</span>
        <span class="tabular-nums text-stone-500 dark:text-stone-400">${project.progress}%${project.total ? ` · ${pending} pendentes` : ''}</span>
      </div>
      <div class="h-1.5 overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800" role="progressbar" aria-valuenow="${project.progress}" aria-valuemin="0" aria-valuemax="100" aria-label="Progresso de ${escapeHtml(project.name)}">
        <div class="h-full rounded-full ${bar} transition-all duration-500 ease-out" style="width:${project.progress}%"></div>
      </div>
      <div class="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-stone-500 dark:text-stone-400">
        <span>${escapeHtml(project.owner)}</span>
        <span class="inline-flex items-center gap-1"><svg class="icon h-3.5 w-3.5"><use href="#i-calendar"/></svg>${formatDate(project.deadline)}</span>
      </div>
    </div>
  </article>`;
}

function matchesFilters(project) {
  const query = normalize(filters.query.trim());
  const haystack = normalize(`${project.name} ${project.owner} ${project.category} ${TEAM_BY_CATEGORY[project.category]}`);
  return (!query || haystack.includes(query))
    && (filters.status === 'all' || project.status === filters.status)
    && (!filters.owner || project.owner === filters.owner);
}

function render() {
  const visible = projects.filter(matchesFilters);
  $('#project-grid').innerHTML = visible.map((p, i) => projectCard(p, i === 0)).join('');
  $('#empty-state').classList.toggle('hidden', visible.length > 0);
  $$('[data-status]').forEach((b) => b.setAttribute('aria-current', String(b.dataset.status === filters.status)));
  const parts = [`${visible.length} de ${projects.length} projetos`];
  if (filters.owner) parts.push(`responsável: ${filters.owner}`);
  $('#filter-note').textContent = parts.join(' · ');
  updateIndicators();
}

/* ---------- Modal e formulário ---------- */
const form = $('#project-form');
const validators = {
  name: (v) => (v.trim().length >= 3 ? '' : 'Informe um nome com pelo menos 3 caracteres.'),
  owner: (v) => (/^[A-Za-zÀ-ÿ' .-]{3,}$/.test(v.trim()) ? '' : 'Informe o nome do responsável (apenas letras).'),
  category: (v) => (v ? '' : 'Escolha uma categoria.'),
  priority: (v) => (v ? '' : 'Escolha uma prioridade.'),
  deadline: (v) => (!v ? 'Informe o prazo.' : v < todayIso() ? 'O prazo não pode estar no passado.' : ''),
  description: (v) => (v.trim().length >= 10 ? '' : 'Descreva o projeto em pelo menos 10 caracteres.')
};
const successText = { name: 'Nome válido.', owner: 'Responsável válido.', category: 'Categoria definida.', priority: 'Prioridade definida.', deadline: 'Prazo válido.', description: 'Descrição válida.' };

function validateField(field) {
  const input = form.elements[field];
  const error = validators[field](input.value);
  input.dataset.state = error ? 'error' : 'success';
  input.setAttribute('aria-invalid', String(Boolean(error)));
  $(`#f-${field}-msg`).textContent = error || successText[field];
  return !error;
}

function showBanner(message, type) {
  const banner = $('#form-banner');
  banner.textContent = message;
  banner.className = `rounded-lg px-3 py-2 text-sm font-medium ${type === 'error'
    ? 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300'
    : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'}`;
}

function resetForm() {
  form.reset();
  $('#form-banner').className = 'hidden';
  $('#submit-button').disabled = false;
  Object.keys(validators).forEach((field) => {
    const input = form.elements[field];
    delete input.dataset.state;
    input.removeAttribute('aria-invalid');
    $(`#f-${field}-msg`).textContent = '';
  });
}

let lastFocused = null;
function openModal() {
  lastFocused = document.activeElement;
  resetForm();
  form.elements.deadline.min = todayIso();
  $('#modal').classList.add('is-open');
  setSidebar(false);
  form.elements.name.focus();
}

function closeModal() {
  $('#modal').classList.remove('is-open');
  if (lastFocused) lastFocused.focus();
}

function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 2800);
}

function handleSubmit(event) {
  event.preventDefault();
  const results = Object.keys(validators).map((field) => [field, validateField(field)]);
  const firstInvalid = results.find(([, ok]) => !ok);
  if (firstInvalid) {
    showBanner('Corrija os campos destacados para continuar.', 'error');
    form.elements[firstInvalid[0]].focus();
    return;
  }
  const data = Object.fromEntries(new FormData(form));
  projects.unshift({
    id: nextId++, name: data.name.trim(), owner: data.owner.trim(), category: data.category, priority: data.priority,
    deadline: data.deadline, description: data.description.trim(), status: 'Em andamento', progress: 0, done: 0, total: 0
  });
  Object.assign(filters, { query: '', status: 'all', owner: null });
  $('#search').value = '';
  showBanner('Projeto cadastrado com sucesso.', 'success');
  $('#submit-button').disabled = true;
  render();
  setTimeout(() => { closeModal(); showToast(`"${data.name.trim()}" foi adicionado ao painel.`); }, 800);
}

function initModal() {
  $$('[data-open-modal]').forEach((b) => b.addEventListener('click', openModal));
  $$('[data-close-modal]').forEach((b) => b.addEventListener('click', closeModal));
  $('#modal').addEventListener('click', (event) => { if (event.target.id === 'modal') closeModal(); });
  form.addEventListener('submit', handleSubmit);
  Object.keys(validators).forEach((field) => {
    const input = form.elements[field];
    input.addEventListener('blur', () => { if (input.value || input.dataset.state) validateField(field); });
    input.addEventListener('input', () => { if (input.dataset.state) validateField(field); });
    input.addEventListener('change', () => validateField(field));
  });
}

/* ---------- Inicialização ---------- */
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initSidebar();
  initUserMenu();
  initModal();
  $('#search').addEventListener('input', (event) => { filters.query = event.target.value; render(); });
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if ($('#modal').classList.contains('is-open')) closeModal();
    setUserMenu(false);
    setSidebar(false);
  });
  render();
});