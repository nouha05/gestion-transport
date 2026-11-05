const router = require('express').Router();
const { body, param, query } = require('express-validator');
const pool = require('../config/db');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');

const rules = [
  body('depart').trim().notEmpty(),
  body('arrivee').trim().notEmpty(),
  body('date_depart').isISO8601(),
  body('date_arrivee').optional({ nullable: true }).isISO8601(),
  body('prix').isFloat({ min: 0 }),
  body('places_total').isInt({ min: 1 }),
  body('vehicule_id').optional({ nullable: true }).isInt(),
  body('chauffeur_id').optional({ nullable: true }).isInt(),
  body('statut').optional().isIn(['planifie', 'en_cours', 'termine', 'annule']),
];
const idRule = param('id').isInt();

const SELECT = `
  SELECT t.*, (t.places_total - COALESCE((
    SELECT SUM(r.nb_places) FROM reservations r
    WHERE r.trajet_id = t.id AND r.statut <> 'annulee'), 0))::int AS places_restantes
  FROM trajets t`;

router.get('/', query('date').optional().isISO8601(), validate, async (req, res, next) => {
  try {
    const { depart, arrivee, date } = req.query;
    const r = await pool.query(
      `${SELECT}
       WHERE ($1::text IS NULL OR t.depart ILIKE '%' || $1 || '%')
         AND ($2::text IS NULL OR t.arrivee ILIKE '%' || $2 || '%')
         AND ($3::date IS NULL OR t.date_depart::date = $3::date)
       ORDER BY t.date_depart`,
      [depart || null, arrivee || null, date || null]);
    res.json(r.rows);
  } catch (e) { next(e); }
});

router.get('/:id', idRule, validate, async (req, res, next) => {
  try {
    const r = await pool.query(`${SELECT} WHERE t.id = $1`, [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ message: 'Trajet introuvable' });
    res.json(r.rows[0]);
  } catch (e) { next(e); }
});

router.post('/', authenticate, authorize('admin'), rules, validate, async (req, res, next) => {
  try {
    const b = req.body;
    const r = await pool.query(
      `INSERT INTO trajets (depart, arrivee, date_depart, date_arrivee, prix,
                            places_total, vehicule_id, chauffeur_id, statut)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8, COALESCE($9,'planifie')) RETURNING *`,
      [b.depart, b.arrivee, b.date_depart, b.date_arrivee || null, b.prix,
       b.places_total, b.vehicule_id || null, b.chauffeur_id || null, b.statut || null]);
    res.status(201).json(r.rows[0]);
  } catch (e) { next(e); }
});

router.put('/:id', authenticate, authorize('admin'), idRule, rules, validate, async (req, res, next) => {
  try {
    const b = req.body;
    const r = await pool.query(
      `UPDATE trajets SET depart=$1, arrivee=$2, date_depart=$3, date_arrivee=$4,
         prix=$5, places_total=$6, vehicule_id=$7, chauffeur_id=$8,
         statut=COALESCE($9, statut)
       WHERE id=$10 RETURNING *`,
      [b.depart, b.arrivee, b.date_depart, b.date_arrivee || null, b.prix,
       b.places_total, b.vehicule_id || null, b.chauffeur_id || null,
       b.statut || null, req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ message: 'Trajet introuvable' });
    res.json(r.rows[0]);
  } catch (e) { next(e); }
});

router.delete('/:id', authenticate, authorize('admin'), idRule, validate, async (req, res, next) => {
  try {
    const r = await pool.query('DELETE FROM trajets WHERE id=$1 RETURNING id', [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ message: 'Trajet introuvable' });
    res.status(204).end();
  } catch (e) { next(e); }
});

module.exports = router;
