
const fs = require('fs');

// Specify the path to your JavaScript file
const filePath = './scripts/filterlist.js';

// Read the file
fs.readFile(filePath, (err, data) => {
  if (err) {
    console.error('Error reading the file:', err);
    return;
  }
  
  // Convert the file data to Base64
  const base64String = Buffer.from(data).toString('base64');
  
  // Output the Base64 string
  console.log('Base64 String:', base64String);
});