import { MongoClient } from 'mongodb';

async function main() {
  const uri = "mongodb+srv://mohosinali075_db_user:OCBHUJNGnjckTVWW@cluster0.q6z07fe.mongodb.net/lionel10gg_quranInternational?appName=Cluster0";
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db();
    
    const languagesCollection = db.collection('languages');
    const langs = await languagesCollection.distinct('full_language_name');
    const validLangs = langs.filter(Boolean).map(l => l.trim()).filter(l => l.length > 0);
    const uniqueLangs = Array.from(new Set(validLangs)).sort();

    console.log(`\nTotal supported translation languages in API list: ${uniqueLangs.length}`);
    console.log("Languages:", uniqueLangs.join(", "));
    
    // Check actual loaded translations
    const translationsCollection = db.collection('translations');
    const loadedLangs = await translationsCollection.distinct('lang');
    console.log(`\n==================================\nTotal languages actually downloaded/synced in your DB right now: ${loadedLangs.length}`);
    console.log("Loaded Languages:", loadedLangs.filter(Boolean).sort().join(", "));

  } finally {
    await client.close();
  }
}

main().catch(console.error);
