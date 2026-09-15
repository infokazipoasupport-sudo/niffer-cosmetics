import { Router } from 'express'
import db from './db.js'
import { requireAuth } from './middleware-auth.js'

const router = Router()
router.get('/content', (_req, res) => {
  const settings = Object.fromEntries(db.prepare('SELECT key, value FROM website_settings').all().map((item) => [item.key, item.value]))
  res.json({ settings, founder: db.prepare('SELECT * FROM founder_profile WHERE id = 1').get(), branches: db.prepare('SELECT * FROM branches WHERE published = 1 ORDER BY name').all() })
})
router.get('/products/:id/reviews', (req, res) => res.json(db.prepare('SELECT r.id, r.rating, r.body, r.created_at, u.name AS customer FROM reviews r JOIN users u ON u.id = r.user_id WHERE r.product_id = ? AND r.approved = 1 ORDER BY r.created_at DESC').all(req.params.id)))
router.post('/products/:id/reviews', requireAuth, (req, res) => { const rating = Number(req.body.rating); const body = String(req.body.body || '').trim(); if (!Number.isInteger(rating) || rating < 1 || rating > 5 || !body) return res.status(400).json({ message: 'Rating and review text are required.' }); const result = db.prepare('INSERT INTO reviews (product_id, user_id, rating, body) VALUES (?, ?, ?, ?)').run(req.params.id, req.user.id, rating, body); res.status(201).json({ id: result.lastInsertRowid, message: 'Review submitted for approval.' }) })
router.post('/contact', (req, res) => { const { name, email, phone, message } = req.body; if (!name || !message) return res.status(400).json({ message: 'Name and message are required.' }); db.prepare('INSERT INTO contact_messages (name, email, phone, message) VALUES (?, ?, ?, ?)').run(name, email || '', phone || '', message); res.status(201).json({ message: 'Your message has been received.' }) })
export default router
