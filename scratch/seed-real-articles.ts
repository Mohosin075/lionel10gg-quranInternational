import mongoose from 'mongoose'
import config from '../src/config'
import { KnowledgeArticle } from '../src/app/modules/knowledge-library/knowledge-library.model'

const realArticles = [
  // 1. Probleme der heutigen Zeit
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
    articleId: 'social-media-addiction',
    slug: 'die-sucht-nach-sozialen-medien',
    title: 'Die Sucht nach sozialen Medien und Zeitverschwendung',
    content: `<h3>Ablenkung vom Wesentlichen im 21. Jahrhundert</h3>
<p>Soziale Medien sind darauf ausgelegt, unsere Aufmerksamkeit so lange wie möglich zu fesseln. Für Muslime besteht die Gefahr darin, wertvolle Lebenszeit zu verlieren, die für Gottesdienste, Familie und persönliche Entwicklung gedacht war.</p>
<ul>
  <li><b>Verlust des Fokus:</b> Ständiges Scrollen verringert die Konzentrationsfähigkeit im Gebet (Khushu).</li>
  <li><b>Sozialer Vergleich:</b> Das Vergleichen des eigenen Lebens mit den inszenierten Profilen anderer führt zu Undankbarkeit und Unzufriedenheit.</li>
  <li><b>Das Konzept der Zeit im Islam:</b> Der Prophet (s.a.w.) sagte: "Es gibt zwei Gaben, bei denen viele Menschen betrogen werden: Gesundheit und Freizeit."</li>
</ul>
<p>Setzen Sie klare Zeitlimits für Apps, löschen Sie unnötige Benachrichtigungen und nutzen Sie die gewonnene Zeit für das Lesen des Korans und das Gedenken Allahs.</p>`,
    category: 'Probleme der heutigen Zeit',
    readTime: 6,
    imageUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    lang: 'de',
    version: 1,
    isActive: true,
  },

  // 2. Charakter & Reinigung der Seele
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
    articleId: 'curing-anger',
    slug: 'der-umgang-mit-wut-im-islam',
    title: 'Der Umgang mit Wut im Islam',
    content: `<h3>Wut kontrollieren nach der Sunnah</h3>
<p>Wut ist eine Emotion, die vom Schaitan genutzt wird, um Beziehungen zu zerstören und unüberlegte Taten hervorzurufen. Der Prophet (s.a.w.) sagte: "Der Starke ist nicht derjenige, der im Ringen siegt, sondern derjenige, der sich in der Wut beherrscht."</p>
<ul>
  <li><b>Zuflucht suchen:</b> Sagen Sie sofort "A'udhu billahi minash-shaitanir-rajim", wenn Sie Wut spüren.</li>
  <li><b>Körperhaltung ändern:</b> Wenn Sie stehen, setzen Sie sich hin. Wenn Sie sitzen, legen Sie sich hin.</li>
  <li><b>Die Gebetswaschung (Wudu) vollziehen:</b> Da Wut aus Feuer ist, löscht das kühle Wasser des Wudu die Wut im Herzen.</li>
  <li><b>Schweigen bewahren:</b> Vermeiden Sie es, im Zustand der Wut zu sprechen, um verletzende Worte zu verhindern.</li>
</ul>`,
    category: 'Charakter & Reinigung der Seele',
    readTime: 5,
    imageUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773',
    lang: 'de',
    version: 1,
    isActive: true,
  },

  // 3. Gute Taten & spirituelles Wachstum
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
    articleId: 'dhikr-morning-evening',
    slug: 'die-kraft-des-morgendlichen-und-abendlichen-dhikr',
    title: 'Die Kraft des morgendlichen und abendlichen Dhikr',
    content: `<h3>Ein Schutzschild für den Tag</h3>
<p>Das Gedenken Allahs am Morgen und am Abend (Adhkar) dient dem Muslim als spiritueller Schutzschild gegen Schaitan, das Böse Auge (Al-Ayn), Magie und die Sorgen des Alltags.</p>
<ul>
  <li><b>Innerer Frieden:</b> "Wahrlich, im Gedenken Allahs finden die Herzen Ruhe." (Koran 13:28).</li>
  <li><b>Konsequente Praxis:</b> Der Prophet (s.a.w.) lehrte uns bestimmte Bittgebete für die Zeit nach dem Fajr- und dem Asr-Gebet.</li>
  <li><b>Schutz vor Schaden:</b> Das Rezitieren der letzten drei Suren des Korans sowie Ayat al-Kursi am Morgen und Abend schützt den Menschen bis zur Nacht bzw. bis zum nächsten Morgen.</li>
</ul>`,
    category: 'Gute Taten & spirituelles Wachstum',
    readTime: 5,
    imageUrl: 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d',
    lang: 'de',
    version: 1,
    isActive: true,
  },

  // 4. Geschichten & Lehren
  {
    articleId: 'people-of-cave-lessons',
    slug: 'die-gefaehrten-der-hoehle-ashab-al-kahf-und-ihre-lehren',
    title: 'Die Gefährten der Höhle (Ashab al-Kahf) und ihre Lehren',
    content: `<h3>Glaube inmitten von Prüfungen</h3>
<p>Die Geschichte der jungen Männer in der Höhle zeigt uns, dass wahrer Glaube und das Vertrauen auf Allah (Tawakkul) uns vor den größten Gefahren schützen können. Sie flohen vor einem tyrannischen König, um ihre Religion zu bewahren.</p>
<ul>
  <li><b>Flucht vor Fitnah:</b> Wenn die Umgebung den eigenen Glauben gefährdet, muss man nach Wegen suchen, sich zu schützen.</li>
  <li><b>Allahs Barmherzigkeit:</b> Allah gewährte den Gläubigen einen tiefen Schlaf von 309 Jahren und schützte ihre Körper vor dem Verfall.</li>
  <li><b>Geduld zahlt sich aus:</b> Am Ende triumphierte die Wahrheit über den Unglauben, und die jungen Männer wurden zu einem ewigen Zeichen für die Auferstehung.</li>
</ul>`,
    category: 'Geschichten & Lehren',
    readTime: 5,
    imageUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb',
    lang: 'de',
    version: 1,
    isActive: true,
  },
  {
    articleId: 'prophet-yusuf-patience',
    slug: 'prophet-yusuf-geduld-und-aufstieg',
    title: 'Prophet Yusuf (a.s.): Geduld, Aufrichtigkeit und der Weg zum Erfolg',
    content: `<h3>Vom Brunnen zum Herrscherpalast</h3>
<p>Die Geschichte des Propheten Yusuf (a.s.) wird im Koran als die "schönste aller Geschichten" bezeichnet. Sie lehrt uns, dass Prüfungen und Verrat durch Geduld und Vertrauen auf Allahs Plan in Segen verwandelt werden.</p>
<ul>
  <li><b>Umgang mit Verrat:</b> Obwohl seine Brüder ihn in einen Brunnen warfen, verlor Yusuf nie das Vertrauen in Allah.</li>
  <li><b>Widerstand gegen Versuchung:</b> Als er von der Frau des Ministers verführt wurde, wählte er lieber das Gefängnis als die Sünde, um Allah treu zu bleiben.</li>
  <li><b>Vergebung:</b> Als er schließlich Herrscher über Ägypten wurde, vergab er seinen Brüdern bedingungslos. Dies zeigt die absolute Reinheit seines Charakters.</li>
</ul>`,
    category: 'Geschichten & Lehren',
    readTime: 6,
    imageUrl: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e',
    lang: 'de',
    version: 1,
    isActive: true,
  },

  // 5. Biographien der Rechtschaffenen
  {
    articleId: 'abu-bakr-siddiq-bio',
    slug: 'abu-bakr-as-siddiq-der-treueste-gefaehrte',
    title: 'Abu Bakr As-Siddiq: Der treueste Gefährte',
    content: `<h3>Der erste Kalif des Islam</h3>
<p>Abu Bakr war der engste Freund des Propheten Muhammad (s.a.w.) und der erste erwachsene Mann, der den Islam annahm. Seine Loyalität und Opferbereitschaft sind unübertroffen.</p>
<ul>
  <li><b>Der Beiname "As-Siddiq":</b> Er erhielt diesen Namen (der Wahrhaftige), weil er der Nachtreise (Isra und Miraj) des Propheten ohne das geringste Zögern glaubte.</li>
  <li><b>Spende seines gesamten Vermögens:</b> Als der Prophet um Spenden für die Armee bat, brachte Abu Bakr alles, was er besaß, und ließ für seine Familie nur "Allah und Seinen Gesandten" übrig.</li>
  <li><b>Standhaftigkeit nach dem Tod des Propheten:</b> Er hielt die muslimische Gemeinschaft in einer schweren Krise zusammen und führte sie weise durch die ersten Prüfungen als Kalif.</li>
</ul>`,
    category: 'Biographien der Rechtschaffenen',
    readTime: 6,
    imageUrl: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66',
    lang: 'de',
    version: 1,
    isActive: true,
  },
  {
    articleId: 'umar-ibn-al-khattab-justice',
    slug: 'umar-ibn-al-khattab-gerechtigkeit',
    title: 'Umar ibn Al-Khattab: Der Inbegriff von Gerechtigkeit',
    content: `<h3>Der zweite Kalif des Islam (Al-Faruq)</h3>
<p>Umar ibn Al-Khattab war bekannt für seine Stärke, Entschlossenheit und seine unerbittliche Gerechtigkeit. Unter seiner Herrschaft breitete sich der Islam weit aus, während er selbst in extremer Bescheidenheit lebte.</p>
<ul>
  <li><b>Al-Faruq (Der Unterscheider):</b> Er erhielt diesen Titel, weil Allah durch ihn die Wahrheit vom Falschen trennte und er den Islam öffentlich verkündete.</li>
  <li><b>Gerechtigkeit für alle Bürger:</b> Umar patrouillierte nachts persönlich durch die Straßen von Medina, um sicherzustellen, dass keine arme Familie Hunger litt. Er half Witwen und Waisen anonym.</li>
  <li><b>Bescheidenheit im Erfolg:</b> Als er Jerusalem friedlich übernahm, trug er einfache Kleidung und teilte sich das Reittier abwechselnd mit seinem Diener.</li>
</ul>`,
    category: 'Biographien der Rechtschaffenen',
    readTime: 7,
    imageUrl: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05',
    lang: 'de',
    version: 1,
    isActive: true,
  },

  // 6. Beziehungen, Ehe & Familie
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
    articleId: 'honoring-parents',
    slug: 'die-pflicht-zur-ehrung-der-eltern',
    title: 'Die Pflicht zur Ehrung der Eltern (Birr al-Walidayn)',
    content: `<h3>Eine der am höchsten bewerteten Taten im Islam</h3>
<p>Allah hat das gute Behandeln der Eltern direkt nach der Anbetung Seiner Selbst genannt. Elternliebe und Gehorsam ihnen gegenüber sind Schlüssel zum Paradies.</p>
<ul>
  <li><b>Koranisches Gebot:</b> "Und dein Herr hat bestimmt, dass ihr nur Ihm dienen und zu den Eltern gütig sein sollt. Wenn einer von ihnen oder beide bei dir ein hohes Alter erreichen, so sag zu ihnen nicht 'Pfui!'..." (Koran 17:23).</li>
  <li><b>Die Mutter zuerst:</b> Als ein Mann den Propheten fragte, wer die meiste Zuneigung verdient, antwortete er dreimal: "Deine Mutter", und erst beim vierten Mal: "Dein Vater".</li>
  <li><b>Dua für sie:</b> Beten Sie ständig für ihre Vergebung: "Mein Herr, erbarme Dich ihrer, so wie sie mich großgezogen haben, als ich klein war."</li>
</ul>`,
    category: 'Beziehungen, Ehe & Familie',
    readTime: 5,
    imageUrl: 'https://images.unsplash.com/photo-1511895426328-dc8714191300',
    lang: 'de',
    version: 1,
    isActive: true,
  },

  // 7. Jugend, Motivation & Disziplin
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
    articleId: 'discipline-in-prayers',
    slug: 'disziplin-im-gebet-als-schluessel-zum-erfolg',
    title: 'Disziplin im Gebet als Schlüssel zum Erfolg',
    content: `<h3>Wie Salah unseren Alltag ordnet</h3>
<p>Das Gebet (Salah) ist nicht nur eine Pflicht, sondern ein tägliches Training für Disziplin, Fokus und Zeitmanagement. Wer sein Gebet pünktlich verrichtet, dem fällt es leichter, auch andere Lebensbereiche zu strukturieren.</p>
<ul>
  <li><b>Der feste Anker:</b> Die 5 täglichen Gebete unterbrechen den Trubel des Alltags und erinnern uns an unseren Lebenssinn.</li>
  <li><b>Vermeidung von Aufschieberitis (Prokrastination):</b> Das sofortige Verrichten des Gebets stärkt die Willenskraft und die Selbstdisziplin.</li>
  <li><b>Spirituelle Stärke:</b> Ein diszipliniertes Gebetsleben reinigt die Seele und schützt vor schlechten Gewohnheiten und Sünden.</li>
</ul>`,
    category: 'Jugend, Motivation & Disziplin',
    readTime: 5,
    imageUrl: 'https://images.unsplash.com/photo-1507208773393-40d9fc670acf',
    lang: 'de',
    version: 1,
    isActive: true,
  },

  // 8. Herz, Emotionen & mentale Kämpfe
  {
    articleId: 'overcoming-anxiety-sabr',
    slug: 'umgang-mit-angst-und-trauer-durch-sabr-und-dua',
    title: 'Umgang mit Angst und Trauer durch Sabr und Dua',
    content: `<h3>Innere Ruhe in stürmischen Zeiten</h3>
<p>Jeder Mensch erlebt Phasen der Angst, Sorge und Trauer. Der Islam lehrt uns, dass diese Gefühle Teil der menschlichen Erfahrung und Prüfungen im irdischen Leben sind.</p>
<ul>
  <li><b>Geduld (Sabr):</b> Sabr bedeutet nicht Tatenlosigkeit, sondern das emotionale Gleichgewicht zu halten, nicht zu verzweifeln und aktiv auf Allahs Hilfe zu hoffen.</li>
  <li><b>Das Gebet (Salah):</b> Der Prophet (s.a.w.) suchte Zuflucht im Gebet, wann immer ihn eine Angelegenheit schwer bedrückte. Es verbindet uns wieder mit der Ewigkeit und relativiert irdische Sorgen.</li>
  <li><b>Dua als emotionale Stütze:</b> Das aufrichtige Aussprechen von Sorgen vor Allah im Dua bringt sofortige Erleichterung und Trost. Sagen Sie oft: "Hasbunallahu wa ni'mal wakeel" (Allah genügt uns, und Er ist der beste Sachwalter).</li>
</ul>`,
    category: 'Herz, Emotionen & mentale Kämpfe',
    readTime: 5,
    imageUrl: 'https://images.unsplash.com/photo-1499209974431-9dddcece7f88',
    lang: 'de',
    version: 1,
    isActive: true,
  },
  {
    articleId: 'mental-peace-dhikr',
    slug: 'mentale-gesundheit-und-innerer-frieden',
    title: 'Mentale Gesundheit und innerer Frieden im Islam',
    content: `<h3>Wie der Glaube bei seelischen Belastungen hilft</h3>
<p>Mentale Kämpfe wie Depressionen, übermäßige Sorgen oder Einsamkeit sind reale Herausforderungen. Der Islam bietet einen ganzheitlichen Ansatz, der spirituelle Praktiken mit praktischen Schritten verbindet.</p>
<ul>
  <li><b>Akzeptanz der Prüfung:</b> Prüfungen sind kein Zeichen von Allahs Zorn, sondern können ein Mittel sein, um Sünden zu tilgen und den Glauben zu stärken.</li>
  <li><b>Therapie und Medizin:</b> Der Islam befürwortet die Suche nach medizinischer und psychologischer Hilfe. Der Prophet (s.a.w.) sagte: "Sucht Heilung, denn Allah hat keine Krankheit erschaffen, ohne auch ein Heilmittel dafür zu erschaffen."</li>
  <li><b>Dhikr (Gedenken):</b> "Es sind diejenigen, die glauben und deren Herzen im Gedenken Allahs Ruhe finden." (Koran 13:28).</li>
</ul>`,
    category: 'Herz, Emotionen & mentale Kämpfe',
    readTime: 6,
    imageUrl: 'https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5',
    lang: 'de',
    version: 1,
    isActive: true,
  },

  // 9. Dunya, Geld & moderne Gesellschaft
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
  {
    articleId: 'riba-danger',
    slug: 'die-gefahr-von-zinsen-riba-im-alltag',
    title: 'Die Gefahr von Zinsen (Riba) im modernen Alltag',
    content: `<h3>Warum Zinsen im Islam verboten sind</h3>
<p>Zinsen (Riba) gehören zu den schwersten Sünden im Islam, da sie Ausbeutung fördern und soziale Ungerechtigkeit vergrößern. Allah warnt im Koran eindringlich davor.</p>
<ul>
  <li><b>Wirtschaftliche Gerechtigkeit:</b> Der Islam fördert reale Investitionen, Partnerschaften und Risikoteilung statt garantierter Zinsgewinne auf Kosten der Schuldner.</li>
  <li><b>Alternative Halal-Investitionen:</b> Muslime sollten nach islamkonformen Finanzlösungen, Aktien ohne Riba oder zinsfreien Krediten (Qard al-Hasan) suchen.</li>
  <li><b>Der Segen im Verzicht:</b> "Allah löscht den Zinssegen aus und lässt die Almosen wachsen..." (Koran 2:276).</li>
</ul>`,
    category: 'Dunya, Geld & moderne Gesellschaft',
    readTime: 5,
    imageUrl: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44',
    lang: 'de',
    version: 1,
    isActive: true,
  },

  // 10. Quran, Dua & Verbindung zu Allah
  {
    articleId: 'power-of-istighfar',
    slug: 'die-transformative-kraft-des-istighfar',
    title: 'Die transformative Kraft des Istighfar (Vergebung suchen)',
    content: `<h3>Ein Schlüssel zu spiritueller und weltlicher Erleichterung</h3>
<p>Istighfar (das Sagen von "Astaghfirullah") reinigt das Herz nicht nur von Sünden, sondern öffnet auch die Türen der Versorgung, des Friedens und der Stärke im Leben.</p>
<p>Im Koran sagt Allah durch den Propheten Nuh (Noah): "Sucht Vergebung bei eurem Herrn... Er wird den Regen reichlich über euch senden und euch mit Besitz und Kindern unterstützen."</p>
<ul>
  <li><b>Befreiung von Sorgen:</b> Wer viel Istighfar praktiziert, dem schenkt Allah einen Ausweg aus jeder Bedrängnis und Erleichterung bei jedem Kummer.</li>
  <li><b>Mehr Segen im Alltag:</b> Es stärkt die spirituelle Verbindung zu Allah und zieht Seine Barmherzigkeit an.</li>
</ul>`,
    category: 'Quran, Dua & Verbindung zu Allah',
    readTime: 4,
    imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e',
    lang: 'de',
    version: 1,
    isActive: true,
  },
  {
    articleId: 'quran-daily-connection',
    slug: 'die-taegliche-verbindung-zum-quran',
    title: 'Die tägliche Verbindung zum Quran aufbauen',
    content: `<h3>Wie wir das Buch Allahs in unser Leben integrieren</h3>
<p>Der Koran ist nicht nur ein Buch zum Dekorieren, sondern eine Rechtleitung für den Alltag. Eine tägliche, beständige Dosis Koran - selbst wenn es nur wenige Verse sind - belebt das Herz.</p>
<ul>
  <li><b>Regelmäßigkeit vor Quantität:</b> Der Prophet (s.a.w.) sagte: "Die beliebtesten Taten bei Allah sind die beständigen, auch wenn sie gering sind." Lesen Sie jeden Tag mindestens eine Seite.</li>
  <li><b>Verstehen und Nachsinnen (Tadabbur):</b> Lesen Sie den Koran mit Übersetzung und Tafsir. Das Nachsinnen über die Bedeutung verändert das Verhalten und stärkt den Glauben.</li>
  <li><b>Das Herz mit Licht füllen:</b> Ein Haus, in dem der Koran rezitiert wird, zieht Engel an und vertreibt den Schaitan.</li>
</ul>`,
    category: 'Quran, Dua & Verbindung zu Allah',
    readTime: 5,
    imageUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c',
    lang: 'de',
    version: 1,
    isActive: true,
  },
]

async function seedRealArticles() {
  try {
    console.log('🚀 Starting Seeding of 20 Real Knowledge Library Articles (German)...')
    await mongoose.connect(config.database_url as string)
    console.log('✅ Connected to database')

    for (const article of realArticles) {
      console.log(`Upserting German article in "${article.category}": "${article.title}"...`)
      await KnowledgeArticle.findOneAndUpdate(
        { articleId: article.articleId, lang: 'de' },
        { $set: { ...article, source: 'manual' } },
        { upsert: true, new: true }
      )
    }

    console.log('\n🎉 Real German articles seed successfully completed!')
  } catch (error) {
    console.error('❌ Error seeding knowledge library:', error)
  } finally {
    await mongoose.disconnect()
    console.log('🔌 Disconnected from database')
  }
}

seedRealArticles()
