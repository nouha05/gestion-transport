const router = require('express').Router();
const { body, param } = require('express-validator');
const pool = require('../config/db');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');

const rules = [
  body('immatriculation').trim().notEmpty(),
  body('marque').trim().notEmpty(),
  body('modele').trim().notEmpty(),
  body('capacite').isInt({ min: 1 }),
  body('statut').optional().isIn(['disponible', 'en_service', 'maintenance']),
];
const idRule = param('id').isInt();

router.use(authenticate);

router.get('/', authorize('admin', 'chauffeur'), async (req, res, next) => {
  try {
    const r = await pool.query('SELECT * FROM vehicules ORDER BY id');
    res.json(r.rows);
  } catch (e) { next(e); }
});

router.post('/', authorize('admin'), rules, validate, async (req, res, next) => {
  try {
    const b = req.body;
    const r = await pool.query(
      `INSERT INTO vehicules (immatriculation, marque, modele, capacite, statut)
       VALUES ($1,$2,$3,$4, COALESCE($5,'disponible')) RETURNING *`,
      [b.immatriculation, b.marque, b.modele, b.capacite, b.statut || null]);
    res.status(201).json(r.rows[0]);
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ message: 'Immatriculation déjà utilisée' });
    next(e);
  }
});

router.put('/:id', authorize('admin'), idRule, rules, validate, async (req, res, next) => {
  try {
    const b = req.body;
    const r = await pool.query(
      `UPDATE vehicules SET immatriculation=$1, marque=$2, modele=$3, capacite=$4,
         statut=COALESCE($5, statut) WHERE id=$6 RETURNING *`,
      [b.immatriculation, b.marque, b.modele, b.capacite, b.statut || null, req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ message: 'Véhicule introuvable' });
    res.json(r.rows[0]);
  } catch (e) { next(e); }
});

router.delete('/:id', authorize('admin'), idRule, validate, async (req, res, next) => {
  try {
    const r = await pool.query('DELETE FROM vehicules WHERE id=$1 RETURNING id', [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ message: 'Véhicule introuvable' });
    res.status(204).end();
  } catch (e) { next(e); }
});

module.exports = router;
