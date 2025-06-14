const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const {
  getDashboard,
  searchBills,
  searchHouseByMeter,
  getVillages,
  getHousesByVillage,
  createHouseAndBill,
  generateBillForHouse,
  getBillDetails,
  processPayment,
  generatePaymentQRCode,
  downloadBillPDF
} = require('../controllers/pillarAdminController');

// Apply auth and pillar admin authorization to all routes
router.use(auth);
router.use(authorize('pillar_admin'));

/**
 * @swagger
 * components:
 *   schemas:
 *     CreateHouseAndBill:
 *       type: object
 *       required:
 *         - village
 *         - ownerName
 *         - aadhaarNumber
 *         - mobileNumber
 *         - address
 *         - waterMeterNumber
 *         - sequenceNumber
 *         - usageType
 *         - propertyNumber
 *         - currentReading
 *         - month
 *         - year
 *         - dueDate
 *       properties:
 *         village:
 *           type: string
 *         ownerName:
 *           type: string
 *         aadhaarNumber:
 *           type: string
 *         mobileNumber:
 *           type: string
 *         address:
 *           type: string
 *         waterMeterNumber:
 *           type: string
 *         previousMeterReading:
 *           type: number
 *         sequenceNumber:
 *           type: string
 *         usageType:
 *           type: string
 *           enum: [residential, commercial, institutional, industrial]
 *         propertyNumber:
 *           type: string
 *         currentReading:
 *           type: number
 *         month:
 *           type: string
 *         year:
 *           type: integer
 *         dueDate:
 *           type: string
 *           format: date
 */

/**
 * @swagger
 * /api/pillar-admin/dashboard:
 *   get:
 *     summary: Get pillar admin dashboard data
 *     tags: [Pillar Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard data retrieved successfully
 */
router.get('/dashboard', getDashboard);

/**
 * @swagger
 * /api/pillar-admin/search-bills:
 *   get:
 *     summary: Search bills by meter ID, customer name, or house owner
 *     tags: [Pillar Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *         description: Search term (meter ID, customer name, or owner name)
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
 *         description: Search results retrieved successfully
 */
router.get('/search-bills', searchBills);

/**
 * @swagger
 * /api/pillar-admin/search-house:
 *   get:
 *     summary: Search house by meter number for bill generation
 *     tags: [Pillar Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: meterNumber
 *         required: true
 *         schema:
 *           type: string
 *         description: Water meter number
 *     responses:
 *       200:
 *         description: House found successfully
 *       404:
 *         description: House not found with this meter number
 */
router.get('/search-house', searchHouseByMeter);

/**
 * @swagger
 * /api/pillar-admin/villages:
 *   get:
 *     summary: Get all villages for bill generation
 *     tags: [Pillar Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Villages retrieved successfully
 */
router.get('/villages', getVillages);

/**
 * @swagger
 * /api/pillar-admin/villages/{villageId}/houses:
 *   get:
 *     summary: Get houses by village
 *     tags: [Pillar Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: villageId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Houses retrieved successfully
 */
router.get('/villages/:villageId/houses', getHousesByVillage);

/**
 * @swagger
 * /api/pillar-admin/create-house-and-bill:
 *   post:
 *     summary: Create new house and generate bill
 *     tags: [Pillar Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateHouseAndBill'
 *     responses:
 *       201:
 *         description: House created and bill generated successfully
 */
router.post('/create-house-and-bill', validate(schemas.createHouseAndBill), createHouseAndBill);

/**
 * @swagger
 * /api/pillar-admin/houses/{houseId}/generate-bill:
 *   post:
 *     summary: Generate bill for existing house
 *     tags: [Pillar Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: houseId
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
 *               - currentReading
 *               - month
 *               - year
 *               - dueDate
 *             properties:
 *               currentReading:
 *                 type: number
 *               month:
 *                 type: string
 *               year:
 *                 type: integer
 *               dueDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Bill generated successfully
 */
router.post('/houses/:houseId/generate-bill', validate(schemas.generateBill), generateBillForHouse);

/**
 * @swagger
 * /api/pillar-admin/bills/{billId}:
 *   get:
 *     summary: Get bill details
 *     tags: [Pillar Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: billId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Bill details retrieved successfully
 *       400:
 *         description: Bill ID is required
 *       404:
 *         description: Bill not found
 */
router.get('/bills/:billId', getBillDetails);

/**
 * @swagger
 * /api/pillar-admin/bills/{billId}/payment:
 *   post:
 *     summary: Process payment for bill
 *     tags: [Pillar Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: billId
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
 *               - amount
 *               - paymentMode
 *             properties:
 *               amount:
 *                 type: number
 *               paymentMode:
 *                 type: string
 *                 enum: [cash, upi, pay_later]
 *               transactionId:
 *                 type: string
 *               remarks:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment processed successfully
 *       400:
 *         description: Bill ID is required or invalid payment amount
 *       404:
 *         description: Bill not found
 */
router.post('/bills/:billId/payment', validate(schemas.makePayment), processPayment);

/**
 * @swagger
 * /api/pillar-admin/bills/{billId}/qr-code:
 *   get:
 *     summary: Generate payment QR code for bill
 *     tags: [Pillar Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: billId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: QR code generated successfully
 *       400:
 *         description: Bill ID is required or UPI not configured
 *       404:
 *         description: Bill not found
 */
router.get('/bills/:billId/qr-code', generatePaymentQRCode);

/**
 * @swagger
 * /api/pillar-admin/bills/{billId}/pdf:
 *   get:
 *     summary: Download bill PDF
 *     tags: [Pillar Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: billId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: PDF generated and downloaded successfully
 *       400:
 *         description: Bill ID is required
 *       404:
 *         description: Bill not found
 */
router.get('/bills/:billId/pdf', downloadBillPDF);

module.exports = router;