import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SHADOWS } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../i18n';
import { useSpeech } from '../hooks/useSpeech';

const FAQS = [
  {
    id: 1,
    category: 'Naturalization',
    q: { en: 'How long does it take to become a U.S. citizen?', es: '¿Cuánto tiempo tarda convertirse en ciudadano de EE.UU.?', ht: 'Konbyen tan sa pran pou tounen yon sitwayen ameriken?' },
    a: { en: 'The naturalization process typically takes 12–24 months from filing Form N-400 to taking the Oath of Allegiance. Times vary by USCIS field office and your individual circumstances. Check current processing times at uscis.gov.', es: 'El proceso de naturalización generalmente tarda de 12 a 24 meses desde que se presenta el Formulario N-400 hasta que se toma el Juramento de Lealtad. Los tiempos varían según la oficina local de USCIS y sus circunstancias individuales.', ht: 'Pwosesis natirizasyon an pran antre 12 a 24 mwa soti nan depoze Fòm N-400 jiska pran Sèman Fidèlite a.' },
  },
  {
    id: 2,
    category: 'Naturalization',
    q: { en: 'What are the requirements to apply for naturalization?', es: '¿Cuáles son los requisitos para solicitar la naturalización?', ht: 'Ki kondisyon pou mande natirizasyon?' },
    a: { en: 'You must: be a permanent resident (green card holder) for at least 5 years (3 years if married to a U.S. citizen), be at least 18 years old, have continuous residence in the U.S., have good moral character, pass the English and civics tests, and be willing to take the Oath of Allegiance.', es: 'Debe: ser residente permanente (titular de tarjeta verde) por al menos 5 años (3 años si está casado con un ciudadano estadounidense), tener al menos 18 años, tener residencia continua en EE.UU., tener buen carácter moral, pasar las pruebas de inglés y cívica, y estar dispuesto a tomar el Juramento de Lealtad.', ht: 'Ou dwe: yon rezidan pèmanan (titulè kat vèt) pou omwen 5 an (3 an si ou marye ak yon sitwayen ameriken), gen omwen 18 an, gen rezidans kontinyèl nan Etazini, gen bon karaktè moral, pase tès anglè ak sivik yo, epi aksepte pran Sèman Fidèlite a.' },
  },
  {
    id: 3,
    category: 'Naturalization',
    q: { en: 'What is the civics test like?', es: '¿Cómo es el examen de civismo?', ht: 'Kijan tès sivik la ye?' },
    a: { en: 'An officer will ask you up to 10 questions from the official list of 100 civics questions. You must answer 6 out of 10 correctly to pass. The questions cover American history, government, and geography. You can study all 100 questions on the USCIS website for free.', es: 'Un oficial le hará hasta 10 preguntas de la lista oficial de 100 preguntas cívicas. Debe responder correctamente 6 de 10 para aprobar. Las preguntas cubren historia, gobierno y geografía americanos.', ht: 'Yon ofisye ap poze ou jiska 10 kesyon soti nan lis ofisyèl 100 kesyon sivik yo. Ou dwe reponn 6 nan 10 kòrèkteman pou pase. Kesyon yo kouvri istwa, gouvènman, ak jewografi ameriken.' },
  },
  {
    id: 4,
    category: 'Green Card',
    q: { en: 'What is the difference between a green card and citizenship?', es: '¿Cuál es la diferencia entre una tarjeta verde y la ciudadanía?', ht: 'Ki diferans ki genyen ant kat vèt la ak sitwayennete?' },
    a: { en: 'A green card makes you a lawful permanent resident — you can live and work in the U.S. indefinitely. Citizenship gives you additional rights: voting in federal elections, getting a U.S. passport, sponsoring more family members, and protection from deportation. Citizens cannot lose their status the way permanent residents can.', es: 'Una tarjeta verde te hace residente permanente legal: puedes vivir y trabajar en EE.UU. indefinidamente. La ciudadanía te da derechos adicionales: votar en elecciones federales, obtener pasaporte estadounidense, patrocinar a más familiares y protección contra la deportación.', ht: 'Kat vèt la fè ou yon rezidan pèmanan legal — ou ka viv ak travay nan Etazini san limit. Sitwayennete bay ou dwa siplemantè: vote nan eleksyon federal, jwenn yon paspò ameriken, patwinen plis manm fanmi, ak pwoteksyon kont depòtasyon.' },
  },
  {
    id: 5,
    category: 'Green Card',
    q: { en: 'How do I renew my green card?', es: '¿Cómo renuevo mi tarjeta verde?', ht: 'Kijan pou m renouvle kat vèt mwen?' },
    a: { en: 'File Form I-90 online at uscis.gov up to 6 months before your green card expires. The filing fee is $455 plus $85 for biometrics (as of 2025). USCIS will mail you a receipt notice, schedule your biometrics, and mail the new card. Processing typically takes 8–18 months.', es: 'Presente el Formulario I-90 en línea en uscis.gov hasta 6 meses antes de que expire su tarjeta verde. La tarifa de presentación es de $455 más $85 para biometría. USCIS le enviará un aviso de recibo, programará su biometría y enviará la nueva tarjeta.', ht: 'Depoze Fòm I-90 sou entènèt nan uscis.gov jiska 6 mwa anvan kat vèt ou ekspire. Frè depo a se $455 plis $85 pou biometrik. USCIS pral voye yon avi resepti ba ou, planifye biometrik ou, epi voye nouvo kat la.' },
  },
  {
    id: 6,
    category: 'Green Card',
    q: { en: 'Can I travel outside the U.S. with a green card?', es: '¿Puedo viajar fuera de EE.UU. con una tarjeta verde?', ht: 'Èske m ka vwayaje deyò Etazini ak yon kat vèt?' },
    a: { en: 'Yes, but be careful about time limits. Absences of 6 months or more can break your continuous residence for naturalization purposes. Absences of 1 year or more may be considered as abandoning your green card. If you plan to be away for more than 1 year, apply for a re-entry permit (Form I-131) before leaving.', es: 'Sí, pero tenga cuidado con los límites de tiempo. Las ausencias de 6 meses o más pueden interrumpir su residencia continua para propósitos de naturalización. Las ausencias de 1 año o más pueden considerarse como abandono de su tarjeta verde.', ht: 'Wi, men pran prekosyon konsènan limit tan. Absans 6 mwa oswa plis ka kase rezidans kontinyèl ou pou rezon natirizasyon. Absans 1 an oswa plis ka konsidere kòm abandone kat vèt ou.' },
  },
  {
    id: 7,
    category: 'Application Process',
    q: { en: 'What is Form N-400 and where do I get it?', es: '¿Qué es el Formulario N-400 y dónde lo consigo?', ht: 'Kisa Fòm N-400 ye epi ki kote mwen jwenn li?' },
    a: { en: 'Form N-400 is the Application for Naturalization. Download it for free at uscis.gov/n-400 or apply online at myaccount.uscis.gov. Never pay a third-party website for this form. The filing fee is $725 for most applicants (as of 2025), or $0 for certain military members.', es: 'El Formulario N-400 es la Solicitud de Naturalización. Descárguelo gratis en uscis.gov/n-400 o solicite en línea en myaccount.uscis.gov. Nunca pague a un sitio web de terceros por este formulario.', ht: 'Fòm N-400 se Aplikasyon pou Natirizasyon an. Telechaje li gratis nan uscis.gov/n-400 oswa aplike sou entènèt nan myaccount.uscis.gov. Pa janm peye yon sit entènèt twazyèm pati pou fòm sa a.' },
  },
  {
    id: 8,
    category: 'Application Process',
    q: { en: 'What documents do I need for my naturalization interview?', es: '¿Qué documentos necesito para mi entrevista de naturalización?', ht: 'Ki dokiman mwen bezwen pou entèvyou natirizasyon mwen an?' },
    a: { en: 'Bring originals and copies of: your green card, state ID or driver\'s license, your interview appointment notice (Form N-400 acknowledgment), any documents showing name changes, 5 years of tax returns (USCIS may request these), and any travel records showing trips outside the U.S.', es: 'Traiga originales y copias de: su tarjeta verde, identificación estatal o licencia de conducir, su aviso de cita de entrevista, cualquier documento que muestre cambios de nombre, 5 años de declaraciones de impuestos y cualquier registro de viaje que muestre viajes fuera de EE.UU.', ht: 'Pote orijinal ak kopi: kat vèt ou, ID eta oswa lisans kondwi, avi randevou entèvyou ou, nenpòt dokiman ki montre chanjman non, 5 an deklarasyon taks, ak nenpòt dosye vwayaj ki montre vwayaj deyò Etazini.' },
  },
  {
    id: 9,
    category: 'Application Process',
    q: { en: 'What happens at a biometrics appointment?', es: '¿Qué sucede en una cita de biometría?', ht: 'Ki sa ki rive nan yon randevou biometrik?' },
    a: { en: 'Biometrics appointments are quick — usually 15–30 minutes. USCIS staff will take your fingerprints and photograph. Bring your appointment notice and valid photo ID. Do not be late. USCIS uses your biometrics for background checks. You cannot reschedule without contacting USCIS first.', es: 'Las citas de biometría son rápidas, generalmente de 15 a 30 minutos. El personal de USCIS tomará sus huellas digitales y fotografía. Traiga su aviso de cita y una identificación con foto válida.', ht: 'Randevou biometrik yo rapid — anjeneral 15-30 minit. Anplwaye USCIS pral pran anprent dwèt ou ak foto. Pote avi randevou ou ak yon ID foto valid. Pa rive an reta.' },
  },
  {
    id: 10,
    category: 'Rights & Responsibilities',
    q: { en: 'What are my rights as a permanent resident?', es: '¿Cuáles son mis derechos como residente permanente?', ht: 'Ki dwa mwen genyen kòm rezidan pèmanan?' },
    a: { en: 'As a permanent resident you have the right to: live and work anywhere in the U.S., attend public schools, receive certain public benefits, own property, apply for certain government jobs, and carry a firearm (subject to state laws). You can also petition to bring qualifying family members to the U.S.', es: 'Como residente permanente tiene derecho a: vivir y trabajar en cualquier lugar de EE.UU., asistir a escuelas públicas, recibir ciertos beneficios públicos, poseer propiedades, solicitar ciertos empleos gubernamentales y portar armas de fuego (sujeto a las leyes estatales).', ht: 'Kòm rezidan pèmanan ou gen dwa: viv ak travay nenpòt ki kote nan Etazini, ale nan lekòl piblik, resevwa sèten avantaj piblik, posede pwopriyete, aplike pou sèten travay gouvènman, ak pote zam (selon lwa eta yo).' },
  },
  {
    id: 11,
    category: 'Rights & Responsibilities',
    q: { en: 'Do I have to register for Selective Service?', es: '¿Tengo que registrarme en el Servicio Selectivo?', ht: 'Èske mwen dwe anrejistre nan Sèvis Selektif?' },
    a: { en: 'Male immigrants between 18 and 25 who are not U.S. citizens must register with the Selective Service within 30 days of arriving in the U.S. or turning 18. This applies to most non-citizen male residents. Failing to register can affect your ability to become a citizen or get federal benefits.', es: 'Los inmigrantes varones entre 18 y 25 años que no son ciudadanos estadounidenses deben registrarse en el Servicio Selectivo dentro de los 30 días posteriores a llegar a EE.UU. o cumplir 18 años.', ht: 'Imigran gason ant 18 ak 25 an ki pa sitwayen ameriken dwe anrejistre nan Sèvis Selektif nan 30 jou apre yo rive nan Etazini oswa gen 18 an.' },
  },
  {
    id: 12,
    category: 'Rights & Responsibilities',
    q: { en: 'Can I vote as a permanent resident?', es: '¿Puedo votar como residente permanente?', ht: 'Èske mwen ka vote kòm rezidan pèmanan?' },
    a: { en: 'No. Only U.S. citizens can vote in federal, state, and most local elections. Voting when you are not a citizen is a federal crime that can result in deportation and a permanent bar to citizenship. After you naturalize, register to vote — it is both a right and a civic duty.', es: 'No. Solo los ciudadanos estadounidenses pueden votar en las elecciones federales, estatales y la mayoría de las locales. Votar cuando no eres ciudadano es un delito federal que puede resultar en deportación y una prohibición permanente para obtener la ciudadanía.', ht: 'Non. Se sèlman sitwayen ameriken ki ka vote nan eleksyon federal, eta, ak pifò eleksyon lokal yo. Vote lè ou pa yon sitwayen se yon krim federal ki ka mennen nan depòtasyon ak yon entèdiksyon pèmanan pou sitwayennete.' },
  },
  {
    id: 13,
    category: 'Fees & Costs',
    q: { en: 'How much does it cost to become a citizen?', es: '¿Cuánto cuesta convertirse en ciudadano?', ht: 'Konbyen sa koute pou tounen yon sitwayen?' },
    a: { en: 'The USCIS filing fee for Form N-400 is $725 (as of 2025). If you cannot afford this fee, file Form I-912 to request a fee waiver — eligibility is based on income or public benefits. Some nonprofits also hold free or discounted naturalization clinics. Attorney fees are separate and vary.', es: 'La tarifa de presentación de USCIS para el Formulario N-400 es de $725 (a partir de 2025). Si no puede pagar esta tarifa, presente el Formulario I-912 para solicitar una exención de tarifa.', ht: 'Frè depo USCIS pou Fòm N-400 se $725 (an 2025). Si ou pa ka pèmèt frè sa a, depoze Fòm I-912 pou mande egzanpsyon frè — elijibilite a baze sou revni oswa avantaj piblik yo.' },
  },
  {
    id: 14,
    category: 'Fees & Costs',
    q: { en: 'Are there any free immigration services?', es: '¿Existen servicios de inmigración gratuitos?', ht: 'Èske genyen sèvis imigrasyon gratis?' },
    a: { en: 'Yes. Many nonprofits provide free or low-cost immigration legal help. Look for DOJ-accredited representatives through the CLINIC network, RAICES, IRC, PAIR Project, and Legal Aid Society. Public libraries also often host workshops. The USCIS website and all its forms are always free at uscis.gov.', es: 'Sí. Muchas organizaciones sin fines de lucro brindan ayuda legal de inmigración gratuita o de bajo costo. Busque representantes acreditados por el DOJ a través de la red CLINIC, RAICES, IRC, Proyecto PAIR y Legal Aid Society.', ht: 'Wi. Anpil òganizasyon san bi likratif bay èd legal imigrasyon gratis oswa pri ba. Chèche reprezantan akredite pa DOJ atravè rezo CLINIC, RAICES, IRC, Pwojè PAIR, ak Legal Aid Society.' },
  },
  {
    id: 15,
    category: 'Special Situations',
    q: { en: 'What if I have a criminal record?', es: '¿Qué pasa si tengo antecedentes penales?', ht: 'Kisa ki rive si mwen gen yon dosye kriminèl?' },
    a: { en: 'A criminal record does not automatically bar you from citizenship, but it depends on what the charges were. Certain crimes (aggravated felonies, crimes of moral turpitude, drug offenses) can permanently bar you. Always disclose your full history on USCIS forms — hiding it is worse than the crime itself. Consult an immigration attorney before filing.', es: 'Un antecedente penal no lo descalifica automáticamente de la ciudadanía, pero depende de los cargos. Ciertos delitos pueden excluirlo permanentemente. Siempre divulgue su historial completo en los formularios de USCIS.', ht: 'Yon dosye kriminèl pa otomatikman eksklui ou nan sitwayennete, men sa depan sou ki akizasyon yo te ye. Sèten krim ka entèdi ou pèmamanan. Toujou revele tout istwa ou nan fòm USCIS yo.' },
  },
  {
    id: 16,
    category: 'Special Situations',
    q: { en: 'What is asylum and how do I apply?', es: '¿Qué es el asilo y cómo solicito?', ht: 'Kisa azil ye epi kijan pou m aplike?' },
    a: { en: 'Asylum is protection for people who have been persecuted, or fear persecution, in their home country based on race, religion, nationality, political opinion, or membership in a particular social group. You must apply within 1 year of arriving in the U.S. using Form I-589. There is no filing fee. Consult an attorney — asylum cases are complex.', es: 'El asilo es protección para personas que han sido perseguidas o temen persecución en su país de origen por motivos de raza, religión, nacionalidad, opinión política o pertenencia a un grupo social particular. Debe solicitar dentro de 1 año de llegar a EE.UU. usando el Formulario I-589.', ht: 'Azil se pwoteksyon pou moun ki te pèsekite, oswa ki pè pèseksyon, nan peyi lakay yo akòz ras, relijyon, nasyonalite, opinion politik, oswa manm nan yon gwoup sosyal patikilye. Ou dwe aplike nan 1 an apre ou rive nan Etazini lè l sèvi avèk Fòm I-589.' },
  },
  {
    id: 17,
    category: 'Special Situations',
    q: { en: 'Can children born in the U.S. become citizens automatically?', es: '¿Los niños nacidos en EE.UU. son ciudadanos automáticamente?', ht: 'Èske timoun ki fèt nan Etazini tounen sitwayen otomatikman?' },
    a: { en: 'Yes. Under the 14th Amendment, children born on U.S. soil are automatically U.S. citizens regardless of their parents\' immigration status. This is called birthright citizenship. Apply for a U.S. birth certificate and then a U.S. passport for the child as proof of citizenship.', es: 'Sí. Bajo la 14ª Enmienda, los niños nacidos en suelo estadounidense son ciudadanos automáticamente independientemente del estatus migratorio de sus padres.', ht: 'Wi. Dapre Amandman 14a a, timoun ki fèt sou tè ameriken se otomatikman sitwayen ameriken kèlkeswa estati imigrasyon paran yo.' },
  },
  {
    id: 18,
    category: 'Documents',
    q: { en: 'What documents do I need to keep forever?', es: '¿Qué documentos debo guardar para siempre?', ht: 'Ki dokiman mwen bezwen kenbe pou tout tan?' },
    a: { en: 'Keep permanently: your naturalization certificate, passport, birth certificate, marriage/divorce certificates, tax returns (7 years minimum), green card (until you naturalize), I-94 arrival records, and all USCIS approval notices. Store originals in a fireproof safe and make digital copies stored in a secure cloud.', es: 'Conserve permanentemente: su certificado de naturalización, pasaporte, acta de nacimiento, certificados de matrimonio/divorcio, declaraciones de impuestos (mínimo 7 años), tarjeta verde (hasta que se naturalice) y todos los avisos de aprobación de USCIS.', ht: 'Kenbe pèmamanan: sètifika natirizasyon ou, paspò, sètifika nesans, sètifika maryaj/divòs, deklarasyon taks (minimòm 7 an), kat vèt (jiska ou natirilize), ak tout avi apwobasyon USCIS.' },
  },
  {
    id: 19,
    category: 'After Citizenship',
    q: { en: 'What do I do right after my naturalization ceremony?', es: '¿Qué hago justo después de mi ceremonia de naturalización?', ht: 'Kisa pou m fè jis apre seremoni natirizasyon mwen an?' },
    a: { en: 'Immediately after your ceremony: (1) Keep your naturalization certificate safe — it is irreplaceable. (2) Apply for a U.S. passport (Form DS-11) — bring your certificate, photo ID, and passport photo. (3) Update your Social Security record online at ssa.gov. (4) Register to vote. (5) Update your name if changed on all accounts, licenses, and records.', es: 'Inmediatamente después de su ceremonia: (1) Guarde su certificado de naturalización de forma segura. (2) Solicite un pasaporte estadounidense. (3) Actualice su registro de Seguro Social en ssa.gov. (4) Regístrese para votar. (5) Actualice su nombre si cambió.', ht: 'Imedyatman apre seremoni ou: (1) Kenbe sètifika natirizasyon ou an sekirite. (2) Aplike pou yon paspò ameriken. (3) Mete a jou dosye Sekirite Sosyal ou nan ssa.gov. (4) Anrejistre pou vote. (5) Mete a jou non ou si li chanje.' },
  },
  {
    id: 20,
    category: 'After Citizenship',
    q: { en: 'Can a U.S. citizen lose their citizenship?', es: '¿Puede un ciudadano estadounidense perder su ciudadanía?', ht: 'Èske yon sitwayen ameriken ka pèdi sitwayennete li?' },
    a: { en: 'It is very rare. You can lose U.S. citizenship through a voluntary act like renouncing citizenship, serving in a foreign military as an officer, committing treason, or being naturalized through fraud (your certificate can be revoked). Simply living abroad or holding dual citizenship generally does not cause you to lose U.S. citizenship.', es: 'Es muy raro. Puede perder la ciudadanía estadounidense mediante un acto voluntario como renunciar a ella, servir en un ejército extranjero como oficial, cometer traición o naturalizarse mediante fraude.', ht: 'Li ra anpil. Ou ka pèdi sitwayennete ameriken nan yon aksyon volontè tankou renonsasyon sitwayennete, sèvi nan yon lame etranje kòm ofisye, fè trayizon, oswa natirilize atravè fwod.' },
  },
];

function FAQItem({ item, lang, colors, onSpeak }) {
  const [open, setOpen] = useState(false);
  const l = lang === 'es' ? 'es' : lang === 'ht' ? 'ht' : 'en';
  const question = item.q[l] || item.q.en;
  const answer   = item.a[l] || item.a.en;

  return (
    <View style={[styles.card, { backgroundColor: colors.card || '#fff' }, SHADOWS.small]}>
      <TouchableOpacity style={styles.qRow} onPress={() => setOpen(!open)} activeOpacity={0.8}>
        <View style={[styles.numBadge, { backgroundColor: colors.primaryLight }]}>
          <Text style={[styles.numText, { color: colors.primary }]}>{item.id}</Text>
        </View>
        <Text style={[styles.qText, { color: colors.text }]}>{question}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textSecondary} />
      </TouchableOpacity>
      {open && (
        <View style={styles.aWrap}>
          <Text style={[styles.aText, { color: colors.text }]}>{answer}</Text>
          <TouchableOpacity
            style={[styles.speakBtn, { borderColor: colors.primary + '40' }]}
            onPress={() => onSpeak(`${question}. ${answer}`)}
          >
            <Ionicons name="volume-high-outline" size={15} color={colors.primary} />
            <Text style={[styles.speakText, { color: colors.primary }]}>Read Aloud</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const CATS = ['All', 'Naturalization', 'Green Card', 'Application Process', 'Rights & Responsibilities', 'Fees & Costs', 'Special Situations', 'Documents', 'After Citizenship'];

export default function FAQScreen() {
  const { colors } = useTheme();
  const { lang } = useLanguage();
  const { speak } = useSpeech();
  const insets = useSafeAreaInsets();

  const [query, setQuery]   = useState('');
  const [cat, setCat]       = useState('All');

  const l = lang === 'es' ? 'es' : lang === 'ht' ? 'ht' : 'en';

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return FAQS.filter((item) => {
      const matchCat = cat === 'All' || item.category === cat;
      if (!matchCat) return false;
      if (!q) return true;
      return (item.q[l] || item.q.en).toLowerCase().includes(q) ||
             (item.a[l] || item.a.en).toLowerCase().includes(q);
    });
  }, [query, cat, l]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.searchWrap, { backgroundColor: colors.card || '#fff' }, SHADOWS.small]}>
        <Ionicons name="search-outline" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search questions…"
          placeholderTextColor={colors.textSecondary}
          value={query}
          onChangeText={setQuery}
          clearButtonMode="while-editing"
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={styles.chipRow}>
        {CATS.map((c) => {
          const active = cat === c;
          return (
            <TouchableOpacity
              key={c}
              style={[styles.chip, active ? { backgroundColor: colors.primary } : { backgroundColor: colors.card || '#fff', borderWidth: 1, borderColor: '#ddd' }]}
              onPress={() => setCat(c)}
            >
              <Text style={[styles.chipText, { color: active ? '#fff' : colors.textSecondary }]}>{c}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="help-circle-outline" size={48} color={colors.textLight || '#ccc'} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No questions found</Text>
          </View>
        ) : (
          filtered.map((item) => (
            <FAQItem key={item.id} item={item} lang={lang} colors={colors} onSpeak={speak} />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1 },
  searchWrap:  { flexDirection: 'row', alignItems: 'center', margin: 16, marginBottom: 8, borderRadius: 14, paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 10 : 6 },
  searchInput: { flex: 1, fontSize: 15 },
  chipScroll:  { flexGrow: 0 },
  chipRow:     { paddingHorizontal: 16, gap: 8, paddingBottom: 8 },
  chip:        { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  chipText:    { fontSize: 12, fontWeight: '600' },
  list:        { paddingHorizontal: 16, gap: 10 },
  card:        { borderRadius: 16, overflow: 'hidden' },
  qRow:        { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  numBadge:    { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  numText:     { fontSize: 12, fontWeight: '800' },
  qText:       { flex: 1, fontSize: 14, fontWeight: '600', lineHeight: 20 },
  aWrap:       { paddingHorizontal: 14, paddingBottom: 14, gap: 10 },
  aText:       { fontSize: 14, lineHeight: 22 },
  speakBtn:    { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  speakText:   { fontSize: 13, fontWeight: '600' },
  empty:       { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText:   { fontSize: 15 },
});
