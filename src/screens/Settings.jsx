import { useState } from 'react';
import { all, run, tx, getSetting, setSetting, resetDb, exportBytes } from '../db.js';
import { CURRENCIES, currencyCode, fmt, money, currencySymbol, todayISO } from '../format.js';
import { useStore } from '../store.jsx';
import { PageHead, Card, Stepper, Modal } from '../components.jsx';

export default function Settings() {
  const { version, refresh, showToast, navigate } = useStore();
  void version;

  const currency = currencyCode();
  const playerName = getSetting('player_name', 'You');
  const defaultPcs = Number(getSetting('default_pcs_per_tube', '12'));
  const tubes = all('SELECT * FROM tubes ORDER BY bought_date DESC, id DESC');
  const sym = currencySymbol();

  const [showTube, setShowTube] = useState(false);

  const setCurrency = (code) => { setSetting('currency', code); refresh(); showToast(`Currency set to ${code}`); };
  const setName = (name) => { setSetting('player_name', name); refresh(); };

  const adjustRemaining = (id, val) => { run('UPDATE tubes SET remaining=? WHERE id=?', [val, id]); refresh(); };
  const delTube = (id) => { run('DELETE FROM tubes WHERE id=?', [id]); refresh(); showToast('Tube removed'); };

  const exportDb = () => {
    const blob = new Blob([exportBytes()], { type: 'application/x-sqlite3' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'sport-session.sqlite'; a.click();
    URL.revokeObjectURL(url);
  };
  const doReset = () => {
    if (!confirm('Reset all data back to the sample set? This erases your sessions.')) return;
    resetDb(); refresh(); showToast('Data reset'); navigate('home');
  };

  return (
    <>
      <PageHead
        title="Settings"
        sub="Currency, profile and inventory"
        right={<button className="icon-btn" onClick={() => navigate('home')} title="Back">←</button>}
      />

      {/* Currency */}
      <Card>
        <div className="card-title" style={{ marginBottom: 12 }}><span className="ci">💱</span> Currency</div>
        <div className="field">
          <label>Display currency</label>
          <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>{c.symbol} — {c.name} ({c.code})</option>
            ))}
          </select>
        </div>
        <div className="note" style={{ background: 'var(--green-bg)', color: 'var(--green-d)' }}>
          <span>👁️</span><span>Preview: a {money(57.5)} split shows as <strong>{fmt(57.5)}</strong></span>
        </div>
      </Card>

      {/* Profile */}
      <Card>
        <div className="card-title" style={{ marginBottom: 12 }}><span className="ci">🙂</span> Your name</div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Shown as the payer in new sessions</label>
          <input type="text" value={playerName} onChange={(e) => setName(e.target.value)} />
        </div>
      </Card>

      {/* Inventory */}
      <Card>
        <div className="card-head">
          <div className="card-title"><span className="ci">🏸</span> Shuttlecock Inventory</div>
          <button className="link purple" onClick={() => setShowTube(true)}>+ Add Tube</button>
        </div>
        {tubes.length === 0 && <div className="row-sub">No tubes. Add one to start tracking usage.</div>}
        {tubes.map((t) => (
          <div className="usage" key={t.id}>
            <div className="usage-top">
              <div className="tube-img">🥫</div>
              <div className="usage-meta">
                <div className="usage-name">{t.brand}</div>
                <div className="row-sub">Bought {t.bought_date} · {sym}{money(t.price)}/tube · {t.pcs_per_tube} pcs</div>
              </div>
              <button className="icon-btn" onClick={() => delTube(t.id)} title="Remove">🗑️</button>
            </div>
            <div className="usage-ctrl">
              <span className="row-sub">Remaining</span>
              <Stepper value={t.remaining} min={0} max={t.pcs_per_tube} onChange={(v) => adjustRemaining(t.id, v)} />
            </div>
          </div>
        ))}
      </Card>

      {/* Data */}
      <Card>
        <div className="card-title" style={{ marginBottom: 12 }}><span className="ci">💾</span> Data</div>
        <div className="row-sub" style={{ marginBottom: 12 }}>Your data lives in a SQLite database stored in this browser. Export a backup or reset to the sample data.</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" onClick={exportDb}>Export .sqlite</button>
          <button className="btn btn-ghost" style={{ color: 'var(--red)' }} onClick={doReset}>Reset data</button>
        </div>
      </Card>

      {showTube && <AddTube defaultPcs={defaultPcs} onClose={() => setShowTube(false)} onSaved={() => { setShowTube(false); refresh(); showToast('Tube added'); }} />}
    </>
  );
}

function AddTube({ defaultPcs, onClose, onSaved }) {
  const [brand, setBrand] = useState('');
  const [price, setPrice] = useState('');
  const [pcs, setPcs] = useState(defaultPcs || 12);
  const [date, setDate] = useState(todayISO());

  const save = () => {
    if (!brand.trim() || !(Number(price) > 0)) return;
    run(
      'INSERT INTO tubes(brand,bought_date,price,pcs_per_tube,remaining,created_at) VALUES(?,?,?,?,?,?)',
      [brand.trim(), date, Number(price), pcs, pcs, new Date().toISOString()]
    );
    onSaved();
  };

  return (
    <Modal title="Add a tube to inventory" onClose={onClose}>
      <div className="field"><label>Brand / model</label>
        <input type="text" placeholder="e.g. Yonex Aerosensa 50" value={brand} onChange={(e) => setBrand(e.target.value)} /></div>
      <div className="row" style={{ gap: 10 }}>
        <div className="field" style={{ flex: 1 }}><label>Price per tube</label>
          <input type="number" inputMode="decimal" placeholder="110" value={price} onChange={(e) => setPrice(e.target.value)} /></div>
        <div className="field" style={{ width: 120 }}><label>Date bought</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
      </div>
      <div className="row">
        <span className="muted">Pieces per tube</span>
        <Stepper value={pcs} min={1} max={20} onChange={setPcs} />
      </div>
      <button className="btn btn-green" style={{ marginTop: 16 }} onClick={save}>Save Tube</button>
    </Modal>
  );
}
