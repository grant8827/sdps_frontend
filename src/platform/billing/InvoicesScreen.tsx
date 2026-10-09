import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Screen } from '../../components/Screen';
import { Pagination } from '../../components/Pagination';
import { SummaryTile } from '../../components/SummaryTile';
import { ReasonDialog } from '../../components/ReasonDialog';
import { useAuth } from '../../context/AuthContext';
import { api, type BillingSummary, type Invoice, type Paged, type Payment, type PlatformSchoolRow } from '../../services/api';
import { formatMoney, parseMoney } from '../../utils/money';
import { formatUtcTimestamp } from '../../utils/utcTime';

const INVOICE_TONE: Record<Invoice['status'], { bg: string; color?: string; label: string }> = {
  DRAFT: { bg: 'var(--chip-bg)', color: 'var(--text)', label: 'Draft' },
  OPEN: { bg: 'var(--blue)', label: 'Open' },
  PAID: { bg: 'var(--green)', label: 'Paid' },
  VOID: { bg: '#6B7280', label: 'Void' },
};
export function InvoiceBadge({ invoice }: { invoice: Pick<Invoice, 'status' | 'overdue'> }) {
  if (invoice.overdue) return <span className="pill" style={{ backgroundColor: 'var(--red)' }}>Overdue</span>;
  const tone = INVOICE_TONE[invoice.status];
  return <span className="pill" style={{ backgroundColor: tone.bg, color: tone.color }}>{tone.label}</span>;
}

/** Billing → Invoices: everything invoiced, what's open or overdue, and new invoices. */
export function InvoicesScreen() {
  const { token, can } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [status, setStatus] = useState(params.get('status') ?? '');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paged<Invoice> | null>(null);
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [schools, setSchools] = useState<PlatformSchoolRow[]>([]);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ schoolId: '', description: '', amount: '', periodStart: '', periodEnd: '', dueOn: '' });
  const [message, setMessage] = useState('');

  const load = useCallback(() => {
    if (!token) return;
    api.invoices(token, { status: status || undefined, page }).then(setData).catch(err => setMessage(err.message));
    api.billingSummary(token).then(setSummary).catch(() => {});
  }, [token, status, page]);
  useEffect(load, [load]);
  useEffect(() => { if (token) api.platformSchools(token, { pageSize: 100 }).then(p => setSchools(p.items)).catch(() => {}); }, [token]);

  const create = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    const amountCents = form.amount.trim() ? parseMoney(form.amount) : undefined;
    if (amountCents === null) { setMessage('Enter an amount like 250.00, or leave it empty to price from the school\'s plan.'); return; }
    try {
      const created = await api.createInvoice(token, {
        schoolId: form.schoolId, description: form.description.trim() || undefined, amountCents,
        periodStart: form.periodStart || undefined, periodEnd: form.periodEnd || undefined, dueOn: form.dueOn || undefined,
      });
      navigate(`/platform/billing/invoices/${created.id}`);
    } catch (err) { setMessage(err instanceof Error ? err.message : 'Could not create the invoice'); }
  };

  return (
    <Screen title="Invoices" subtitle="What schools have been invoiced and what they've paid. Payments are recorded here by hand.">
      {summary && (
        <div className="tile-grid tile-grid-wide">
          <SummaryTile label="Owed on open invoices" value={formatMoney(summary.openCents)} />
          <SummaryTile label={`Overdue (${summary.overdueCount})`} value={formatMoney(summary.overdueCents)} accentColor={summary.overdueCount ? 'var(--red)' : undefined} />
          <SummaryTile label="Received, last 30 days" value={formatMoney(summary.receivedLast30DaysCents)} accentColor="var(--green)" />
        </div>
      )}
      <div className="action-row">
        <label className="field-label" style={{ margin: 0 }}>Show{' '}
          <select className="input" style={{ width: 'auto', display: 'inline-block' }} value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All invoices</option><option value="OVERDUE">Overdue</option><option value="OPEN">Open</option><option value="DRAFT">Drafts</option><option value="PAID">Paid</option><option value="VOID">Void</option>
          </select>
        </label>
        {can('billing:update') && <button type="button" className="btn btn-primary btn-sm" onClick={() => setCreating(v => !v)}>New invoice</button>}
      </div>
      {message && <div className="card" role="status">{message}</div>}
      {creating && (
        <form className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 600 }} onSubmit={create}>
          <p className="form-title" style={{ margin: 0 }}>New invoice (saved as a draft)</p>
          <label className="field-label" style={{ margin: 0 }}>School
            <select className="input" value={form.schoolId} onChange={e => setForm(f => ({ ...f, schoolId: e.target.value }))}><option value="">Choose…</option>{schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
          </label>
          <div className="action-row">
            <label className="field-label" style={{ margin: 0 }}>Period from<input className="input" type="date" value={form.periodStart} onChange={e => setForm(f => ({ ...f, periodStart: e.target.value }))} /></label>
            <label className="field-label" style={{ margin: 0 }}>to<input className="input" type="date" value={form.periodEnd} onChange={e => setForm(f => ({ ...f, periodEnd: e.target.value }))} /></label>
            <label className="field-label" style={{ margin: 0 }}>Due<input className="input" type="date" value={form.dueOn} onChange={e => setForm(f => ({ ...f, dueOn: e.target.value }))} /></label>
          </div>
          <label className="field-label" style={{ margin: 0 }}>Amount in USD (leave empty to price from the school's plan)<input className="input" inputMode="decimal" style={{ maxWidth: 160 }} value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} /></label>
          <label className="field-label" style={{ margin: 0 }}>Description (needed when you enter an amount)<input className="input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></label>
          <div className="action-row"><button type="submit" className="btn btn-primary" disabled={!form.schoolId}>Create draft</button><button type="button" className="btn btn-secondary" onClick={() => setCreating(false)}>Cancel</button></div>
        </form>
      )}
      {!data ? <p className="empty-text">Loading…</p> : (
        <>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Invoice</th><th>School</th><th>Amount</th><th>Paid</th><th>Due</th><th>Status</th></tr></thead>
              <tbody>
                {data.items.map(invoice => (
                  <tr key={invoice.id}>
                    <td><Link to={`/platform/billing/invoices/${invoice.id}`} style={{ fontWeight: 600 }}>{invoice.number}</Link><div className="field-label" style={{ margin: 0 }}>{invoice.description}</div></td>
                    <td>{invoice.schoolName}</td>
                    <td>{formatMoney(invoice.amountCents, invoice.currency)}</td>
                    <td>{formatMoney(invoice.paidCents, invoice.currency)}</td>
                    <td>{invoice.dueOn ?? '—'}</td>
                    <td><InvoiceBadge invoice={invoice} /></td>
                  </tr>
                ))}
                {data.items.length === 0 && <tr><td colSpan={6} className="empty-text">No invoices.</td></tr>}
              </tbody>
            </table>
          </div>
          <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPage={setPage} />
        </>
      )}
    </Screen>
  );
}

/** One invoice: issue it, record payments against it, or void it. */
export function InvoiceDetailScreen() {
  const { invoiceId = '' } = useParams();
  const { token, can } = useAuth();
  const [invoice, setInvoice] = useState<(Invoice & { payments: Payment[] }) | null>(null);
  const [payment, setPayment] = useState({ amount: '', method: 'CHECK', reference: '', receivedOn: '' });
  const [voiding, setVoiding] = useState(false);
  const [message, setMessage] = useState('');
  const load = useCallback(() => { if (token) api.invoice(token, invoiceId).then(setInvoice).catch(err => setMessage(err.message)); }, [token, invoiceId]);
  useEffect(load, [load]);
  if (!invoice) return <Screen title="Invoice">{message ? <div className="card" role="alert">{message}</div> : <p className="empty-text">Loading…</p>}</Screen>;

  const owed = invoice.amountCents - invoice.paidCents;
  const edit = can('billing:update');
  const act = async (action: () => Promise<unknown>, done: string) => {
    try { await action(); setMessage(done); load(); return true; } catch (err) { setMessage(err instanceof Error ? err.message : 'Something went wrong'); return false; }
  };
  const record = (e: FormEvent) => {
    e.preventDefault();
    const amountCents = parseMoney(payment.amount);
    if (!amountCents) { setMessage('Enter the amount received, like 125.00.'); return; }
    act(() => api.recordPayment(token!, invoice.id, { amountCents, method: payment.method, reference: payment.reference || undefined, receivedOn: payment.receivedOn || undefined }), 'Payment recorded.')
      .then(ok => { if (ok) setPayment({ amount: '', method: 'CHECK', reference: '', receivedOn: '' }); });
  };

  return (
    <Screen title={`Invoice ${invoice.number}`} subtitle={`${invoice.schoolName} · ${invoice.description}`}>
      <p style={{ margin: 0 }}><Link to="/platform/billing/invoices">← All invoices</Link></p>
      {message && <div className="card" role="status">{message}</div>}
      <div className="card" style={{ display: 'grid', gap: 6, fontSize: 14 }}>
        <div><InvoiceBadge invoice={invoice} /></div>
        <div><strong>Amount:</strong> {formatMoney(invoice.amountCents, invoice.currency)} · <strong>Paid:</strong> {formatMoney(invoice.paidCents, invoice.currency)}{invoice.status === 'OPEN' && <> · <strong>Still owed:</strong> {formatMoney(owed, invoice.currency)}</>}</div>
        {(invoice.periodStart || invoice.periodEnd) && <div><strong>Period:</strong> {invoice.periodStart ?? '…'} to {invoice.periodEnd ?? '…'}</div>}
        <div><strong>Due:</strong> {invoice.dueOn ?? 'Not set'}</div>
        <div><strong>Created:</strong> {formatUtcTimestamp(invoice.createdAt)}{invoice.issuedAt && <> · <strong>Issued:</strong> {formatUtcTimestamp(invoice.issuedAt)}</>}{invoice.paidAt && <> · <strong>Paid in full:</strong> {formatUtcTimestamp(invoice.paidAt)}</>}</div>
        {invoice.voidReason && <div><strong>Voided:</strong> {invoice.voidReason}</div>}
      </div>
      {edit && (invoice.status === 'DRAFT' || invoice.status === 'OPEN') && (
        <div className="action-row">
          {invoice.status === 'DRAFT' && <button type="button" className="btn btn-primary btn-sm" onClick={() => act(() => api.issueInvoice(token!, invoice.id), 'Invoice issued. Send it to the school, then record payments here as they arrive.')}>Issue invoice</button>}
          {invoice.payments.length === 0 && <button type="button" className="btn btn-secondary btn-sm" onClick={() => setVoiding(true)}>Void</button>}
        </div>
      )}
      {edit && invoice.status === 'OPEN' && (
        <form className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 600 }} onSubmit={record}>
          <p className="form-title" style={{ margin: 0 }}>Record a payment</p>
          <div className="action-row">
            <label className="field-label" style={{ margin: 0 }}>Amount (USD)<input className="input" style={{ width: 130 }} inputMode="decimal" placeholder={(owed / 100).toFixed(2)} value={payment.amount} onChange={e => setPayment(p => ({ ...p, amount: e.target.value }))} /></label>
            <label className="field-label" style={{ margin: 0 }}>Method
              <select className="input" value={payment.method} onChange={e => setPayment(p => ({ ...p, method: e.target.value }))}><option value="CHECK">Check</option><option value="ACH">Bank transfer (ACH)</option><option value="WIRE">Wire</option><option value="CARD">Card</option><option value="OTHER">Other</option></select>
            </label>
            <label className="field-label" style={{ margin: 0 }}>Received<input className="input" type="date" value={payment.receivedOn} onChange={e => setPayment(p => ({ ...p, receivedOn: e.target.value }))} /></label>
          </div>
          <label className="field-label" style={{ margin: 0 }}>Reference (check number, transfer id…)<input className="input" value={payment.reference} onChange={e => setPayment(p => ({ ...p, reference: e.target.value }))} /></label>
          <div><button type="submit" className="btn btn-primary">Record payment</button></div>
        </form>
      )}
      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>Received</th><th>Amount</th><th>Method</th><th>Reference</th><th>Recorded by</th></tr></thead>
          <tbody>
            {invoice.payments.map(p => <tr key={p.id}><td>{p.receivedOn}</td><td>{formatMoney(p.amountCents, invoice.currency)}</td><td>{p.method}</td><td>{p.reference ?? '—'}</td><td>{p.recordedBy ?? '—'}</td></tr>)}
            {invoice.payments.length === 0 && <tr><td colSpan={5} className="empty-text">No payments yet.</td></tr>}
          </tbody>
        </table>
      </div>
      {voiding && (
        <ReasonDialog
          title={`Void invoice ${invoice.number}?`}
          message="A voided invoice stays on record but is no longer owed."
          confirmLabel="Void invoice"
          danger
          onConfirm={async reason => { await api.voidInvoice(token!, invoice.id, reason); setVoiding(false); setMessage('Invoice voided.'); load(); }}
          onClose={() => setVoiding(false)}
        />
      )}
    </Screen>
  );
}
