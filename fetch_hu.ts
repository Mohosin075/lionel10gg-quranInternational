import axios from 'axios';
import fs from 'fs';

async function fetchHungarian() {
    try {
        console.log("Fetching editions from quran-api...");
        const indexRes = await axios.get('https://cdn.jsdelivr.net/gh/fawazahmed0/quran-api@1/editions.json');
        
        const editions = indexRes.data;
        const huEditions = [];
        
        for (const [key, value] of Object.entries(editions)) {
            if (value.language === 'Hungarian' || value.language === 'hu') {
                huEditions.push({ key, ...value });
            }
        }
        
        if (huEditions.length > 0) {
            // Using the first edition's link
            const url = huEditions[0].link;
            console.log(`Fetching data from ${url}...`);
            const dataRes = await axios.get(url);
            
            // Write to file
            fs.writeFileSync('hungarian_quran.json', JSON.stringify(dataRes.data, null, 2));
            console.log(`Saved to hungarian_quran.json`);
        }
        
    } catch (e) {
        console.error("Error:", e.message);
    }
}

fetchHungarian();
