const router = require('express').Router();
const crypto = require('crypto');
const QRCode = require('qrcode');
const { body, param } = require('express-validator');
const pool = require('../config/db');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

const JOIN = `
  SELECT r.id, r.utilisateur_id, r.trajet_id, r.nb_places, r.statut,
         r.utilise, r.created_at, t.depart, t.arrivee, t.date_depart, t.prix
  FROM reservations r JOIN trajets t ON t.id = r.trajet_id`;

// Client: book a trajet (automatic confirmation + QR code)
router.post('/', authorize('client', 'admin'),
  body('trajet_id').isInt(),
  body('nb_places').optional().isInt({ min: 1 }),
  validate,
  async (req, res, next) => {
    const trajetId = req.body.trajet_id;
    const nb = req.body.nb_places || 1;
    let db;
    try {
      const code = crypto.randomBytes(16).toString('hex');
      const qr_image = await QRCode.toDataURL(code);
      db = await pool.connect();
      await db.query('BEGIN');
      const t = await db.query('SELECT * FROM trajets WHERE id=$1 FOR UPDATE', [trajetId]);
      if (!t.rows[0]) {
        await db.query('ROLLBACK');
        return res.status(404).json({ message: 'Trajet introuvable' });
      }
      if (t.rows[0].statut !== 'planifie') {
        await db.query('ROLLBACK');
        return res.status(400).json({ message: "Ce trajet n'est plus réservable" });
      }
      const taken = await db.query(
        `SELECT COALESCE(SUM(nb_places),0)::int AS n FROM reservations
         WHERE trajet_id=$1 AND statut <> 'annulee'`, [trajetId]);
      if (taken.rows[0].n + nb > t.rows[0].places_total) {
        await db.query('ROLLBACK');
        return res.status(409).json({ message: 'Plus assez de places disponibles' });
      }
      const r = await db.query(
        `INSERT INTO reservations (utilisateur_id, trajet_id, nb_places, statut, qr_code)
         VALUES ($1,$2,$3,'confirmee',$4)
         RETURNING id, utilisateur_id, trajet_id, nb_places, statut, created_at`,
        [req.user.id, trajetId, nb, code]);
      await db.query('COMMIT');
      res.status(201).json({ ...r.rows[0], qr_code: code, qr_image });
    } catch (e) {
      if (db) await db.query('ROLLBACK').catch(() => {});
      next(e);
    } finally {
      if (db) db.release();
    }
  });

// Client: own history
router.get('/mine', async (req, res, next) => {
  try {
    const r = await pool.query(`${JOIN} WHERE r.utilisateur_id=$1 ORDER BY r.created_at DESC`, [req.user.id]);
    res.json(r.rows);
  } catch (e) { next(e); }
});

// Admin: all reservations
router.get('/', authorize('admin'), async (req, res, next) => {
  try {
    const r = await pool.query(`${JOIN} ORDER BY r.created_at DESC`);
    res.json(r.rows);
  } catch (e) { next(e); }
});

// Chauffeur: reservations of his own trajets (admin sees all)
router.get('/chauffeur', authorize('chauffeur', 'admin'), async (req, res, next) => {
  try {
    const r = await pool.query(
      `SELECT r.id, r.nb_places, r.statut, r.utilise, r.created_at,
              t.id AS trajet_id, t.depart, t.arrivee, t.date_depart,
              u.nom, u.prenom, u.telephone
       FROM reservations r
       JOIN trajets t ON t.id = r.trajet_id
       JOIN utilisateurs u ON u.id = r.utilisateur_id
       WHERE ($1::text = 'admin' OR t.chauffeur_id = $2)
       ORDER BY t.date_depart, r.created_at`,
      [req.user.role, req.user.id]);
    res.json(r.rows);
  } catch (e) { next(e); }
});

// Chauffeur: scan a QR code and validate the boarding
router.post('/scan', authorize('chauffeur', 'admin'),
  body('code').isString().isLength({ min: 32, max: 32 }).matches(/^[a-f0-9]+$/),
  validate,
  async (req, res, next) => {
    try {
      const info = await pool.query(
        `SELECT r.id, r.nb_places, r.statut, r.utilise,
                t.chauffeur_id, t.depart, t.arrivee, t.date_depart, t.statut AS trajet_statut,
                u.nom, u.prenom
         FROM reservations r
         JOIN trajets t ON t.id = r.trajet_id
         JOIN utilisateurs u ON u.id = r.utilisateur_id
         WHERE r.qr_code = $1`, [req.body.code]);
      const x = info.rows[0];
      if (!x) return res.status(404).json({ valide: false, message: 'QR Code inconnu' });
      if (req.user.role !== 'admin' && x.chauffeur_id !== req.user.id)
        return res.status(403).json({ valide: false, message: "Ce trajet n'est pas le vôtre" });
      if (x.statut !== 'confirmee')
        return res.status(409).json({ valide: false, message: 'Réservation annulée' });
      if (x.trajet_statut === 'annule')
        return res.status(409).json({ valide: false, message: 'Trajet annulé' });
      if (x.utilise)
        return res.status(409).json({ valide: false, message: 'QR Code déjà utilisé' });

      const upd = await pool.query(
        `UPDATE reservations SET utilise=TRUE, utilise_at=NOW()
         WHERE id=$1 AND utilise=FALSE RETURNING id`, [x.id]);
      if (!upd.rows[0])
        return res.status(409).json({ valide: false, message: 'QR Code déjà utilisé' });

      res.json({
        valide: true,
        message: 'Réservation valide',
        client: `${x.prenom} ${x.nom}`,
        nb_places: x.nb_places,
        trajet: { depart: x.depart, arrivee: x.arrivee, date_depart: x.date_depart },
      });
    } catch (e) { next(e); }
  });

// Client: get the QR image of one of his reservations
router.get('/:id/qr', param('id').isInt(), validate, async (req, res, next) => {
  try {
    const r = await pool.query(
      `SELECT qr_code, utilise, statut FROM reservations
       WHERE id=$1 AND utilisateur_id=$2`, [req.params.id, req.user.id]);
    if (!r.rows[0]) return res.status(404).json({ message: 'Réservation introuvable' });
    const qr_image = await QRCode.toDataURL(r.rows[0].qr_code);
    res.json({ ...r.rows[0], qr_image });
  } catch (e) { next(e); }
});

// Cancel (client: his own, admin: any). A used reservation can't be cancelled.
router.patch('/:id/annuler', param('id').isInt(), validate, async (req, res, next) => {
  try {
    const r = await pool.query(
      `UPDATE reservations SET statut='annulee'
       WHERE id=$1 AND utilise=FALSE
         AND ($2::text = 'admin' OR utilisateur_id=$3) RETURNING id, statut`,
      [req.params.id, req.user.role, req.user.id]);
    if (!r.rows[0]) return res.status(404).json({ message: 'Réservation introuvable ou déjà utilisée' });
    res.json(r.rows[0]);
  } catch (e) { next(e); }
});

module.exports = router;
