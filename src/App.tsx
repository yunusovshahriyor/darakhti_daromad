import { CSSProperties, ReactNode, useEffect, useRef, useState } from 'react';
import AddSheet from './components/AddSheet';
import AuthPage from './components/AuthPage';
import SyncBadge from './components/SyncBadge';
import SyncSheet from './components/SyncSheet';
import { BASE, activeCode, setActiveCode } from './currency';
import { nav, refresh, success, warn } from './haptic';
import LockScreen from './components/LockScreen';
import { autoHide, getLock, isLockOn } from './lock';
import Onboarding, { INTRO_RESUME_KEY } from './components/Onboarding';
import SystemGuide from './views/SystemGuide';
import Celebrate from './components/Celebrate';
import InfoSheet from './components/InfoSheet';
import {
  BackIcon, GridIcon, InfoIcon, ListIcon, PersonIcon, PlusIcon, WalletIcon,
} from './components/Icons';
import { setRootBackHandler, useHistoryLayer } from './components/useHistoryLayer';
import { ACCOUNTS, ACCOUNT_ORDER, ALL_IDS, balancesOf, hasDebt, newFreeAccounts, syncCatalog, toFreeMode, toSystemMode, today, uid } from './model';
import { emptyState, loadState, saveState, stateObjHasData } from './storage';
import { noDepositThisWeek, runAutoSaves } from './dreams';
import { nextInstallment } from './loanPlan';
import { setSyncNotifier, takeNotice, useSync } from './sync';
import { useDreamMilestones } from './useDreamMilestones';
import type { Alloc, AccountId } from './types';
import AccountDetail from './views/AccountDetail';
import Accounts from './views/Accounts';
import Dashboard from './views/Dashboard';
import Debts from './views/Debts';
import Dreams from './views/Dreams';
import History, { HistoryFilter } from './views/History';
import type { Sub, Tab } from './views/props';
import Profile from './views/Profile';
import SettingsView from './views/SettingsView';
import type { SettingsPage } from './views/SettingsView';

const LEFT: { id: Tab; label: string; icon: ReactNode }[] = [
  { id: 'home', label: 'Асосӣ', icon: <GridIcon /> },
  { id: 'accounts', label: 'Ҳисобҳо', icon: <WalletIcon /> },
];
const RIGHT: { id: Tab; label: string; icon: ReactNode }[] = [
  { id: 'history', label: 'Таърих', icon: <ListIcon /> },
  { id: 'profile', label: 'Профил', icon: <PersonIcon /> },
];

const TITLES: Record<Tab, string> = { home: 'Асосӣ', accounts: 'Ҳисобҳо', history: 'Таърих', profile: 'Профил' };
const SUB_TITLES: Record<Sub, string> = { dreams: 'Орзуҳо', debts: 'Қарзҳо', settings: 'Танзимот', guide: 'Системаҳои кор' };
/** Огоҳии баромад: 3 сония намоиш дода мешавад; дар ҳамин вақт бозгашти дуюм барномаро мепӯшад. */
const EXIT_MSG = 'Барои баромадан боз тугмаи «Назад»-ро пахш кунед';
const HIDE_KEY = 'darakhti:hide';
const NAV_KEY = 'darakhti:nav';
const FILTER_KEY = 'darakhti:hfilter';

const TAB_IDS: Tab[] = ['home', 'accounts', 'history', 'profile'];
const SUB_IDS: Sub[] = ['dreams', 'debts', 'settings', 'guide'];
const FILTER_IDS: HistoryFilter[] = ['all', 'income', 'expense', 'transfer'];

interface Nav {
  tab: Tab;
  sub: Sub | null;
  acct: AccountId | null;
  filter: HistoryFilter;
}

const readFilter = (): HistoryFilter => {
  try {
    const f = localStorage.getItem(FILTER_KEY) as HistoryFilter | null;
    if (f && FILTER_IDS.includes(f)) return f;
  } catch { /* ignore */ }
  return 'all';
};

/** Ҷойгиршавӣ (таб, саҳифа, ҳисоб) пас аз навсозии саҳифа аз нав барқарор мешавад. */
function readNav(): Nav {
  const nav: Nav = { tab: 'home', sub: null, acct: null, filter: 'all' };
  try {
    const raw = JSON.parse(sessionStorage.getItem(NAV_KEY) ?? 'null') as Partial<Nav> | null;
    if (raw) {
      if (raw.tab && TAB_IDS.includes(raw.tab)) nav.tab = raw.tab;
      if (raw.sub && SUB_IDS.includes(raw.sub)) nav.sub = raw.sub;
      if (raw.acct && ACCOUNT_ORDER.includes(raw.acct)) nav.acct = raw.acct;
      if (raw.filter && FILTER_IDS.includes(raw.filter)) nav.filter = raw.filter;
    }
  } catch { /* ignore */ }
  return nav;
}

interface InstallEvent extends Event {
  prompt: () => Promise<void>;
}

const readHidden = () => {
  try { return localStorage.getItem(HIDE_KEY) === '1'; } catch { return false; }
};

export default function App() {
  const [state, setState] = useState(loadState);
  syncCatalog(state);
  const [nav0] = useState(readNav);
  const [wantTg, setWantTg] = useState(() => new URLSearchParams(location.search).get('tg') === 'link');
  const [tab, setTab] = useState<Tab>(wantTg ? 'profile' : nav0.tab);
  const [sub, setSub] = useState<Sub | null>(nav0.sub);
  const [setPageName, setSetPageName] = useState<SettingsPage>('menu');
  useEffect(() => { if (sub !== 'settings') setSetPageName('menu'); }, [sub]);
  const [acct, setAcct] = useState<AccountId | null>(nav0.acct);
  const [filter, setFilter] = useState<HistoryFilter>(readFilter);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const layerOnBoot = typeof history !== 'undefined' && history.state?.layer === true;
  const reuseSub = useRef(layerOnBoot && nav0.sub !== null);
  const reuseAcct = useRef(layerOnBoot && nav0.acct !== null);
  const [adding, setAdding] = useState(false);
  const [info, setInfo] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [celebration, setCelebration] = useState<{ title: string; text: string } | null>(null);
  const [hidden, setHidden] = useState(() => readHidden() || autoHide());
  const [locked, setLocked] = useState(isLockOn);
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null);
  const prevBal = useRef<Alloc | null>(null);

  useEffect(() => saveState(state), [state]);

  // Асъор: нусхаи localStorage барои translator; агар аз дастгоҳи дигар (синхронизатсия) иваз шуда бошад — саҳифа аз нав бор мешавад
  useEffect(() => {
    const code = state.currency ?? BASE;
    if (code !== activeCode()) {
      setActiveCode(code);
      // Агар хотира дастнорас бошад (реҷаи махфӣ), аз нав бор кардан давр мезанад: фақат вақте, ки сабт шуд
      if (activeCode() === code) location.reload();
    }
  }, [state.currency]);

  // Корбари нав (бе маълумот ва бе интихоб): аввал услуби кор интихоб мешавад. Каме интизор мешавем, то синхронизатсия
  // маълумоти аккаунти мавҷударо биёрад.
  const sync = useSync();
  const [settled, setSettled] = useState(false);
  useEffect(() => { const t = setTimeout(() => setSettled(true), 1500); return () => clearTimeout(t); }, []);
  const fresh = state.mode === undefined && !stateObjHasData(state);
  // Муқаддима (онбординг): автоматӣ барои корбари нав, ва бо дархост аз саҳифаи «Системаҳои кор»
  // Агар забон аз дохили муқаддима иваз шуда бошад, саҳифа аз нав бор мешавад ва муқаддима боз кушода мешавад
  const [intro, setIntro] = useState(() => {
    try { return sessionStorage.getItem(INTRO_RESUME_KEY) === '1'; } catch { return false; }
  });
  useEffect(() => { try { sessionStorage.removeItem(INTRO_RESUME_KEY); } catch { /* ignore */ } }, []);
  const introShown = useRef(intro);
  useEffect(() => {
    if (fresh && settled && !wantTg && !authOpen && sync.status !== 'syncing' && !introShown.current) {
      introShown.current = true;
      setIntro(true);
    }
  }, [fresh, settled, wantTg, authOpen, sync.status]);
  const pickMode = (m: 'system' | 'free') =>
    setState(s => {
      // Бе маълумот: ҳолати тоза аз нав сохта мешавад; бо маълумот: гузариш, ки маълумотро нигоҳ медорад
      if (!stateObjHasData(s)) {
        const base = emptyState();
        return m === 'free' ? { ...toFreeMode(base), accounts: newFreeAccounts() } : { ...base, mode: 'system' };
      }
      return m === 'free' ? toFreeMode(s) : toSystemMode(s);
    });

  // Ҳамаи қарзҳо пардохт шуданд: боқимондаи «Пардохти қарз» ба «Сармоя» мегузарад
  useEffect(() => {
    if (state.mode === 'free' || hasDebt(state.debts) || !state.accounts.some(a => a.id === 'capital' && !a.archived)) return;
    const left = balancesOf(state).debt ?? 0;
    if (left > 0.005) {
      setState(s => ({
        ...s,
        transfers: [...s.transfers, { id: uid(), from: 'debt', to: 'capital', amount: left, date: today() }],
      }));
    }
  }, [state]);

  useEffect(() => {
    try { localStorage.setItem(FILTER_KEY, filter); } catch { /* ignore */ }
  }, [filter]);

  useEffect(() => {
    try { sessionStorage.setItem(NAV_KEY, JSON.stringify({ tab, sub, acct, filter })); } catch { /* ignore */ }
  }, [tab, sub, acct, filter]);

  useEffect(() => {
    try { localStorage.setItem(HIDE_KEY, hidden ? '1' : '0'); } catch { /* ignore */ }
  }, [hidden]);

  // Ҷамъкунии худкор ба орзуҳо: ҳангоми кушодан, баъди таҳрир ва ҳангоми баргашт ба барнома
  useEffect(() => {
    setState(s => runAutoSaves(s));
  }, [state.dreams]);
  useEffect(() => {
    const h = () => { if (document.visibilityState === 'visible') setState(s => runAutoSaves(s)); };
    document.addEventListener('visibilitychange', h);
    return () => document.removeEventListener('visibilitychange', h);
  }, []);

  // Хотиррасонии рӯзона: ҳафта гузашт, ба орзуҳо чизе нагузоштаед
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        const day = new Date().toLocaleDateString('sv-SE');
        if (localStorage.getItem('darakhti:nudge') === day) return;
        if (state.dreams.some(d => !d.boughtAt) && noDepositThisWeek(state)) {
          localStorage.setItem('darakhti:nudge', day);
          setToast('💡 Ин ҳафта ба орзуҳо ҳанӯз чизе нагузоштаед');
        }
      } catch { /* ignore */ }
    }, 2500);
    return () => clearTimeout(t);
    // танҳо ҳангоми кушодани барнома
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Хотиррасонии пардохти моҳонаи бонкӣ: мӯҳлат гузашт ё дар 3 рӯзи наздик мерасад (як маротиба дар як рӯз)
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        const day = today();
        if (localStorage.getItem('darakhti:duenudge') === day) return;
        const soon = new Date();
        soon.setDate(soon.getDate() + 3);
        const limit = soon.toLocaleDateString('sv-SE');
        for (const d of state.debts) {
          const n = nextInstallment(d, day);
          if (n && n.row.due <= limit) {
            localStorage.setItem('darakhti:duenudge', day);
            setToast(n.overdue ? `⚠️ «${d.title}»: мӯҳлати пардохт гузашт` : `🏦 «${d.title}»: пардохти ${n.row.due} наздик аст`);
            break;
          }
        }
      } catch { /* ignore */ }
    }, 3500);
    return () => clearTimeout(t);
    // танҳо ҳангоми кушодани барнома
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const m = takeNotice();
    if (m) setTimeout(() => setToast(m), 600);
    setSyncNotifier(setToast);
    return () => setSyncNotifier(null);
  }, []);

  // Ҳавасмандии орзуҳо: марҳилаҳои 25/50/75/100% ва ҷашни харид
  useDreamMilestones(state, setToast, (title, text) => setCelebration({ title, text }));

  // Огоҳӣ ҳангоми расидан ба мақсад
  useEffect(() => {
    const bal = balancesOf(state);
    const prev = prevBal.current;
    prevBal.current = bal;
    if (!prev) return;
    for (const id of ALL_IDS) {
      const goal = state.goals[id];
      if (goal && prev[id] < goal && bal[id] >= goal) {
        setToast(`🎉 «${ACCOUNTS[id].name}» ба мақсад расид!`);
        warn();
        break;
      }
    }
  }, [state]);

  useEffect(() => {
    const h = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as InstallEvent);
    };
    const done = () => setInstallEvent(null);
    window.addEventListener('beforeinstallprompt', h);
    window.addEventListener('appinstalled', done);
    return () => {
      window.removeEventListener('beforeinstallprompt', h);
      window.removeEventListener('appinstalled', done);
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    // Ҳис кардани муваффақият: ларзиш; пардохти пурраи қарз, харид ва расидан ба мақсад — ҷашн
    if (toast.includes('🎉') && !toast.includes('тайёр аст')) {
      setCelebration({ title: 'Табрик!', text: toast.replace('🎉', '').trim() });
    } else if (toast.includes('✓')) success();
    const t = setTimeout(() => setToast(''), toast === EXIT_MSG ? 3000 : 2400);
    return () => clearTimeout(t);
  }, [toast]);

  // Қулф ва пинҳон кардани маблағ ҳангоми баргашт аз «пасзамина»
  useEffect(() => {
    let away = 0;
    const onVis = () => {
      if (document.visibilityState === 'hidden') { away = Date.now(); return; }
      if (!away) return;
      const secs = (Date.now() - away) / 1000;
      away = 0;
      const cfg = getLock();
      if (cfg && secs >= cfg.after) setLocked(true);
      if (autoHide() && secs >= 30) setHidden(true);
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  // «Бозгашт»-и телефон: аз саҳифаи дигар → ба «Асосӣ»; дар «Асосӣ» бори аввал огоҳӣ, бори дуюм баромадан.
  // Барои ин як сабти «посбон» (guard) дар таърих мемонем, то бозгашти аввал онро бигирад.
  const tabRef = useRef(tab);
  tabRef.current = tab;
  useEffect(() => {
    const guard = () => history.pushState({ guard: true }, '');
    if (!history.state?.guard && !history.state?.layer) guard();
    let armed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const disarm = (restore: boolean) => {
      if (!armed) return;
      armed = false;
      if (timer) clearTimeout(timer);
      if (restore) guard();
    };
    setRootBackHandler(() => {
      if (tabRef.current !== 'home') {
        setSub(null);
        setAcct(null);
        setTab('home');
        guard();
        return;
      }
      armed = true;
      setToast(EXIT_MSG);
      timer = setTimeout(() => disarm(true), 3000);
    });
    // Корбар дар вақти интизорӣ чизеро пахш кард: посбонро барқарор мекунем (пеш аз он ки қабати нав илова шавад)
    const onDown = () => disarm(true);
    document.addEventListener('pointerdown', onDown, true);
    return () => {
      setRootBackHandler(null);
      document.removeEventListener('pointerdown', onDown, true);
      if (timer) clearTimeout(timer);
    };
  }, []);

  useHistoryLayer(sub !== null, () => setSub(null), reuseSub);
  useHistoryLayer(acct !== null, () => setAcct(null), reuseAcct);

  const go = (t: Tab, f?: HistoryFilter) => {
    if (t !== tab) nav();
    setSub(null);
    setAcct(null);
    setTab(t);
    if (t === 'history' && f) setFilter(f);
  };

  const openAccount = (id: AccountId) => {
    setSub(null);
    setAcct(id);
  };

  // Навсозӣ бо свайп аз боло ба поён (дар ҳолати скролли боло)
  const onTouchStart = (e: React.TouchEvent<HTMLElement>) => {
    // Ҳаракатҳое, ки дар дохили варақа (sheet) сар мешаванд, ба навсозии саҳифа дахл надоранд
    const inSheet = (e.target as Element).closest('.backdrop') !== null;
    touch.current = !inSheet && e.currentTarget.scrollTop <= 0 && !refreshing
      ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
      : null;
  };
  const onTouchMove = (e: React.TouchEvent<HTMLElement>) => {
    const t = touch.current;
    if (!t) return;
    const dy = e.touches[0].clientY - t.y;
    const dx = e.touches[0].clientX - t.x;
    if (dy > 0 && dy > Math.abs(dx) && e.currentTarget.scrollTop <= 0) setPull(Math.min(84, dy * 0.55));
    else if (dy <= 0) setPull(0);
  };
  const onTouchEnd = () => {
    if (!touch.current) return;
    touch.current = null;
    if (pull >= 52) {
      setRefreshing(true);
      setPull(56);
      refresh();
      setTimeout(() => window.location.reload(), 450);
    } else {
      setPull(0);
    }
  };

  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);

  // Маълумоти фоизҳо танҳо дар саҳифаи «Ҳисобҳо ва фоизҳо» (на дар менюи Танзимот ва на дар ҳолати «ба тарзи худам»)
  const infoKind = !acct && (sub === 'debts' || sub === 'dreams' || (sub === 'settings' && setPageName === 'accounts' && state.mode !== 'free')) ? sub : null;
  const home = tab === 'home' && !sub && !acct;
  const inAccPage = !acct && sub === 'settings' && setPageName === 'accounts';
  const title = acct ? ACCOUNTS[acct].name : inAccPage ? (state.mode === 'free' ? 'Ҳисобҳо' : 'Ҳисобҳо ва фоизҳо') : sub ? SUB_TITLES[sub] : TITLES[tab];
  const props = { state, setState };
  const privacy = { hidden, onToggleHidden: () => setHidden(h => !h) };

  const tabButton = (t: { id: Tab; label: string; icon: ReactNode }) => (
    <button key={t.id} className={t.id === tab ? 'tab active' : 'tab'} onClick={() => go(t.id)}>
      {t.icon}
      <span>{t.label}</span>
    </button>
  );

  const content = () => {
    if (acct) {
      return <AccountDetail {...props} {...privacy} id={acct} onToast={setToast}
        onManage={page => { setAcct(null); setSub(page); }} />;
    }
    if (sub === 'dreams') return <Dreams {...props} onToast={setToast} />;
    if (sub === 'debts') return <Debts {...props} onToast={setToast} />;
    if (sub === 'settings') return <SettingsView {...props} onToast={setToast} onGuide={() => setSub('guide')} page={setPageName} setPage={setSetPageName} />;
    if (sub === 'guide') return <SystemGuide {...props} onToast={setToast} onIntro={() => setIntro(true)} />;
    if (tab === 'home') {
      return (
        <Dashboard {...props} {...privacy} onNavigate={go} onProfile={() => go('profile')}
          onOpenAccount={openAccount} />
      );
    }
    if (tab === 'accounts') return <Accounts {...props} {...privacy} onOpenAccount={openAccount} />;
    if (tab === 'history') return <History {...props} filter={filter} onFilter={setFilter} />;
    return (
      <Profile {...props} open={setSub} onIntro={() => setIntro(true)} standalone={standalone} ios={ios} onOpenAuth={() => setAuthOpen(true)} autoTelegram={wantTg}
        onTelegramShown={() => {
          setWantTg(false);
          try { history.replaceState(history.state, '', location.pathname + location.hash); } catch { /* ignore */ }
        }}
        canInstall={installEvent !== null}
        install={() => installEvent?.prompt().then(() => setInstallEvent(null))} />
    );
  };

  return (
    <div className="app">
      {!home && (
        <header className="appbar">
          {(sub || acct) && (
            <button className="icon-btn" onClick={() => { if (inAccPage) { setSetPageName('menu'); return; } setSub(null); setAcct(null); }} aria-label="Бозгашт">
              <BackIcon />
            </button>
          )}
          <h1>{title}</h1>
          {tab === 'profile' && !sub && !acct && (
            <SyncBadge onClick={() => setSyncOpen(true)} />
          )}
          {infoKind && (
            <button className="icon-btn info-btn" onClick={() => setInfo(true)} aria-label="Маълумот">
              <InfoIcon />
            </button>
          )}
        </header>
      )}

      <div className={refreshing ? 'ptr busy' : 'ptr'}
        style={{ transform: `translate(-50%, ${pull - 48}px)`, opacity: Math.min(1, pull / 40), '--rot': `${pull * 4}deg` } as CSSProperties}>
        <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden>
          <circle className="ptr-track" cx="12" cy="12" r="9" />
          <circle className="ptr-arc" cx="12" cy="12" r="9" pathLength="100"
            style={{ strokeDashoffset: refreshing ? 25 : 100 - Math.min(100, (pull / 52) * 72) }} />
        </svg>
      </div>

      <main className={home ? 'screen home' : 'screen'} key={`${acct ?? ''}${sub ?? ''}${tab}`}
        style={{ transform: pull ? `translateY(${pull}px)` : undefined, transition: touch.current ? 'none' : 'transform .2s' }}
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} onTouchCancel={onTouchEnd}>
        {content()}
      </main>

      {toast && <div className="toast">{toast}</div>}
      {locked && <LockScreen onUnlock={() => setLocked(false)} />}
      {intro && (
        <Onboarding mode={state.mode} onPick={pickMode} onClose={() => setIntro(false)}
          onGuide={() => { setAcct(null); setSub('guide'); }}
          onAddIncome={() => setAdding(true)}
          onTelegram={() => { setSub(null); setAcct(null); setWantTg(true); setTab('profile'); }} />
      )}
      {celebration && <Celebrate title={celebration.title} text={celebration.text} onClose={() => setCelebration(null)} />}

      <nav className="tabbar">
        {LEFT.map(tabButton)}
        <button className="tab add" onClick={() => setAdding(true)} aria-label="Илова кардан">
          <span className="add-circle"><PlusIcon /></span>
          <span>Илова</span>
        </button>
        {RIGHT.map(tabButton)}
      </nav>

      {syncOpen && (
        <SyncSheet onClose={() => setSyncOpen(false)} onToast={setToast}
          onOpenAuth={() => { setSyncOpen(false); setAuthOpen(true); }} />
      )}
      {authOpen && <AuthPage onClose={() => setAuthOpen(false)} onToast={setToast} />}

      {info && infoKind && <InfoSheet kind={infoKind} onClose={() => setInfo(false)} />}

      {adding && (
        <AddSheet {...props} onClose={() => setAdding(false)} onDone={setToast} />
      )}
    </div>
  );
}
