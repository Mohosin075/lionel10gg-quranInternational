import axios from 'axios';

async function checkOtherAPIs() {
    try {
        console.log("Checking AlQuran Cloud API...");
        const alQuranRes = await axios.get('http://api.alquran.cloud/v1/edition/language/hu');
        if (alQuranRes.data.data && alQuranRes.data.data.length > 0) {
            console.log("Found in AlQuran Cloud:", alQuranRes.data.data);
        } else {
            console.log("Not found in AlQuran Cloud.");
        }
        
    } catch (e) {
        if (e.response && e.response.status === 404) {
             console.log("Not found in AlQuran Cloud (404).");
        } else {
            console.error("AlQuran Cloud Error:", e.message);
        }
    }

    try {
        console.log("\nChecking GlobalQuran API...");
        const gqRes = await axios.get('https://api.globalquran.com/quran');
        // GlobalQuran returns a large list, let's check keys or language
        const quranData = gqRes.data.quran;
        let foundGQ = false;
        if(quranData) {
            for (const key of Object.keys(quranData)) {
                if (key.includes('hu') || key.toLowerCase().includes('hungarian')) {
                    console.log("Found in GlobalQuran:", key);
                    foundGQ = true;
                }
            }
        }
        if(!foundGQ) console.log("Not found in GlobalQuran.");
    } catch (e) {
        console.error("GlobalQuran Error:", e.message);
    }
}

checkOtherAPIs();
