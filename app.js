'use strict';

// Column names are taken directly from pokemon.csv (including "classfication").
const STATS = [
  { key: 'hp', label: 'HP' },
  { key: 'attack', label: 'Attack' },
  { key: 'defense', label: 'Defense' },
  { key: 'sp_attack', label: 'Special Attack' },
  { key: 'sp_defense', label: 'Special Defense' },
  { key: 'speed', label: 'Speed' }
];
const COLORS = ['#e72c39', '#4858e8'];
// Cache sprite requests so changing chart type or revisiting a record avoids extra API calls.
const spriteRequests = new Map();

async function fetchPokemonSprite(id) {
  const key = String(Number(id));
  if (!spriteRequests.has(key)) {
    const request = (async () => {
      const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${key}/`);
      if (!response.ok) throw new Error(`PokéAPI request failed: ${response.status}`);
      const pokemon = await response.json();
      // Prefer pixel sprites to match the handheld interface.
      const url = pokemon.sprites?.front_default
        || pokemon.sprites?.other?.['official-artwork']?.front_default;
      if (!url) throw new Error('No sprite available');
      return url;
    })();
    spriteRequests.set(key, request);
    request.catch(() => spriteRequests.delete(key));
  }
  return spriteRequests.get(key);
}

async function loadPokemonArtwork(record, artwork) {
  const loading = element('p', 'image-unavailable', 'Loading image…');
  loading.setAttribute('role', 'status');
  artwork.append(loading);
  try {
    const url = await fetchPokemonSprite(record.pokedex_number);
    const image = element('img', 'pokemon-image');
    image.alt = record.name;
    image.width = 192;
    image.height = 192;
    image.decoding = 'async';
    image.addEventListener('error', () => {
      artwork.replaceChildren(element('p', 'image-unavailable', 'Image unavailable'));
    }, { once: true });
    image.src = url;
    // Each request updates only its own profile, even after a quick selection change.
    artwork.replaceChildren(image);
  } catch (error) {
    artwork.replaceChildren(element('p', 'image-unavailable', 'Image unavailable'));
  }
}
let records = [];
let chart;
let chartType = 'radar';
const primary = document.getElementById('primary');
const secondary = document.getElementById('secondary');

// Handles quoted commas, escaped quotes, CRLF, and quoted multiline cells.
function parseCSV(text) {
  const rows = [];
  let row = [], value = '', quoted = false;
  text = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < text.length; i++) {
    const character = text[i];
    if (character === '"') {
      if (quoted && text[i + 1] === '"') { value += '"'; i++; }
      else quoted = !quoted;
    } else if (character === ',' && !quoted) {
      row.push(value); value = '';
    } else if ((character === '\n' || character === '\r') && !quoted) {
      row.push(value);
      if (row.some(cell => cell !== '')) rows.push(row);
      row = []; value = '';
      if (character === '\r' && text[i + 1] === '\n') i++;
    } else value += character;
  }
  if (quoted) throw new Error('The CSV contains an unfinished quoted field.');
  if (value !== '' || row.length) { row.push(value); rows.push(row); }
  if (rows.length < 2) throw new Error('The CSV has no Pokémon records.');
  const headers = rows.shift();
  const required = ['name', 'pokedex_number', 'type1', 'type2', 'abilities', 'classfication', 'height_m', 'weight_kg', 'generation', 'is_legendary', 'base_total', ...STATS.map(stat => stat.key)];
  for (const key of required) if (!headers.includes(key)) throw new Error(`Missing CSV column: ${key}`);
  return rows.map((cells, index) => {
    if (cells.length !== headers.length) throw new Error(`Unexpected number of columns in CSV row ${index + 2}.`);
    const record = Object.fromEntries(headers.map((header, index) => [header, cells[index]]));
    for (const stat of STATS) if (record[stat.key] === '' || !Number.isFinite(Number(record[stat.key]))) throw new Error(`Invalid ${stat.key} for ${record.name}.`);
    return record;
  });
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function selectedRecords() {
  return [primary.value, secondary.value].filter(value => value !== '').map(index => records[Number(index)]);
}

function profile(record) {
  const article = element('article', 'pokemon-profile');
  article.append(element('p', 'record-id', `NO. ${record.pokedex_number.padStart(3, '0')}`), element('h2', '', record.name), element('p', 'classification', record.classfication || 'Unknown classification'));
  const artwork = element('div', 'pokemon-artwork');
  loadPokemonArtwork(record, artwork);
  article.append(artwork);
  const types = element('div', 'types');
  [record.type1, record.type2].filter(Boolean).forEach(type => types.append(element('span', 'type', type)));
  article.append(types);
  const facts = element('dl', 'profile-facts');
  const values = [
    ['Height', record.height_m ? `${record.height_m} m` : 'Unknown'],
    ['Weight', record.weight_kg ? `${record.weight_kg} kg` : 'Unknown'],
    ['Generation', record.generation],
    ['Capture rate', record.capture_rate || 'Unknown'],
    ['Happiness', record.base_happiness || 'Unknown'],
    ['Base total', record.base_total]
  ];
  values.forEach(([label, value]) => { const group = element('div'); group.append(element('dt', '', label), element('dd', '', value)); facts.append(group); });
  article.append(facts, element('div', 'abilities-label', 'Abilities'));
  // The CSV encodes abilities as a Python-style list, not JSON. Extract strings without eval.
  const abilities = [...record.abilities.matchAll(/'([^']*)'|"([^"]*)"/g)].map(match => match[1] ?? match[2]);
  article.append(element('div', 'abilities', abilities.length ? abilities.join(' / ') : record.abilities || 'Unknown'));
  if (record.is_legendary === '1') article.append(element('span', 'legendary', '★ LEGENDARY'));
  return article;
}

function populateDropdown(key, select, other) {
  const query = document.getElementById(`${key}-search`).value.trim().toLowerCase();
  const choices = records.map((record, index) => ({ name: record.name, value: String(index), number: record.pokedex_number.padStart(3, '0') }));
  if (key === 'secondary') choices.unshift({ name: 'No comparison', value: '', number: '—' });
  const options = choices.filter(choice => choice.name.toLowerCase().includes(query));
  const buttons = options.map(choice => {
    const button = element('button', 'dropdown-option', `${choice.number}  ${choice.name}`);
    button.type = 'button';
    button.disabled = choice.value !== '' && choice.value === other.value;
    button.classList.toggle('is-selected', choice.value === select.value);
    button.setAttribute('aria-pressed', String(choice.value === select.value));
    button.addEventListener('click', () => {
      select.value = choice.value;
      closeDropdown(key);
      render();
      document.getElementById(`${key}-toggle`).focus();
    });
    return button;
  });
  document.getElementById(`${key}-options`).replaceChildren(...(buttons.length ? buttons : [element('p', 'dropdown-empty', 'No Pokémon found.')]));
}

function closeDropdown(key) {
  document.getElementById(`${key}-menu`).hidden = true;
  document.getElementById(`${key}-toggle`).setAttribute('aria-expanded', 'false');
}

function updateSearchSuggestions() {
  for (const [key, select, other] of [['primary', primary, secondary], ['secondary', secondary, primary]]) {
    document.getElementById(`${key}-toggle`).firstElementChild.textContent = select.value === '' ? 'No comparison' : records[Number(select.value)].name;
    populateDropdown(key, select, other);
  }
}

function render() {
  const selected = selectedRecords();
  updateSearchSuggestions();
  document.getElementById('workspace').classList.toggle('is-comparing', selected.length === 2);
  document.getElementById('profiles').replaceChildren(...selected.map(profile));
  document.getElementById('legend').replaceChildren(...selected.map((record, index) => {
    const label = element('span', '', record.name);
    label.prepend(element('i', `color-key ${index ? 'secondary-key' : 'primary-key'}`));
    return label;
  }));
  const head = element('tr');
  head.append(element('th', '', 'Stat'), ...selected.map(record => element('th', '', record.name)));
  [...head.children].forEach(th => { th.scope = 'col'; });
  document.getElementById('stats-head').replaceChildren(head);
  document.getElementById('stats-body').replaceChildren(...[...STATS, { key: 'base_total', label: 'Total' }].map(stat => {
    const row = element('tr', stat.key === 'base_total' ? 'total-row' : '');
    const label = element('th', '', stat.label); label.scope = 'row';
    row.append(label, ...selected.map(record => element('td', '', record[stat.key])));
    return row;
  }));
  primary.querySelectorAll('option').forEach(option => { option.disabled = secondary.value !== '' && option.value === secondary.value; });
  secondary.querySelectorAll('option').forEach(option => { option.disabled = option.value === primary.value; });
  renderChart(selected);
}

function renderChart(selected) {
  document.querySelector('.chart-container').classList.toggle('radar-chart', chartType === 'radar');
  if (typeof Chart === 'undefined') {
    document.getElementById('chart-error').hidden = false;
    document.getElementById('stats-chart').hidden = true;
    return;
  }
  if (chart) chart.destroy();
  const radar = chartType === 'radar';
  chart = new Chart(document.getElementById('stats-chart'), {
    type: chartType,
    data: {
      labels: STATS.map(stat => stat.label),
      datasets: selected.map((record, index) => ({
        label: record.name,
        data: STATS.map(stat => Number(record[stat.key])),
        borderColor: COLORS[index],
        backgroundColor: radar ? `${COLORS[index]}26` : `${COLORS[index]}cc`,
        borderWidth: radar ? 2 : 1,
        pointRadius: 3,
        pointBackgroundColor: COLORS[index],
        borderRadius: radar ? 0 : 3
      }))
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      animation: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? false : { duration: 250 },
      plugins: { legend: { display: false }, tooltip: { backgroundColor: '#26392f', padding: 12 } },
      scales: radar ? {
        r: { min: 0, max: 255, ticks: { stepSize: 51, display: false }, grid: { color: '#d2d9c7' }, angleLines: { color: '#d2d9c7' }, pointLabels: { color: '#53634d', font: { family: 'VT323, monospace', size: 20 } } }
      } : {
        y: { min: 0, max: 255, ticks: { stepSize: 51, color: '#53634d' }, grid: { color: '#dce0d3' } },
        x: { grid: { display: false }, ticks: { color: '#53634d', font: { size: 11 }, callback(value) { return ['HP', 'Attack', 'Defense', 'Sp. Atk', 'Sp. Def', 'Speed'][value]; } } }
      }
    }
  });
}

async function initialize() {
  try {
    const response = await fetch('pokemon.csv');
    if (!response.ok) throw new Error(`Could not load pokemon.csv (${response.status}).`);
    records = parseCSV(await response.text());
    const options = records.map((record, index) => {
      const option = element('option', '', `#${record.pokedex_number.padStart(3, '0')} · ${record.name}`);
      option.value = String(index); return option;
    });
    primary.replaceChildren(...options);
    const noComparison = element('option', '', 'No comparison'); noComparison.value = '';
    secondary.replaceChildren(noComparison, ...options.map(option => option.cloneNode(true)));
    primary.value = String(Math.max(0, records.findIndex(record => record.name === 'Bulbasaur')));
    primary.disabled = secondary.disabled = false;
    document.querySelectorAll('.dropdown-toggle').forEach(button => { button.disabled = false; });
    document.getElementById('record-count').textContent = `${records.length} RECORDS`;
    document.querySelector('footer > span').textContent = `${records.length} RECORDS. ENDLESS MATCHUPS.`;
    document.getElementById('status').hidden = true;
    document.getElementById('workspace').hidden = false;
    render();
  } catch (error) {
    document.getElementById('status').textContent = `Could not open the Pokédex. ${error.message} Serve this folder through a local web server so the CSV can be loaded.`;
    document.getElementById('record-count').textContent = 'DATA UNAVAILABLE';
  }
}

for (const [key, select, other] of [['primary', primary, secondary], ['secondary', secondary, primary]]) {
  const input = document.getElementById(`${key}-search`);
  const toggle = document.getElementById(`${key}-toggle`);
  const menu = document.getElementById(`${key}-menu`);
  toggle.addEventListener('click', () => {
    const opening = menu.hidden;
    closeDropdown('primary');
    closeDropdown('secondary');
    if (opening) {
      input.value = '';
      populateDropdown(key, select, other);
      menu.hidden = false;
      toggle.setAttribute('aria-expanded', 'true');
      input.focus();
    }
  });
  input.addEventListener('input', () => populateDropdown(key, select, other));
  document.getElementById(`${key}-dropdown`).addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      closeDropdown(key);
      toggle.focus();
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (menu.hidden) return;
      const buttons = [...menu.querySelectorAll('.dropdown-option:not(:disabled)')];
      const index = buttons.indexOf(document.activeElement);
      const next = event.key === 'ArrowDown' ? index + 1 : index < 0 ? buttons.length - 1 : index - 1;
      if (buttons.length) buttons[(next + buttons.length) % buttons.length].focus();
      event.preventDefault();
    } else if (event.key === 'Enter' && event.target === input) {
      menu.querySelector('.dropdown-option:not(:disabled)')?.click();
      event.preventDefault();
    }
  });
}
document.addEventListener('click', event => {
  if (!event.target.closest('.pokemon-dropdown')) {
    closeDropdown('primary');
    closeDropdown('secondary');
  }
});
document.addEventListener('focusin', event => {
  for (const key of ['primary', 'secondary']) {
    if (!document.getElementById(`${key}-dropdown`).contains(event.target)) closeDropdown(key);
  }
});
primary.addEventListener('change', render);
secondary.addEventListener('change', render);
['radar', 'bar'].forEach(type => {
  document.getElementById(`${type}-button`).addEventListener('click', () => {
    chartType = type;
    ['radar', 'bar'].forEach(mode => document.getElementById(`${mode}-button`).setAttribute('aria-pressed', String(mode === type)));
    renderChart(selectedRecords());
  });
});
initialize();
