const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const generateBillPDF = async (billData, houseData) => {
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
      
      // Bill Details
      doc.fontSize(12);
      doc.text(`Bill No: ${billData.billNumber}`, 50, 120);
      doc.text(`Month: ${billData.month} ${billData.year}`, 200, 120);
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 350, 120);

      // House Details
      doc.text('House Details:', 50, 160);
      doc.text(`Owner: ${houseData.ownerName}`, 50, 180);
      doc.text(`Address: ${houseData.address}`, 50, 200);
      doc.text(`Property No: ${houseData.propertyNumber}`, 50, 220);
      doc.text(`Meter No: ${houseData.waterMeterNumber}`, 300, 180);
      doc.text(`Usage Type: ${houseData.usageType}`, 300, 200);

      // Meter Reading
      doc.text('Meter Reading:', 50, 260);
      doc.text(`Previous Reading: ${billData.previousReading}`, 50, 280);
      doc.text(`Current Reading: ${billData.currentReading}`, 200, 280);
      doc.text(`Total Usage: ${billData.totalUsage} KL`, 350, 280);

      // Bill Amount Details
      doc.text('Bill Details:', 50, 320);
      doc.text(`Current Demand: ₹${billData.currentDemand}`, 50, 340);
      doc.text(`Arrears: ₹${billData.arrears}`, 200, 340);
      doc.text(`Interest: ₹${billData.interest}`, 350, 340);
      doc.text(`Others: ₹${billData.others}`, 50, 360);
      doc.text(`Total Amount: ₹${billData.totalAmount}`, 200, 360);
      doc.text(`Paid: ₹${billData.paidAmount}`, 350, 360);

      // Payment Status
      doc.fontSize(14);
      doc.text(`Status: ${billData.status.toUpperCase()}`, 50, 400);
      if (billData.remainingAmount > 0) {
        doc.text(`Remaining: ₹${billData.remainingAmount}`, 200, 400);
      }

      // Due Date
      doc.text(`Due Date: ${new Date(billData.dueDate).toLocaleDateString()}`, 50, 430);

      // Footer
      doc.fontSize(10);
      doc.text('Please pay your bill on time to avoid late fees.', 50, 500);
      doc.text('Thank you for using our services.', 50, 520);

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
  generateBillPDF
};