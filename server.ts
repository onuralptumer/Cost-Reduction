import express from 'express';
import path from 'path';
import cors from 'cors';
import Database from 'better-sqlite3';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// SQLite setup
const db = new Database('costtrack.db');

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS fields (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    options TEXT,
    required INTEGER DEFAULT 0,
    showInTable INTEGER DEFAULT 1,
    order_index INTEGER DEFAULT 0,
    isSystem INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS financials (
    id TEXT PRIMARY KEY,
    year INTEGER NOT NULL,
    month TEXT NOT NULL,
    cogs REAL DEFAULT 0,
    annualTarget REAL DEFAULT 0,
    targetPercent REAL DEFAULT 0,
    note TEXT
  );
`);

// Migration for existing tables
try {
  db.prepare('ALTER TABLE fields ADD COLUMN order_index INTEGER DEFAULT 0').run();
} catch (e) {
  // Column might already exist
}

try {
  db.prepare('ALTER TABLE fields ADD COLUMN showInTable INTEGER DEFAULT 1').run();
} catch (e) {
  // Column might already exist
}

try {
  db.prepare('ALTER TABLE fields ADD COLUMN isSystem INTEGER DEFAULT 0').run();
} catch (e) {
  // Column might already exist
}

// Mark core fields as system fields and ensure they exist
const mandatorySystemFields = [
  { id: 'f_no', name: 'Proje No', type: 'text', required: 1, showInTable: 1, isSystem: 1, orderIndex: 0 },
  { id: 'f_name', name: 'Proje Adı', type: 'text', required: 1, showInTable: 1, isSystem: 1, orderIndex: 1 },
  { id: 'f_champ', name: 'Proje Şampiyonu', type: 'text', required: 0, showInTable: 1, isSystem: 1, orderIndex: 3 },
  { id: 'f_leader', name: 'Proje Lideri', type: 'text', required: 0, showInTable: 1, isSystem: 1, orderIndex: 4 },
  { id: 'f_start', name: 'Başlangıç Tarihi', type: 'date', required: 0, showInTable: 1, isSystem: 1, orderIndex: 6 },
  { id: 'f_real', name: 'Gerçekleşme Tarihi', type: 'date', required: 0, showInTable: 0, isSystem: 1, orderIndex: 8 },
  { id: 'f_end', name: 'Termin Tarihi', type: 'date', required: 0, showInTable: 1, isSystem: 1, orderIndex: 7 },
  { id: 'f_savings', name: 'Beklenen Kazanç', type: 'number', required: 0, showInTable: 1, isSystem: 1, orderIndex: 5 },
  { id: 'f_status', name: 'Durum', type: 'select', required: 1, showInTable: 1, isSystem: 1, orderIndex: 9 },
  { id: 'f_desc', name: 'Açıklama', type: 'textarea', required: 0, showInTable: 0, isSystem: 1, orderIndex: 10 },
  { id: 'f_notes', name: 'Aksiyon Notları', type: 'textarea', required: 0, showInTable: 0, isSystem: 1, orderIndex: 11 }
];

const insertSystemField = db.prepare(`
  INSERT OR IGNORE INTO fields (id, name, type, required, showInTable, isSystem, order_index)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const updateSystemFieldStatus = db.prepare(`
  UPDATE fields SET isSystem = 1 WHERE id = ?
`);

mandatorySystemFields.forEach(f => {
  insertSystemField.run(f.id, f.name, f.type, f.required, f.showInTable, f.isSystem, f.orderIndex);
  updateSystemFieldStatus.run(f.id);
});

// Remove f_priority from system fields
db.prepare(`UPDATE fields SET isSystem = 0 WHERE id = 'f_priority'`).run();

// Update f_status options to strictly match requested values
const statusOptions = JSON.stringify([
  { value: 'Tamamlandı', label: 'Tamamlandı' },
  { value: 'Devam Ediyor', label: 'Devam Ediyor' },
  { value: 'İptal', label: 'İptal' },
  { value: 'Fikir Aşamasında', label: 'Fikir Aşamasında' },
  { value: 'Hesaplama Bekliyor', label: 'Hesaplama Bekliyor' },
  { value: 'Başarısız', label: 'Başarısız' }
]);
db.prepare(`UPDATE fields SET options = ? WHERE id = 'f_status'`).run(statusOptions);

// API Routes
// Fields
app.get('/api/fields', (req, res) => {
  const fields = db.prepare('SELECT * FROM fields ORDER BY order_index ASC').all();
  res.json(fields.map((f: any) => ({
    ...f,
    showInTable: !!f.showInTable,
    isSystem: !!f.isSystem,
    orderIndex: f.order_index,
    options: f.options ? JSON.parse(f.options) : undefined,
    required: !!f.required
  })));
});

app.post('/api/fields', (req, res) => {
  const { id, name, type, options, required, orderIndex, showInTable, isSystem } = req.body;
  db.prepare('INSERT OR REPLACE INTO fields (id, name, type, options, required, order_index, showInTable, isSystem) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(id, name, type, options ? JSON.stringify(options) : null, required ? 1 : 0, orderIndex || 0, showInTable ? 1 : 0, isSystem ? 1 : 0);
  res.json({ success: true });
});

app.delete('/api/fields/:id', (req, res) => {
  db.prepare('DELETE FROM fields WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Projects
app.get('/api/projects', (req, res) => {
  const projects = db.prepare('SELECT * FROM projects').all();
  res.json(projects.map((p: any) => JSON.parse(p.data)));
});

app.post('/api/projects', (req, res) => {
  const project = req.body;
  db.prepare('INSERT OR REPLACE INTO projects (id, data) VALUES (?, ?)')
    .run(project.id, JSON.stringify(project));
  res.json({ success: true });
});

app.delete('/api/projects/:id', (req, res) => {
  db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Financials
app.get('/api/financials', (req, res) => {
  const financials = db.prepare('SELECT * FROM financials').all();
  res.json(financials);
});

app.post('/api/financials', (req, res) => {
  const { id, year, month, cogs, annualTarget, targetPercent, note } = req.body;
  db.prepare('INSERT OR REPLACE INTO financials (id, year, month, cogs, annualTarget, targetPercent, note) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(id, year, month, cogs, annualTarget, targetPercent, note);
  res.json({ success: true });
});

app.delete('/api/financials/:id', (req, res) => {
  db.prepare('DELETE FROM financials WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
