const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const {
  getDashboard,
  getGramPanchayats,
  createGramPanchayat,
  getGramPanchayatDetails,
  updateGramPanchayat,
  deleteGramPanchayat,
  createGPAdmin,
  getSuperAdmins,
  createSuperAdmin,
  deleteSuperAdmin
} = require('../controllers/superAdminController');

// Apply auth and super admin authorization to all routes
router.use(auth);
router.use(authorize('super_admin'));

/**
 * @swagger
 * components:
 *   schemas:
 *     GramPanchayat:
 *       type: object
 *       required:
 *         - name
 *         - uniqueId
 *         - district
 *         - taluk
 *         - address
 *         - pincode
 *         - state
 *         - contactPerson
 *       properties:
 *         name:
 *           type: string
 *         uniqueId:
 *           type: string
 *         district:
 *           type: string
 *         taluk:
 *           type: string
 *         address:
 *           type: string
 *         pincode:
 *           type: string
 *         state:
 *           type: string
 *         contactPerson:
 *           type: object
 *           properties:
 *             name:
 *               type: string
 *             mobile:
 *               type: string
 */

/**
 * @swagger
 * /api/super-admin/dashboard:
 *   get:
 *     summary: Get super admin dashboard data
 *     tags: [Super Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard data retrieved successfully
 */
router.get('/dashboard', getDashboard);

/**
 * @swagger
 * /api/super-admin/gram-panchayats:
 *   get:
 *     summary: Get all gram panchayats
 *     tags: [Super Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term
 *     responses:
 *       200:
 *         description: Gram panchayats retrieved successfully
 *   post:
 *     summary: Create new gram panchayat
 *     tags: [Super Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GramPanchayat'
 *     responses:
 *       201:
 *         description: Gram panchayat created successfully
 */
router.route('/gram-panchayats')
  .get(getGramPanchayats)
  .post(validate(schemas.createGramPanchayat), createGramPanchayat);

/**
 * @swagger
 * /api/super-admin/gram-panchayats/{id}:
 *   get:
 *     summary: Get gram panchayat details
 *     tags: [Super Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Gram panchayat details retrieved successfully
 *   put:
 *     summary: Update gram panchayat
 *     tags: [Super Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GramPanchayat'
 *     responses:
 *       200:
 *         description: Gram panchayat updated successfully
 *   delete:
 *     summary: Delete gram panchayat
 *     tags: [Super Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Gram panchayat deleted successfully
 */
router.route('/gram-panchayats/:id')
  .get(getGramPanchayatDetails)
  .put(updateGramPanchayat)
  .delete(deleteGramPanchayat);

/**
 * @swagger
 * /api/super-admin/gram-panchayats/{id}/admins:
 *   post:
 *     summary: Create GP admin for specific gram panchayat
 *     tags: [Super Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - mobile
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               mobile:
 *                 type: string
 *               password:
 *                 type: string
 *                 minLength: 6
 *     responses:
 *       201:
 *         description: GP admin created successfully
 */
router.post('/gram-panchayats/:id/admins', createGPAdmin);

/**
 * @swagger
 * /api/super-admin/super-admins:
 *   get:
 *     summary: Get all super admins
 *     tags: [Super Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Super admins retrieved successfully
 *   post:
 *     summary: Create new super admin
 *     tags: [Super Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - mobile
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               mobile:
 *                 type: string
 *               password:
 *                 type: string
 *                 minLength: 6
 *     responses:
 *       201:
 *         description: Super admin created successfully
 */
router.route('/super-admins')
  .get(getSuperAdmins)
  .post(createSuperAdmin);

/**
 * @swagger
 * /api/super-admin/super-admins/{id}:
 *   delete:
 *     summary: Delete super admin
 *     tags: [Super Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Super admin deleted successfully
 */
router.delete('/super-admins/:id', deleteSuperAdmin);

module.exports = router;