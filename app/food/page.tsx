'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { ThemeToggle } from '@/lib/ThemeToggle';
import { redirectToPayment } from '@/lib/usePayMongo';
import Navbar from '@/lib/Navbar';

type MenuItem = {
  id: string;
  name: string;
  description: string;
  category: 'snacks' | 'drinks' | 'meals';
  price: number;
  is_available: boolean;
  stock?: number | null;
  image_url?: string;
};

type CartItem = {
  item: MenuItem;
  qty: number;
};

type Booking = {
  id: string;
  courts?: { name: string };
  start_time: string;
};

export default function FoodPage() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [cart, setCart] = useState<CartItem[]>(() => {
    // Restore cart from localStorage on mount
    try { const saved = localStorage.getItem('picklverse_food_cart'); return saved ? JSON.parse(saved) : []; } catch { return []; }
  });
  const [activeCategory, setActiveCategory] = useState<'all' | 'snacks' | 'drinks' | 'meals'>('all');
  const [deliveryType, setDeliveryType] = useState<'court' | 'counter'>('court');
  const [selectedBooking, setSelectedBooking] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [error, setError] = useState('');
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);

  // Persist cart to localStorage whenever it changes
  useEffect(() => {
    try { localStorage.setItem('picklverse_food_cart', JSON.stringify(cart)); } catch {}
  }, [cart]);

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = '/login'; return; }
      setUser({ id: user.id, email: user.email });

      const [{ data: menuData }, { data: bookingsData }] = await Promise.all([
        supabase.from('menu_items').select('*').eq('is_available', true).order('category'),
        supabase.from('bookings').select('*, courts(name)').eq('user_id', user.id).eq('status', 'confirmed').gte('end_time', new Date().toISOString()).limit(5),
      ]);

      setMenuItems(menuData || []);
      setBookings(bookingsData || []);
      if (bookingsData && bookingsData.length > 0) setSelectedBooking(bookingsData[0].id);
      setLoading(false);
    };
    fetchData();

    // Realtime: update menu stock and active bookings live
    const supabaseRt = createClient();
    const refreshMenu = async () => {
      const { data } = await supabaseRt.from('menu_items').select('*').eq('is_available', true);
      if (data) setMenuItems(data);
    };
    const refreshBookings = async () => {
      if (!user) return;
      const { data } = await supabaseRt.from('bookings').select('id,court_id,start_time').eq('user_id', user.id).eq('status', 'confirmed').gte('end_time', new Date().toISOString());
      if (data) { setBookings(data); if (data.length > 0 && !selectedBooking) setSelectedBooking(data[0].id); }
    };
    const channel = supabaseRt.channel('food-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, refreshMenu)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, refreshBookings)
      .subscribe();
    return () => { supabaseRt.removeChannel(channel); };
  }, []);

  const getQty = (id: string) => cart.find(c => c.item.id === id)?.qty || 0;

  const updateCart = (item: MenuItem, delta: number) => {
    setCart(prev => {
      const existing = prev.find(c => c.item.id === item.id);
      if (!existing && delta > 0) return [...prev, { item, qty: 1 }];
      return prev.map(c => c.item.id === item.id ? { ...c, qty: Math.max(0, c.qty + delta) } : c).filter(c => c.qty > 0);
    });
  };

  const cartTotal = cart.reduce((sum, c) => sum + c.item.price * c.qty, 0);
  const cartCount = cart.reduce((sum, c) => sum + c.qty, 0);

  const handleOrder = async () => {
    if (cart.length === 0 || !user) return;
    setPlacing(true); setError('');
    try {
      const supabase = createClient();
      const { data: orderData, error } = await supabase.from('food_orders').insert({
        user_id: user.id,
        booking_id: selectedBooking || null,
        items: cart.map(c => ({ id: c.item.id, name: c.item.name, qty: c.qty, price: c.item.price })),
        total_price: cartTotal,
        delivery_type: deliveryType,
        status: 'pending',
      }).select().single();
      if (error) throw error;
      // Stock decrement + auto-disable happens in the webhook after payment confirmed
      // Redirect to PayMongo
      try { localStorage.removeItem('picklverse_food_cart'); } catch {}
      await redirectToPayment({
        amount: cartTotal,
        description: `Picklverse Food Order - ${cart.map(c => c.item.name).join(', ')}`,
        referenceId: orderData.id,
        type: 'food',
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Order failed. Please try again.');
      setPlacing(false);
    }
  };

  const filtered = activeCategory === 'all' ? menuItems : menuItems.filter(m => m.category === activeCategory);
  const categories = ['all', 'snacks', 'drinks', 'meals'] as const;

  const categoryEmoji: Record<string, string> = { snacks: '🥨', drinks: '🧃', meals: '🍱' };

  if (loading) return (
    <div style={{ fontFamily: "'Barlow Condensed',sans-serif", background: 'var(--bg-primary)', color: 'var(--text-primary)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, border: '2px solid var(--border)', borderTop: '2px solid var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
        <div style={{ fontFamily: "'Barlow',sans-serif", color: 'var(--text-muted)', fontSize: 14 }}>Loading menu...</div>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (orderSuccess) return (
    <div style={{ fontFamily: "'Barlow Condensed',sans-serif", background: 'var(--bg-primary)', color: 'var(--text-primary)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <div style={{ width: 72, height: 72, background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: 32 }}>🍱</div>
        <h2 style={{ fontSize: 36, fontWeight: 800, textTransform: 'uppercase', marginBottom: 12 }}>Order placed!</h2>
        <p style={{ fontFamily: "'Barlow',sans-serif", color: 'var(--text-muted)', fontSize: 15, marginBottom: 8 }}>
          {deliveryType === 'court' ? 'Your order will be delivered to your court in ~10 mins.' : 'Your order will be ready for pick up at the counter.'}
        </p>
        <p style={{ fontFamily: "'Barlow',sans-serif", color: 'var(--accent)', fontSize: 18, fontWeight: 700, marginBottom: 32 }}>Total: ₱{cartTotal.toLocaleString()}</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <a href="/dashboard" style={{ background: 'var(--accent)', color: '#fff', padding: '12px 24px', borderRadius: 8, fontFamily: "'Barlow Condensed',sans-serif", fontSize: 14, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', textDecoration: 'none' }}>Go to dashboard</a>
          <button onClick={() => setOrderSuccess(false)} style={{ background: 'transparent', border: '1px solid var(--border-hover)', color: 'var(--text-secondary)', padding: '12px 24px', borderRadius: 8, fontFamily: "'Barlow Condensed',sans-serif", fontSize: 14, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer' }}>Order more</button>
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

        .cat-pill{padding:8px 18px;border-radius:20px;font-size:12px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;border:1px solid var(--border);cursor:pointer;transition:all .2s;background:transparent;color:var(--text-muted);display:flex;align-items:center;gap:6px;}
        .cat-pill.active{background:var(--accent);color:#fff;border-color:var(--accent);}
        .cat-pill:hover:not(.active){border-color:var(--border-hover);color:var(--text-secondary);}

        .delivery-opt{flex:1;border:1px solid var(--border);border-radius:8px;padding:10px;text-align:center;cursor:pointer;transition:all .2s;background:var(--card-bg);}
        .delivery-opt.active{border-color:var(--accent);background:var(--accent-bg);}
        .delivery-opt-title{font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;margin-bottom:2px;}
        .delivery-opt-sub{font-family:'Barlow',sans-serif;font-size:11px;color:var(--text-muted);}
        .delivery-opt.active .delivery-opt-title{color:var(--accent);}

        .menu-card{background:var(--card-bg);border:1px solid var(--border);border-radius:12px;overflow:hidden;transition:all .25s;animation:fadeUp .5s ease both;}
        .menu-card:hover{border-color:var(--accent);transform:translateY(-2px);}

        .menu-img{height:100px;display:flex;align-items:center;justify-content:center;font-size:40px;background:var(--bg-hover);position:relative;overflow:hidden;}
        .menu-body{padding:14px;}
        .menu-name{font-size:15px;font-weight:700;margin-bottom:4px;}
        .menu-desc{font-family:'Barlow',sans-serif;font-size:12px;color:var(--text-muted);margin-bottom:10px;line-height:1.4;}
        .menu-footer{display:flex;justify-content:space-between;align-items:center;}
        .menu-price{font-size:16px;font-weight:800;color:var(--accent);}

        .qty-wrap{display:flex;align-items:center;gap:8px;}
        .qty-btn{width:28px;height:28px;border-radius:50%;border:1px solid var(--border-hover);background:transparent;color:var(--text-primary);cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center;transition:all .15s;line-height:1;}
        .qty-btn:hover{border-color:var(--accent);background:var(--accent-bg);}
        .qty-num{font-size:15px;font-weight:700;min-width:20px;text-align:center;}

        .add-btn{background:var(--accent);color:#fff;border:none;padding:7px 16px;border-radius:8px;font-family:'Barlow Condensed',sans-serif;font-size:12px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;cursor:pointer;transition:background .2s;}
        .add-btn:hover{background:var(--accent-hover);}

        .cart-item{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border);}
        .cart-item:last-child{border-bottom:none;}
        .cart-item-name{font-size:13px;font-weight:600;}
        .cart-item-qty{font-family:'Barlow',sans-serif;font-size:12px;color:var(--text-muted);}
        .cart-item-price{font-size:13px;font-weight:700;color:var(--accent);}

        .order-btn{width:100%;height:50px;background:var(--accent);color:#fff;border:none;border-radius:10px;font-family:'Barlow Condensed',sans-serif;font-size:16px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;transition:all .2s;display:flex;align-items:center;justify-content:center;gap:8px;}
        .order-btn:hover:not(:disabled){background:var(--accent-hover);transform:translateY(-2px);}
        .order-btn:disabled{background:var(--bg-hover);color:var(--text-muted);cursor:not-allowed;}

        .section-label{font-size:11px;color:var(--accent);letter-spacing:.1em;text-transform:uppercase;font-family:'Barlow',sans-serif;margin-bottom:8px;}

        @media(max-width:768px){.main-grid{grid-template-columns:1fr !important;}}
      `}</style>

      {/* NAV */}
      <Navbar activeLink="/food" />


      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>

        {/* HEADER */}
        <div style={{ marginBottom: 32, animation: 'fadeUp .5s ease both' }}>
          <div style={{ fontSize: 11, fontFamily: "'Barlow',sans-serif", color: 'var(--accent)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Food & drinks</div>
          <h1 style={{ fontSize: 'clamp(32px,5vw,52px)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '-0.01em', lineHeight: 1, marginBottom: 8 }}>
            Order to your <span style={{ color: 'var(--accent)' }}>court</span>
          </h1>
          <p style={{ fontFamily: "'Barlow',sans-serif", fontSize: 15, color: 'var(--text-muted)' }}>Snacks, drinks and meals delivered while you play.</p>
        </div>

        {/* DELIVERY TYPE */}
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px', marginBottom: 24, animation: 'fadeUp .5s .1s ease both' }}>
          <div className="section-label">Delivery method</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div className={`delivery-opt ${deliveryType === 'court' ? 'active' : ''}`} onClick={() => setDeliveryType('court')}>
              <div className="delivery-opt-title">Deliver to court</div>
              <div className="delivery-opt-sub">~10 mins · Free</div>
            </div>
            <div className={`delivery-opt ${deliveryType === 'counter' ? 'active' : ''}`} onClick={() => setDeliveryType('counter')}>
              <div className="delivery-opt-title">Pick up at counter</div>
              <div className="delivery-opt-sub">Ready in ~5 mins</div>
            </div>
          </div>

          {/* Link to booking */}
          {deliveryType === 'court' && (
            <div style={{ marginTop: 14 }}>
              <div className="section-label" style={{ marginBottom: 6 }}>Deliver to which booking?</div>
              {bookings.length === 0 ? (
                <div style={{ fontFamily: "'Barlow',sans-serif", fontSize: 13, color: 'var(--text-muted)' }}>
                  No active bookings found. <a href="/courts" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Book a court first</a> or choose pick up at counter.
                </div>
              ) : (
                <select
                  value={selectedBooking}
                  onChange={e => setSelectedBooking(e.target.value)}
                  title="Select booking for delivery"
                  aria-label="Select booking for delivery"
                  style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-hover)', borderRadius: 8, color: 'var(--text-primary)', fontFamily: "'Barlow',sans-serif", fontSize: 14, padding: '8px 12px', outline: 'none', cursor: 'pointer', width: '100%', maxWidth: 360 }}
                >
                  {bookings.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.courts?.name} · {new Date(b.start_time).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })} {new Date(b.start_time).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}
        </div>

        {/* CATEGORY FILTERS */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap', animation: 'fadeUp .5s .15s ease both' }}>
          {categories.map(cat => (
            <button key={cat} className={`cat-pill ${activeCategory === cat ? 'active' : ''}`} onClick={() => setActiveCategory(cat)}>
              {cat !== 'all' && <span style={{ fontSize: 14 }}>{categoryEmoji[cat]}</span>}
              {cat === 'all' ? 'All items' : cat}
            </button>
          ))}
        </div>

        {/* MAIN GRID */}
        <div className="main-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24, alignItems: 'start' }}>

          {/* MENU */}
          <div>
            {filtered.length === 0 ? (
              <div style={{ fontFamily: "'Barlow',sans-serif", color: 'var(--text-muted)', fontSize: 14, padding: '40px 0', textAlign: 'center' }}>No items in this category right now.</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 14 }}>
                {filtered.map((item, i) => {
                  const qty = getQty(item.id);
                  return (
                    <div key={item.id} className="menu-card" style={{ animationDelay: `${i * 0.06}s` }}>
                      <div className="menu-img">
                        {item.image_url ? (
                          <Image src={item.image_url} alt={item.name} fill sizes="(max-width: 768px) 100vw, 280px" style={{ objectFit:'cover' }} />
                        ) : (
                          <span>{categoryEmoji[item.category] || '🍽️'}</span>
                        )}
                      </div>
                      <div className="menu-body">
                        <div className="menu-name">{item.name}</div>
                        <div className="menu-desc">{item.description || item.category}</div>
                        <div className="menu-footer">
                          <span className="menu-price">₱{item.price}</span>
                          {qty === 0 ? (
                            <button className="add-btn" onClick={() => updateCart(item, 1)}>+ Add</button>
                          ) : (
                            <div className="qty-wrap">
                              <button className="qty-btn" onClick={() => updateCart(item, -1)}>−</button>
                              <span className="qty-num">{qty}</span>
                              <button className="qty-btn" onClick={() => updateCart(item, 1)}>+</button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ORDER SUMMARY */}
          <div style={{ position: 'sticky', top: 76 }}>
            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, animation: 'fadeUp .5s .2s ease both' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ fontSize: 16, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Your order</div>
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
                  <div style={{ marginBottom: 16 }}>
                    {cart.map(c => (
                      <div key={c.item.id} className="cart-item">
                        <div>
                          <div className="cart-item-name">{c.item.name}</div>
                          <div className="cart-item-qty">x{c.qty} · ₱{c.item.price} each</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span className="cart-item-price">₱{(c.item.price * c.qty).toLocaleString()}</span>
                          <button className="qty-btn" onClick={() => updateCart(c.item, -1)} style={{ width: 22, height: 22, fontSize: 14 }}>−</button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ background: 'var(--bg-primary)', borderRadius: 8, padding: 12, marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: "'Barlow',sans-serif", fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>
                      <span>Subtotal ({cartCount} items)</span>
                      <span>₱{cartTotal.toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: "'Barlow',sans-serif", fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>
                      <span>Delivery</span>
                      <span style={{ color: 'var(--success-text)' }}>Free</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 800, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                      <span>Total</span>
                      <span style={{ color: 'var(--accent)' }}>₱{cartTotal.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Delivery info */}
                  <div style={{ background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', borderRadius: 8, padding: '10px 12px', marginBottom: 14, fontFamily: "'Barlow',sans-serif", fontSize: 12, color: 'var(--accent-light)' }}>
                    {deliveryType === 'court'
                      ? `Delivering to ${bookings.find(b => b.id === selectedBooking)?.courts?.name || 'your court'} in ~10 mins`
                      : 'Pick up at the counter when ready (~5 mins)'}
                  </div>

                  {error && (
                    <div style={{ background: 'var(--error-bg)', border: '1px solid var(--error-border)', borderRadius: 8, padding: '10px 14px', fontFamily: "'Barlow',sans-serif", fontSize: 13, color: 'var(--error-text)', marginBottom: 12 }}>{error}</div>
                  )}

                  <button className="order-btn" onClick={handleOrder} disabled={placing || (deliveryType === 'court' && bookings.length === 0)}>
                    {placing ? (
                      <><div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,.3)', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />Placing order...</>
                    ) : (
                      <>Place order · ₱{cartTotal.toLocaleString()} <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg></>
                    )}
                  </button>
                  <div style={{ fontFamily: "'Barlow',sans-serif", fontSize: 11, color: 'var(--text-hint)', textAlign: 'center', marginTop: 8 }}>Payment via GCash, Maya or card · Powered by PayMongo</div>
                </>
              )}
            </div>

            {/* Popular items hint */}
            {cart.length === 0 && menuItems.length > 0 && (
              <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, marginTop: 12, animation: 'fadeUp .5s .3s ease both' }}>
                <div className="section-label">Popular picks</div>
                {menuItems.slice(0, 3).map(item => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }} className="cart-item">
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{item.name}</div>
                      <div style={{ fontFamily: "'Barlow',sans-serif", fontSize: 11, color: 'var(--accent)' }}>₱{item.price}</div>
                    </div>
                    <button className="add-btn" onClick={() => updateCart(item, 1)}>+ Add</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}