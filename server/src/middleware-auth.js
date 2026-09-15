import jwt from 'jsonwebtoken'

const secret = process.env.JWT_SECRET || 'local-development-only-change-me'

export const signUser = (user) => jwt.sign({ id: user.id, role: user.role, email: user.email }, secret, { expiresIn: '7d' })

export const requireAuth = (req, res, next) => {
  const token = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null
  if (!token) return res.status(401).json({ message: 'Authentication required.' })
  try { req.user = jwt.verify(token, secret); next() } catch { return res.status(401).json({ message: 'Session expired. Please sign in again.' }) }
}

export const optionalAuth = (req, _res, next) => {
  const token = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null
  if (token) {
    try { req.user = jwt.verify(token, secret) } catch { /* Anonymous checkout remains supported. */ }
  }
  next()
}

export const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'ADMIN') return res.status(403).json({ message: 'Administrator access required.' })
  next()
}
