const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const generateBillPDF = async (billData, houseData, gramPanchayat) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument();
      const filename = `bill_${billData.billNumber}.pdf`;
      const filepath = path.join(__dirname, '../temp', filename);

      // Ensure temp directory exists
      if (!fs.existsSync(path.dirname(filepath))) {
        fs.mkdirSync(path.dirname(filepath), { recursive: true });
      }

      doc.pipe(fs.createWriteStream(filepath));

      // Header
      doc.fontSize(20).text('Water Management System', 50, 50);
      doc.fontSize(16).text('Water Bill', 50, 80);
      
      // GP Details
      if (gramPanchayat) {
        doc.fontSize(12);
        doc.text(`Gram Panchayat: ${gramPanchayat.name}`, 50, 100);
        doc.text(`District: ${gramPanchayat.district}`, 300, 100);
      }
      
      // Bill Details
      doc.fontSize(12);
      doc.text(`Bill No: ${billData.billNumber}`, 50, 130);
      doc.text(`Month: ${billData.month} ${billData.year}`, 200, 130);
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 350, 130);

      // House Details
      doc.text('House Details:', 50, 170);
      doc.text(`Owner: ${houseData.ownerName}`, 50, 190);
      doc.text(`Address: ${houseData.address}`, 50, 210);
      doc.text(`Property No: ${houseData.propertyNumber}`, 50, 230);
      doc.text(`Meter No: ${houseData.waterMeterNumber}`, 300, 190);
      doc.text(`Usage Type: ${houseData.usageType}`, 300, 210);
      doc.text(`Mobile: ${houseData.mobileNumber}`, 300, 230);

      // Meter Reading
      doc.text('Meter Reading:', 50, 270);
      doc.text(`Previous Reading: ${billData.previousReading}`, 50, 290);
      doc.text(`Current Reading: ${billData.currentReading}`, 200, 290);
      doc.text(`Total Usage: ${billData.totalUsage} KL`, 350, 290);

      // Bill Amount Details
      doc.text('Bill Details:', 50, 330);
      doc.text(`Current Demand: ₹${billData.currentDemand}`, 50, 350);
      doc.text(`Arrears: ₹${billData.arrears}`, 200, 350);
      doc.text(`Interest: ₹${billData.interest}`, 350, 350);
      doc.text(`Others: ₹${billData.others}`, 50, 370);
      doc.text(`Total Amount: ₹${billData.totalAmount}`, 200, 370);
      doc.text(`Paid: ₹${billData.paidAmount}`, 350, 370);

      // Payment Status
      doc.fontSize(14);
      doc.text(`Status: ${billData.status.toUpperCase()}`, 50, 410);
      if (billData.remainingAmount > 0) {
        doc.text(`Remaining: ₹${billData.remainingAmount}`, 200, 410);
      }

      // Due Date
      doc.text(`Due Date: ${new Date(billData.dueDate).toLocaleDateString()}`, 50, 440);

      // Payment Details if paid
      if (billData.paidDate) {
        doc.text(`Paid Date: ${new Date(billData.paidDate).toLocaleDateString()}`, 50, 460);
        if (billData.paymentMode) {
          doc.text(`Payment Mode: ${billData.paymentMode.toUpperCase()}`, 200, 460);
        }
        if (billData.transactionId) {
          doc.text(`Transaction ID: ${billData.transactionId}`, 350, 460);
        }
      }

      // Footer
      doc.fontSize(10);
      doc.text('Please pay your bill on time to avoid late fees.', 50, 520);
      doc.text('Thank you for using our services.', 50, 540);

      doc.end();

      doc.on('end', () => {
        resolve(filepath);
      });

    } catch (error) {
      reject(error);
    }
  });
};

const generateReceiptPDF = async (receiptData) => {
  return new Promise((resolve, reject) => {
    try {
      const { bill, house, payments, gramPanchayat, generatedBy, generatedAt } = receiptData;
      
      const doc = new PDFDocument();
      const filename = `receipt_${bill.billNumber}.pdf`;
      const filepath = path.join(__dirname, '../temp', filename);

      // Ensure temp directory exists
      if (!fs.existsSync(path.dirname(filepath))) {
        fs.mkdirSync(path.dirname(filepath), { recursive: true });
      }

      doc.pipe(fs.createWriteStream(filepath));

      // Header
      doc.fontSize(20).text('Water Management System', 50, 50);
      doc.fontSize(16).text('Payment Receipt', 50, 80);
      
      // GP Details
      doc.fontSize(12);
      doc.text(`Gram Panchayat: ${gramPanchayat.name}`, 50, 110);
      doc.text(`Address: ${gramPanchayat.address}`, 50, 130);
      
      // Bill Details
      doc.text(`Receipt No: ${bill.billNumber}`, 50, 160);
      doc.text(`Date: ${new Date(generatedAt).toLocaleDateString()}`, 200, 160);
      doc.text(`Month: ${bill.month} ${bill.year}`, 350, 160);

      // Customer Details
      doc.text('Customer Details:', 50, 200);
      doc.text(`Name: ${house.ownerName}`, 50, 220);
      doc.text(`Address: ${house.address}`, 50, 240);
      doc.text(`Mobile: ${house.mobileNumber}`, 300, 220);
      doc.text(`Meter No: ${house.waterMeterNumber}`, 300, 240);

      // Bill Amount Details
      doc.text('Bill Details:', 50, 280);
      doc.text(`Current Demand: ₹${bill.currentDemand}`, 50, 300);
      doc.text(`Arrears: ₹${bill.arrears}`, 200, 300);
      doc.text(`Total Amount: ₹${bill.totalAmount}`, 350, 300);
      doc.text(`Paid Amount: ₹${bill.paidAmount}`, 50, 320);
      doc.text(`Remaining: ₹${bill.remainingAmount}`, 200, 320);

      // Payment Details
      if (bill.paidDate) {
        doc.text(`Paid Date: ${new Date(bill.paidDate).toLocaleDateString()}`, 50, 350);
        if (bill.paymentMode) {
          doc.text(`Payment Mode: ${bill.paymentMode.toUpperCase()}`, 200, 350);
        }
        if (bill.transactionId) {
          doc.text(`Transaction ID: ${bill.transactionId}`, 350, 350);
        }
      }

      // Payment History
      if (payments && payments.length > 0) {
        doc.text('Payment History:', 50, 380);
        let yPos = 400;
        payments.forEach((payment, index) => {
          doc.text(`${index + 1}. ₹${payment.amount} - ${payment.paymentMode} - ${new Date(payment.createdAt).toLocaleDateString()}`, 50, yPos);
          if (payment.transactionId) {
            doc.text(`   Transaction ID: ${payment.transactionId}`, 70, yPos + 15);
            yPos += 35;
          } else {
            yPos += 20;
          }
        });
      }

      // Footer
      doc.fontSize(10);
      doc.text(`Generated by: ${generatedBy}`, 50, 520);
      doc.text(`Generated on: ${new Date(generatedAt).toLocaleString()}`, 50, 540);
      doc.text('Thank you for your payment.', 50, 560);

      doc.end();

      doc.on('end', () => {
        resolve(filepath);
      });

    } catch (error) {
      reject(error);
    }
  });
};

module.exports = {
  generateBillPDF,
  generateReceiptPDF
};