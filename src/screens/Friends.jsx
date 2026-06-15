import { useState } from 'react';
import { all, one, run } from '../db.js';
import { fmt } from '../format.js';
import { useStore } from '../store.jsx';
import { PageHead, Card, Empty } from '../components.jsx';

export default function Friends() {
  const { version, refresh, showToast } = useStore();
  void version;
  const [name, setName] = useState('');

  const friends = all('SELECT * FROM friends ORDER BY name');
  // Money owed to you = sum of unpaid amounts attributed to that name as a non-payer.
  const owedBy = (n) =>
    one('SELECT COALESCE(SUM(amount),0) v FROM session_people WHERE name=? AND is_payer=0 AND paid=0', [n]).v;
  const sessionsWith = (n) =>
    one('SELECT COUNT(DISTINCT session_id) v FROM session_people WHERE name=?', [n]).v;

  const add = () => {
    const n = name.trim();
    if (!n) return;
    run('INSERT INTO friends(name, created_at) VALUES(?, ?)', [n, new Date().toISOString()]);
    setName('');
    refresh();
  };
  const remove = (id) => {
    run('DELETE FROM friends WHERE id=?', [id]);
    refresh();
    showToast('Friend removed');
  };

  const totalOwed = friends.reduce((s, f) => s + owedBy(f.name), 0);

  return (
    <>
      <PageHead title="Friends" sub="People you play and split costs with" />

      <Card className="tint-green">
        <div className="row">
          <div>
            <div className="row-sub">Total owed to you</div>
            <div className="big-amount" style={{ color: 'var(--green)', fontSize: 28 }}>{fmt(totalOwed)}</div>
          </div>
          <div className="badgebox bx-green" style={{ width: 52, height: 52, fontSize: 26 }}>👥</div>
        </div>
      </Card>

      <Card>
        <div className="card-title" style={{ marginBottom: 10 }}>Add a friend</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input type="text" placeholder="Friend name" value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()} />
          <button className="btn btn-green btn-sm" onClick={add}>Add</button>
        </div>
      </Card>

      {friends.length === 0 ? (
        <Empty icon="👥" title="No friends yet" sub="Add the people you usually play with." />
      ) : (
        <Card>
          <ul className="list-reset">
            {friends.map((f, i) => {
              const owed = owedBy(f.name);
              return (
                <li className="row" key={f.id} style={{ marginTop: i ? 14 : 0 }}>
                  <div className="row-lead">
                    <div className="badgebox bx-purple">{f.name.slice(0, 1).toUpperCase()}</div>
                    <div>
                      <div className="row-name">{f.name}</div>
                      <div className="row-sub">{sessionsWith(f.name)} sessions</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {owed > 0
                      ? <span style={{ color: 'var(--green)', fontWeight: 700 }}>owes {fmt(owed)}</span>
                      : <span className="row-sub">settled</span>}
                    <button className="icon-btn" style={{ width: 34, height: 34, fontSize: 14 }} onClick={() => remove(f.id)} title="Remove">✕</button>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </>
  );
}
