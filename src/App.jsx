import React, { useState, useEffect } from 'react';
import { Trash2, Plus, RefreshCw, ShoppingCart } from 'lucide-react';
import './index.css';

const App = () => {
    const [products, setProducts] = useState([]);
    const [rate, setRate] = useState(0);
    const [isSyncing, setIsSyncing] = useState(true);
    const [form, setForm] = useState({ name: '', quantity: 1, price: '' });

    // Persistence
    useEffect(() => {
        const saved = localStorage.getItem('carrito-ccs-products');
        if (saved) setProducts(JSON.parse(saved));
        fetchRate();
    }, []);

    useEffect(() => {
        localStorage.setItem('carrito-ccs-products', JSON.stringify(products));
    }, [products]);

    const fetchRate = async () => {
        setIsSyncing(true);
        try {
            // DolarApi as primary source for BCV rate
            const res = await fetch('https://ve.dolarapi.com/v1/dolares/oficial');
            const data = await res.json();
            if (data && data.promedio) {
                setRate(data.promedio);
            } else {
                throw new Error('Fallback logic needed');
            }
        } catch (err) {
            console.error('API Error, using manual fallback', err);
            // Hardcoded fallback or manual input could go here
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

    const totalUSD = products.reduce((acc, p) => acc + (p.priceUSD * p.quantity), 0);
    const totalVES = totalUSD * rate;

    return (
        <>
            <header className="header glass-panel">
                <h1><ShoppingCart style={{ marginRight: 8, verticalAlign: 'middle' }} />Carrito Caracas</h1>
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
                                <div style={{ color: 'var(--accent-gold)', fontWeight: 700 }}>
                                    ${(p.priceUSD * p.quantity).toFixed(2)}
                                </div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                                    Bs. {((p.priceUSD * p.quantity) * rate).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                                </div>
                            </div>
                            <button
                                onClick={() => removeProduct(p.id)}
                                style={{ marginLeft: 16, padding: 8, color: 'var(--danger)' }}
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

            <footer className="totals-footer glass-panel">
                <div>
                    <div className="total-ves">Bs. {totalVES.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div className="total-usd">${totalUSD.toFixed(2)} USD</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Total a pagar</div>
                </div>
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
