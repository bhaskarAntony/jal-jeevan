const User = require('../models/User');
const GramPanchayat = require('../models/GramPanchayat');
const Village = require('../models/Village');
const House = require('../models/House');
const WaterBill = require('../models/WaterBill');
const Payment = require('../models/Payment');
const { calculateWaterBill } = require('../utils/billCalculator');
const { generateBillPDF } = require('../utils/pdfGenerator');
const { generatePaymentQR } = require('../utils/qrCodeGenerator');
const moment = require('moment');

// @desc    Get pillar admin dashboard data
// @route   GET /api/pillar-admin/dashboard
// @access  Private (Pillar Admin)
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

    // Current month collection by this pillar admin
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

// @desc    Search bills by meter ID, customer name, or house owner
// @route   GET /api/pillar-admin/search-bills
// @access  Private (Pillar Admin)
const searchBills = async (req, res) => {
  try {
    const { query, page = 1, limit = 10 } = req.query;
    const gpId = req.user.gramPanchayat._id;

    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    // Search houses first
    const houses = await House.find({
      gramPanchayat: gpId,
      isActive: true,
      $or: [
        { ownerName: { $regex: query, $options: 'i' } },
        { waterMeterNumber: { $regex: query, $options: 'i' } },
        { aadhaarNumber: { $regex: query, $options: 'i' } }
      ]
    }).populate('village');

    if (houses.length === 0) {
      return res.json({
        success: true,
        data: {
          bills: [],
          houses: [],
          pagination: {
            current: 1,
            total: 0,
            count: 0,
            totalRecords: 0
          }
        }
      });
    }

    const houseIds = houses.map(house => house._id);

    // Get bills for found houses
    const bills = await WaterBill.find({
      house: { $in: houseIds }
    })
      .populate({
        path: 'house',
        populate: {
          path: 'village'
        }
      })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await WaterBill.countDocuments({
      house: { $in: houseIds }
    });

    res.json({
      success: true,
      data: {
        bills,
        houses,
        pagination: {
          current: page,
          total: Math.ceil(total / limit),
          count: bills.length,
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

// @desc    Search house by meter number for bill generation
// @route   GET /api/pillar-admin/search-house
// @access  Private (Pillar Admin)
const searchHouseByMeter = async (req, res) => {
  try {
    const { meterNumber } = req.query;
    const gpId = req.user.gramPanchayat._id;

    if (!meterNumber) {
      return res.status(400).json({
        success: false,
        message: 'Meter number is required'
      });
    }

    const house = await House.findOne({
      waterMeterNumber: meterNumber,
      gramPanchayat: gpId,
      isActive: true
    }).populate('village');

    if (!house) {
      return res.status(404).json({
        success: false,
        message: 'House not found with this meter number'
      });
    }

    // Get latest bill for this house
    const latestBill = await WaterBill.findOne({
      house: house._id
    }).sort({ createdAt: -1 });

    // Get unpaid bills count
    const unpaidBillsCount = await WaterBill.countDocuments({
      house: house._id,
      status: { $in: ['pending', 'partial'] }
    });

    res.json({
      success: true,
      data: {
        house,
        latestBill,
        unpaidBillsCount,
        canGenerateNewBill: true
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

// @desc    Get villages for bill generation
// @route   GET /api/pillar-admin/villages
// @access  Private (Pillar Admin)
const getVillages = async (req, res) => {
  try {
    const gpId = req.user.gramPanchayat._id;

    const villages = await Village.find({
      gramPanchayat: gpId,
      isActive: true
    }).sort({ name: 1 });

    res.json({
      success: true,
      data: villages
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get houses by village
// @route   GET /api/pillar-admin/villages/:villageId/houses
// @access  Private (Pillar Admin)
const getHousesByVillage = async (req, res) => {
  try {
    const { villageId } = req.params;
    const gpId = req.user.gramPanchayat._id;

    const houses = await House.find({
      village: villageId,
      gramPanchayat: gpId,
      isActive: true
    }).populate('village').sort({ ownerName: 1 });

    res.json({
      success: true,
      data: houses
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Create new house and generate bill
// @route   POST /api/pillar-admin/create-house-and-bill
// @access  Private (Pillar Admin)
const createHouseAndBill = async (req, res) => {
  try {
    const {
      village,
      ownerName,
      aadhaarNumber,
      mobileNumber,
      address,
      waterMeterNumber,
      previousMeterReading,
      sequenceNumber,
      usageType,
      propertyNumber,
      currentReading,
      month,
      year,
      dueDate
    } = req.body;

    const gpId = req.user.gramPanchayat._id;

    // Check if meter number already exists
    const existingHouse = await House.findOne({
      waterMeterNumber,
      gramPanchayat: gpId,
      isActive: true
    });

    if (existingHouse) {
      return res.status(400).json({
        success: false,
        message: 'House with this meter number already exists'
      });
    }

    // Create house first
    const house = new House({
      village,
      gramPanchayat: gpId,
      ownerName,
      aadhaarNumber,
      mobileNumber,
      address,
      waterMeterNumber,
      previousMeterReading: parseFloat(previousMeterReading) || 0,
      sequenceNumber,
      usageType,
      propertyNumber
    });

    await house.save();

    // Generate bill immediately
    const gramPanchayat = await GramPanchayat.findById(gpId);
    const totalUsage = currentReading - (previousMeterReading || 0);
    
    if (totalUsage < 0) {
      return res.status(400).json({
        success: false,
        message: 'Current reading cannot be less than previous reading'
      });
    }

    // Calculate bill amount
    const currentDemand = calculateWaterBill(totalUsage, gramPanchayat.waterTariff, usageType);

    const bill = new WaterBill({
      house: house._id,
      gramPanchayat: gpId,
      month,
      year: parseInt(year),
      previousReading: previousMeterReading || 0,
      currentReading: parseInt(currentReading),
      totalUsage,
      currentDemand,
      arrears: 0,
      interest: 0,
      others: 0,
      totalAmount: currentDemand,
      remainingAmount: currentDemand,
      dueDate: new Date(dueDate)
    });

    await bill.save();

    // Update house previous reading
    house.previousMeterReading = currentReading;
    await house.save();

    const populatedBill = await WaterBill.findById(bill._id).populate({
      path: 'house',
      populate: {
        path: 'village'
      }
    });

    res.status(201).json({
      success: true,
      message: 'House created and bill generated successfully',
      data: {
        house,
        bill: populatedBill
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

// @desc    Generate bill for existing house
// @route   POST /api/pillar-admin/houses/:houseId/generate-bill
// @access  Private (Pillar Admin)
const generateBillForHouse = async (req, res) => {
  try {
    const { houseId } = req.params;
    const { currentReading, month, year, dueDate } = req.body;
    const gpId = req.user.gramPanchayat._id;

    const house = await House.findOne({
      _id: houseId,
      gramPanchayat: gpId,
      isActive: true
    });

    if (!house) {
      return res.status(404).json({
        success: false,
        message: 'House not found'
      });
    }

    const gramPanchayat = await GramPanchayat.findById(gpId);
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
      gramPanchayat: gpId,
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

    const populatedBill = await WaterBill.findById(bill._id).populate({
      path: 'house',
      populate: {
        path: 'village'
      }
    });

    res.status(201).json({
      success: true,
      message: 'Bill generated successfully',
      data: populatedBill
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
// @route   GET /api/pillar-admin/bills/:billId
// @access  Private (Pillar Admin)
const getBillDetails = async (req, res) => {
  try {
    const { billId } = req.params;
    const gpId = req.user.gramPanchayat._id;

    if (!billId) {
      return res.status(400).json({
        success: false,
        message: 'Bill ID is required'
      });
    }

    const bill = await WaterBill.findOne({
      _id: billId,
      gramPanchayat: gpId
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

    // Get payment history
    const payments = await Payment.find({
      bill: bill._id
    }).populate('collectedBy', 'name').sort({ createdAt: -1 });

    res.json({
      success: true,
      data: {
        bill,
        payments
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

// @desc    Process payment for bill
// @route   POST /api/pillar-admin/bills/:billId/payment
// @access  Private (Pillar Admin)
const processPayment = async (req, res) => {
  try {
    const { billId } = req.params;
    const { amount, paymentMode, transactionId, remarks } = req.body;
    const gpId = req.user.gramPanchayat._id;

    if (!billId) {
      return res.status(400).json({
        success: false,
        message: 'Bill ID is required'
      });
    }

    const bill = await WaterBill.findOne({
      _id: billId,
      gramPanchayat: gpId
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

    // Update bill only if not pay_later
    if (paymentMode !== 'pay_later') {
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
    }

    const updatedBill = await WaterBill.findById(bill._id).populate({
      path: 'house',
      populate: {
        path: 'village'
      }
    });

    res.json({
      success: true,
      message: 'Payment processed successfully',
      data: {
        bill: updatedBill,
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
// @route   GET /api/pillar-admin/bills/:billId/qr-code
// @access  Private (Pillar Admin)
const generatePaymentQRCode = async (req, res) => {
  try {
    const { billId } = req.params;
    const gpId = req.user.gramPanchayat._id;

    if (!billId) {
      return res.status(400).json({
        success: false,
        message: 'Bill ID is required'
      });
    }

    const bill = await WaterBill.findOne({
      _id: billId,
      gramPanchayat: gpId
    }).populate('house');

    if (!bill) {
      return res.status(404).json({
        success: false,
        message: 'Bill not found'
      });
    }

    const gramPanchayat = await GramPanchayat.findById(gpId);
    
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
        billNumber: bill.billNumber,
        upiId: gramPanchayat.qrCodeData.upiId,
        merchantName: gramPanchayat.qrCodeData.merchantName || gramPanchayat.name
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

// @desc    Download bill PDF
// @route   GET /api/pillar-admin/bills/:billId/pdf
// @access  Private (Pillar Admin)
const downloadBillPDF = async (req, res) => {
  try {
    const { billId } = req.params;
    const gpId = req.user.gramPanchayat._id;

    if (!billId) {
      return res.status(400).json({
        success: false,
        message: 'Bill ID is required'
      });
    }

    const bill = await WaterBill.findOne({
      _id: billId,
      gramPanchayat: gpId
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

module.exports = {
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
};