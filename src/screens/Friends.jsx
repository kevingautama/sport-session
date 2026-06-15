import { useState } from 'react';
import { all, one, run } from '../db.js';
import { fmt } from '../format.js';
import { useStore } from '../store.jsx';
import { PageHead, Empty } from '../components.jsx';
import { Users, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function Friends() {
  const { version, refresh, showToast } = useStore();
  void version;
  const [name, setName] = useState('');

  const friends = all('SELECT * FROM friends ORDER BY name');
  const owedBy = (n) => one('SELECT COALESCE(SUM(amount),0) v FROM session_people WHERE name=? AND is_payer=0 AND paid=0', [n]).v;
  const sessionsWith = (n) => one('SELECT COUNT(DISTINCT session_id) v FROM session_people WHERE name=?', [n]).v;

  const add = () => {
    const n = name.trim();
    if (!n) return;
    run('INSERT INTO friends(name, created_at) VALUES(?, ?)', [n, new Date().toISOString()]);
    setName('');
    refresh();
  };
  const remove = (id) => { run('DELETE FROM friends WHERE id=?', [id]); refresh(); showToast('Friend removed'); };

  const totalOwed = friends.reduce((s, f) => s + owedBy(f.name), 0);

  return (
    <>
      <PageHead title="Friends" sub="People you play and split costs with" />

      <Card className="mb-3.5 bg-gradient-to-b from-brand-green/8 to-card">
        <CardContent className="flex items-center justify-between">
          <div>
            <div className="text-muted-foreground text-xs">Total owed to you</div>
            <div className="text-brand-green text-3xl font-extrabold tabular-nums">{fmt(totalOwed)}</div>
          </div>
          <div className="bg-brand-green/12 text-brand-green flex size-13 items-center justify-center rounded-2xl"><Users className="size-6" /></div>
        </CardContent>
      </Card>

      <Card className="mb-3.5">
        <CardContent>
          <div className="mb-2.5 font-semibold">Add a friend</div>
          <div className="flex gap-2">
            <Input type="text" placeholder="Friend name" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
            <Button onClick={add}>Add</Button>
          </div>
        </CardContent>
      </Card>

      {friends.length === 0 ? (
        <Empty icon="👥" title="No friends yet" sub="Add the people you usually play with." />
      ) : (
        <Card>
          <CardContent>
            <ul className="space-y-3.5">
              {friends.map((f) => {
                const owed = owedBy(f.name);
                return (
                  <li key={f.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-brand-purple/12 text-brand-purple flex size-10 items-center justify-center rounded-full font-bold">{f.name.slice(0, 1).toUpperCase()}</div>
                      <div>
                        <div className="font-semibold">{f.name}</div>
                        <div className="text-muted-foreground text-xs">{sessionsWith(f.name)} sessions</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5">
                      {owed > 0 ? <span className="text-brand-green font-bold">owes {fmt(owed)}</span> : <span className="text-muted-foreground text-sm">settled</span>}
                      <Button variant="outline" size="icon" className="size-8" onClick={() => remove(f.id)} aria-label="Remove"><X className="size-4" /></Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </>
  );
}
