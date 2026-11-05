const router = require('express').Router();
const { body, param } = require('express-validator');
const pool = require('../config/db');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

const JOIN = `
  SELECT r.*, t.depart, t.arrivee, t.date_depart, t.prix
  FROM reservations r JOIN trajets t ON t.id = r.trajet_id`;

router.post('/', authorize('client', 'admin'),
  body('trajet_id').isInt(),
  body('nb_places').optional().isInt({ min: 1 }),
  validate,
  async (req, res, next) => {
    const trajetId = req.body.trajet_id;
    const nb = req.body.nb_places || 1;
    const db = await pool.connect();
    try {
      await db.query('BEGIN');
      const t = await db.query('SELECT * FROM trajets WHERE id=$1 FOR UPDATE', [trajetId]);
      if (!t.rows[0]) {
        await db.query('ROLLBACK');
        return res.status(404).json({ message: 'Trajet introuvable' });
      }
      if (t.rows[0].statut !== 'planifie') {
        await db.query('ROLLBACK');
        return res.status(400).json({ message: 'Ce trajet n\'est plus réservable' });
      }
      const taken = await db.query(
        `SELECT COALESCE(SUM(nb_places),0)::int AS n FROM reservations
         WHERE trajet_id=$1 AND statut <> 'annulee'`, [trajetId]);
      if (taken.rows[0].n + nb > t.rows[0].places_total) {
        await db.query('ROLLBACK');
        return res.status(409).json({ message: 'Plus assez de places disponibles' });
      }
      const r = await db.query(
        `INSERT INTO reservations (utilisateur_id, trajet_id, nb_places, statut)
         VALUES ($1,$2,$3,'confirmee') RETURNING *`,
        [req.user.id, trajetId, nb]);
      await db.query('COMMIT');
      res.status(201).json(r.rows[0]);
    } catch (e) {
      await db.query('ROLLBACK');
      next(e);
    } finally {
      db.release();
    }
  });

router.get('/mine', async (req, res, next) => {
  try {
    const r = await pool.query(`${JOIN} WHERE r.utilisateur_id=$1 ORDER BY r.created_at DESC`, [req.user.id]);
    res.json(r.rows);
  } catch (e) { next(e); }
});

router.get('/', authorize('admin'), async (req, res, next) => {
  try {
    const r = await pool.query(`${JOIN} ORDER BY r.created_at DESC`);
    res.json(r.rows);
  } catch (e) { next(e); }
});

router.patch('/:id/annuler', param('id').isInt(), validate, async (req, res, next) => {
  try {
    const r = await pool.query(
      `UPDATE reservations SET statut='annulee'
       WHERE id=$1 AND ($2 = 'admin' OR utilisateur_id=$3) RETURNING *`,
      [req.params.id, req.user.role, req.user.id]);
    if (!r.rows[0]) return res.status(404).json({ message: 'Réservation introuvable' });
    res.json(r.rows[0]);
  } catch (e) { next(e); }
});

module.exports = router;
