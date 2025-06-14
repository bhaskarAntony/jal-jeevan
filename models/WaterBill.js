const mongoose = require('mongoose');

const waterBillSchema = new mongoose.Schema({
  house: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'House',
    required: true
  },
  gramPanchayat: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GramPanchayat',
    required: true
  },
  billNumber: {
    type: String,
    required: true,
    unique: true
  },
  month: {
    type: String,
    required: true
  },
  year: {
    type: Number,
    required: true
  },
  previousReading: {
    type: Number,
    required: true
  },
  currentReading: {
    type: Number,
    required: true
  },
  totalUsage: {
    type: Number,
    required: true
  },
  currentDemand: {
    type: Number,
    required: true
  },
  arrears: {
    type: Number,
    default: 0
  },
  interest: {
    type: Number,
    default: 0
  },
  others: {
    type: Number,
    default: 0
  },
  totalAmount: {
    type: Number,
    required: true
  },
  paidAmount: {
    type: Number,
    default: 0
  },
  remainingAmount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'partial', 'paid'],
    default: 'pending'
  },
  paymentMode: {
    type: String,
    enum: ['cash', 'upi', 'online', 'pay_later'],
    default: null
  },
  transactionId: {
    type: String,
    default: null
  },
  paidDate: {
    type: Date,
    default: null
  },
  dueDate: {
    type: Date,
    required: true
  }
}, {
  timestamps: true
});

// Generate bill number
waterBillSchema.pre('save', async function(next) {
  if (!this.billNumber) {
    const count = await this.constructor.countDocuments();
    this.billNumber = `WB${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

module.exports = mongoose.model('WaterBill', waterBillSchema);