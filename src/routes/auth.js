const router = require('express').Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { body } = require('express-validator');
const pool = require('../config/db');
const validate = require('../middleware/validate');

router.post('/register',
  body('nom').trim().notEmpty(),
  body('prenom').trim().notEmpty(),
  body('email').isEmail().normalizeEmail(),
  body('mot_de_passe').isLength({ min: 8 }),
  body('telephone').optional().trim(),
  validate,
  async (req, res, next) => {
    try {
      const { nom, prenom, email, mot_de_passe, telephone } = req.body;
      const hash = await bcrypt.hash(mot_de_passe, 10);
      // the role is NOT taken from the request: every new account is a client
      const r = await pool.query(
        `INSERT INTO utilisateurs (nom, prenom, email, mot_de_passe_hash, telephone)
         VALUES ($1, $2, $3, $4, $5) RETURNING id, nom, prenom, email, role`,
        [nom, prenom, email, hash, telephone || null]);
      res.status(201).json(r.rows[0]);
    } catch (e) {
      if (e.code === '23505')
        return res.status(409).json({ message: 'Email déjà utilisé' });
      next(e);
    }
  });

router.post('/login',
  body('email').isEmail().normalizeEmail(),
  body('mot_de_passe').notEmpty(),
  validate,
  async (req, res, next) => {
    try {
      const { email, mot_de_passe } = req.body;
      const r = await pool.query('SELECT * FROM utilisateurs WHERE email = $1', [email]);
      const u = r.rows[0];
      if (!u || !(await bcrypt.compare(mot_de_passe, u.mot_de_passe_hash)))
        return res.status(401).json({ message: 'Identifiants incorrects' });
      const token = jwt.sign({ id: u.id, role: u.role }, process.env.JWT_SECRET, { expiresIn: '2h' });
      res.json({ token, user: { id: u.id, nom: u.nom, prenom: u.prenom, email: u.email, role: u.role } });
    } catch (e) { next(e); }
  });

module.exports = router;
