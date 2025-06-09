const QRCode = require('qrcode');

const generatePaymentQR = async (amount, upiId, merchantName, billNumber) => {
  try {
    const upiString = `upi://pay?pa=${upiId}&pn=${merchantName}&am=${amount}&cu=INR&tn=Bill Payment ${billNumber}`;
    
    const qrCodeDataURL = await QRCode.toDataURL(upiString, {
      width: 256,
      height: 256,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    return {
      success: true,
      qrCode: qrCodeDataURL,
      upiString
    };
  } catch (error) {
    console.error('QR Code generation error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = {
  generatePaymentQR
};