import React, { useMemo, useState } from 'react'
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js'

function Step({ idx, current, label }){
  const state = idx < current ? 'done' : idx === current ? 'current' : 'todo'
  return (
    <div className="step">
      <div className={['dot', state].join(' ')}>{state === 'done' ? '✓' : idx + 1}</div>
      <div>
        <div style={{fontWeight:700}}>{label}</div>
        <div className="kicker">{idx === 0 ? 'Scegli la data' : idx === 1 ? 'Seleziona i posti' : 'Pagamento sicuro'}</div>
      </div>
    </div>
  )
}
function Segment({ selected, onClick, children }){
  return <button type="button" onClick={onClick} className={['segment', selected ? 'selected' : ''].join(' ')}>{children}</button>
}

export default function App(){
  const steps = ['Data','Posti','Pagamento']
  const [step, setStep] = useState(0)
  const availableDates = useMemo(() => ([
    { key: '2025-09-12', label: 'Ven 12 Set 2025' },
    { key: '2025-09-13', label: 'Sab 13 Set 2025' },
    { key: '2025-09-14', label: 'Dom 14 Set 2025' },
  ]), [])
  const [selectedDate, setSelectedDate] = useState(null)
  const [qty, setQty] = useState(1)
  const [accepted, setAccepted] = useState(false)
  const [isPaying, setIsPaying] = useState(false)
  const [paid, setPaid] = useState(false)

  const pricePerSeat = 12
  const total = selectedDate ? qty * pricePerSeat : 0

  const canContinueFromDate = !!selectedDate
  const canContinueFromSeats = qty > 0
  const canPay = accepted && canContinueFromSeats && canContinueFromDate && !isPaying

  const onNext = () => setStep(s => Math.min(s + 1, steps.length - 1))
  const onPrev = () => setStep(s => Math.max(s - 1, 0))

  const scrollToPayPal = () => {
    const el = document.getElementById('paypal-buttons')
    if(el){ el.scrollIntoView({ behavior: 'smooth', block: 'start' }); el.classList.add('highlight'); setTimeout(()=>el.classList.remove('highlight'), 1800) }
  }

  async function generateTicketPdf(){
    if(!selectedDate) return
    const { jsPDF } = await import('jspdf')
    const QRMod = await import('qrcode')
    const QRCode = QRMod.default || QRMod
    const orderId = `LL-${Date.now().toString(36)}-${Math.floor(Math.random()*9999)}`
    const showName = 'La Locandiera — Teatro'
    const dateLabel = new Date(selectedDate).toLocaleDateString('it-IT', { weekday:'long', day:'2-digit', month:'long', year:'numeric' })

    const payload = JSON.stringify({ v:1, orderId, show:showName, date:selectedDate, qty, holder:'Trentadue Bit', total })
    const qrDataUrl = await (QRCode.toDataURL ? QRCode.toDataURL(payload, { margin:1, scale:6 }) : QRCode.default.toDataURL(payload, { margin:1, scale:6 }))

    const doc = new jsPDF({ unit:'pt', format:'a4' })
    doc.setFillColor(240, 240, 245); doc.rect(0,0,595.28,120,'F')
    doc.setTextColor(20,20,30); doc.setFontSize(20); doc.text('E‑TICKET', 40, 52)
    doc.setFontSize(14); doc.text('La Locandiera — Trentadue Bit', 40, 80)
    doc.setDrawColor(210,210,220); doc.setLineWidth(1); doc.roundedRect(40,150,515,300,12,12,'S')
    doc.setTextColor(20,20,30); doc.setFontSize(16); doc.text('Dettagli biglietto', 60, 180)

    doc.setFontSize(12); doc.setTextColor(90,90,100); doc.text('Spettacolo', 60, 210)
    doc.setTextColor(20,20,30); doc.text(showName, 180, 210)

    doc.setTextColor(90,90,100); doc.text('Data', 60, 235)
    doc.setTextColor(20,20,30); doc.text(dateLabel, 180, 235)

    doc.setTextColor(90,90,100); doc.text('Posti', 60, 260)
    doc.setTextColor(20,20,30); doc.text(String(qty), 180, 260)

    doc.setTextColor(90,90,100); doc.text('Totale', 60, 285)
    doc.setTextColor(20,20,30); doc.text(`€ ${total.toFixed(2)}`, 180, 285)

    doc.setTextColor(90,90,100); doc.text('Ordine', 60, 310)
    doc.setTextColor(20,20,30); doc.text(orderId, 180, 310)

    doc.addImage(qrDataUrl, 'PNG', 420, 190, 110, 110)
    doc.setFontSize(10); doc.setTextColor(120,120,130); doc.text("Mostra questo QR all'ingresso.", 420, 315)
    doc.setFontSize(9); doc.setTextColor(130,130,140); doc.text('Emesso da Trentadue Bit • Uso personale • Non trasferibile senza autorizzazione', 40, 480)

    doc.save(`eticket_${orderId}.pdf`)
  }

  return (
    <PayPalScriptProvider options={{
      clientId: import.meta.env.VITE_PAYPAL_CLIENT_ID || 'sb',
      currency: 'EUR',
      intent: 'CAPTURE',
      components: 'buttons',
    }}>
      <div className="container">
        <div className="header">
          <div className="eyebrow">Acquisto biglietti</div>
          <h1>La Locandiera — Teatro</h1>
        </div>

        <div className="card" style={{marginTop:16}}>
          <div className="content">
            <div className="grid grid-3">
              <Step idx={0} current={step} label="Data" />
              <Step idx={1} current={step} label="Posti" />
              <Step idx={2} current={step} label="Pagamento" />
            </div>
          </div>
        </div>

        {step === 0 && (
          <div className="card">
            <div className="content">
              <div style={{fontWeight:700, fontSize:18}}>Seleziona la data dello spettacolo</div>
              <div className="kicker">Date disponibili: 12–13–14 Settembre 2025</div>
              <div style={{height:10}} />
              <div className="segment-row">
                {availableDates.map(d => (
                  <Segment key={d.key} selected={selectedDate === d.key} onClick={()=>setSelectedDate(d.key)}>{d.label}</Segment>
                ))}
              </div>
              <div style={{height:10}} />
              <div className="actions">
                <button className="btn secondary" disabled>◀ Indietro</button>
                <button className="btn" onClick={() => setStep(1)} disabled={!canContinueFromDate}>Prosegui ▶</button>
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="card">
            <div className="content">
              <div style={{fontWeight:700, fontSize:18}}>Seleziona il numero di posti</div>
              <div className="kicker">Quanti biglietti desideri acquistare?</div>
              <div style={{height:10}} />
              <div className="row">
                <div className="label">Posti</div>
                <div className="qty">
                  <button className="btn-ghost" onClick={()=>setQty(q => Math.max(1, q-1))}>−</button>
                  <input type="number" min="1" max="10" value={qty} onChange={e=>{
                    const v = Number(e.target.value); if(!Number.isNaN(v)) setQty(Math.min(10, Math.max(1, v)))
                  }}/>
                  <button className="btn-ghost" onClick={()=>setQty(q => Math.min(10, q+1))}>+</button>
                </div>
              </div>
              <div style={{height:10}} />
              <div className="summary">
                <div><div className="muted">Riepilogo</div><div>{qty} × € {pricePerSeat.toFixed(2)}</div></div>
                <div style={{textAlign:'right'}}><div className="muted">Totale</div><div className="total">€ {total.toFixed(2)}</div></div>
              </div>
              <div style={{height:10}} />
              <div className="actions">
                <button className="btn secondary" onClick={() => setStep(0)}>◀ Indietro</button>
                <button className="btn" onClick={() => setStep(2)} disabled={!canContinueFromSeats}>Prosegui ▶</button>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="card">
            <div className="content">
              <div style={{fontWeight:700, fontSize:18}}>Pagamento</div>
              <div className="kicker">Collegato all'account PayPal <strong>Trentadue Bit</strong></div>
              <div style={{height:10}} />
              <label style={{display:'flex', gap:10, alignItems:'center'}}>
                <input type="checkbox" checked={accepted} onChange={e=>setAccepted(e.target.checked)} />
                <span>Accetto i <u>termini e condizioni</u> e l'informativa privacy.</span>
              </label>
              <div style={{height:10}} />
              <div id="paypal-buttons">
                <PayPalButtons
                  style={{ layout: 'horizontal', shape: 'rect', label: 'pay' }}
                  disabled={!canPay}
                  createOrder={(data, actions) => {
                    setIsPaying(true);
                    return actions.order.create({
                      purchase_units: [{
                        amount: { currency_code: 'EUR', value: total.toFixed(2) },
                        description: `Biglietti teatro — ${qty} posti — ${selectedDate ?? 'data non selezionata'}`,
                      }],
                      application_context: { brand_name: 'Trentadue Bit', user_action: 'PAY_NOW' },
                    });
                  }}
                  onApprove={async (data, actions) => {
                    try {
                      await actions.order?.capture();
                      setIsPaying(false);
                      setPaid(true);
                    } catch (e) {
                      setIsPaying(false);
                      alert('Problema durante la conferma del pagamento.');
                    }
                  }}
                  onCancel={() => setIsPaying(false)}
                  onError={(err) => { console.error(err); setIsPaying(false); alert('Errore PayPal. Riprova.'); }}
                />
              </div>
              <div style={{height:10}} />
              <div className="actions">
                <button className="btn secondary" onClick={() => setStep(1)}>◀ Indietro</button>
                {paid ? (
                  <button className="btn" onClick={generateTicketPdf}>Scarica e‑ticket (PDF)</button>
                ) : (
                  <button className="btn" onClick={scrollToPayPal}>Vai al pagamento</button>
                )}
              </div>
              <div style={{height:8}} />
              <div className="note">Dopo l'approvazione del pagamento, potrai scaricare l'e‑ticket con QR.</div>
            </div>
          </div>
        )}

        <div className="sticky">
          <div className="card">
            <div className="content" style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
              <div>
                <div style={{fontWeight:700}}>Riepilogo ordine</div>
                <div className="muted">{selectedDate ? new Date(selectedDate).toLocaleDateString('it-IT', { weekday:'long', day:'2-digit', month:'long', year:'numeric' }) : 'Nessuna data selezionata'} • {qty} posti</div>
              </div>
              <div style={{textAlign:'right'}}>
                <div className="muted">Totale</div>
                <div className="total">€ {total.toFixed(2)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PayPalScriptProvider>
  )
}
