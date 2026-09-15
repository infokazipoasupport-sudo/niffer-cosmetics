import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import db from '../database/db.js'
import { requireAuth, signUser } from '../middleware/auth.js'

const router = Router()
const credentials = z.object({ email: z.string().email(), password: z.string().min(8), name: z.string().min(2).optional(), phone: z.string().optional() })
const safeUser = (user) => ({ id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role })

router.post('/register', (req, res) => {
  const parsed = credentials.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ message: 'Enter a valid email and a password of at least 8 characters.' })
  const data = parsed.data
  if (db.prepare('SELECT id FROM users WHERE email = ?').get(data.email.toLowerCase())) return res.status(409).json({ message: 'An account already exists for that email.' })
  const result = db.prepare('INSERT INTO users (name, email, phone, password_hash) VALUES (?, ?, ?, ?)').run(data.name || data.email.split('@')[0], data.email.toLowerCase(), data.phone || '', bcrypt.hashSync(data.password, 12))
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid)
  res.status(201).json({ user: safeUser(user), token: signUser(user) })
})

router.post('/login', (req, res) => {
  const parsed = credentials.pick({ email: true, password: true }).safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ message: 'Enter your email and password.' })
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(parsed.data.email.toLowerCase())
  if (!user || !bcrypt.compareSync(parsed.data.password, user.password_hash)) return res.status(401).json({ message: 'Email or password is incorrect.' })
  res.json({ user: safeUser(user), token: signUser(user) })
})

router.get('/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)
  if (!user) return res.status(404).json({ message: 'Account not found.' })
  res.json(safeUser(user))
})

export default router
