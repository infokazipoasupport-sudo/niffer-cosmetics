import Database from 'better-sqlite3'
import bcrypt from 'bcryptjs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = process.cwd()
const db = new Database(path.join(root, 'Niffer.sqlite'))
db.pragma('journal_mode = WAL')

const ensureColumn = (table, column, definition) => {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all()
  if (!columns.some((item) => item.name === column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)
}

db.exec(`
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    price INTEGER NOT NULL,
    sale_price INTEGER,
    image TEXT NOT NULL,
    stock INTEGER NOT NULL DEFAULT 0,
    size TEXT NOT NULL DEFAULT '',
    featured INTEGER NOT NULL DEFAULT 0,
    new_arrival INTEGER NOT NULL DEFAULT 0,
    best_seller INTEGER NOT NULL DEFAULT 0,
    category_id INTEGER REFERENCES categories(id),
    is_verified INTEGER NOT NULL DEFAULT 0,
    is_public INTEGER NOT NULL DEFAULT 0,
    meta_title TEXT NOT NULL DEFAULT '',
    meta_description TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    region TEXT NOT NULL,
    city TEXT NOT NULL,
    address TEXT NOT NULL,
    delivery_instructions TEXT,
    total INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL REFERENCES orders(id),
    product_id INTEGER NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL,
    price INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'CUSTOMER',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS product_images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    alt_text TEXT NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS product_variants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sku TEXT NOT NULL UNIQUE,
    price INTEGER,
    stock INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS inventory_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL REFERENCES products(id),
    quantity_change INTEGER NOT NULL,
    reason TEXT NOT NULL,
    created_by INTEGER REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS customer_addresses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    label TEXT NOT NULL DEFAULT 'Default',
    region TEXT NOT NULL,
    city TEXT NOT NULL,
    address TEXT NOT NULL,
    instructions TEXT
  );
  CREATE TABLE IF NOT EXISTS wishlists (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, product_id)
  );
  CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id),
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    body TEXT NOT NULL,
    approved INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS coupons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL CHECK (type IN ('PERCENTAGE', 'FIXED')),
    value INTEGER NOT NULL,
    minimum_order INTEGER NOT NULL DEFAULT 0,
    expires_at TEXT,
    usage_limit INTEGER,
    usage_count INTEGER NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1
  );
  CREATE TABLE IF NOT EXISTS branches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    phone TEXT,
    opening_hours TEXT,
    latitude REAL,
    longitude REAL,
    maps_url TEXT,
    published INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS founder_profile (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    name TEXT NOT NULL DEFAULT '',
    title TEXT NOT NULL DEFAULT '',
    image TEXT NOT NULL DEFAULT '',
    bio TEXT NOT NULL DEFAULT '',
    message TEXT NOT NULL DEFAULT ''
  );
  CREATE TABLE IF NOT EXISTS website_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL DEFAULT ''
  );
  CREATE TABLE IF NOT EXISTS contact_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    message TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL REFERENCES orders(id),
    provider TEXT NOT NULL,
    reference TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING',
    amount INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`)

ensureColumn('products', 'sku', "TEXT NOT NULL DEFAULT ''")
ensureColumn('products', 'low_stock_threshold', 'INTEGER NOT NULL DEFAULT 5')
ensureColumn('products', 'updated_at', 'TEXT')
ensureColumn('products', 'is_verified', 'INTEGER NOT NULL DEFAULT 0')
ensureColumn('products', 'is_public', 'INTEGER NOT NULL DEFAULT 0')
ensureColumn('products', 'size', "TEXT NOT NULL DEFAULT ''")
ensureColumn('products', 'meta_title', "TEXT NOT NULL DEFAULT ''")
ensureColumn('products', 'meta_description', "TEXT NOT NULL DEFAULT ''")
ensureColumn('products', 'is_test', 'INTEGER NOT NULL DEFAULT 1')
ensureColumn('categories', 'is_active', 'INTEGER NOT NULL DEFAULT 1')
ensureColumn('orders', 'user_id', 'INTEGER REFERENCES users(id)')

const updateUnverifiedFlag = db.prepare('UPDATE products SET is_test = 1, is_verified = 0, is_public = 0 WHERE is_test IS NULL OR is_verified IS NULL OR is_public IS NULL')
updateUnverifiedFlag.run()

const demoCategoryIds = db.prepare(`SELECT id FROM categories WHERE lower(name) LIKE '%demo%' OR lower(slug) LIKE '%demo%' OR lower(name) LIKE '%test data%' OR lower(slug) LIKE '%test data%'`).all().map((row) => row.id)
if (demoCategoryIds.length) {
  const placeholderProductIds = db.prepare('SELECT id FROM products WHERE category_id IN (' + demoCategoryIds.map(() => '?').join(',') + ')').all(...demoCategoryIds).map((row) => row.id)
  if (placeholderProductIds.length) db.prepare('DELETE FROM order_items WHERE product_id IN (' + placeholderProductIds.map(() => '?').join(',') + ')').run(...placeholderProductIds)
  if (placeholderProductIds.length) db.prepare('DELETE FROM products WHERE id IN (' + placeholderProductIds.map(() => '?').join(',') + ')').run(...placeholderProductIds)
  db.prepare('DELETE FROM categories WHERE id IN (' + demoCategoryIds.map(() => '?').join(',') + ')').run(...demoCategoryIds)
}

const demoProductIds = db.prepare(`SELECT id FROM products WHERE lower(name) LIKE '%test data%' OR lower(slug) LIKE '%test%' OR lower(description) LIKE '%placeholder%'`).all().map((row) => row.id)
if (demoProductIds.length) {
  db.prepare('DELETE FROM order_items WHERE product_id IN (' + demoProductIds.map(() => '?').join(',') + ')').run(...demoProductIds)
  db.prepare('DELETE FROM products WHERE id IN (' + demoProductIds.map(() => '?').join(',') + ')').run(...demoProductIds)
}

if (!db.prepare('SELECT id FROM founder_profile WHERE id = 1').get()) db.prepare('INSERT INTO founder_profile (id) VALUES (1)').run()

const adminEmail = process.env.ADMIN_EMAIL
const adminPassword = process.env.ADMIN_PASSWORD
if (adminEmail && adminPassword && !db.prepare('SELECT id FROM users WHERE email = ?').get(adminEmail.toLowerCase())) {
  db.prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)').run('Niffer Administrator', adminEmail.toLowerCase(), bcrypt.hashSync(adminPassword, 12), 'ADMIN')
}

export default db
