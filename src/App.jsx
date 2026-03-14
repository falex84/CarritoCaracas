import React, { useState, useEffect } from 'react';
import { Trash2, Plus, RefreshCw, ShoppingCart, FileText, Eraser, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import './index.css';

const App = () => {
    const [products, setProducts] = useState([]);
    const [rate, setRate] = useState(0);
    const [isSyncing, setIsSyncing] = useState(true);
    const [form, setForm] = useState({ name: '', quantity: 1, price: '' });
    const [installPrompt, setInstallPrompt] = useState(null);

    // Persistence
    useEffect(() => {
        const saved = localStorage.getItem('carrito-ccs-products');
        if (saved) setProducts(JSON.parse(saved));
        fetchRate();

        // Listen for PWA install prompt
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            setInstallPrompt(e);
        });
    }, []);

    const handleInstall = async () => {
        if (!installPrompt) return;
        installPrompt.prompt();
        const { outcome } = await installPrompt.userChoice;
        if (outcome === 'accepted') {
            setInstallPrompt(null);
        }
    };

    useEffect(() => {
        localStorage.setItem('carrito-ccs-products', JSON.stringify(products));
    }, [products]);

    const fetchRate = async () => {
        setIsSyncing(true);
        try {
            const res = await fetch('https://ve.dolarapi.com/v1/dolares/oficial');
            const data = await res.json();
            if (data && data.promedio) {
                setRate(data.promedio);
            } else {
                throw new Error('Fallback logic needed');
            }
        } catch (err) {
            console.error('API Error, using manual fallback', err);
            const manual = prompt('Error sincronizando BCV. Ingrese tasa manual:', '60.00');
            setRate(parseFloat(manual) || 60);
        } finally {
            setIsSyncing(false);
        }
    };

    const addProduct = (e) => {
        e.preventDefault();
        if (!form.name || !form.price) return;

        const newProduct = {
            id: Date.now().toString(),
            name: form.name,
            quantity: parseFloat(form.quantity),
            priceUSD: parseFloat(form.price)
        };

        setProducts([...products, newProduct]);
        setForm({ name: '', quantity: 1, price: '' });
    };

    const removeProduct = (id) => {
        setProducts(products.filter(p => p.id !== id));
    };

    const clearData = () => {
        if (window.confirm('¿Está seguro de que desea borrar toda la lista?')) {
            setProducts([]);
        }
    };

    const exportPDF = () => {
        if (products.length === 0) {
            alert('No hay productos para exportar.');
            return;
        }

        const doc = new jsPDF();
        const now = new Date();
        const dateStr = now.toLocaleDateString('es-VE') + ' ' + now.toLocaleTimeString('es-VE');

        // Header
        doc.setFontSize(18);
        doc.setTextColor(5, 150, 105); // #059669
        doc.text('Carrito Caracas - Reporte de Mercado', 14, 22);

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Fecha: ${dateStr}`, 14, 30);
        doc.text(`Tasa BCV: ${rate.toFixed(2)} Bs/$`, 14, 35);

        // Table
        const tableData = products.map(p => [
            p.name,
            p.quantity.toString(),
            `$${p.priceUSD.toFixed(2)}`,
            `$${(p.priceUSD * p.quantity).toFixed(2)}`,
            `Bs. ${((p.priceUSD * p.quantity) * rate).toLocaleString('es-VE', { minimumFractionDigits: 2 })}`
        ]);

        autoTable(doc, {
            startY: 45,
            head: [['Producto', 'Cant.', 'Precio Unit.', 'Total USD', 'Total Bs.']],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [5, 150, 105] },
        });

        const finalY = doc.lastAutoTable.finalY || 45;
        const totalUSD = products.reduce((acc, p) => acc + (p.priceUSD * p.quantity), 0);
        const totalVES = totalUSD * rate;

        // Totals area
        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.text(`TOTAL USD: $${totalUSD.toFixed(2)}`, 14, finalY + 15);
        doc.text(`TOTAL BS: Bs. ${totalVES.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`, 14, finalY + 22);

        doc.save(`carrito-ccs-${now.getTime()}.pdf`);
    };

    const totalUSD = products.reduce((acc, p) => acc + (p.priceUSD * p.quantity), 0);
    const totalVES = totalUSD * rate;

    return (
        <>
            <header className="header glass-panel">
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
                    {installPrompt && (
                        <button
                            onClick={handleInstall}
                            title="Instalar Aplicación"
                            style={{ position: 'absolute', left: 0, padding: '6px 10px', border: '1px solid var(--accent-color)', background: 'var(--panel-bg)', color: 'var(--accent-color)', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: 4 }}
                        >
                            <Download size={14} /> Instalar
                        </button>
                    )}
                    <h1><ShoppingCart style={{ marginRight: 8, verticalAlign: 'middle' }} />Carrito Caracas</h1>
                    <button
                        onClick={clearData}
                        title="Borrar todo"
                        style={{ position: 'absolute', right: 0, padding: 8, border: 'none', background: 'transparent', color: 'var(--danger)' }}
                    >
                        <Eraser size={20} />
                    </button>
                </div>
                <div className={`rate-badge ${isSyncing ? 'syncing' : 'synced'}`}>
                    {isSyncing ? <RefreshCw className="spin" size={14} /> : <div className="dot" />}
                    Tasa BCV: <strong>{rate.toFixed(2)} Bs/$</strong>
                </div>
            </header>

            <main className="container">
                <form className="product-form" onSubmit={addProduct}>
                    <input
                        className="form-name"
                        placeholder="Producto (ej. Harina)"
                        value={form.name}
                        onChange={e => setForm({ ...form, name: e.target.value })}
                    />
                    <input
                        type="number"
                        placeholder="Cant."
                        step="0.1"
                        value={form.quantity}
                        onChange={e => setForm({ ...form, quantity: e.target.value })}
                    />
                    <input
                        type="number"
                        placeholder="Precio $"
                        step="0.01"
                        value={form.price}
                        onChange={e => setForm({ ...form, price: e.target.value })}
                    />
                    <button type="submit" className="primary"><Plus size={20} /></button>
                </form>

                <div className="product-list">
                    {products.map(p => (
                        <div key={p.id} className="product-item glass-panel">
                            <div className="product-info">
                                <strong>{p.name}</strong>
                                <span>{p.quantity} x ${p.priceUSD.toFixed(2)}</span>
                            </div>
                            <div className="product-price-total">
                                <div style={{ color: 'var(--accent-color)', fontWeight: 700 }}>
                                    ${(p.priceUSD * p.quantity).toFixed(2)}
                                </div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                                    Bs. {((p.priceUSD * p.quantity) * rate).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                                </div>
                            </div>
                            <button
                                onClick={() => removeProduct(p.id)}
                                style={{ marginLeft: 16, padding: 8, color: 'var(--danger)', border: 'none', background: 'transparent' }}
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    ))}
                    {products.length === 0 && (
                        <div style={{ textAlign: 'center', color: 'var(--text-dim)', marginTop: 40 }}>
                            No hay productos en la lista.
                        </div>
                    )}
                </div>
            </main>

            <footer className="totals-footer glass-panel" style={{ backgroundColor: 'var(--panel-bg)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                    <div>
                        <div className="total-ves">Bs. {totalVES.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div className="total-usd" style={{ color: 'var(--accent-color)' }}>${totalUSD.toFixed(2)} USD</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Total a pagar</div>
                    </div>
                </div>
                <button
                    className="primary"
                    onClick={exportPDF}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                >
                    <FileText size={18} /> Generar Reporte PDF
                </button>
            </footer>

            <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from {transform: rotate(0deg)} to {transform: rotate(360deg)} }
        .dot { width: 8px; height: 8px; background: var(--success); border-radius: 50%; box-shadow: 0 0 8px var(--success); }
      `}</style>
        </>
    );
};

export default App;
