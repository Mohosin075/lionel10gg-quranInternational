import axios from 'axios';

async function checkHungarian() {
    try {
        console.log("Checking QuranEnc...");
        const encRes = await axios.get('https://quranenc.com/api/v1/translations/list');
        const huEnc = encRes.data.translations.filter(t => t.language_iso_code === 'hu' || t.title.toLowerCase().includes('hungarian'));
        console.log("QuranEnc:", huEnc);
        
        console.log("Checking Quran.com...");
        const comRes = await axios.get('https://api.quran.com/api/v4/resources/translations');
        const huCom = comRes.data.translations.filter(t => t.language_name.toLowerCase() === 'hungarian');
        console.log("Quran.com:", huCom);
        
    } catch (e) {
        console.error(e);
    }
}

checkHungarian();
