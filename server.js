import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import db from './database/db.js'
import authRoutes from './routes/auth.js'
import accountRoutes from './routes/account.js'
import adminRoutes from './routes/admin.js'
import publicRoutes from './routes/public.js'
import { optionalAuth } from './middleware/auth.js'
import { paymentService } from './services/paymentService.js'

const app = express()
const port = Number(process.env.PORT || 4000)
const allowedStatuses = ['PENDING', 'CONFIRMED', 'PROCESSING', 'READY_FOR_DELIVERY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED']
const allowedOrigins = [process.env.CLIENT_URL].filter(Boolean)

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || /^http:\/\/localhost:\d+$/.test(origin)) return callback(null, true)
    callback(new Error('CORS origin not allowed'))
  },
  credentials: true
}))
app.use(express.json())
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 120 }))
app.use('/uploads', express.static(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../uploads'), { dotfiles: 'deny', index: false }))
app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'Niffer-api' }))
app.use('/api/auth', authRoutes)
app.use('/api/account', accountRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api', publicRoutes)

app.get('/api/categories', (_req, res) => {
  const rows = db.prepare(`SELECT c.* FROM categories c
    WHERE c.is_active = 1
      AND EXISTS (
        SELECT 1 FROM products p
        WHERE p.category_id = c.id
          AND p.is_verified = 1
          AND p.is_public = 1
      )
    ORDER BY c.name`).all()
  res.json(rows)
})

app.get('/api/settings', (_req, res) => {
  const rows = Object.fromEntries(db.prepare('SELECT key, value FROM website_settings').all().map((item) => [item.key, item.value]))
  res.json(rows)
})

app.get('/api/products', (req, res) => {
  const { search = '', category = '', sort = 'newest' } = req.query
  const order = { newest: 'p.created_at DESC', 'price-low': 'COALESCE(p.sale_price, p.price) ASC', 'price-high': 'COALESCE(p.sale_price, p.price) DESC', popular: 'p.best_seller DESC', featured: 'p.featured DESC' }[sort] || 'p.created_at DESC'
  const rows = db.prepare(`SELECT p.*, c.name AS category_name, c.slug AS category_slug FROM products p LEFT JOIN categories c ON c.id = p.category_id WHERE p.is_verified = 1 AND p.is_public = 1 AND (p.name LIKE @search OR p.description LIKE @search) AND (@category = '' OR c.slug = @category) ORDER BY ${order}`).all({ search: `%${search}%`, category })
  res.json(rows.map((row) => ({ ...row, featured: Boolean(row.featured), newArrival: Boolean(row.new_arrival), bestSeller: Boolean(row.best_seller), salePrice: row.sale_price, category: row.category_name, isVerified: Boolean(row.is_verified), isPublic: Boolean(row.is_public), isTest: Boolean(row.is_test) })))
})

app.get('/api/products/:slug', (req, res) => {
  const product = db.prepare('SELECT p.*, c.name AS category_name FROM products p LEFT JOIN categories c ON c.id = p.category_id WHERE p.slug = ? AND p.is_verified = 1 AND p.is_public = 1').get(req.params.slug)
  if (!product) return res.status(404).json({ message: 'Product not found' })
  res.json({ ...product, category: product.category_name, salePrice: product.sale_price, isVerified: Boolean(product.is_verified), isPublic: Boolean(product.is_public), isTest: Boolean(product.is_test) })
})

app.post('/api/orders', optionalAuth, (req, res) => {
  const { customer, items, delivery } = req.body
  if (!customer?.name || !customer?.phone || !delivery?.region || !delivery?.city || !delivery?.address || !Array.isArray(items) || items.length === 0) return res.status(400).json({ message: 'Complete customer, delivery, and cart details are required.' })
  const order = db.transaction(() => {
    let total = 0
    const resolved = items.map((item) => {
      const product = db.prepare('SELECT id, name, price, sale_price, stock FROM products WHERE id = ?').get(item.productId)
      if (!product || product.stock < item.quantity) throw new Error(`${product?.name || 'Product'} is unavailable in that quantity.`)
      const price = product.sale_price || product.price
      total += price * item.quantity
      return { ...product, quantity: item.quantity, price }
    })
    const result = db.prepare('INSERT INTO orders (user_id, customer_name, phone, email, region, city, address, delivery_instructions, total) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(req.user?.id || null, customer.name, customer.phone, customer.email || '', delivery.region, delivery.city, delivery.address, delivery.instructions || '', total)
    const insertItem = db.prepare('INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)')
    const decrement = db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?')
    resolved.forEach((item) => { insertItem.run(result.lastInsertRowid, item.id, item.quantity, item.price); decrement.run(item.quantity, item.id) })
    return { id: result.lastInsertRowid, total, status: 'PENDING' }
  })()
  res.status(201).json(order)
})

app.get('/api/orders', (_req, res) => {
  const orders = db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all()
  res.json(orders)
})

app.put('/api/orders/:id/status', (req, res) => {
  if (!allowedStatuses.includes(req.body.status)) return res.status(400).json({ message: 'Invalid order status.' })
  const result = db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(req.body.status, req.params.id)
  if (!result.changes) return res.status(404).json({ message: 'Order not found.' })
  res.json(db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id))
})

app.get('/api/orders/:id/whatsapp', (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id)
  const settings = Object.fromEntries(db.prepare('SELECT key, value FROM website_settings').all().map((item) => [item.key, item.value]))
  const number = settings.whatsapp || process.env.WHATSAPP_NUMBER || ''
  if (!order || !number) return res.status(404).json({ message: 'Order or verified WhatsApp number is not configured.' })
  const items = db.prepare('SELECT oi.quantity, oi.price, p.name FROM order_items oi JOIN products p ON p.id = oi.product_id WHERE oi.order_id = ?').all(order.id)
  const message = [`${settings.businessName || 'Niffer Cosmetics'} order #${order.id}`, `Customer: ${order.customer_name}`, ...items.map((item) => `${item.name} x${item.quantity} - TZS ${item.price * item.quantity}`), `Total: TZS ${order.total}`, `Delivery: ${order.city}, ${order.address}`].join('\n')
  res.json({ url: `https://wa.me/${number.replace(/\D/g, '')}?text=${encodeURIComponent(message)}` })
})

app.post('/api/orders/:id/payment-intent', async (req, res) => {
  const order = db.prepare('SELECT id, total FROM orders WHERE id = ?').get(req.params.id)
  if (!order) return res.status(404).json({ message: 'Order not found.' })
  const intent = await paymentService.createIntent({ orderId: order.id, amount: order.total, provider: req.body.provider })
  const result = db.prepare('INSERT INTO payments (order_id, provider, status, amount) VALUES (?, ?, ?, ?)').run(order.id, intent.provider, intent.status, order.total)
  res.status(202).json({ ...intent, paymentId: result.lastInsertRowid })
})

app.use((error, _req, res, _next) => {
  console.error(error)
  res.status(500).json({ message: error.message || 'Unexpected server error.' })
})
app.listen(port, () => console.log(`Niffer API listening on http://localhost:${port}`))
