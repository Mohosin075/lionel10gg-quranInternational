import axios from 'axios';
const pdf = require('pdf-parse');

async function testMultiplePdfs() {
  const apiKey = 'paV29H2gm56kvLP';
  const url = `https://api3.islamhouse.com/v3/${apiKey}/main/articles/de/de/1/10/json`;
  
  try {
    console.log('Fetching article list from IslamHouse...');
    const response = await axios.get(url);
    const articles = response.data.data;
    console.log(`Found ${articles.length} articles.`);
    
    for (const art of articles) {
      console.log(`\n-----------------------------------------`);
      console.log(`Title: ${art.title}`);
      console.log(`URL: ${art.api_url}`);
      
      const attachment = art.attachments && art.attachments.find((att: any) => att.extension_type === 'PDF');
      if (!attachment) {
        console.log('No PDF attachment found.');
        continue;
      }
      
      console.log(`PDF URL: ${attachment.url} (${attachment.size})`);
      try {
        const pdfRes = await axios.get(attachment.url, { responseType: 'arraybuffer', timeout: 8000 });
        const buffer = Buffer.from(pdfRes.data);
        const uint8Array = new Uint8Array(buffer);
        
        const instance = new pdf.PDFParse(uint8Array);
        await instance.load();
        
        const result = await instance.getText();
        const cleanedText = result.text ? result.text.replace(/-- \d+ of \d+ --/g, '').trim() : '';
        console.log(`Parsed text length: ${cleanedText.length}`);
        if (cleanedText.length > 50) {
          console.log('Text preview (first 150 chars):');
          console.log(cleanedText.substring(0, 150));
        } else {
          console.log('Warning: No text or very little text extracted (possibly scanned image).');
        }
      } catch (err: any) {
        console.error(`Failed to process PDF: ${err.message}`);
      }
    }
  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

testMultiplePdfs();
