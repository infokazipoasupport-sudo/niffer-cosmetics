import { useEffect, useMemo, useState } from 'react'
import './App.css'

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'
const money = (value) => new Intl.NumberFormat('en-TZ', { style: 'currency', currency: 'TZS', maximumFractionDigits: 0 }).format(value)
const queenSlides = [
  { image: 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?auto=format&fit=crop&w=1600&q=90', label: 'Skincare collection' },
  { image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=1600&q=90', label: 'Cosmetics collection' },
  { image: 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?auto=format&fit=crop&w=1600&q=90', label: 'Beauty and skincare products' },
  { image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1600&q=90', label: 'Makeup and beauty products' },
]
const serviceItems = [
  { title: 'Cosmetics Wholesale', text: 'Wholesale cosmetics supply for approved retail and beauty business enquiries.' },
  { title: 'Skincare Collections', text: 'Curated skincare products including kits, body lotions, and face serums.' },
  { title: 'Cosmetics Collections', text: 'Beauty cosmetics selected for customers and approved wholesale enquiries.' },
  { title: 'Product Enquiries', text: 'Contact Niffer for verified product availability, catalogue, and wholesale information.' },
]
const galleryCategories = [
  { title: 'Glow Routine', text: 'Hydration, treatment, and everyday skincare essentials.', image: 'https://images.unsplash.com/photo-1612817288484-6f916006741a?auto=format&fit=crop&w=900&q=85' },
  { title: 'Skin Revival', text: 'Targeted care for acne, pigmentation, and smooth radiant skin.', image: 'https://images.unsplash.com/photo-1556229010-6c3f2c9ca5f8?auto=format&fit=crop&w=900&q=85' },
  { title: 'Beauty Edit', text: 'Luxury beauty picks curated for confident everyday styling.', image: 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&w=900&q=85' },
  { title: 'Cosmetic Ritual', text: 'Makeup, glow, and polish designed to elevate the beauty routine.', image: 'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=900&q=85' },
]

function App() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [cart, setCart] = useState(() => JSON.parse(localStorage.getItem('niffer-cart') || '[]'))
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [sort, setSort] = useState('newest')
  const [view, setView] = useState('home')
  const [selected, setSelected] = useState(null)
  const [notice, setNotice] = useState('')
  const [order, setOrder] = useState(null)
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('niffer-user') || 'null'))
  const [authMode, setAuthMode] = useState('login')
  const [queenSlide, setQueenSlide] = useState(0)
  const [customerMenuOpen, setCustomerMenuOpen] = useState(false)
  const [promoPlaying, setPromoPlaying] = useState(false)

  useEffect(() => { localStorage.setItem('niffer-cart', JSON.stringify(cart)) }, [cart])
  useEffect(() => { fetch(`${API}/categories`).then((response) => response.json()).then(setCategories).catch(() => setCategories([])) }, [])
  useEffect(() => { const params = new URLSearchParams({ search, category, sort }); fetch(`${API}/products?${params}`).then((response) => response.json()).then(setProducts).catch(() => setProducts([])) }, [search, category, sort])
  useEffect(() => { const timer = window.setInterval(() => setQueenSlide((current) => (current + 1) % queenSlides.length), 5000); return () => window.clearInterval(timer) }, [])

  const total = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.quantity, 0), [cart])
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0)
  const addToCart = (product) => { setCart((current) => { const existing = current.find((item) => item.id === product.id); return existing ? current.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item) : [...current, { ...product, price: product.salePrice || product.price, quantity: 1 }] }); setNotice(`${product.name} added to your bag.`) }
  const changeQuantity = (id, delta) => setCart((current) => current.map((item) => item.id === id ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item).filter((item) => item.quantity))
  const showProduct = (product) => { setSelected(product); setView('product') }
  const showPreviousHeroSlide = () => setQueenSlide((current) => (current - 1 + queenSlides.length) % queenSlides.length)
  const showNextHeroSlide = () => setQueenSlide((current) => (current + 1) % queenSlides.length)
  const handleAuth = async (event) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    try {
      const response = await fetch(`${API}/auth/${authMode}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: form.get('name'), email: form.get('email'), password: form.get('password'), phone: form.get('phone') }) })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) return setNotice(data.message || 'Could not authenticate.')
      localStorage.setItem('niffer-token', data.token)
      localStorage.setItem('niffer-user', JSON.stringify(data.user))
      setUser(data.user)
      setView(data.user.role === 'ADMIN' ? 'admin' : 'dashboard')
      setNotice(`Welcome, ${data.user.name}.`)
    } catch {
      setNotice('Sign in is temporarily unavailable. Please try again when the API is online.')
    }
  }
  const logout = () => { localStorage.removeItem('niffer-token'); localStorage.removeItem('niffer-user'); setUser(null); setView('home') }
  const submitOrder = async (event) => { event.preventDefault(); const form = new FormData(event.currentTarget); const response = await fetch(`${API}/orders`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(localStorage.getItem('niffer-token') ? { Authorization: `Bearer ${localStorage.getItem('niffer-token')}` } : {}) }, body: JSON.stringify({ customer: { name: form.get('name'), phone: form.get('phone'), email: form.get('email') }, delivery: { region: form.get('region'), city: form.get('city'), address: form.get('address'), instructions: form.get('instructions') }, items: cart.map((item) => ({ productId: item.id, quantity: item.quantity })) }) }); const data = await response.json(); if (!response.ok) return setNotice(data.message || 'Could not create order.'); setOrder(data); setCart([]); setView('tracking'); setNotice('Order received. We will confirm delivery details by phone.') }

  return (
    <div className="site-shell">
      <div className="announcement">Brand-safe Niffer storefront · verified details only</div>
      <header className="site-header">
        <button className="brand" onClick={() => setView('home')}>NIFFER <span>COSMETICS</span></button>
        <nav>
          <button onClick={() => setView('home')}>Home</button>
          <button onClick={() => setView('shop')}>Collections</button>
          <button onClick={() => setView('about')}>About</button>
          <button onClick={() => setView('contact')}>Gallery</button>
          <button onClick={() => setView('contact')}>Contact</button>
          {user?.role === 'ADMIN' && <button onClick={() => setView('admin')}>Admin</button>}
        </nav>
        <div className="header-actions">
          {user?.role === 'CUSTOMER' && <div className="customer-account-menu"><button className="customer-account-trigger" onClick={() => setCustomerMenuOpen((open) => !open)} aria-expanded={customerMenuOpen}><span className="customer-header-avatar">{(user.name || 'C').charAt(0).toUpperCase()}</span><span>Customer</span><span className="menu-chevron">⌄</span></button>{customerMenuOpen && <div className="customer-account-dropdown"><button onClick={() => { setView('dashboard'); setCustomerMenuOpen(false) }}>My dashboard</button><button onClick={logout}>Sign out</button></div>}</div>}
          {user?.role === 'ADMIN' && <button onClick={logout}>Sign out</button>}
          {!user && <button className="signin-button" onClick={() => setView('login')}>Sign in</button>}
          {user?.role !== 'ADMIN' && <button className="bag-button" onClick={() => setView('cart')}><span>Bag</span> <b>{cartCount}</b></button>}
        </div>
      </header>

      {notice && <button className="notice" onClick={() => setNotice('')}>{notice} ×</button>}

      {view === 'home' && (
        <main className="instagram-page">
          <div className="instagram-panel">
            <section className="queen-slideshow" aria-label="African beauty portraits">
              {queenSlides.map((slide, index) => <img className={index === queenSlide ? 'active' : ''} key={slide.image} src={slide.image} alt={slide.label} />)}
              <div className="queen-hero-copy"><span className="hero-kicker">Niffer Cosmetic HQ</span><h1>Beauty, curated for you.</h1><i /><p>Explore the world of cosmetics, skincare, and fragrance from Niffer.</p><div className="hero-actions"><button className="gold-button" onClick={() => setView('contact')}>Make an enquiry <span>→</span></button><button className="outline-button" onClick={() => setView('shop')}>Explore collection</button></div></div>
              <button className="hero-slide-control previous" aria-label="Previous hero image" onClick={showPreviousHeroSlide}>‹</button>
              <button className="hero-slide-control next" aria-label="Next hero image" onClick={showNextHeroSlide}>›</button>
              <div className="queen-caption"><span>{String(queenSlide + 1).padStart(2, '0')} / {String(queenSlides.length).padStart(2, '0')}</span><strong>Cosmetics. Care. Confidence.</strong></div>
              <div className="queen-dots">{queenSlides.map((slide, index) => <button aria-label={`Show portrait ${index + 1}`} className={index === queenSlide ? 'active' : ''} key={slide.image} onClick={() => setQueenSlide(index)} />)}</div>
            </section>
            <section className="reference-services"><div className="reference-heading"><span>What Niffer offers</span><h2>Cosmetics collections, considered.</h2></div><div className="reference-service-grid">{serviceItems.map((item, index) => <article key={item.title}><small>{String(index + 1).padStart(2, '0')}</small><h3>{item.title}</h3><p>{item.text}</p></article>)}</div></section>
            <section className="gallery-section"><div className="reference-heading"><span>Gallery</span><h2>Explore the Niffer experience.</h2></div><div className="gallery-category-grid">{galleryCategories.map((item) => <article className="gallery-category-card" key={item.title}><img src={item.image} alt={item.title} /><div><span>Beauty collection</span><h3>{item.title}</h3><p>{item.text}</p></div></article>)}</div></section>
            <section className={`promo-video-section ${promoPlaying ? 'promo-is-playing' : ''}`}><div className="promo-visual"><div className="promo-badge">Promo reel · 01:00</div><div className="promo-reel-content"><span>NIFFER COSMETICS</span><strong>One system for your beauty journey.</strong><div className="promo-reel-scenes"><b>01 · Explore collections</b><b>02 · View skincare details</b><b>03 · Sign in and save your bag</b><b>04 · Send an enquiry directly</b></div><i /></div><button className="promo-play" aria-label={promoPlaying ? 'Pause promo reel' : 'Play promo reel'} onClick={() => setPromoPlaying((playing) => !playing)}>{promoPlaying ? 'Ⅱ' : '▶'}</button><div className="promo-progress" aria-hidden="true"><span /></div></div><div className="promo-copy"><span>Brand story · 60 seconds</span><h2>See how Niffer Cosmetics works.</h2><p>This one-minute reel introduces the full system: discover the brand, browse verified collections, view product information, add items to your bag, sign in for a customer dashboard, and contact Niffer Cosmetics for skincare or wholesale enquiries.</p><button className="gold-button" onClick={() => setView('contact')}>Send to Niffer <span>→</span></button></div></section>
            <section className="reference-story"><div><span>About Niffer Cosmetics</span><h2>Beauty, skincare, and confidence in one brand.</h2><p>Jenifer Jovin, popularly known as Niffer, is a Tanzanian entrepreneur, digital creator, and founder of Niffer Cosmetics. Her brand specializes in personalized skincare, professional skin analysis, collagen supplements, and treatment support for acne and hyperpigmentation.</p><button className="outline-button" onClick={() => setView('about')}>Discover Niffer <span>→</span></button></div></section>
            <section className="reference-appointment"><span>Wholesale enquiries</span><h2>Looking for Niffer products?</h2><p>Contact Niffer Cosmetics for verified product availability, catalogue information, and skincare consultations.</p><button className="gold-button" onClick={() => setView('contact')}>Contact Niffer <span>→</span></button></section>
            <div className="instagram-footer">
              <button onClick={() => setView('shop')}>Products coming soon</button>
              <button onClick={() => setView('contact')}>Official details</button>
            </div>
          </div>
        </main>
      )}

      {view === 'shop' && (
        <main className="shop-page">
          <div className="page-heading">
            <p className="eyebrow">Shop</p>
            <h1>Collection coming soon</h1>
            <p>The approved Niffer catalogue has not yet been supplied, so the storefront is intentionally empty until verified product details are confirmed.</p>
          </div>
          <div className="empty-state-box">
            <p>No public product catalog is displayed yet.</p>
            <button className="primary" onClick={() => setView('contact')}>Request official catalogue <span>→</span></button>
          </div>
        </main>
      )}

      {view === 'product' && selected && (
        <main className="product-page">
          <button className="back" onClick={() => setView('shop')}>← Back to shop</button>
          <div className="product-detail">
            <img src={selected.image} alt={selected.name} />
            <div>
              <p className="eyebrow">{selected.category}</p>
              <h1>{selected.name}</h1>
              <p className="price">{money(selected.salePrice || selected.price)} {selected.salePrice && <del>{money(selected.price)}</del>}</p>
              <p className="description">{selected.description}</p>
              <p className="stock">{selected.stock > 0 ? `${selected.stock} available` : 'Currently unavailable'}</p>
              <button className="primary" disabled={!selected.stock} onClick={() => addToCart(selected)}>Add to bag <span>→</span></button>
            </div>
          </div>
        </main>
      )}

      {view === 'cart' && (
        <main className="narrow-page">
          <p className="eyebrow">Your selection</p>
          <h1>Your bag</h1>
          {cart.length === 0 ? <Empty text="Your bag is waiting for something lovely." action={() => setView('shop')} /> : (
            <>
              <div className="cart-list">
                {cart.map((item) => (
                  <div className="cart-row" key={item.id}>
                    <img src={item.image} alt="" />
                    <div>
                      <h3>{item.name}</h3>
                      <p>{money(item.price)}</p>
                      <div className="quantity">
                        <button onClick={() => changeQuantity(item.id, -1)}>−</button>
                        <span>{item.quantity}</span>
                        <button onClick={() => changeQuantity(item.id, 1)}>+</button>
                      </div>
                    </div>
                    <strong>{money(item.price * item.quantity)}</strong>
                  </div>
                ))}
              </div>
              <div className="cart-total"><span>Subtotal</span><strong>{money(total)}</strong></div>
              <button className="primary full" onClick={() => setView('checkout')}>Continue to checkout <span>→</span></button>
            </>
          )}
        </main>
      )}

      {view === 'checkout' && (
        <main className="narrow-page">
          <button className="back" onClick={() => setView('cart')}>← Back to bag</button>
          <p className="eyebrow">Delivery details</p>
          <h1>Complete your order</h1>
          <form className="checkout-form" onSubmit={submitOrder}>
            <input name="name" required placeholder="Full name" />
            <input name="phone" required placeholder="Phone number" />
            <input name="email" type="email" placeholder="Email address" />
            <div className="form-row"><input name="region" required placeholder="Region" /><input name="city" required placeholder="City" /></div>
            <input name="address" required placeholder="Delivery address" />
            <textarea name="instructions" placeholder="Delivery instructions (optional)" rows="4" />
            <button className="primary full">Place order · {money(total)} <span>→</span></button>
          </form>
        </main>
      )}

      {view === 'tracking' && (
        <main className="narrow-page">
          <p className="eyebrow">Order received</p>
          <h1>Thank you.</h1>
          <p className="large-copy">Your order <strong>#{order?.id}</strong> is pending confirmation.</p>
          <div className="timeline">{['PENDING', 'CONFIRMED', 'PROCESSING', 'OUT_FOR_DELIVERY', 'DELIVERED'].map((status, index) => <div className={index === 0 ? 'timeline-step active' : 'timeline-step'} key={status}><i />{status.replaceAll('_', ' ')}</div>)}</div>
          <button className="primary" onClick={() => setView('shop')}>Continue shopping <span>→</span></button>
        </main>
      )}

      {view === 'about' && (
        <main className="narrow-page editorial">
          <p className="eyebrow">About Niffer</p>
          <h1>Jenifer Jovin</h1>
          <p className="large-copy">Jenifer Jovin, popularly known as Niffer, is a Tanzanian entrepreneur, digital content creator, and fashion personality based in Dar es Salaam. She is the founder and CEO of Niffer Cosmetics, a beauty brand specializing in personalized skincare, professional skin analysis, collagen supplements, and verified treatment for acne and hyperpigmentation.</p>
          <p className="large-copy">Recognized as one of East Africa's most prominent young business leaders, she combines her background in journalism, beauty therapy, and digital influence to build high-demand lifestyle products and connect with communities across social media.</p>
          <div className="about-details"><span>Business</span><strong>Niffer Cosmetics</strong><span>Founder</span><strong>Jenifer Jovin</strong><span>Location</span><strong>Dar es Salaam, Tanzania</strong></div>
        </main>
      )}

      {view === 'contact' && (
        <main className="narrow-page editorial">
          <p className="eyebrow">Contact</p>
          <h1>Connect with Niffer.</h1>
          <p className="large-copy">Name: JENIFER JOVIN</p>
          <p className="large-copy">Location: Sinza Kumekucha, Dar es Salaam, Tanzania</p>
          <p className="large-copy">Instagram: <a href="https://instagram.com/niffer_cosmetics1" target="_blank" rel="noreferrer">@niffer_cosmetics1</a></p>
          <p className="large-copy">TikTok: <a href="https://www.tiktok.com/@niffer_cosmetics" target="_blank" rel="noreferrer">@niffer_cosmetics</a></p>
          <p className="large-copy">WhatsApp: <a href="https://wa.me/255747340170" target="_blank" rel="noreferrer">wa.me/255747340170</a> | +255 747 340 170</p>
          <p className="large-copy">Bio: ACNE TREATMENT, HYPERPIGMENTATION, COLLAGEN SUPPLEMENTS, SKIN ANALYSIS. ORIGINAL PRODUCTS ONLY.</p>
        </main>
      )}

      {view === 'login' && (
        <main className="narrow-page auth-page">
          <div className="auth-page-inner">
            <div className="auth-form-panel">
              <p className="eyebrow">Your account</p>
              <h1>{authMode === 'login' ? 'Welcome back.' : 'Join the ritual.'}</h1>
              <form className="checkout-form auth-form" onSubmit={handleAuth}>
                {authMode === 'register' && <><input name="name" required placeholder="Full name" /><input name="phone" placeholder="Phone number" /></>}
                <input name="email" required type="email" placeholder="Email address" />
                <input name="password" required minLength="8" type="password" placeholder="Password (8+ characters)" />
                <button className="primary full auth-submit">{authMode === 'login' ? 'Sign in' : 'Create account'} <span>→</span></button>
              </form>
              <button className="text-button" onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}>{authMode === 'login' ? 'Need an account? Register' : 'Already registered? Sign in'}</button>
            </div>

            <div className="auth-hero-panel">
              <div className="auth-hero-copy">
                <span className="eyebrow">Niffer Cosmetic HQ</span>
                <h2>Beauty, curated with intention.</h2>
              </div>
              <div className="auth-meta-row">
                <div className="auth-meta-item">
                  <span className="auth-icon">⌖</span>
                  <div>
                    <small>Location</small>
                    <strong>Sinza Kumekucha, Dar es Salaam, Tanzania</strong>
                  </div>
                </div>
                <div className="auth-meta-item">
                  <span className="auth-icon">✆</span>
                  <div>
                    <small>WhatsApp</small>
                    <strong>+255 747 340 170</strong>
                  </div>
                </div>
                <div className="auth-socials">
                  <a href="https://wa.me/255747340170" target="_blank" rel="noreferrer">WhatsApp</a>
                  <a href="https://instagram.com/niffer_cosmetics1" target="_blank" rel="noreferrer">Instagram</a>
                  <a href="https://www.tiktok.com/@niffer_cosmetics" target="_blank" rel="noreferrer">TikTok</a>
                </div>
              </div>
            </div>
          </div>
        </main>
      )}

      {view === 'admin' && user?.role === 'ADMIN' && <AdminPanel onNotice={setNotice} />}
      {view === 'dashboard' && user?.role === 'CUSTOMER' && <CustomerDashboard user={user} onNotice={setNotice} onShop={() => setView('shop')} onBook={() => setView('contact')} />}

      <footer className="site-footer">
        <div className="footer-intro">
          <span className="footer-kicker">Niffer COSMETIC HQ</span>
          <h2>Beauty, curated with intention.</h2>
          <p>Cosmetics wholesaler · Public rating 5.0/5 from 2 reviews.</p>
        </div>
        <div className="footer-contact-grid">
          <div className="footer-contact-item">
            <span className="footer-icon" aria-hidden="true">⌕</span>
            <div><small>Location</small><strong>Sinza Kumekucha, Dar es Salaam, Tanzania</strong></div>
          </div>
          <div className="footer-contact-item">
            <span className="footer-icon" aria-hidden="true">✆</span>
            <div><small>WhatsApp</small><strong><a href="https://wa.me/255747340170" target="_blank" rel="noreferrer">+255 747 340 170</a></strong></div>
          </div>
        </div>
        <div className="footer-socials">
          <a href="https://wa.me/255747340170" target="_blank" rel="noreferrer" aria-label="Niffer WhatsApp">WhatsApp</a>
          <a href="https://instagram.com/niffer_cosmetics1" target="_blank" rel="noreferrer" aria-label="Niffer Instagram">Instagram</a>
          <a href="https://www.tiktok.com/@niffer_cosmetics" target="_blank" rel="noreferrer" aria-label="Niffer business TikTok">TikTok</a>
        </div>
      </footer>
    </div>
  )
}

function ProductGrid({ products, onSelect, onAdd }) {
  return (
    <section className="product-section">
      <div className="section-heading">
        <p className="eyebrow">Selected essentials</p>
        <h2>Find your ritual</h2>
      </div>
      <div className="product-grid">
        {products.map((product) => (
          <article className="product-card" key={product.id}>
            <button className="product-image" onClick={() => onSelect(product)}>
              <img src={product.image} alt={product.name} />
              <span>{product.name.startsWith('TEST DATA') ? 'Demo' : 'New'}</span>
            </button>
            <div className="product-meta">
              <button onClick={() => onSelect(product)}>
                <h3>{product.name}</h3>
                <p>{product.category}</p>
              </button>
              <div>
                <strong>{money(product.salePrice || product.price)}</strong>
                <button className="add-button" disabled={!product.stock} onClick={() => onAdd(product)}>{product.stock ? '+' : 'Sold out'}</button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function Empty({ text, action }) {
  return (
    <div className="empty">
      <p>{text}</p>
      <button className="primary" onClick={action}>Shop products <span>→</span></button>
    </div>
  )
}

function CustomerDashboard({ user, onNotice, onShop, onBook }) {
  const [orders, setOrders] = useState([])
  const [addresses, setAddresses] = useState([])
  const [profile, setProfile] = useState({ name: user.name || '', phone: user.phone || '' })
  const [message, setMessage] = useState('')
  const token = localStorage.getItem('Niffer-token')
  const request = (path, options = {}) => fetch(`${API}/account${path}`, { ...options, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(options.headers || {}) } }).then(async (response) => { const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.message || 'Request failed.'); return data })
  const load = () => Promise.all([request('/orders'), request('/addresses')]).then(([orderList, addressList]) => { setOrders(orderList); setAddresses(addressList) }).catch((error) => onNotice(error.message))
  useEffect(() => { load() }, [])
  const saveProfile = async (event) => { event.preventDefault(); setMessage(''); try { const updated = await request('/profile', { method: 'PUT', body: JSON.stringify(profile) }); localStorage.setItem('Niffer-user', JSON.stringify({ ...user, ...updated })); setMessage('Profile updated.'); onNotice('Profile updated.') } catch (error) { setMessage(error.message) } }

  return <main className="customer-dashboard-shell">
    <aside className="customer-sidebar"><button className="customer-sidebar-brand">Niffer <small>COSMETICS HQ</small></button><div className="customer-profile"><span className="customer-avatar">{(user.name || 'N').charAt(0).toUpperCase()}</span><div><strong>{user.name || 'Customer'}</strong><small>Beauty member</small></div></div><nav><button className="active">⌂ <span>Dashboard</span></button><button onClick={onShop}>◇ <span>Shop collections</span></button><button>▣ <span>My orders</span></button><button>⚙ <span>Profile settings</span></button></nav></aside>
    <section className="customer-main"><div className="customer-topbar"><div><small>Customer activity dashboard</small><h1>Welcome, {user.name || 'there'}</h1></div><span className="customer-top-avatar">{(user.name || 'N').charAt(0).toUpperCase()}</span></div><div className="customer-content"><div className="dashboard-actions"><button className="gold-button" onClick={onShop}>Shop cosmetics <span>→</span></button><button className="outline-button dark" onClick={onBook}>Wholesale enquiry <span>→</span></button></div><div className="customer-stat-grid"><div><small>My orders</small><strong>{orders.length}</strong></div><div><small>Saved addresses</small><strong>{addresses.length}</strong></div><div><small>Product interest</small><strong>Cosmetics</strong></div><div><small>Member status</small><strong>Active</strong></div></div><div className="customer-activity-grid"><section className="dashboard-panel"><div className="panel-heading"><span>My orders</span><b>{orders.length}</b></div>{orders.length ? <div className="dashboard-list">{orders.slice(0, 4).map((orderItem) => <div className="dashboard-list-row" key={orderItem.id}><div><strong>Order #{orderItem.id}</strong><small>{orderItem.created_at}</small></div><span>{orderItem.status}</span><b>{money(orderItem.total)}</b></div>)}</div> : <div className="dashboard-empty"><strong>No orders yet.</strong><p>Your confirmed cosmetics orders will appear here.</p><button className="text-link" onClick={onShop}>Explore collection →</button></div>}</section><section className="dashboard-panel"><div className="panel-heading"><span>Wholesale enquiries</span><b>Contact</b></div><div className="dashboard-empty"><strong>Need Niffer products?</strong><p>Contact Niffer Cosmetics HQ for verified catalogue and wholesale information.</p><button className="text-link" onClick={onBook}>Contact Niffer →</button></div></section><section className="dashboard-panel"><div className="panel-heading"><span>Saved addresses</span><b>{addresses.length}</b></div>{addresses.length ? addresses.map((address) => <div className="dashboard-address" key={address.id}><strong>{address.label}</strong><span>{address.address}, {address.city}, {address.region}</span></div>) : <div className="dashboard-empty"><strong>No delivery address saved.</strong><p>Add an address during your next order.</p></div>}</section><form className="dashboard-panel profile-form" onSubmit={saveProfile}><div className="panel-heading"><span>Profile & preferences</span><b>Account</b></div><label><span>Name</span><input value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} required /></label><label><span>Phone</span><input value={profile.phone} onChange={(event) => setProfile({ ...profile, phone: event.target.value })} placeholder="Add phone number" /></label>{message && <p className="form-message">{message}</p>}<button className="primary full" type="submit">Save profile</button></form></div></div></section>
  </main>
}

function AdminPanel({ onNotice }) {
  const [dashboard, setDashboard] = useState(null)
  const [products, setProducts] = useState([])
  const [orders, setOrders] = useState([])
  const [customers, setCustomers] = useState([])
  const [categories, setCategories] = useState([])
  const [section, setSection] = useState('overview')
  const [settings, setSettings] = useState({ businessName: '', phone: '', whatsapp: '', email: '', address: '', instagram: '', facebook: '', tiktok: '', deliveryRegions: '', deliveryCharges: '', paymentMethods: '' })
  const [founder, setFounder] = useState({ name: '', title: '', image: '', bio: '', message: '' })
  const [categoryName, setCategoryName] = useState('')
  const [productForm, setProductForm] = useState({ name: '', description: '', price: '', salePrice: '', image: '', categoryId: '', size: '', stock: '0', sku: '', featured: false, bestSeller: false, newArrival: false, isVerified: false, isPublic: false, metaTitle: '', metaDescription: '' })
  const [formMessage, setFormMessage] = useState('')

  const token = localStorage.getItem('Niffer-token')
  const request = (path, options = {}) => fetch(`${API}/admin${path}`, { ...options, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(options.headers || {}) } }).then(async (response) => { const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.message || 'Request failed.'); return data })

  const load = () => Promise.all([
    request('/dashboard'),
    request('/products'),
    request('/orders'),
    request('/customers'),
    request('/categories'),
    request('/settings'),
    request('/founder'),
  ]).then(([metrics, catalog, orderList, customerList, categoryList, settingsData, founderData]) => {
    setDashboard(metrics)
    setProducts(catalog)
    setOrders(orderList)
    setCustomers(customerList)
    setCategories(categoryList)
    setSettings({
      businessName: settingsData.businessName || '',
      phone: settingsData.phone || '',
      whatsapp: settingsData.whatsapp || '',
      email: settingsData.email || '',
      address: settingsData.address || '',
      instagram: settingsData.instagram || '',
      facebook: settingsData.facebook || '',
      tiktok: settingsData.tiktok || '',
      deliveryRegions: settingsData.deliveryRegions || '',
      deliveryCharges: settingsData.deliveryCharges || '',
      paymentMethods: settingsData.paymentMethods || '',
    })
    setFounder({
      name: founderData?.name || '',
      title: founderData?.title || '',
      image: founderData?.image || '',
      bio: founderData?.bio || '',
      message: founderData?.message || '',
    })
  }).catch((error) => onNotice(error.message))

  useEffect(() => { load() }, [])

  const updateStatus = (id, status) => request(`/orders/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }).then(load).catch((error) => onNotice(error.message))
  const adjustStock = (id) => {
    const quantity = Number(window.prompt('Stock adjustment (+ or - whole number):', '1'))
    if (!Number.isInteger(quantity) || quantity === 0) return
    request(`/inventory/${id}/adjust`, { method: 'POST', body: JSON.stringify({ quantity, reason: 'Admin dashboard adjustment' }) }).then(load).catch((error) => onNotice(error.message))
  }

  const handleSettingsSave = async (event) => {
    event.preventDefault(); setFormMessage('')
    try {
      await request('/settings', {
        method: 'PUT',
        body: JSON.stringify({
          businessName: settings.businessName,
          phone: settings.phone,
          whatsapp: settings.whatsapp,
          email: settings.email,
          address: settings.address,
          instagram: settings.instagram,
          facebook: settings.facebook,
          tiktok: settings.tiktok,
          deliveryRegions: settings.deliveryRegions,
          deliveryCharges: settings.deliveryCharges,
          paymentMethods: settings.paymentMethods,
        }),
      })
      setFormMessage('Business settings saved.')
      onNotice('Business settings updated.')
    } catch (error) {
      setFormMessage(error.message)
    }
  }

  const handleFounderSave = async (event) => {
    event.preventDefault(); setFormMessage('')
    try {
      await request('/founder', { method: 'PUT', body: JSON.stringify(founder) })
      setFormMessage('Founder profile saved.')
      onNotice('Founder profile updated.')
    } catch (error) {
      setFormMessage(error.message)
    }
  }

  const handleCategoryCreate = async (event) => {
    event.preventDefault(); if (!categoryName.trim()) return
    try {
      await request('/categories', { method: 'POST', body: JSON.stringify({ name: categoryName.trim() }) })
      setCategoryName('')
      load()
      setFormMessage('Category added.')
    } catch (error) {
      setFormMessage(error.message)
    }
  }

  const handleProductCreate = async (event) => {
    event.preventDefault(); setFormMessage('')
    try {
      const payload = {
        name: productForm.name.trim(),
        description: productForm.description.trim(),
        price: Number(productForm.price),
        salePrice: productForm.salePrice ? Number(productForm.salePrice) : null,
        image: productForm.image.trim(),
        categoryId: Number(productForm.categoryId),
        size: productForm.size.trim(),
        stock: Number(productForm.stock || 0),
        sku: productForm.sku.trim(),
        featured: Boolean(productForm.featured),
        newArrival: Boolean(productForm.newArrival),
        bestSeller: Boolean(productForm.bestSeller),
        isVerified: Boolean(productForm.isVerified),
        isPublic: Boolean(productForm.isPublic),
        metaTitle: productForm.metaTitle.trim(),
        metaDescription: productForm.metaDescription.trim(),
      }

      if (!payload.name || !payload.description || !payload.image || !payload.size || !payload.categoryId || payload.price <= 0) {
        throw new Error('Complete the required verified product fields before saving.')
      }
      if (payload.isPublic && !payload.isVerified) {
        throw new Error('Public products must be marked verified.')
      }

      await request('/products', { method: 'POST', body: JSON.stringify(payload) })
      setProductForm({ name: '', description: '', price: '', salePrice: '', image: '', categoryId: '', size: '', stock: '0', sku: '', featured: false, bestSeller: false, newArrival: false, isVerified: false, isPublic: false, metaTitle: '', metaDescription: '' })
      load()
      setFormMessage('Product saved successfully.')
      onNotice('Product added.')
    } catch (error) {
      setFormMessage(error.message)
    }
  }

  return (
    <main className="admin-dashboard-shell">
      <aside className="admin-sidebar">
        <button className="admin-sidebar-brand" onClick={() => setSection('overview')}>Niffer <small>COSMETICS HQ</small></button>
        <div className="admin-profile"><span className="admin-avatar">N</span><div><strong>Niffer Administrator</strong><small>Protected workspace</small></div></div>
        <nav className="admin-sidebar-nav">{[['overview', 'Overview'], ['products', 'Products & Inventory'], ['services', 'Product Collections'], ['orders', 'Orders'], ['customers', 'Customers'], ['settings', 'Settings']].map(([key, label]) => <button className={section === key ? 'active' : ''} key={key} onClick={() => setSection(key)}><span>{key === 'overview' ? '⌂' : key === 'settings' ? '⚙' : key === 'customers' ? '◉' : key === 'orders' ? '▣' : key === 'products' ? '◇' : '✦'}</span>{label}</button>)}</nav>
      </aside>
      <section className="admin-main">
        <div className="admin-topbar"><div><span className="admin-mobile-label">Niffer COSMETICS HQ</span><strong>{section === 'overview' ? 'Dashboard' : section.charAt(0).toUpperCase() + section.slice(1)}</strong></div><div className="admin-topbar-actions"><span>Overview ⓘ</span><button aria-label="Notifications">♧</button><span className="admin-avatar small">N</span></div></div>
        <div className="admin-content">

      {section === 'overview' && (
        <div className="admin-overview">
        <div className="metric-grid admin-stat-grid">
          {[
            ['Revenue', dashboard?.revenue ? money(dashboard.revenue) : '—'],
            ['Orders', dashboard?.orders ?? '—'],
            ['Customers', dashboard?.customers ?? '—'],
            ['Products', dashboard?.products ?? '—'],
            ['Low stock', dashboard?.lowStock ?? '—'],
            ['Pending', dashboard?.pending ?? '—'],
          ].map(([label, value]) => (
            <div className="metric" key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
        <div className="admin-chart-grid"><div className="admin-chart-panel"><div className="admin-chart-heading"><h2>Sales & Orders Overview</h2><span>Last 7 days</span></div><div className="fake-chart"><i /><i /><i /><i /><i /><i /><i /></div><div className="chart-axis"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span></div></div><div className="admin-chart-panel traffic-panel"><h2>Store Overview</h2><div className="donut-chart"><span>{dashboard?.products ?? 0}</span></div><div className="traffic-legend"><span><i className="gold-dot" />Products</span><span><i className="pink-dot" />Customers</span><span><i className="blue-dot" />Orders</span></div></div></div>
        </div>
      )}

      {section === 'services' && <div className="admin-empty-panel"><p className="eyebrow">Product collections</p><h2>Manage cosmetics collections.</h2><p>Use Products & Inventory to add verified cosmetics, skincare, fragrance, and wholesale catalogue records. Only confirmed Niffer product information should be published.</p><button className="primary" onClick={() => setSection('products')}>Open products <span>→</span></button></div>}

      {section === 'products' && (
        <div className="admin-stack">
          <form className="admin-form" onSubmit={handleProductCreate}>
            <h3>Add verified product</h3>
            <div className="form-grid">
              <label>
                <span>Product name</span>
                <input value={productForm.name} onChange={(event) => setProductForm({ ...productForm, name: event.target.value })} placeholder="Official Niffer product name" required />
              </label>
              <label>
                <span>Category</span>
                <select value={productForm.categoryId} onChange={(event) => setProductForm({ ...productForm, categoryId: event.target.value })} required>
                  <option value="">Select category</option>
                  {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
              </label>

              <label className="full">
                <span>Description</span>
                <textarea value={productForm.description} onChange={(event) => setProductForm({ ...productForm, description: event.target.value })} rows="4" placeholder="Official product description" required />
              </label>

              <div className="inline-grid">
                <label>
                  <span>Price (TZS)</span>
                  <input type="number" min="0" value={productForm.price} onChange={(event) => setProductForm({ ...productForm, price: event.target.value })} required />
                </label>
                <label>
                  <span>Sale price (TZS)</span>
                  <input type="number" min="0" value={productForm.salePrice} onChange={(event) => setProductForm({ ...productForm, salePrice: event.target.value })} />
                </label>
              </div>

              <div className="inline-grid">
                <label>
                  <span>Size</span>
                  <input value={productForm.size} onChange={(event) => setProductForm({ ...productForm, size: event.target.value })} placeholder="e.g. 120ml" required />
                </label>
                <label>
                  <span>Stock</span>
                  <input type="number" min="0" value={productForm.stock} onChange={(event) => setProductForm({ ...productForm, stock: event.target.value })} />
                </label>
              </div>

              <div className="inline-grid">
                <label>
                  <span>SKU</span>
                  <input value={productForm.sku} onChange={(event) => setProductForm({ ...productForm, sku: event.target.value })} placeholder="Optional SKU" />
                </label>
                <label>
                  <span>Image URL</span>
                  <input value={productForm.image} onChange={(event) => setProductForm({ ...productForm, image: event.target.value })} placeholder="https://..." required />
                </label>
              </div>

              <div className="inline-grid">
                <label>
                  <span>Meta title</span>
                  <input value={productForm.metaTitle} onChange={(event) => setProductForm({ ...productForm, metaTitle: event.target.value })} placeholder="Optional SEO title" />
                </label>
                <label>
                  <span>Meta description</span>
                  <input value={productForm.metaDescription} onChange={(event) => setProductForm({ ...productForm, metaDescription: event.target.value })} placeholder="Optional SEO description" />
                </label>
              </div>

              <div className="check-grid">
                <label><input type="checkbox" checked={productForm.featured} onChange={(event) => setProductForm({ ...productForm, featured: event.target.checked })} /> Featured</label>
                <label><input type="checkbox" checked={productForm.bestSeller} onChange={(event) => setProductForm({ ...productForm, bestSeller: event.target.checked })} /> Best seller</label>
                <label><input type="checkbox" checked={productForm.newArrival} onChange={(event) => setProductForm({ ...productForm, newArrival: event.target.checked })} /> New arrival</label>
                <label><input type="checkbox" checked={productForm.isVerified} onChange={(event) => setProductForm({ ...productForm, isVerified: event.target.checked })} /> Verified</label>
                <label><input type="checkbox" checked={productForm.isPublic} onChange={(event) => setProductForm({ ...productForm, isPublic: event.target.checked })} /> Publish publicly</label>
              </div>
            </div>

            {formMessage && <p className="form-message">{formMessage}</p>}
            <button className="primary full" type="submit">Save product</button>
          </form>

          <form className="admin-form compact" onSubmit={handleCategoryCreate}>
            <h3>Categories</h3>
            <div className="inline-grid">
              <input value={categoryName} onChange={(event) => setCategoryName(event.target.value)} placeholder="Add official category" />
              <button className="primary" type="submit">Add</button>
            </div>
            {categories.length > 0 ? (
              <ul className="list-inline">{categories.map((category) => <li key={category.id}>{category.name}</li>)}</ul>
            ) : (
              <p className="form-note">No categories created yet. Add only confirmed Niffer categories.</p>
            )}
          </form>

          <div className="admin-table">
            <div className="table-row table-head">
              <span>Product</span>
              <span>Stock</span>
              <span>Price</span>
              <span>Action</span>
            </div>
            {products.map((product) => (
              <div className="table-row" key={product.id}>
                <span>{product.name}</span>
                <span className={product.stock <= product.lowStockThreshold ? 'warning' : ''}>{product.stock}</span>
                <span>{money(product.salePrice || product.price)}</span>
                <button className="small-button" onClick={() => adjustStock(product.id)}>Adjust stock</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {section === 'orders' && (
        <div className="admin-table">
          <div className="table-row table-head">
            <span>Order</span>
            <span>Customer</span>
            <span>Total</span>
            <span>Status</span>
          </div>
          {orders.map((item) => (
            <div className="table-row" key={item.id}>
              <span>#{item.id}</span>
              <span>{item.customer_name}</span>
              <span>{money(item.total)}</span>
              <select value={item.status} onChange={(event) => updateStatus(item.id, event.target.value)}>
                {['PENDING', 'CONFIRMED', 'PROCESSING', 'READY_FOR_DELIVERY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'].map((status) => <option key={status}>{status}</option>)}
              </select>
            </div>
          ))}
        </div>
      )}

      {section === 'customers' && (
        <div className="admin-table">
          <div className="table-row table-head">
            <span>Name</span>
            <span>Email</span>
            <span>Phone</span>
            <span>Orders</span>
          </div>
          {customers.map((customer) => (
            <div className="table-row" key={customer.id}>
              <span>{customer.name}</span>
              <span>{customer.email}</span>
              <span>{customer.phone || '—'}</span>
              <span>{customer.order_count}</span>
            </div>
          ))}
        </div>
      )}

      {section === 'settings' && (
        <div className="admin-stack">
          <form className="admin-form" onSubmit={handleSettingsSave}>
            <h3>Business settings</h3>
            <div className="form-grid">
              <label>
                <span>Business name</span>
                <input value={settings.businessName} onChange={(event) => setSettings({ ...settings, businessName: event.target.value })} placeholder="Official Niffer Cosmetics name" />
              </label>
              <label>
                <span>Phone</span>
                <input value={settings.phone} onChange={(event) => setSettings({ ...settings, phone: event.target.value })} placeholder="Official phone" />
              </label>
              <label>
                <span>WhatsApp</span>
                <input value={settings.whatsapp} onChange={(event) => setSettings({ ...settings, whatsapp: event.target.value })} placeholder="Official WhatsApp number" />
              </label>
              <label>
                <span>Email</span>
                <input type="email" value={settings.email} onChange={(event) => setSettings({ ...settings, email: event.target.value })} placeholder="Official email" />
              </label>
              <label className="full">
                <span>Address</span>
                <textarea value={settings.address} onChange={(event) => setSettings({ ...settings, address: event.target.value })} rows="3" placeholder="Official business address" />
              </label>
              <label>
                <span>Instagram</span>
                <input value={settings.instagram} onChange={(event) => setSettings({ ...settings, instagram: event.target.value })} placeholder="Instagram URL" />
              </label>
              <label>
                <span>Facebook</span>
                <input value={settings.facebook} onChange={(event) => setSettings({ ...settings, facebook: event.target.value })} placeholder="Facebook URL" />
              </label>
              <label>
                <span>TikTok</span>
                <input value={settings.tiktok} onChange={(event) => setSettings({ ...settings, tiktok: event.target.value })} placeholder="TikTok URL" />
              </label>
              <label className="full">
                <span>Delivery regions</span>
                <textarea value={settings.deliveryRegions} onChange={(event) => setSettings({ ...settings, deliveryRegions: event.target.value })} rows="2" placeholder="e.g. Dar es Salaam, Arusha, Zanzibar" />
              </label>
              <label className="full">
                <span>Delivery charges</span>
                <textarea value={settings.deliveryCharges} onChange={(event) => setSettings({ ...settings, deliveryCharges: event.target.value })} rows="2" placeholder="Delivery cost by region" />
              </label>
              <label className="full">
                <span>Payment methods</span>
                <textarea value={settings.paymentMethods} onChange={(event) => setSettings({ ...settings, paymentMethods: event.target.value })} rows="2" placeholder="e.g. M-Pesa, cash on delivery" />
              </label>
            </div>
            {formMessage && <p className="form-message">{formMessage}</p>}
            <button className="primary full" type="submit">Save business settings</button>
          </form>

          <form className="admin-form" onSubmit={handleFounderSave}>
            <h3>Founder profile</h3>
            <div className="form-grid">
              <label>
                <span>Founder name</span>
                <input value={founder.name} onChange={(event) => setFounder({ ...founder, name: event.target.value })} placeholder="Official founder name" />
              </label>
              <label>
                <span>Title</span>
                <input value={founder.title} onChange={(event) => setFounder({ ...founder, title: event.target.value })} placeholder="Official title" />
              </label>
              <label className="full">
                <span>Profile image URL</span>
                <input value={founder.image} onChange={(event) => setFounder({ ...founder, image: event.target.value })} placeholder="https://..." />
              </label>
              <label className="full">
                <span>Biography</span>
                <textarea value={founder.bio} onChange={(event) => setFounder({ ...founder, bio: event.target.value })} rows="4" placeholder="Verified founder biography" />
              </label>
              <label className="full">
                <span>Message</span>
                <textarea value={founder.message} onChange={(event) => setFounder({ ...founder, message: event.target.value })} rows="3" placeholder="Brand message" />
              </label>
            </div>
            <button className="primary full" type="submit">Save founder profile</button>
          </form>
        </div>
      )}
        </div>
      </section>
    </main>
  )
}

export default App
