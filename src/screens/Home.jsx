import { all, one } from '../db.js';
import { fmt, money, currencySymbol, time12, monthShort, dayNum } from '../format.js';
import { useStore } from '../store.jsx';
import { PageHead, Card, Empty } from '../components.jsx';

export default function Home() {
  const { version, navigate } = useStore();
  // version is referenced so this re-reads after any mutation.
  void version;

  const inv = one('SELECT COALESCE(SUM(remaining),0) AS left, COALESCE(SUM(pcs_per_tube),0) AS total FROM tubes') || { left: 0, total: 0 };
  const pctLeft = inv.total ? Math.round((inv.left / inv.total) * 100) : 0;
  const used = inv.total - inv.left;

  const last = one('SELECT * FROM sessions ORDER BY date DESC, id DESC LIMIT 1');
  const owedTotal = one(
    `SELECT COALESCE(SUM(amount),0) AS owed FROM session_people WHERE is_payer = 0 AND paid = 0`
  ).owed;
  const lastOwed = last
    ? one(`SELECT COALESCE(SUM(amount),0) AS owed FROM session_people WHERE session_id = ? AND is_payer = 0 AND paid = 0`, [last.id]).owed
    : 0;
  const lastPerPerson = last && last.num_people ? last.total_cost / last.num_people : 0;
  const sym = currencySymbol();

  return (
    <>
      <PageHead
        title="Sport Session 🏸"
        sub="Track shuttlecocks and split costs easily"
        right={<button className="icon-btn" onClick={() => navigate('settings')} title="Settings">⚙️</button>}
      />

      {/* Inventory */}
      <Card className="tint-green">
        <div className="card-head">
          <div className="card-title" style={{ color: 'var(--green)' }}><span className="ci">🏸</span> Shuttlecock Left</div>
          <button className="link" onClick={() => navigate('settings')}>✎ Manage</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span className="big-amount" style={{ color: 'var(--green)' }}>{inv.left}</span>
          <span className="muted">pcs left</span>
        </div>
        <div className="muted" style={{ fontSize: 13 }}>out of {inv.total} pcs</div>
        <div className="progress"><i style={{ width: `${pctLeft}%` }} /></div>
        <div className="row">
          <span className="row-sub">Used {used} pcs</span>
          <span className="row-sub" style={{ color: 'var(--green)', fontWeight: 700 }}>{100 - pctLeft}% used</span>
        </div>
      </Card>

      {/* Most recent session */}
      <Card>
        <div className="card-head">
          <div className="card-title" style={{ color: 'var(--purple)' }}><span className="ci">📅</span> Latest Session</div>
          <button className="link purple" onClick={() => navigate('history')}>View all</button>
        </div>
        {!last ? (
          <Empty title="No sessions yet" sub="Tap + to log your first one." />
        ) : (
          <>
            <div className="row">
              <div className="row-lead">
                <div className="hist-date">
                  <div className="m">{monthShort(last.date)}</div>
                  <div className="d">{dayNum(last.date)}</div>
                </div>
                <div>
                  <div className="row-name">{last.location || 'Session'}</div>
                  <div className="row-sub">{time12(last.time)} · {last.num_people} people</div>
                </div>
              </div>
            </div>
            <div className="divider" />
            <div className="row"><span className="muted">Court Rental</span><span>{money(last.court_rental)}</span></div>
            <div className="row"><span className="muted">Shuttlecock</span><span>{money(last.shuttle_cost)}</span></div>
            {last.other_expenses > 0 && <div className="row"><span className="muted">Other</span><span>{money(last.other_expenses)}</span></div>}
            <div className="divider" />
            <div className="row">
              <strong>Total Cost</strong>
              <span className="cost-out">{money(last.total_cost)}</span>
            </div>
            <div className="row" style={{ marginTop: 8 }}>
              <span className="muted">Cost per person</span>
              <span style={{ color: 'var(--blue)', fontWeight: 700 }}>{money(lastPerPerson)}</span>
            </div>
          </>
        )}
      </Card>

      {/* Balance */}
      <Card>
        <div className="card-title" style={{ color: 'var(--orange)', marginBottom: 12 }}><span className="ci">💲</span> Summary</div>
        {last && (
          <div className="row">
            <span className="muted">You're owed from latest</span>
            <span style={{ fontWeight: 700 }}>{fmt(lastOwed)}</span>
          </div>
        )}
        <div className="note" style={{ marginTop: 12, background: 'var(--green-bg)', color: 'var(--green-d)' }}>
          <span>💰</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18 }}>You're owed (total) {fmt(owedTotal)}</div>
            <div style={{ marginTop: 2 }}>Remind your friends to settle up! 😉</div>
          </div>
        </div>
        <button className="btn btn-green" style={{ marginTop: 14 }} onClick={() => navigate('new')}>+ New Session</button>
      </Card>
    </>
  );
}
