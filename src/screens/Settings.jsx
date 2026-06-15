import { useState, useRef } from 'react';
import { all, run, getSetting, setSetting, resetDb, exportBytes, importDb } from '../db.js';
import { CURRENCIES, currencyCode, fmt, money, currencySymbol, todayISO } from '../format.js';
import { useStore } from '../store.jsx';
import { PageHead, Stepper } from '../components.jsx';
import { ArrowLeft, Eye, Trash2, Database, Plus, Monitor, Sun, Moon, Upload, Download, ExternalLink } from 'lucide-react';
import { getTheme, setTheme, initTheme } from '../theme.js';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DatePicker } from '@/components/date-time-picker';

export default function Settings() {
  const { version, refresh, showToast, navigate } = useStore();
  void version;

  const currency = currencyCode();
  const playerName = getSetting('player_name', 'You');
  const defaultPcs = Number(getSetting('default_pcs_per_tube', '12'));
  const tubes = all('SELECT * FROM tubes ORDER BY bought_date DESC, id DESC');
  const sym = currencySymbol();
  const [showTube, setShowTube] = useState(false);

  const theme = getTheme();
  const chooseTheme = (t) => { setTheme(t); refresh(); };

  const setCurrency = (code) => { setSetting('currency', code); refresh(); showToast(`Currency set to ${code}`); };
  const setName = (name) => { setSetting('player_name', name); refresh(); };
  const adjustRemaining = (id, val) => { run('UPDATE tubes SET remaining=? WHERE id=?', [val, id]); refresh(); };
  const delTube = (id) => { run('DELETE FROM tubes WHERE id=?', [id]); refresh(); showToast('Tube removed'); };

  const fileRef = useRef(null);

  const exportDb = () => {
    const blob = new Blob([exportBytes()], { type: 'application/x-sqlite3' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'sport-session.sqlite'; a.click();
    URL.revokeObjectURL(url);
  };
  const onImportFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file later
    if (!file) return;
    if (!confirm('Importing replaces all current data with the contents of this file. Continue?')) return;
    try {
      const buf = await file.arrayBuffer();
      importDb(buf);
      initTheme(); // apply the imported theme/currency immediately
      refresh();
      showToast('Database imported ✓');
      navigate('home');
    } catch (err) {
      showToast(err.message || 'Import failed');
    }
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
        right={<Button variant="outline" size="icon" onClick={() => navigate('home')} aria-label="Back"><ArrowLeft className="size-[18px]" /></Button>}
      />

      {/* Appearance */}
      <Card className="mb-3.5">
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 font-semibold">🎨 Appearance</div>
          <div className="space-y-1.5">
            <Label>Theme</Label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'system', label: 'System', icon: Monitor },
                { id: 'light', label: 'Light', icon: Sun },
                { id: 'dark', label: 'Dark', icon: Moon },
              ].map((opt) => {
                const Icon = opt.icon;
                return (
                  <Button
                    key={opt.id}
                    type="button"
                    variant={theme === opt.id ? 'default' : 'outline'}
                    className="h-auto flex-col gap-1.5 py-3"
                    onClick={() => chooseTheme(opt.id)}
                  >
                    <Icon className="size-5" />
                    <span className="text-xs">{opt.label}</span>
                  </Button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-3.5">
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 font-semibold">💱 Currency</div>
          <div className="space-y-1.5">
            <Label>Display currency</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => <SelectItem key={c.code} value={c.code}>{c.symbol} — {c.name} ({c.code})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="bg-brand-green/10 text-brand-green flex items-center gap-2.5 rounded-lg p-3 text-sm">
            <Eye className="size-4 shrink-0" /><span>Preview: a {money(57.5)} split shows as <strong>{fmt(57.5)}</strong></span>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-3.5">
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 font-semibold">🙂 Your name</div>
          <div className="space-y-1.5">
            <Label>Shown as the payer in new sessions</Label>
            <Input type="text" value={playerName} onChange={(e) => setName(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card className="mb-3.5">
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold">🏸 Shuttlecock Inventory</div>
            <Button variant="ghost" size="sm" className="text-brand-purple h-7 gap-1 px-2" onClick={() => setShowTube(true)}><Plus className="size-4" /> Add Tube</Button>
          </div>
          <div className="mt-2 space-y-2.5">
            {tubes.length === 0 && <p className="text-muted-foreground text-sm">No tubes. Add one to start tracking usage.</p>}
            {tubes.map((t) => (
              <div key={t.id} className="rounded-xl border p-3">
                <div className="flex gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-bold">{t.brand}</div>
                    <div className="text-muted-foreground text-xs">Bought {t.bought_date} · {sym}{money(t.price)}/tube · {t.pcs_per_tube} pcs</div>
                  </div>
                  <Button variant="outline" size="icon" onClick={() => delTube(t.id)} aria-label="Remove"><Trash2 className="size-4" /></Button>
                </div>
                <div className="mt-2.5 flex items-center justify-between border-t border-dashed pt-2.5">
                  <span className="text-muted-foreground text-sm">Remaining</span>
                  <Stepper value={t.remaining} min={0} max={t.pcs_per_tube} onChange={(v) => adjustRemaining(t.id, v)} />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 font-semibold"><Database className="size-[18px]" /> Data</div>
          <p className="text-muted-foreground text-sm">Your data lives in a SQLite database stored in this browser. Export a backup, import one from a .sqlite file, or reset to the sample data.</p>
          <input ref={fileRef} type="file" accept=".sqlite,.db,.sqlite3,application/x-sqlite3,application/octet-stream" className="hidden" onChange={onImportFile} />
          <div className="grid grid-cols-2 gap-2.5">
            <Button variant="outline" onClick={exportDb}><Download className="size-4" /> Export</Button>
            <Button variant="outline" onClick={() => fileRef.current?.click()}><Upload className="size-4" /> Import</Button>
          </div>
          <Button variant="outline" className="text-destructive w-full" onClick={doReset}>Reset data</Button>
        </CardContent>
      </Card>

      {/* Attribution */}
      <Card>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 font-semibold">ℹ️ About</div>
          <p className="text-muted-foreground text-sm">
            Sport Session — a mobile-first badminton cost &amp; bill-splitting tracker. Built with React, Vite, sql.js and shadcn/ui.
          </p>
          <a
            href="https://github.com/kevingautama/sport-session"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:bg-accent flex items-center justify-between rounded-xl border p-3 transition-colors"
          >
            <span className="flex items-center gap-3">
              <span className="bg-muted flex size-9 items-center justify-center rounded-lg"><GithubMark /></span>
              <span>
                <span className="block font-semibold">View source on GitHub</span>
                <span className="text-muted-foreground block text-xs">kevingautama/sport-session</span>
              </span>
            </span>
            <ExternalLink className="text-muted-foreground size-4" />
          </a>
        </CardContent>
      </Card>

      <Dialog open={showTube} onOpenChange={setShowTube}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add a tube to inventory</DialogTitle></DialogHeader>
          <AddTube defaultPcs={defaultPcs} onSaved={() => { setShowTube(false); refresh(); showToast('Tube added'); }} />
        </DialogContent>
      </Dialog>
    </>
  );
}

function AddTube({ defaultPcs, onSaved }) {
  const [brand, setBrand] = useState('');
  const [price, setPrice] = useState('');
  const [pcs, setPcs] = useState(defaultPcs || 12);
  const [date, setDate] = useState(todayISO());

  const save = () => {
    if (!brand.trim() || !(Number(price) > 0)) return;
    run('INSERT INTO tubes(brand,bought_date,price,pcs_per_tube,remaining,created_at) VALUES(?,?,?,?,?,?)',
      [brand.trim(), date, Number(price), pcs, pcs, new Date().toISOString()]);
    onSaved();
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1.5"><Label>Brand / model</Label><Input type="text" placeholder="e.g. Yonex Aerosensa 50" value={brand} onChange={(e) => setBrand(e.target.value)} /></div>
      <div className="flex gap-2.5">
        <div className="flex-1 space-y-1.5"><Label>Price per tube</Label><Input type="number" inputMode="decimal" placeholder="110" value={price} onChange={(e) => setPrice(e.target.value)} /></div>
        <div className="w-40 space-y-1.5"><Label>Date bought</Label><DatePicker date={date} onChange={setDate} /></div>
      </div>
      <div className="flex items-center justify-between"><span className="text-muted-foreground text-sm">Pieces per tube</span><Stepper value={pcs} min={1} max={20} onChange={setPcs} /></div>
      <Button className="mt-1 w-full" onClick={save}>Save Tube</Button>
    </div>
  );
}

function GithubMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden="true">
      <path d="M12 .5C5.73.5.5 5.73.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.7-3.88-1.54-3.88-1.54-.52-1.34-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.23-1.28-5.23-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.06.78 2.14 0 1.55-.01 2.8-.01 3.18 0 .31.21.68.8.56A11.51 11.51 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5z" />
    </svg>
  );
}
