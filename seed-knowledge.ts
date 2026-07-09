import mongoose from 'mongoose';
import path from 'path';
import dotenv from 'dotenv';
import { KnowledgeArticle } from './src/app/modules/knowledge-library/knowledge-library.model';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const DATABASE_URL = process.env.DATABASE_URL as string;

const demoArticles = [
  {
    articleId: 'pornography-destruction',
    slug: 'die-zerstoerung-durch-pornografie',
    title: 'Die Zerstörung durch Pornografie',
    content: `<h3>Die unsichtbare Gefahr im digitalen Zeitalter</h3>
<p>Pornografie ist eine der größten Prüfungen unserer Zeit. Sie zerstört nicht nur die spirituelle Reinheit, sondern schädigt auch die mentale Gesundheit und ruiniert reale Beziehungen.</p>
<ul>
  <li><b>Verlust der Spiritualität:</b> Die Schamhaftigkeit (Haya) geht verloren und die Distanz zu gottesdienstlichen Handlungen wächst.</li>
  <li><b>Neurologische Schäden:</b> Das Gehirn wird auf unnatürliche Reize trainiert, was zu Konzentrationsschwäche und emotionaler Abstumpfung führt.</li>
  <li><b>Beziehungskrisen:</b> Die Erwartungen an reale Partner werden massiv verzerrt, was Ehen belasten kann.</li>
</ul>
<p>Der Ausweg beginnt mit aufrichtiger Reue (Tawbah), dem konsequenten Meiden von Triggern, guten Gewohnheiten und dem ständigen Gedenken an Allah.</p>`,
    category: 'Probleme der heutigen Zeit',
    readTime: 5,
    imageUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    lang: 'de',
    version: 1,
    isActive: true,
  },
  {
    articleId: 'purifying-the-heart',
    slug: 'die-reinigung-des-herzens-tazkiyah',
    title: 'Die Reinigung des Herzens (Tazkiyah)',
    content: `<h3>Das Herz als Zentrum des Glaubens</h3>
<p>Der Prophet (s.a.w.) sagte: "Wahrlich, im Körper gibt es ein Fleischklumpen; wenn dieses gesund ist, ist der ganze Körper gesund."</p>
<p>Die Reinigung des Herzens erfordert das Erkennen und Heilen von Krankheiten wie Neid (Hasad), Stolz (Kibr) und Augendienerei (Riya).</p>
<ol>
  <li><b>Istighfar (Bitten um Vergebung):</b> Ständiges Bitten wäscht die Sünden vom Herzen ab.</li>
  <li><b>Dhikr (Gedenken Allahs):</b> Das Gedenken Allahs bringt dem unruhigen Herzen Frieden.</li>
  <li><b>Gute Taten im Verborgenen:</b> Das Verrichten von Taten, die nur Allah sieht, reinigt die Absicht (Ikhlas).</li>
</ol>`,
    category: 'Charakter & Reinigung der Seele',
    readTime: 6,
    imageUrl: 'https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    lang: 'de',
    version: 1,
    isActive: true,
  },
  {
    articleId: 'tahajjud-night-prayer',
    slug: 'tahajjud-das-gebet-im-letzten-drittel-der-nacht',
    title: 'Tahajjud: Das Gebet im letzten Drittel der Nacht',
    content: `<h3>Die geheime Verbindung zu Allah</h3>
<p>Wenn die Welt schläft, öffnet sich das Tor zur göttlichen Nähe. Das Tahajjud-Gebet ist eine der stärksten Waffen des Gläubigen und ein Zeichen tiefer Liebe zu Allah.</p>
<p>Allah steigt im letzten Drittel der Nacht zum untersten Himmel herab und fragt: "Wer bittet Mich, damit Ich ihm gebe? Wer sucht Meine Vergebung, damit Ich ihm vergebe?"</p>
<p>Bereite dich darauf vor, indem du rechtzeitig schläfst, die feste Absicht fasst und einen Wecker stellst. Schon zwei Rakah können dein Leben fundamental verändern.</p>`,
    category: 'Gute Taten & spirituelles Wachstum',
    readTime: 4,
    imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
    lang: 'de',
    version: 1,
    isActive: true,
  },
  {
    articleId: 'foundation-of-family',
    slug: 'die-saeulen-einer-gesegneten-ehe',
    title: 'Die Säulen einer gesegneten Ehe',
    content: `<h3>Mawaddah und Rahmah im Licht der Sunnah</h3>
<p>Eine gesunde islamische Ehe basiert auf Liebe (Mawaddah) und Barmherzigkeit (Rahmah), wie Allah es im edlen Koran beschreibt. Sie ist kein Kampf, sondern eine harmonische Partnerschaft.</p>
<ul>
  <li><b>Gegenseitiger Respekt:</b> Fehler des Partners mit Geduld und Nachsicht ertragen.</li>
  <li><b>Gemeinsamer Glaube:</b> Das gemeinsame Gebet und Lernen im Haus zieht den Segen Allahs an.</li>
  <li><b>Offene & liebevolle Kommunikation:</b> Konflikte im Licht der Sunnah ohne Zorn klären.</li>
</ul>`,
    category: 'Beziehungen, Ehe & Familie',
    readTime: 5,
    imageUrl: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
    lang: 'de',
    version: 1,
    isActive: true,
  },
  {
    articleId: 'youth-time-management',
    slug: 'zeitmanagement-fuer-die-muslimische-jugend',
    title: 'Zeitmanagement für die muslimische Jugend',
    content: `<h3>Nutze deine Jugend vor dem Alter</h3>
<p>Die Jugend ist die dynamischste und wertvollste Phase des Lebens. Disziplin und Zeitmanagement im Licht des Islam helfen uns, in Dunya und Akhirah das Beste zu erreichen.</p>
<p>Strukturiere deinen Tag konsequent um die fünf täglichen Pflichtgebete herum. Dies bringt göttlichen Segen (Barakah) in deine Zeit und schützt dich vor Faulheit und Ablenkung.</p>`,
    category: 'Jugend, Motivation & Disziplin',
    readTime: 5,
    imageUrl: 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
    lang: 'de',
    version: 1,
    isActive: true,
  },
  {
    articleId: 'halal-wealth-barakah',
    slug: 'halal-einkommen-und-der-segen-barakah-im-besitz',
    title: 'Halal-Einkommen und der Segen (Barakah) im Besitz',
    content: `<h3>Reinheit des Vermögens im Islam</h3>
<p>Das Verdienen eines reinen Halal-Guthabens ist eine Pflicht für jeden gläubigen Muslim. Zinsen (Riba), Betrug und zweifelhafte Einnahmequellen rauben dem Besitz jeglichen Segen.</p>
<p>Wer für Allah auf eine verbotene Einnahmequelle verzichtet, dem verspricht Allah etwas weit Besseres. Barakah zeigt sich nicht in der reinen Summe, sondern im Frieden und Nutzen des Geldes.</p>`,
    category: 'Dunya, Geld & moderne Gesellschaft',
    readTime: 6,
    imageUrl: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3',
    lang: 'de',
    version: 1,
    isActive: true,
  },
];

async function seedKnowledge() {
  try {
    console.log('🚀 Starting Knowledge Library seeding...');
    console.log(`🔗 Connecting to: ${DATABASE_URL.split('@')[1] || DATABASE_URL}`);
    await mongoose.connect(DATABASE_URL);
    console.log('✅ Connected to database');

    for (const article of demoArticles) {
      console.log(`Upserting German article: "${article.title}"...`);
      await KnowledgeArticle.findOneAndUpdate(
        { articleId: article.articleId, lang: 'de' },
        { $set: { ...article, source: 'manual' } },
        { upsert: true, new: true }
      );
    }

    console.log('🎉 Seeding successfully completed!');
  } catch (error) {
    console.error('❌ Error seeding knowledge library:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from database');
    process.exit(0);
  }
}

seedKnowledge();
