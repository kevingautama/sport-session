import { useState, useMemo } from 'react';
import { all, tx, run, getSetting } from '../db.js';
import { fmt, money, currencySymbol, todayISO, nowHHMM } from '../format.js';
import { useStore } from '../store.jsx';
import { PageHead, Card, Stepper, Pill, Modal } from '../components.jsx';

const num = (v) => (v === '' || v == null ? 0 : Number(v) || 0);

export default function NewSession() {
  const { navigate, refresh, showToast } = useStore();

  // Inventory tubes available to draw from.
  const tubes = useMemo(() => all('SELECT * FROM tubes ORDER BY bought_date DESC, id DESC'), []);
  const friends = useMemo(() => all('SELECT * FROM friends ORDER BY name'), []);
  const playerName = getSetting('player_name', 'You');

  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState(nowHHMM());
  const [location, setLocation] = useState('');
  const [duration, setDuration] = useState('');
  const [court, setCourt] = useState('');
  const [other, setOther] = useState('');

  // usage: { [tubeId]: pcsUsed }. Start with every tube shown at 0.
  const [usage, setUsage] = useState(() => Object.fromEntries(tubes.map((t) => [t.id, 0])));
  const [showAdd, setShowAdd] = useState(false);
  const [visibleTubes, setVisibleTubes] = useState(() => tubes.slice(0, 3).map((t) => t.id));

  // people: array of { name, isPayer }
  const [people, setPeople] = useState([{ name: playerName, isPayer: true }, { name: 'Friend 1' }, { name: 'Friend 2' }, { name: 'Friend 3' }]);

  const shown = tubes.filter((t) => visibleTubes.includes(t.id));

  const shuttleCost = shown.reduce((sum, t) => {
    const pcs = usage[t.id] || 0;
    return sum + pcs * (t.price / t.pcs_per_tube);
  }, 0);

  const total = num(court) + num(other) + shuttleCost;
  const perPerson = people.length ? total / people.length : 0;
  const youPaid = total;
  const youReceive = total - perPerson;

  const setUse = (tubeId, val) => setUsage((u) => ({ ...u, [tubeId]: val }));

  const addTube = (tubeId) => {
    setVisibleTubes((v) => (v.includes(tubeId) ? v : [...v, tubeId]));
    setShowAdd(false);
  };
  const removeTube = (tubeId) => {
    setVisibleTubes((v) => v.filter((x) => x !== tubeId));
    setUse(tubeId, 0);
  };

  const setCount = (n) => {
    setPeople((p) => {
      if (n < 1) return p;
      if (n < p.length) return p.slice(0, n);
      const next = [...p];
      while (next.length < n) next.push({ name: `Friend ${next.length}` });
      return next;
    });
  };
  const setPersonName = (i, name) => setPeople((p) => p.map((x, idx) => (idx === i ? { ...x, name } : x)));

  const clearAll = () => {
    setCourt(''); setOther(''); setLocation(''); setDuration('');
    setUsage(Object.fromEntries(tubes.map((t) => [t.id, 0])));
  };

  const save = () => {
    if (total <= 0) {
      showToast('Add a cost before saving');
      return;
    }
    tx(({ exec, lastId }) => {
      exec(
        `INSERT INTO sessions(date,time,location,court_rental,other_expenses,duration_hr,num_people,shuttle_cost,total_cost,created_at)
         VALUES(?,?,?,?,?,?,?,?,?,?)`,
        [date, time, location || null, num(court), num(other), num(duration), people.length, shuttleCost, total, new Date().toISOString()]
      );
      const sid = lastId();
      for (const t of shown) {
        const pcs = usage[t.id] || 0;
        if (pcs > 0) {
          const cost = pcs * (t.price / t.pcs_per_tube);
          exec(`INSERT INTO session_shuttles(session_id,tube_id,brand,pcs_used,cost) VALUES(?,?,?,?,?)`, [sid, t.id, t.brand, pcs, cost]);
          exec(`UPDATE tubes SET remaining = MAX(0, remaining - ?) WHERE id = ?`, [pcs, t.id]);
        }
      }
      people.forEach((p) => {
        exec(`INSERT INTO session_people(session_id,name,is_payer,amount,paid) VALUES(?,?,?,?,?)`,
          [sid, p.name, p.isPayer ? 1 : 0, perPerson, p.isPayer ? 1 : 0]);
      });
    });
    refresh();
    showToast('Session saved ✓');
    navigate('history');
  };

  const sym = currencySymbol();

  return (
    <>
      <PageHead
        title="New Session"
        sub="Track your play and split the cost"
        right={<button className="link" onClick={clearAll}>Clear All</button>}
      />

      {/* Court rental */}
      <Card>
        <div className="row">
          <div className="row-lead">
            <div className="badgebox bx-green">🏟️</div>
            <div>
              <div className="row-name">Court Rental</div>
              <div className="row-sub">Cost of the court</div>
            </div>
          </div>
          <input className="inline-amount" type="number" inputMode="decimal" placeholder="0.00"
            value={court} onChange={(e) => setCourt(e.target.value)} />
        </div>
      </Card>

      {/* Date / location / duration */}
      <Card>
        <div className="field">
          <label>Location</label>
          <input type="text" placeholder="e.g. JB Badminton Center - Court 5" value={location} onChange={(e) => setLocation(e.target.value)} />
        </div>
        <div className="row" style={{ gap: 10 }}>
          <div className="field" style={{ flex: 1, marginBottom: 0 }}>
            <label>Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="field" style={{ width: 100, marginBottom: 0 }}>
            <label>Time</label>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
          <div className="field" style={{ width: 90, marginBottom: 0 }}>
            <label>Hours</label>
            <input type="number" inputMode="decimal" placeholder="2.0" value={duration} onChange={(e) => setDuration(e.target.value)} />
          </div>
        </div>
      </Card>

      {/* Shuttlecock usage */}
      <Card>
        <div className="card-head">
          <div className="card-title"><span className="ci">🏸</span> Shuttlecock Usage</div>
          {shown.length < tubes.length && (
            <button className="link purple" onClick={() => setShowAdd(true)}>+ Add Usage</button>
          )}
        </div>
        <div className="row-sub" style={{ marginTop: -6, marginBottom: 10 }}>Track by shuttlecocks from your inventory</div>

        {shown.length === 0 && <div className="row-sub">No tubes selected. Tap “Add Usage”.</div>}

        {shown.map((t) => {
          const pcs = usage[t.id] || 0;
          const cost = pcs * (t.price / t.pcs_per_tube);
          return (
            <div className="usage" key={t.id}>
              <div className="usage-top">
                <div className="tube-img">🥫</div>
                <div className="usage-meta">
                  <div className="usage-name">{t.brand}</div>
                  <div className="row-sub">Bought on {t.bought_date}</div>
                  <div style={{ marginTop: 6, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Pill kind="purple">{sym}{money(t.price)} / tube</Pill>
                    <span className="row-sub">{t.pcs_per_tube} pcs per tube</span>
                  </div>
                  <div className="row-sub" style={{ marginTop: 6 }}>{t.remaining} remaining before this session</div>
                </div>
              </div>
              <div className="usage-ctrl">
                <div>
                  <div className="row-sub">Used</div>
                  <Stepper value={pcs} min={0} max={t.remaining} onChange={(v) => setUse(t.id, v)} />
                </div>
                <div className="center">
                  <div className="row-sub">Cost</div>
                  <div className="cost-out">{money(cost)}</div>
                </div>
                <button className="icon-btn" onClick={() => removeTube(t.id)} title="Remove">🗑️</button>
              </div>
            </div>
          );
        })}

        <div className="note">
          <span>ℹ️</span>
          <span>Cost is calculated from the price you paid for the tube. You can use pieces from multiple tubes in one session.</span>
        </div>

        <div className="row" style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--line)' }}>
          <strong>Total Shuttlecock Cost</strong>
          <span className="cost-out">{money(shuttleCost)}</span>
        </div>
      </Card>

      {/* Other expenses */}
      <Card>
        <div className="row">
          <div className="row-lead">
            <div className="badgebox bx-orange">🏷️</div>
            <div>
              <div className="row-name">Other Expenses <span className="row-sub">(Optional)</span></div>
              <div className="row-sub">Drinks, parking, etc.</div>
            </div>
          </div>
          <input className="inline-amount" type="number" inputMode="decimal" placeholder="0.00"
            value={other} onChange={(e) => setOther(e.target.value)} />
        </div>
      </Card>

      {/* People */}
      <Card>
        <div className="card-head">
          <div className="card-title"><span className="ci">👥</span> People</div>
        </div>
        <div className="row">
          <span className="muted">Number of People</span>
          <Stepper value={people.length} min={1} onChange={setCount} />
        </div>
        <div className="divider" />
        <ul className="list-reset">
          {people.map((p, i) => (
            <li className="row" key={i} style={{ marginTop: i ? 12 : 0 }}>
              <div className="row-lead">
                <div className="badgebox bx-purple">{i + 1}</div>
                {p.isPayer ? (
                  <div className="row-name">{p.name} <span className="row-sub">(Payer)</span></div>
                ) : (
                  <input list="friend-names" value={p.name} onChange={(e) => setPersonName(i, e.target.value)} style={{ maxWidth: 160 }} />
                )}
              </div>
              {p.isPayer ? (
                <Pill kind="green">Paid</Pill>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Pill kind="orange">Owes</Pill>
                  <span className="row-val">{money(perPerson)}</span>
                </div>
              )}
            </li>
          ))}
        </ul>
        <datalist id="friend-names">
          {friends.map((f) => <option value={f.name} key={f.id} />)}
        </datalist>
      </Card>

      {/* Summary */}
      <div className="sumgrid">
        {[
          ['Total Cost', total],
          ['Per Person', perPerson],
          ['You Paid', youPaid],
          ['You receive', youReceive],
        ].map(([k, v]) => (
          <div className="cell" key={k}>
            <div className="k">{k}</div>
            <div className="v">{money(v)}</div>
            <div className="u">{sym}</div>
          </div>
        ))}
      </div>

      <div className="savebar">
        <button className="btn btn-green" onClick={save}>Save Session</button>
      </div>

      {showAdd && (
        <Modal title="Add shuttlecock from inventory" onClose={() => setShowAdd(false)}>
          {tubes.filter((t) => !visibleTubes.includes(t.id)).length === 0 && (
            <div className="row-sub">All tubes are already added.</div>
          )}
          {tubes.filter((t) => !visibleTubes.includes(t.id)).map((t) => (
            <button key={t.id} className="row" style={{ width: '100%', background: 'none', border: '1px solid var(--line)', borderRadius: 12, padding: 12, marginBottom: 8, textAlign: 'left' }} onClick={() => addTube(t.id)}>
              <div className="row-lead">
                <div className="tube-img">🥫</div>
                <div>
                  <div className="row-name">{t.brand}</div>
                  <div className="row-sub">{t.remaining} left · {sym}{money(t.price)}/tube</div>
                </div>
              </div>
              <span className="link purple">Add</span>
            </button>
          ))}
        </Modal>
      )}
    </>
  );
}
