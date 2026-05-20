'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { ThemeToggle } from '@/lib/ThemeToggle';
import Navbar from '@/lib/Navbar';
import { redirectToPayment } from '@/lib/usePayMongo';

type Product = {
  id: string;
  name: string;
  description: string;
  category: 'rackets' | 'balls' | 'apparel' | 'accessories';
  price: number | null;
  rental_price: number | null;
  stock: number;
  is_for_sale: boolean;
  is_for_rent: boolean;
  image_url?: string;
};

type CartItem = {
  product: Product;
  qty: number;
  type: 'purchase' | 'rental';
};

export default function ShopPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>(() => {
    // Restore cart from localStorage on mount (only store id/qty/type to keep it lean)
    try {
      const saved = localStorage.getItem('picklverse_shop_cart');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [activeCategory, setActiveCategory] = useState<'all' | 'rackets' | 'balls' | 'apparel' | 'accessories'>('all');
  const [activeType, setActiveType] = useState<'all' | 'buy' | 'rent'>('all');
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [error, setError] = useState('');
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);

  // Persist cart to localStorage whenever it changes
  useEffect(() => {
    try { localStorage.setItem('picklverse_shop_cart', JSON.stringify(cart)); } catch {}
  }, [cart]);

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = '/login'; return; }
      setUser({ id: user.id, email: user.email });
      const { data } = await supabase.from('products').select('*').eq('is_available', true).order('category');
      setProducts(data || []);
      setLoading(false);
    };
    fetchData();

    // Realtime: update product stock live
    const supabaseRt = createClient();
    const refreshProducts = async () => {
      const { data } = await supabaseRt.from('products').select('*').eq('is_available', true).order('category');
      if (data) setProducts(data);
    };
    const channel = supabaseRt.channel('shop-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, refreshProducts)
      .subscribe();
    return () => { supabaseRt.removeChannel(channel); };
  }, []);

  const getCartItem = (id: string, type: 'purchase' | 'rental') =>
    cart.find(c => c.product.id === id && c.type === type);

  const updateCart = (product: Product, type: 'purchase' | 'rental', delta: number) => {
    setCart(prev => {
      const existing = prev.find(c => c.product.id === product.id && c.type === type);
      if (!existing && delta > 0) return [...prev, { product, qty: 1, type }];
      return prev
        .map(c => c.product.id === product.id && c.type === type ? { ...c, qty: Math.max(0, c.qty + delta) } : c)
        .filter(c => c.qty > 0);
    });
  };

  const cartTotal = cart.reduce((sum, c) => {
    const price = c.type === 'rental' ? (c.product.rental_price || 0) : (c.product.price || 0);
    return sum + price * c.qty;
  }, 0);
  const cartCount = cart.reduce((sum, c) => sum + c.qty, 0);

  const handleOrder = async () => {
    if (cart.length === 0 || !user) return;
    setPlacing(true); setError('');
    try {
      const supabase = createClient();

      // 1 — Insert all orders and get their IDs back
      const orders = cart.map(c => ({
        user_id: user.id,
        product_id: c.product.id,
        type: c.type,
        quantity: c.qty,
        total_price: ((c.type === 'rental' ? c.product.rental_price : c.product.price) || 0) * c.qty,
        status: 'pending',
      }));
      const { data: orderData, error: orderError } = await supabase
        .from('shop_orders')
        .insert(orders)
        .select();
      if (orderError) throw orderError;

      // 2 — Decrement stock for purchase items only (not rentals)
      // Auto-disable the product if stock reaches 0
      const purchaseItems = cart.filter(c => c.type === 'purchase');
      await Promise.all(purchaseItems.map(async c => {
        const newStock = Math.max(0, c.product.stock - c.qty);
        await supabase
          .from('products')
          .update({ stock: newStock, ...(newStock === 0 ? { is_available: false } : {}) })
          .eq('id', c.product.id);
      }));

      // 3 — Redirect to PayMongo using first order ID as reference
      // We create one combined payment for the whole cart
      const firstOrderId = orderData[0]?.id;
      const itemNames = cart.map(c => `${c.product.name} (${c.type})`).join(', ');
      try { localStorage.removeItem('picklverse_shop_cart'); } catch {}
      await redirectToPayment({
        amount: cartTotal,
        description: `Picklverse Shop — ${itemNames}`,
        referenceId: firstOrderId,
        type: 'shop',
      });

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Order failed. Please try again.');
      setPlacing(false);
    }
  };

  const categories = ['all', 'rackets', 'balls', 'apparel', 'accessories'] as const;

  const categoryEmoji: Record<string, string> = {
    rackets: '🏓', balls: '🟡', apparel: '👕', accessories: '🎒',
  };

  const filtered = products.filter(p => {
    const catMatch = activeCategory === 'all' || p.category === activeCategory;
    const typeMatch = activeType === 'all' || (activeType === 'buy' ? p.is_for_sale : p.is_for_rent);
    return catMatch && typeMatch;
  });

  if (loading) return (
    <div style={{ fontFamily: "'Barlow Condensed',sans-serif", background: 'var(--bg-primary)', color: 'var(--text-primary)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, border: '2px solid var(--border)', borderTop: '2px solid var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
        <div style={{ fontFamily: "'Barlow',sans-serif", color: 'var(--text-muted)', fontSize: 14 }}>Loading shop...</div>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (orderSuccess) return (
    <div style={{ fontFamily: "'Barlow Condensed',sans-serif", background: 'var(--bg-primary)', color: 'var(--text-primary)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <div style={{ width: 72, height: 72, background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: 32 }}>🛍️</div>
        <h2 style={{ fontSize: 36, fontWeight: 800, textTransform: 'uppercase', marginBottom: 12 }}>Order placed!</h2>
        <p style={{ fontFamily: "'Barlow',sans-serif", color: 'var(--text-muted)', fontSize: 15, marginBottom: 8 }}>
          Your items are being prepared. Pick them up at the counter before your session.
        </p>
        <p style={{ fontFamily: "'Barlow',sans-serif", color: 'var(--accent)', fontSize: 18, fontWeight: 700, marginBottom: 32 }}>
          Total: ₱{cartTotal.toLocaleString()}
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <a href="/dashboard" style={{ background: 'var(--accent)', color: '#fff', padding: '12px 24px', borderRadius: 8, fontFamily: "'Barlow Condensed',sans-serif", fontSize: 14, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', textDecoration: 'none' }}>Go to dashboard</a>
          <button onClick={() => setOrderSuccess(false)} style={{ background: 'transparent', border: '1px solid var(--border-hover)', color: 'var(--text-secondary)', padding: '12px 24px', borderRadius: 8, fontFamily: "'Barlow Condensed',sans-serif", fontSize: 14, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer' }}>Shop more</button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ fontFamily: "'Barlow Condensed',sans-serif", background: 'var(--bg-primary)', color: 'var(--text-primary)', minHeight: '100vh' }}>
      <style>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}

        .filter-pill{padding:7px 16px;border-radius:20px;font-size:12px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;border:1px solid var(--border);cursor:pointer;transition:all .2s;background:transparent;color:var(--text-muted);}
        .filter-pill.active{background:var(--accent);color:#fff;border-color:var(--accent);}
        .filter-pill:hover:not(.active){border-color:var(--border-hover);color:var(--text-secondary);}

        .type-toggle{display:flex;background:var(--card-bg);border:1px solid var(--border);border-radius:10px;padding:4px;}
        .type-btn{flex:1;padding:8px;border:none;border-radius:8px;background:transparent;color:var(--text-muted);font-family:'Barlow Condensed',sans-serif;font-size:13px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;cursor:pointer;transition:all .2s;}
        .type-btn.active{background:var(--accent);color:#fff;}

        .product-card{background:var(--card-bg);border:1px solid var(--border);border-radius:12px;overflow:hidden;transition:all .25s;animation:fadeUp .5s ease both;}
        .product-card:hover{border-color:var(--accent);transform:translateY(-3px);}

        .product-img{height:140px;display:flex;align-items:center;justify-content:center;font-size:48px;background:var(--bg-hover);position:relative;overflow:hidden;}

        .badge{display:inline-block;font-size:10px;font-weight:700;padding:2px 8px;border-radius:4px;letter-spacing:.04em;text-transform:uppercase;}
        .badge-rent{background:rgba(56,138,221,.15);color:#85B7EB;}
        .badge-buy{background:var(--accent-bg);color:var(--accent-light);}
        .badge-hot{background:rgba(226,75,74,.1);color:#f09595;}
        .badge-low{background:rgba(186,117,23,.15);color:#EF9F27;}
        .badge-out{background:var(--bg-hover);color:var(--text-muted);}

        .stock-bar-wrap{height:4px;background:var(--bg-hover);border-radius:2px;overflow:hidden;margin-top:4px;}
        .stock-bar{height:100%;border-radius:2px;transition:width .3s;}

        .action-btn{flex:1;padding:8px 6px;border-radius:8px;border:none;font-family:'Barlow Condensed',sans-serif;font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;cursor:pointer;transition:all .2s;display:flex;align-items:center;justify-content:center;gap:4px;}
        .action-buy{background:var(--accent);color:#fff;}
        .action-buy:hover{background:var(--accent-hover);}
        .action-rent{background:rgba(56,138,221,.15);color:#85B7EB;border:1px solid rgba(56,138,221,.3);}
        .action-rent:hover{background:rgba(56,138,221,.25);}
        .action-disabled{background:var(--bg-hover);color:var(--text-hint);cursor:not-allowed;}

        .qty-wrap{display:flex;align-items:center;gap:6px;}
        .qty-btn{width:26px;height:26px;border-radius:50%;border:1px solid var(--border-hover);background:transparent;color:var(--text-primary);cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;transition:all .15s;}
        .qty-btn:hover{border-color:var(--accent);background:var(--accent-bg);}

        .cart-item{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border);}
        .cart-item:last-child{border-bottom:none;}

        .checkout-btn{width:100%;height:50px;background:var(--accent);color:#fff;border:none;border-radius:10px;font-family:'Barlow Condensed',sans-serif;font-size:16px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;transition:all .2s;display:flex;align-items:center;justify-content:center;gap:8px;}
        .checkout-btn:hover:not(:disabled){background:var(--accent-hover);transform:translateY(-2px);}
        .checkout-btn:disabled{background:var(--bg-hover);color:var(--text-muted);cursor:not-allowed;}

        .section-label{font-size:11px;color:var(--accent);letter-spacing:.1em;text-transform:uppercase;font-family:'Barlow',sans-serif;margin-bottom:8px;}
        .rental-note{background:rgba(56,138,221,.08);border:1px solid rgba(56,138,221,.2);border-radius:8px;padding:10px 14px;font-family:'Barlow',sans-serif;font-size:12px;color:#85B7EB;margin-bottom:14px;line-height:1.5;}

        @media(max-width:768px){.main-grid{grid-template-columns:1fr !important;}}
      `}</style>

      {/* NAV */}
      <Navbar activeLink="/shop" />

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>

        {/* HEADER */}
        <div style={{ marginBottom: 32, animation: 'fadeUp .5s ease both' }}>
          <div style={{ fontSize: 11, fontFamily: "'Barlow',sans-serif", color: 'var(--accent)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Equipment shop</div>
          <h1 style={{ fontSize: 'clamp(32px,5vw,52px)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '-0.01em', lineHeight: 1, marginBottom: 8 }}>
            Gear up. <span style={{ color: 'var(--accent)' }}>Play better.</span>
          </h1>
          <p style={{ fontFamily: "'Barlow',sans-serif", fontSize: 15, color: 'var(--text-muted)' }}>Buy gear to keep or rent for your session today.</p>
        </div>

        {/* FILTERS */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center', animation: 'fadeUp .5s .1s ease both' }}>
          {/* Buy / Rent toggle */}
          <div className="type-toggle" style={{ minWidth: 200 }}>
            {(['all', 'buy', 'rent'] as const).map(t => (
              <button key={t} className={`type-btn ${activeType === t ? 'active' : ''}`} onClick={() => setActiveType(t)}>
                {t === 'all' ? 'All' : t === 'buy' ? 'Buy' : 'Rent'}
              </button>
            ))}
          </div>

          {/* Category filters */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {categories.map(cat => (
              <button key={cat} className={`filter-pill ${activeCategory === cat ? 'active' : ''}`} onClick={() => setActiveCategory(cat)}>
                {cat !== 'all' && <span style={{ fontSize: 13 }}>{categoryEmoji[cat]}</span>}
                {cat === 'all' ? 'All categories' : cat}
              </button>
            ))}
          </div>
        </div>

        {/* MAIN GRID */}
        <div className="main-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24, alignItems: 'start' }}>

          {/* PRODUCTS */}
          <div>
            {filtered.length === 0 ? (
              <div style={{ fontFamily: "'Barlow',sans-serif", color: 'var(--text-muted)', fontSize: 14, padding: '40px 0', textAlign: 'center' }}>
                No products found for this filter.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(210px,1fr))', gap: 14 }}>
                {filtered.map((product, i) => {
                  const purchaseQty = getCartItem(product.id, 'purchase')?.qty || 0;
                  const rentalQty = getCartItem(product.id, 'rental')?.qty || 0;
                  const isOutOfStock = product.stock === 0;
                  const isLowStock = product.stock > 0 && product.stock <= 5;
                  const stockPct = Math.min(100, (product.stock / 20) * 100);

                  return (
                    <div key={product.id} className="product-card" style={{ animationDelay: `${i * 0.06}s` }}>
                      {/* Image */}
                      <div className="product-img">
                        {product.image_url ? (
                          <Image src={product.image_url} alt={product.name} fill sizes="(max-width: 768px) 100vw, 300px" style={{ objectFit:'cover' }} />
                        ) : (
                          <span>{categoryEmoji[product.category]}</span>
                        )}
                        {/* Badges */}
                        <div style={{ position: 'absolute', top: 8, left: 8, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {product.is_for_rent && <span className="badge badge-rent">For rent</span>}
                          {product.is_for_sale && <span className="badge badge-buy">For sale</span>}
                          {isOutOfStock && <span className="badge badge-out">Out of stock</span>}
                          {isLowStock && !isOutOfStock && <span className="badge badge-low">Low stock</span>}
                        </div>
                      </div>

                      {/* Info */}
                      <div style={{ padding: 14 }}>
                        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{product.name}</div>
                        <div style={{ fontFamily: "'Barlow',sans-serif", fontSize: 12, color: 'var(--text-muted)', marginBottom: 10, lineHeight: 1.4 }}>
                          {product.description || product.category}
                        </div>

                        {/* Stock indicator */}
                        {(product.is_for_sale || product.is_for_rent) && (
                          <div style={{ marginBottom: 12 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: "'Barlow',sans-serif", fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>
                              <span>Stock</span>
                              <span style={{ color: isOutOfStock ? 'var(--error-text)' : isLowStock ? 'var(--warning-text)' : 'var(--text-muted)' }}>
                                {isOutOfStock ? 'Out of stock' : `${product.stock} left`}
                              </span>
                            </div>
                            <div className="stock-bar-wrap">
                              <div className="stock-bar" style={{
                                width: `${stockPct}%`,
                                background: isOutOfStock ? 'var(--error-text)' : isLowStock ? 'var(--warning-text)' : 'var(--accent)',
                              }} />
                            </div>
                          </div>
                        )}

                        {/* Pricing */}
                        <div style={{ marginBottom: 12 }}>
                          {product.is_for_sale && product.price && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                              <span style={{ fontFamily: "'Barlow',sans-serif", fontSize: 12, color: 'var(--text-muted)' }}>Buy price</span>
                              <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--accent)' }}>₱{product.price.toLocaleString()}</span>
                            </div>
                          )}
                          {product.is_for_rent && product.rental_price && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontFamily: "'Barlow',sans-serif", fontSize: 12, color: 'var(--text-muted)' }}>Rent / session</span>
                              <span style={{ fontSize: 15, fontWeight: 800, color: '#85B7EB' }}>₱{product.rental_price.toLocaleString()}</span>
                            </div>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {/* Buy button */}
                          {product.is_for_sale && product.price && (
                            purchaseQty > 0 ? (
                              <div className="qty-wrap" style={{ justifyContent: 'space-between' }}>
                                <span style={{ fontFamily: "'Barlow',sans-serif", fontSize: 12, color: 'var(--text-muted)' }}>In cart (buy)</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <button className="qty-btn" onClick={() => updateCart(product, 'purchase', -1)}>−</button>
                                  <span style={{ fontSize: 14, fontWeight: 700, minWidth: 20, textAlign: 'center' }}>{purchaseQty}</span>
                                  <button className="qty-btn" onClick={() => updateCart(product, 'purchase', 1)} disabled={isOutOfStock}>+</button>
                                </div>
                              </div>
                            ) : (
                              <button className={`action-btn ${isOutOfStock ? 'action-disabled' : 'action-buy'}`} disabled={isOutOfStock} onClick={() => !isOutOfStock && updateCart(product, 'purchase', 1)}>
                                <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M1 1h2l1.5 6h6l1-4H4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="5.5" cy="11" r="1" fill="currentColor"/><circle cx="10" cy="11" r="1" fill="currentColor"/></svg>
                                {isOutOfStock ? 'Out of stock' : 'Add to cart'}
                              </button>
                            )
                          )}

                          {/* Rent button */}
                          {product.is_for_rent && product.rental_price && (
                            rentalQty > 0 ? (
                              <div className="qty-wrap" style={{ justifyContent: 'space-between' }}>
                                <span style={{ fontFamily: "'Barlow',sans-serif", fontSize: 12, color: '#85B7EB' }}>In cart (rent)</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <button className="qty-btn" onClick={() => updateCart(product, 'rental', -1)}>−</button>
                                  <span style={{ fontSize: 14, fontWeight: 700, minWidth: 20, textAlign: 'center' }}>{rentalQty}</span>
                                  <button className="qty-btn" onClick={() => updateCart(product, 'rental', 1)}>+</button>
                                </div>
                              </div>
                            ) : (
                              <button className="action-btn action-rent" onClick={() => updateCart(product, 'rental', 1)}>
                                <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M6.5 1v5l3 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" strokeWidth="1.2"/></svg>
                                Rent for session
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* CART SIDEBAR */}
          <div style={{ position: 'sticky', top: 76 }}>
            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, animation: 'fadeUp .5s .2s ease both' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ fontSize: 16, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Cart</div>
                {cartCount > 0 && (
                  <div style={{ background: 'var(--accent)', color: '#fff', width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>{cartCount}</div>
                )}
              </div>

              {cart.length === 0 ? (
                <div style={{ fontFamily: "'Barlow',sans-serif", fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '24px 0' }}>
                  Your cart is empty — add some items!
                </div>
              ) : (
                <>
                  {/* Rental note */}
                  {cart.some(c => c.type === 'rental') && (
                    <div className="rental-note">
                      Rentals are tied to your active booking. Equipment must be returned after your session ends.
                    </div>
                  )}

                  {/* Cart items */}
                  <div style={{ marginBottom: 16 }}>
                    {cart.map(c => {
                      const price = c.type === 'rental' ? c.product.rental_price : c.product.price;
                      return (
                        <div key={`${c.product.id}-${c.type}`} className="cart-item">
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>{c.product.name}</div>
                            <div style={{ display: 'flex', gap: 6, marginTop: 3 }}>
                              <span className={`badge ${c.type === 'rental' ? 'badge-rent' : 'badge-buy'}`}>{c.type === 'rental' ? 'Rent' : 'Buy'}</span>
                              <span style={{ fontFamily: "'Barlow',sans-serif", fontSize: 11, color: 'var(--text-muted)' }}>x{c.qty} · ₱{price?.toLocaleString()}</span>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: c.type === 'rental' ? '#85B7EB' : 'var(--accent)' }}>
                              ₱{((price || 0) * c.qty).toLocaleString()}
                            </span>
                            <button className="qty-btn" onClick={() => updateCart(c.product, c.type, -1)} style={{ width: 22, height: 22, fontSize: 14 }}>−</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Total */}
                  <div style={{ background: 'var(--bg-primary)', borderRadius: 8, padding: 12, marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: "'Barlow',sans-serif", fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>
                      <span>Items ({cartCount})</span>
                      <span>₱{cartTotal.toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 800, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                      <span>Total</span>
                      <span style={{ color: 'var(--accent)' }}>₱{cartTotal.toLocaleString()}</span>
                    </div>
                  </div>

                  {error && (
                    <div style={{ background: 'var(--error-bg)', border: '1px solid var(--error-border)', borderRadius: 8, padding: '10px 14px', fontFamily: "'Barlow',sans-serif", fontSize: 13, color: 'var(--error-text)', marginBottom: 12 }}>{error}</div>
                  )}

                  <button className="checkout-btn" onClick={handleOrder} disabled={placing}>
                    {placing ? (
                      <><div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,.3)', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />Processing...</>
                    ) : (
                      <>Checkout · ₱{cartTotal.toLocaleString()} <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg></>
                    )}
                  </button>
                  <div style={{ fontFamily: "'Barlow',sans-serif", fontSize: 11, color: 'var(--text-hint)', textAlign: 'center', marginTop: 8 }}>
                    Payment via GCash, Maya or card · Powered by PayMongo
                  </div>
                </>
              )}
            </div>

            {/* Legend */}
            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, marginTop: 12, animation: 'fadeUp .5s .3s ease both' }}>
              <div className="section-label">Legend</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { badge: 'badge-buy', label: 'For sale — yours to keep' },
                  { badge: 'badge-rent', label: 'For rent — return after session' },
                  { badge: 'badge-low', label: 'Low stock — only a few left' },
                  { badge: 'badge-out', label: 'Out of stock — unavailable' },
                ].map(l => (
                  <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className={`badge ${l.badge}`}>{l.badge.replace('badge-', '')}</span>
                    <span style={{ fontFamily: "'Barlow',sans-serif", fontSize: 12, color: 'var(--text-muted)' }}>{l.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}