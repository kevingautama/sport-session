import { useState } from 'react';
import { all, one, run, tx } from '../db.js';
import { fmt, money, monthLabel, monthShort, dayNum, weekday, time12 } from '../format.js';
import { useStore } from '../store.jsx';
import { PageHead, Card, Pill, Empty, Modal } from '../components.jsx';

export default function History() {
  const { version, refresh, showToast } = useStore();
  void version;
  const [open, setOpen] = useState(null); // session id

  const sessions = all('SELECT * FROM sessions ORDER BY date DESC, id DESC');
  const totals = one(
    'SELECT COALESCE(SUM(total_cost),0) AS spent, COUNT(*) AS cnt, COALESCE(SUM(shuttle_cost),0) AS sc FROM sessions'
  );
  const shuttlePcs = one('SELECT COALESCE(SUM(pcs_used),0) AS pcs FROM session_shuttles').pcs;

  // group by month label preserving order
  const groups = [];
  for (const s of sessions) {
    const label = monthLabel(s.date);
    let g = groups.find((x) => x.label === label);
    if (!g) groups.push((g = { label, items: [] }));
    g.items.push(s);
  }

  const owedFor = (id) =>
    one('SELECT COALESCE(SUM(amount),0) AS v FROM session_people WHERE session_id=? AND is_payer=0 AND paid=0', [id]).v;
  const brandFor = (id) => one('SELECT brand FROM session_shuttles WHERE session_id=? ORDER BY pcs_used DESC LIMIT 1', [id]);
  const pcsFor = (id) => one('SELECT COALESCE(SUM(pcs_used),0) AS v FROM session_shuttles WHERE session_id=?', [id]).v;

  return (
    <>
      <PageHead title="History" sub="Your past play sessions and spending" />

      <Card>
        <div className="stat3">
          <div className="cell"><div className="ic">⬇️</div><div className="v" style={{ color: 'var(--green)' }}>{money(totals.spent)}</div><div className="k">Total Spent</div></div>
          <div className="cell"><div className="ic">👥</div><div className="v" style={{ color: 'var(--purple)' }}>{totals.cnt}</div><div className="k">Sessions</div></div>
          <div className="cell"><div className="ic">🏸</div><div className="v" style={{ color: 'var(--blue)' }}>{shuttlePcs}</div><div className="k">Shuttles Used</div></div>
        </div>
      </Card>

      {sessions.length === 0 && <Empty title="No history yet" sub="Saved sessions will appear here." />}

      {groups.map((g) => (
        <div key={g.label}>
          <div className="month-label">{g.label}</div>
          {g.items.map((s) => {
            const owed = owedFor(s.id);
            const brand = brandFor(s.id);
            const pcs = pcsFor(s.id);
            const perPerson = s.num_people ? s.total_cost / s.num_people : 0;
            return (
              <Card key={s.id}>
                <div className="hist" onClick={() => setOpen(s.id)} style={{ cursor: 'pointer' }}>
                  <div className="hist-date">
                    <div className="m">{monthShort(s.date)}</div>
                    <div className="d">{dayNum(s.date)}</div>
                    <div className="w">{weekday(s.date)}</div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="row">
                      <div className="row-name">{time12(s.time)}</div>
                      <div className="row-val">{money(s.total_cost)}</div>
                    </div>
                    <div className="row-sub">{s.location || 'Session'}</div>
                    <div className="meta-line">
                      {s.duration_hr > 0 && <span>🕐 {s.duration_hr} hr</span>}
                      {brand && <span>🏸 {brand.brand}</span>}
                      {pcs > 0 && <span>{pcs} pcs</span>}
                      <span>👥 {s.num_people} people</span>
                    </div>
                    <div className="row" style={{ marginTop: 8 }}>
                      <span className="row-sub">{money(perPerson)} / person</span>
                      {owed > 0
                        ? <Pill kind="green">You're owed {money(owed)}</Pill>
                        : <Pill kind="gray">Settled</Pill>}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ))}

      {open != null && (
        <SessionDetail
          id={open}
          onClose={() => setOpen(null)}
          onChange={refresh}
          onDeleted={() => { setOpen(null); refresh(); showToast('Session deleted'); }}
        />
      )}
    </>
  );
}

function SessionDetail({ id, onClose, onChange, onDeleted }) {
  const s = one('SELECT * FROM sessions WHERE id=?', [id]);
  const people = all('SELECT * FROM session_people WHERE session_id=? ORDER BY is_payer DESC, id', [id]);
  const shuttles = all('SELECT * FROM session_shuttles WHERE session_id=?', [id]);
  if (!s) return null;

  const togglePaid = (p) => {
    run('UPDATE session_people SET paid=? WHERE id=?', [p.paid ? 0 : 1, p.id]);
    onChange();
  };
  const del = () => {
    if (!confirm('Delete this session? This cannot be undone.')) return;
    tx(({ exec }) => {
      exec('DELETE FROM session_shuttles WHERE session_id=?', [id]);
      exec('DELETE FROM session_people WHERE session_id=?', [id]);
      exec('DELETE FROM sessions WHERE id=?', [id]);
    });
    onDeleted();
  };

  return (
    <Modal title={s.location || 'Session'} onClose={onClose}>
      <div className="row-sub" style={{ marginBottom: 12 }}>{monthLabel(s.date)} · {time12(s.time)}{s.duration_hr ? ` · ${s.duration_hr} hr` : ''}</div>

      <div className="row"><span className="muted">Court Rental</span><span>{money(s.court_rental)}</span></div>
      <div className="row"><span className="muted">Shuttlecock</span><span>{money(s.shuttle_cost)}</span></div>
      {shuttles.map((sh) => (
        <div className="row" key={sh.id} style={{ marginTop: 4 }}>
          <span className="row-sub" style={{ paddingLeft: 12 }}>· {sh.brand} ({sh.pcs_used} pcs)</span>
          <span className="row-sub">{money(sh.cost)}</span>
        </div>
      ))}
      {s.other_expenses > 0 && <div className="row"><span className="muted">Other</span><span>{money(s.other_expenses)}</span></div>}
      <div className="divider" />
      <div className="row"><strong>Total</strong><span className="cost-out">{money(s.total_cost)}</span></div>

      <div className="month-label" style={{ marginTop: 14 }}>Who pays what — tap to settle</div>
      <ul className="list-reset">
        {people.map((p) => (
          <li className="row" key={p.id} style={{ marginTop: 10 }}>
            <div className="row-lead">
              <div className={`badgebox ${p.is_payer ? 'bx-green' : 'bx-purple'}`}>{p.is_payer ? '💳' : '👤'}</div>
              <div className="row-name">{p.name}{p.is_payer ? ' (Payer)' : ''}</div>
            </div>
            {p.is_payer ? (
              <Pill kind="green">Paid</Pill>
            ) : (
              <button className="btn btn-sm" style={{ background: p.paid ? 'var(--green-bg)' : 'var(--orange-bg)', color: p.paid ? 'var(--green)' : '#b45309' }} onClick={() => togglePaid(p)}>
                {p.paid ? `Settled · ${money(p.amount)}` : `Owes ${money(p.amount)}`}
              </button>
            )}
          </li>
        ))}
      </ul>

      <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
        <button className="btn btn-ghost" onClick={onClose}>Close</button>
        <button className="btn btn-ghost" style={{ color: 'var(--red)' }} onClick={del}>Delete</button>
      </div>
    </Modal>
  );
}
