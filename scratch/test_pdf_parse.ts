import axios from 'axios';
const pdf = require('pdf-parse');

async function testPdfParse() {
  const pdfUrl = 'https://d1.islamhouse.com/data/de/ih_articles/single/de-rabiht-al-islam.pdf';
  try {
    const response = await axios.get(pdfUrl, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(response.data);
    const uint8Array = new Uint8Array(buffer);
    
    const instance = new pdf.PDFParse(uint8Array);
    await instance.load();
    
    const result = await instance.getText();
    console.log('Result keys:', Object.keys(result));
    console.log('Total pages:', result.pages ? result.pages.length : 'none');
    console.log('Text length:', result.text ? result.text.length : 'none');
    if (result.text) {
      console.log('Parsed text preview (first 500 chars):');
      console.log(result.text.substring(0, 500));
    }
  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

testPdfParse();
