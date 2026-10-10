import { FormEvent, useState } from 'react';
import AmountEntry from '../components/AmountEntry';
import CollapsibleCells from '../components/CollapsibleCells';
import DebtForm from '../components/DebtForm';
import Empty from '../components/Empty';
import Fab from '../components/Fab';
import LoanEditForm from '../components/LoanEditForm';
import { ReturnLoanForm } from '../components/LoanForms';
import LoanProgress from '../components/LoanProgress';
import PayDebtForm from '../components/PayDebtForm';
import SegTabs from '../components/SegTabs';
import Sheet from '../components/Sheet';
import SwipeRow from '../components/SwipeRow';
import { buildSchedule, nextInstallment, planTotals } from '../loanPlan';
import { dayTitle, fmt, loanLeft, today, openLoans, remaining, splitDebts, withNewDebt } from '../model';
import type { Debt, DebtPlan, Loan } from '../types';
import type { Props } from './props';

function RowEdit({ row, last, edited, onSave, onReset }: {
  row: { n: number; due: string; payment: number; principal: number; interest: number };
  last: boolean;
  edited: boolean;
  onSave: (v: { due: string; payment?: number }) => void;
  onReset: () => void;
}) {
  const [amount, setAmount] = useState(String(row.payment));
  const [date, setDate] = useState(row.due);
  const num = parseFloat(amount) || 0;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (last) onSave({ due: date });
    else if (num > 0) onSave({ due: date, payment: num });
  };
  return (
    <form onSubmit={submit}>
      <AmountEntry value={amount} onChange={setAmount} date={date} onDate={setDate} />
      <p className="muted" style={{ margin: '4px 2px 0' }}>
        {last ? 'Қисти охирин боқимондаро мепӯшонад: танҳо санаро иваз кунед.' : 'Фоизи қистҳои баъдӣ аз санаи нав ҳисоб мешавад.'}
      </p>
      <button className="btn big" type="submit" disabled={!last && !(num > 0)}>Нигоҳ доштан</button>
      {edited && <button type="button" className="btn ghost" onClick={onReset}>Ба ҳисоби аввал баргардонидан</button>}
    </form>
  );
}

function Schedule({ debt, onEdit }: { debt: Debt; onEdit: (n: number) => void }) {
  const plan = debt.plan!;
  const rows = buildSchedule(plan, debt.date ?? today());
  const t = planTotals(rows);
  const now = today();
  let cum = 0;
  return (
    <>
      <div className="loan-info">
        <div><span>Гирифташуда</span><b>{fmt(plan.principal)} смн</b></div>
        <div><span>Фоиз дар ҷамъ ({plan.rate}% дар сол)</span><b>{fmt(t.interest)} смн</b></div>
        <div><span>Ҷамъи супоридан</span><b>{fmt(t.total)} смн</b></div>
      </div>
      <div className="sched">
        {rows.map(r => {
          cum += r.payment;
          const done = cum <= debt.paid + 0.005;
          const late = !done && r.due < now;
          return (
            <button key={r.n} type="button" className={`sched-row${done ? ' done' : ''}${late ? ' late' : ''}`}
              onClick={() => onEdit(r.n)}>
              <span className="sn">{done ? '✓' : r.n}</span>
              <span><b className="sd">{dayTitle(r.due)}{r.edited ? ' ✎' : ''}</b>
                <small>асосӣ {fmt(r.principal)} · фоиз {fmt(r.interest)}</small></span>
              <span className="sp">{fmt(r.payment)}</span>
            </button>
          );
        })}
      </div>
      <p className="muted" style={{ margin: '8px 2px 0' }}>Барои тағйири сана ё маблағи қист онро пахш кунед.</p>
    </>
  );
}

export default function Debts({ state, setState, onToast }: Props & { onToast: (m: string) => void }) {
  const [adding, setAdding] = useState(false);
  const [loanFor, setLoanFor] = useState<Loan | null>(null);
  const [loanMode, setLoanMode] = useState<'return' | 'edit'>('return');
  const [mode, setMode] = useState<'pay' | 'schedule' | 'edit'>('pay');
  const [payFor, setPayFor] = useState<Debt | null>(null);
  const [tab, setTab] = useState<'now' | 'done'>('now');
  const [rowEdit, setRowEdit] = useState<number | null>(null);

  const live = payFor ? state.debts.find(d => d.id === payFor.id) ?? payFor : null;
  const cur = live;
  const { open, paid } = splitDebts(state.debts);
  const first = open[0];

  const add = (v: { title: string; amount: number; priority: boolean; date?: string; plan?: DebtPlan; paid?: number }) => {
    setState(s => withNewDebt(s, v));
    setAdding(false);
  };

  const save = (v: { title: string; amount: number; priority: boolean; date?: string; plan?: DebtPlan; paid?: number }) => {
    if (!payFor) return;
    const id = payFor.id;
    setState(s => ({
      ...s,
      debts: s.debts.map(d => {
        if (d.id !== id) return d;
        const { paidAt, ...rest } = d;
        const next = { ...rest, ...v };
        // Маблағ зиёд шуд: қарз боз кушода мешавад; пардохтшуда бошад, санаи пардохт мемонад
        return next.paid >= next.amount - 0.005 && paidAt ? { ...next, paidAt } : next;
      }),
      expenses: s.expenses.map(x => (x.debtId === id ? { ...x, title: `Қарз: ${v.title}` } : x)),
      incomes: s.incomes.map(i => (i.kind === 'borrow' && i.debtId === id ? { ...i, title: `Қарз гирифтам: ${v.title}` } : i)),
    }));
    setPayFor(null);
  };

  const saveRow = (n: number, v: { due: string; payment?: number } | null) => {
    if (!live?.plan) return;
    const id = live.id;
    setState(s => ({
      ...s,
      debts: s.debts.map(d => {
        if (d.id !== id || !d.plan) return d;
        const overrides = { ...(d.plan.overrides ?? {}) };
        if (v) overrides[n] = v;
        else delete overrides[n];
        const plan = { ...d.plan, overrides };
        const total = planTotals(buildSchedule(plan, d.date ?? today())).total;
        const { paidAt, ...rest } = d;
        const next = { ...rest, plan, amount: total };
        return next.paid >= next.amount - 0.005 ? { ...next, paidAt: paidAt ?? today() } : next;
      }),
    }));
    setRowEdit(null);
  };

  const remove = (id: number) =>
    setState(s => ({ ...s, debts: s.debts.filter(d => d.id !== id) }));

  return (
    <>
      {first && (
        <div className="next-debt">
          <b>{first.title}</b>
          <small>Аввал пардохт кунед</small>
          <span>Бақия: {fmt(remaining(first))} смн{first.priority ? ' · ⭐ афзалиятнок' : ' · хурдтарин қарз'}</span>
        </div>
      )}

      {(() => {
        const t = today();
        const monthEnd = `${t.slice(0, 7)}-31`;
        let sum = 0;
        let late = false;
        let count = 0;
        for (const d of open) {
          const n = nextInstallment(d, t);
          if (n && n.row.due <= monthEnd) { sum += n.toPay; count += 1; late = late || n.overdue; }
        }
        if (count === 0) return null;
        return (
          <div className={late ? 'due-card late' : 'due-card'}>
            <small>{late ? '⚠️ Қистҳои мӯҳлаташ гузашта ва ин моҳ' : 'Ин моҳ супоридан лозим'} · {count} қарз</small>
            <b>{fmt(sum)} смн</b>
          </div>
        );
      })()}

      {state.debts.length === 0 && (
        <Empty icon="🎉" text="Қарз нест — 10%-и вақтхушӣ ба «Вақтхушӣ» меравад." />
      )}

      {state.debts.length > 0 && (
        <div className="tab-block">
          <SegTabs value={tab} onChange={id => setTab(id as 'now' | 'done')}
            tabs={[
              { id: 'now', label: 'Ҳозира', count: open.length },
              { id: 'done', label: 'Пардохтшуда', count: paid.length },
            ]} />

          {tab === 'now' ? (
            open.length === 0 ? (
              <div className="empty small">🎉 Ҳамаи қарзҳо пардохт шудаанд!</div>
            ) : (
              <>
                <div className="cells">
                  {open.map((d, i) => {
                    const left = remaining(d);
                    const pct = Math.min(100, (d.paid / d.amount) * 100);
                    return (
                      <SwipeRow key={d.id} onDelete={() => remove(d.id)}>
                        <div className="cell tap" onClick={() => { setMode('pay'); setPayFor(d); }}>
                          <div className={i === 0 ? 'rank first' : 'rank'}>{i + 1}</div>
                          <div className="grow">
                            <div className="r1">
                              <b>{d.priority ? '⭐ ' : ''}{d.title}</b>
                              <b className="neg">{fmt(left)}</b>
                            </div>
                            <div className="progress"><i style={{ width: `${pct}%` }} /></div>
                            <small>
                              Пардохт: {fmt(d.paid)} аз {fmt(d.amount)} · {d.plan ? `🏦 ${d.plan.rate}% · ${d.plan.months} моҳ` : d.priority ? 'афзалиятнок' : 'аз рӯи миқдор'}
                            </small>
                            {(() => {
                              const n = nextInstallment(d, today());
                              return n ? (
                                <span className={n.overdue ? 'due-line late' : 'due-line'}>
                                  {n.overdue ? 'Мӯҳлат гузашт' : 'Қисти навбатӣ'}: {fmt(n.toPay)} · {dayTitle(n.row.due)}
                                </span>
                              ) : null;
                            })()}
                          </div>
                        </div>
                      </SwipeRow>
                    );
                  })}
                </div>
              </>
            )
          ) : paid.length === 0 ? (
            <div className="empty small">Ҳанӯз қарзи пардохтшуда нест.</div>
          ) : (
            <CollapsibleCells>
              {paid.map(d => (
                <SwipeRow key={d.id} onDelete={() => remove(d.id)}>
                  <div className="cell tap" onClick={() => { setMode('edit'); setPayFor(d); }}>
                    <div className="rank sm done">✓</div>
                    <div className="grow">
                      <div className="r1">
                        <b>{d.priority ? '⭐ ' : ''}{d.title}</b>
                        <b className="pos">{fmt(d.amount)} смн</b>
                      </div>
                      <small>Арзиш: {fmt(d.amount)} смн · пардохт шуд{d.paidAt ? ` · ${d.paidAt}` : ''}</small>
                    </div>
                  </div>
                </SwipeRow>
              ))}
            </CollapsibleCells>
          )}
        </div>
      )}

      {state.loans.length > 0 && (
        <>
          <h3 className="group-title"><span>Аз ман қарздоранд</span></h3>
          {openLoans(state.loans).length > 0 && (
            <div className="cells">
              {openLoans(state.loans).map(l => (
                <div className="cell tap" key={l.id} onClick={() => { setLoanMode('return'); setLoanFor(l); }}>
                  <div className="ic">{l.person.charAt(0).toUpperCase()}</div>
                  <div className="grow">
                    <div className="r1"><b>{l.person}</b><b className="pos">{fmt(loanLeft(l))}</b></div>
                    <LoanProgress loan={l} />
                    {l.returned <= 0 && <small>Ҳанӯз чизе нагашт</small>}
                  </div>
                </div>
              ))}
            </div>
          )}
          {state.loans.some(l => loanLeft(l) <= 0.005) && (
            <>
              <h3 className="group-title"><span>Баргардонидашуда</span></h3>
              <CollapsibleCells>
                {state.loans.filter(l => loanLeft(l) <= 0.005).map(l => (
                  <div className="cell tap" key={l.id} onClick={() => { setLoanMode('edit'); setLoanFor(l); }}>
                    <div className="rank sm done">✓</div>
                    <div className="grow">
                      <div className="r1"><b>{l.person}</b><b className="pos">{fmt(l.amount)} смн</b></div>
                      <small>Баргашт{l.returnedAt ? ` · ${l.returnedAt}` : ''}</small>
                    </div>
                  </div>
                ))}
              </CollapsibleCells>
            </>
          )}
        </>
      )}

      <Fab onClick={() => setAdding(true)} label="Қарзи нав" />

      {adding && (
        <Sheet title="Қарзи нав" onClose={() => setAdding(false)}>
          <DebtForm onSubmit={add} submitLabel="Илова кардан" />
        </Sheet>
      )}

      {cur && (
        <Sheet title={cur.title} onClose={() => setPayFor(null)}>
          {remaining(cur) > 0.005 && (
            <SegTabs value={mode} onChange={id => setMode(id as 'pay' | 'schedule' | 'edit')}
              tabs={[
                { id: 'pay', label: 'Пардохт' },
                ...(cur.plan ? [{ id: 'schedule', label: 'Ҷадвал' }] : []),
                { id: 'edit', label: 'Таҳрир' },
              ]} />
          )}
          {mode === 'schedule' && cur.plan ? (
            <Schedule debt={cur} onEdit={n => setRowEdit(n)} />
          ) : mode === 'pay' && remaining(cur) > 0.005 ? (
            <PayDebtForm state={state} setState={setState} debt={cur}
              onDone={() => setPayFor(null)} />
          ) : (
            <DebtForm initial={cur} onSubmit={save} submitLabel="Нигоҳ доштан" />
          )}
        </Sheet>
      )}

      {loanFor && (() => {
        const live = state.loans.find(l => l.id === loanFor.id) ?? loanFor;
        const canReturn = loanLeft(live) > 0.005;
        return (
          <Sheet title={live.person} onClose={() => setLoanFor(null)}>
            {canReturn && (
              <SegTabs value={loanMode} onChange={id => setLoanMode(id as 'return' | 'edit')}
                tabs={[{ id: 'return', label: 'Баргардонидан' }, { id: 'edit', label: 'Таҳрир' }]} />
            )}
            {loanMode === 'return' && canReturn ? (
              <ReturnLoanForm state={state} setState={setState} loanId={live.id}
                onDone={m => { setLoanFor(null); onToast(m); }} />
            ) : (
              <LoanEditForm loan={live} setState={setState} onDone={() => setLoanFor(null)} />
            )}
          </Sheet>
        );
      })()}

      {rowEdit !== null && live?.plan && (() => {
        const rows = buildSchedule(live.plan, live.date ?? today());
        const row = rows.find(r => r.n === rowEdit);
        if (!row) return null;
        return (
          <Sheet title={`Қисти ${row.n}-ум`} onClose={() => setRowEdit(null)}>
            <RowEdit row={row} last={row.n === rows.length} edited={!!row.edited}
              onSave={v => saveRow(row.n, v)} onReset={() => saveRow(row.n, null)} />
          </Sheet>
        );
      })()}
    </>
  );
}
