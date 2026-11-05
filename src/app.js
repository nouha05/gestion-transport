const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const pool = require('./config/db');

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('combined'));

app.get('/api/health', async (req, res) => {
  try {
    const r = await pool.query('SELECT NOW()');
    res.json({ status: 'ok', db_time: r.rows[0].now });
  } catch (e) {
    res.status(500).json({ status: 'error', message: e.message });
  }
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/trajets', require('./routes/trajets'));
app.use('/api/vehicules', require('./routes/vehicules'));
app.use('/api/reservations', require('./routes/reservations'));

app.use((req, res) => res.status(404).json({ message: 'Route introuvable' }));

app.use((err, req, res, next) => {
  console.error(err);
  if (err.code === '23503')
    return res.status(400).json({ message: 'Référence invalide (véhicule, chauffeur ou trajet inexistant)' });
  res.status(500).json({ message: 'Erreur serveur' });
});

module.exports = app;
