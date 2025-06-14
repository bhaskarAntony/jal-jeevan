const User = require('../models/User');
const GramPanchayat = require('../models/GramPanchayat');
const Village = require('../models/Village');
const House = require('../models/House');
const WaterBill = require('../models/WaterBill');
const Payment = require('../models/Payment');
const { calculateWaterBill } = require('../utils/billCalculator');
const { generateBillPDF } = require('../utils/pdfGenerator');
const { generatePaymentQR } = require('../utils/qrCodeGenerator');
const { processHouseExcel } = require('../utils/excelProcessor');
const moment = require('moment');

// @desc    Get GP admin dashboard data
// @route   GET /api/gp-admin/dashboard
// @access  Private (GP Admin)
const getDashboard = async (req, res) => {
  try {
    const gpId = req.user.gramPanchayat._id;
    const currentMonth = moment().format('MMMM');
    const currentYear = moment().year();

    const totalVillages = await Village.countDocuments({ 
      gramPanchayat: gpId, 
      isActive: true 
    });

    const totalHouses = await House.countDocuments({ 
      gramPanchayat: gpId, 
      isActive: true 
    });

    // Current month collection
    const monthlyBills = await WaterBill.find({
      gramPanchayat: gpId,
      month: currentMonth,
      year: currentYear
    });

    const thisMonthCollection = monthlyBills.reduce((sum, bill) => sum + bill.paidAmount, 0);
    const paidBills = monthlyBills.filter(bill => bill.status === 'paid').length;
    const unpaidBills = monthlyBills.filter(bill => bill.status === 'pending').length;

    res.json({
      success: true,
      data: {
        totalVillages,
        totalHouses,
        thisMonthCollection,
        paidBills,
        unpaidBills
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get all villages for GP
// @route   GET /api/gp-admin/villages
// @access  Private (GP Admin)
const getVillages = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const gpId = req.user.gramPanchayat._id;

    const query = {
      gramPanchayat: gpId,
      isActive: true,
      ...(search && { name: { $regex: search, $options: 'i' } })
    };

    const villages = await Village.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await Village.countDocuments(query);

    res.json({
      success: true,
      data: {
        villages,
        pagination: {
          current: page,
          total: Math.ceil(total / limit),
          count: villages.length,
          totalRecords: total
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Create new village
// @route   POST /api/gp-admin/villages
// @access  Private (GP Admin)
const createVillage = async (req, res) => {
  try {
    const village = new Village({
      ...req.body,
      gramPanchayat: req.user.gramPanchayat._id
    });

    await village.save();

    res.status(201).json({
      success: true,
      message: 'Village created successfully',
      data: village
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get village details with houses
// @route   GET /api/gp-admin/villages/:id
// @access  Private (GP Admin)
const getVillageDetails = async (req, res) => {
  try {
    const village = await Village.findOne({
      _id: req.params.id,
      gramPanchayat: req.user.gramPanchayat._id
    });

    if (!village) {
      return res.status(404).json({
        success: false,
        message: 'Village not found'
      });
    }

    const houses = await House.find({
      village: village._id,
      isActive: true
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: {
        village,
        houses
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Create new house
// @route   POST /api/gp-admin/houses
// @access  Private (GP Admin)
const createHouse = async (req, res) => {
  try {
    const house = new House({
      ...req.body,
      gramPanchayat: req.user.gramPanchayat._id
    });

    await house.save();

    res.status(201).json({
      success: true,
      message: 'House created successfully',
      data: house
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Upload houses from Excel
// @route   POST /api/gp-admin/houses/upload
// @access  Private (GP Admin)
const uploadHousesFromExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an Excel file'
      });
    }

    const result = processHouseExcel(req.file.path);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: 'Error processing Excel file',
        error: result.error
      });
    }

    const { villageId } = req.body;
    const houses = result.data.map(house => ({
      ...house,
      village: villageId,
      gramPanchayat: req.user.gramPanchayat._id
    }));

    const savedHouses = await House.insertMany(houses);

    res.json({
      success: true,
      message: `${savedHouses.length} houses uploaded successfully`,
      data: savedHouses
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get house details with bills
// @route   GET /api/gp-admin/houses/:id
// @access  Private (GP Admin)
const getHouseDetails = async (req, res) => {
  try {
    const house = await House.findOne({
      _id: req.params.id,
      gramPanchayat: req.user.gramPanchayat._id
    }).populate('village');

    if (!house) {
      return res.status(404).json({
        success: false,
        message: 'House not found'
      });
    }

    const bills = await WaterBill.find({
      house: house._id
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: {
        house,
        bills
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Generate water bill
// @route   POST /api/gp-admin/houses/:id/bills
// @access  Private (GP Admin)
const generateWaterBill = async (req, res) => {
  try {
    const { currentReading, month, year, dueDate } = req.body;
    
    const house = await House.findOne({
      _id: req.params.id,
      gramPanchayat: req.user.gramPanchayat._id
    });

    if (!house) {
      return res.status(404).json({
        success: false,
        message: 'House not found'
      });
    }

    const gramPanchayat = await GramPanchayat.findById(house.gramPanchayat);
    const totalUsage = currentReading - house.previousMeterReading;
    
    if (totalUsage < 0) {
      return res.status(400).json({
        success: false,
        message: 'Current reading cannot be less than previous reading'
      });
    }

    // Calculate bill amount
    const currentDemand = calculateWaterBill(totalUsage, gramPanchayat.waterTariff, house.usageType);

    // Check for arrears from previous bills
    const unpaidBills = await WaterBill.find({
      house: house._id,
      status: { $in: ['pending', 'partial'] }
    });

    const arrears = unpaidBills.reduce((sum, bill) => sum + bill.remainingAmount, 0);

    const bill = new WaterBill({
      house: house._id,
      gramPanchayat: house.gramPanchayat,
      month,
      year: parseInt(year),
      previousReading: house.previousMeterReading,
      currentReading: parseInt(currentReading),
      totalUsage,
      currentDemand,
      arrears,
      interest: 0,
      others: 0,
      totalAmount: currentDemand + arrears,
      remainingAmount: currentDemand + arrears,
      dueDate: new Date(dueDate)
    });

    await bill.save();

    // Update house previous reading
    house.previousMeterReading = currentReading;
    await house.save();

    res.status(201).json({
      success: true,
      message: 'Water bill generated successfully',
      data: bill
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get bill details
// @route   GET /api/gp-admin/bills/:id
// @access  Private (GP Admin)
const getBillDetails = async (req, res) => {
  try {
    const bill = await WaterBill.findOne({
      _id: req.params.id,
      gramPanchayat: req.user.gramPanchayat._id
    }).populate({
      path: 'house',
      populate: {
        path: 'village'
      }
    });

    if (!bill) {
      return res.status(404).json({
        success: false,
        message: 'Bill not found'
      });
    }

    // Get last payment details
    const lastPayment = await Payment.findOne({
      bill: bill._id
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: {
        bill,
        lastPayment
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Generate bill PDF
// @route   GET /api/gp-admin/bills/:id/pdf
// @access  Private (GP Admin)
const downloadBillPDF = async (req, res) => {
  try {
    const bill = await WaterBill.findOne({
      _id: req.params.id,
      gramPanchayat: req.user.gramPanchayat._id
    }).populate('house');

    if (!bill) {
      return res.status(404).json({
        success: false,
        message: 'Bill not found'
      });
    }

    const pdfPath = await generateBillPDF(bill, bill.house);
    
    res.download(pdfPath, `bill_${bill.billNumber}.pdf`, (err) => {
      if (err) {
        console.error('PDF download error:', err);
      }
      // Clean up temp file
      require('fs').unlinkSync(pdfPath);
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Make payment
// @route   POST /api/gp-admin/bills/:id/payment
// @access  Private (GP Admin)
const makePayment = async (req, res) => {
  try {
    const { amount, paymentMode, transactionId, remarks } = req.body;
    
    const bill = await WaterBill.findOne({
      _id: req.params.id,
      gramPanchayat: req.user.gramPanchayat._id
    });

    if (!bill) {
      return res.status(404).json({
        success: false,
        message: 'Bill not found'
      });
    }

    if (amount > bill.remainingAmount) {
      return res.status(400).json({
        success: false,
        message: 'Payment amount cannot exceed remaining amount'
      });
    }

    // Create payment record
    const payment = new Payment({
      bill: bill._id,
      amount: parseFloat(amount),
      paymentMode,
      transactionId,
      collectedBy: req.user.id,
      remarks
    });

    await payment.save();

    // Update bill
    bill.paidAmount += parseFloat(amount);
    bill.remainingAmount -= parseFloat(amount);
    
    if (bill.remainingAmount === 0) {
      bill.status = 'paid';
    } else if (bill.paidAmount > 0) {
      bill.status = 'partial';
    }

    bill.paymentMode = paymentMode;
    bill.transactionId = transactionId;
    bill.paidDate = new Date();

    await bill.save();

    res.json({
      success: true,
      message: 'Payment recorded successfully',
      data: {
        bill,
        payment
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Generate payment QR code
// @route   GET /api/gp-admin/bills/:id/qr-code
// @access  Private (GP Admin)
const generatePaymentQRCode = async (req, res) => {
  try {
    const bill = await WaterBill.findOne({
      _id: req.params.id,
      gramPanchayat: req.user.gramPanchayat._id
    }).populate('house');

    if (!bill) {
      return res.status(404).json({
        success: false,
        message: 'Bill not found'
      });
    }

    const gramPanchayat = await GramPanchayat.findById(bill.gramPanchayat);
    
    if (!gramPanchayat.qrCodeData || !gramPanchayat.qrCodeData.upiId) {
      return res.status(400).json({
        success: false,
        message: 'UPI details not configured for this Gram Panchayat'
      });
    }

    const qrResult = await generatePaymentQR(
      bill.remainingAmount,
      gramPanchayat.qrCodeData.upiId,
      gramPanchayat.qrCodeData.merchantName || gramPanchayat.name,
      bill.billNumber
    );

    if (!qrResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to generate QR code',
        error: qrResult.error
      });
    }

    res.json({
      success: true,
      data: {
        qrCode: qrResult.qrCode,
        amount: bill.remainingAmount,
        billNumber: bill.billNumber
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Update water tariff
// @route   PUT /api/gp-admin/tariff
// @access  Private (GP Admin)
const updateWaterTariff = async (req, res) => {
  try {
    const gramPanchayat = await GramPanchayat.findByIdAndUpdate(
      req.user.gramPanchayat._id,
      { waterTariff: req.body },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Water tariff updated successfully',
      data: gramPanchayat.waterTariff
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get users for GP
// @route   GET /api/gp-admin/users
// @access  Private (GP Admin)
const getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, userType = '' } = req.query;
    
    const query = {
      gramPanchayat: req.user.gramPanchayat._id,
      isActive: true,
      ...(userType && { role: userType })
    };

    const users = await User.find(query)
      .select('-password')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          current: page,
          total: Math.ceil(total / limit),
          count: users.length,
          totalRecords: total
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Create user for GP
// @route   POST /api/gp-admin/users
// @access  Private (GP Admin)
const createUser = async (req, res) => {
  try {
    const { name, email, mobile, password, role } = req.body;

    if (!['gp_admin', 'mobile_user', 'pillar_admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user role'
      });
    }

    const user = new User({
      name,
      email,
      mobile,
      password,
      role,
      gramPanchayat: req.user.gramPanchayat._id
    });

    await user.save();

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

module.exports = {
  getDashboard,
  getVillages,
  createVillage,
  getVillageDetails,
  createHouse,
  uploadHousesFromExcel,
  getHouseDetails,
  generateWaterBill,
  getBillDetails,
  downloadBillPDF,
  makePayment,
  generatePaymentQRCode,
  updateWaterTariff,
  getUsers,
  createUser
};