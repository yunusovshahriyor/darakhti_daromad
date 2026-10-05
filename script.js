const form = document.getElementById('form');
const list = document.getElementById('list');
const totalEl = document.getElementById('total');
const emptyEl = document.getElementById('empty');
const dateEl = document.getElementById('date');

let items = [];
try { items = JSON.parse(localStorage.getItem('incomes')) || []; } catch (e) {}

dateEl.valueAsDate = new Date();

const fmt = n => n.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function save() {
  try { localStorage.setItem('incomes', JSON.stringify(items)); } catch (e) {}
}

function render() {
  list.innerHTML = '';
  items.forEach((it, i) => {
    const tr = document.createElement('tr');
    [it.date, it.title].forEach(text => {
      const td = document.createElement('td');
      td.textContent = text;
      tr.appendChild(td);
    });
    const amount = document.createElement('td');
    amount.className = 'num';
    amount.textContent = fmt(it.amount);
    tr.appendChild(amount);
    const act = document.createElement('td');
    const btn = document.createElement('button');
    btn.className = 'del';
    btn.textContent = '✕';
    btn.title = 'Нест кардан';
    btn.onclick = () => { items.splice(i, 1); save(); render(); };
    act.appendChild(btn);
    tr.appendChild(act);
    list.appendChild(tr);
  });
  totalEl.textContent = fmt(items.reduce((s, it) => s + it.amount, 0));
  emptyEl.style.display = items.length ? 'none' : 'block';
}

form.addEventListener('submit', e => {
  e.preventDefault();
  items.push({
    title: document.getElementById('title').value.trim(),
    amount: parseFloat(document.getElementById('amount').value),
    date: dateEl.value,
  });
  items.sort((a, b) => b.date.localeCompare(a.date));
  save();
  render();
  form.reset();
  dateEl.valueAsDate = new Date();
});

render();
