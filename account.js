import { Router } from 'express'
import { z } from 'zod'
import db from './db.js'
import { requireAuth } from './middleware-auth.js'

const router = Router()
router.use(requireAuth)

router.get('/orders', (req, res) => res.json(db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id)))
router.get('/addresses', (req, res) => res.json(db.prepare('SELECT * FROM customer_addresses WHERE user_id = ? ORDER BY id DESC').all(req.user.id)))
router.post('/addresses', (req, res) => {
  const parsed = z.object({ label: z.string().min(1), region: z.string().min(1), city: z.string().min(1), address: z.string().min(1), instructions: z.string().optional() }).safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ message: 'Complete the address fields.' })
  const result = db.prepare('INSERT INTO customer_addresses (user_id, label, region, city, address, instructions) VALUES (?, ?, ?, ?, ?, ?)').run(req.user.id, parsed.data.label, parsed.data.region, parsed.data.city, parsed.data.address, parsed.data.instructions || '')
  res.status(201).json(db.prepare('SELECT * FROM customer_addresses WHERE id = ?').get(result.lastInsertRowid))
})
router.get('/wishlist', (req, res) => res.json(db.prepare('SELECT p.* FROM wishlists w JOIN products p ON p.id = w.product_id WHERE w.user_id = ? ORDER BY w.created_at DESC').all(req.user.id)))
router.post('/wishlist/:productId', (req, res) => { db.prepare('INSERT OR IGNORE INTO wishlists (user_id, product_id) VALUES (?, ?)').run(req.user.id, req.params.productId); res.status(201).json({ ok: true }) })
router.delete('/wishlist/:productId', (req, res) => { db.prepare('DELETE FROM wishlists WHERE user_id = ? AND product_id = ?').run(req.user.id, req.params.productId); res.status(204).end() })
router.put('/profile', (req, res) => { const parsed = z.object({ name: z.string().min(2), phone: z.string().optional() }).safeParse(req.body); if (!parsed.success) return res.status(400).json({ message: 'Enter a valid name.' }); db.prepare('UPDATE users SET name = ?, phone = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(parsed.data.name, parsed.data.phone || '', req.user.id); res.json(db.prepare('SELECT id, name, email, phone, role FROM users WHERE id = ?').get(req.user.id)) })
export default router
