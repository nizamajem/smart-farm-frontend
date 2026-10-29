import { ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';

export default function TankFlow() {
  return <section className="card simple-flow garden-mix" aria-label="Aliran air tandon">
    <div className="simple-heading"><ArrowDownToLine size={28} /><div><h2>Aliran Air</h2><p>Dua jalur air tandon.</p></div></div>
    <div className="garden-status-grid">
      <article className="garden-status"><ArrowDownToLine /><span>Air bersih masuk</span><strong>— <small>L/menit</small></strong><small>Menuju tandon</small></article>
      <article className="garden-status"><ArrowUpFromLine /><span>Air nutrisi keluar</span><strong>— <small>L/menit</small></strong><small>Dari tandon ke tanaman</small></article>
    </div>
    <small className="muted">Data sensor aliran belum terhubung. Takaran A/B dihitung dari durasi relay.</small>
  </section>;
}
