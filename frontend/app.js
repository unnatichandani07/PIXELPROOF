'use strict';
/* ==========================================================
   PixelProof — app.js
   Tabs, EN/HI, light/dark, image check, recent scans,
   scenario lab and help directory. No build step needed.
   ========================================================== */

/* ---------- 1. CONFIG: edit these to match your Flask backend ---------- */
const CONFIG = {
  // If you open index.html straight from disk, talk to the local Flask server.
  API_URL: location.protocol === 'file:' ? 'http://127.0.0.1:5000/api/predict' : '/api/predict',
  FILE_FIELD: 'image',     // name of the form field your /api/predict reads (e.g. 'file' or 'image')
  MAX_MB: 16,
  HIGH: 70,                // % at or above which a score counts as "likely"
  LOW: 40,                 // % below which both scores count as "no signs"
  MAX_SAVED: 30
};

/* Map whatever JSON your backend returns into { ai, forged, ela } (0-100).
   Adjust the key lists below if your response uses other names. */
function normalizeResponse(data) {
  const num = (v) => {
    if (v && typeof v === 'object') v = v.probability ?? v.score ?? v.confidence ?? v.percent;
    v = parseFloat(v);
    if (isNaN(v)) return null;
    return v <= 1 ? v * 100 : v;           // accepts 0.783 or 78.3
  };
  const pick = (keys) => { for (const k of keys) if (data[k] !== undefined && data[k] !== null) return data[k]; return undefined; };

  const ai = num(pick(['ai_generated', 'ai_probability', 'ai_score', 'ai', 'cifake', 'ai_detector']));
  const forged = num(pick(['forged', 'forgery', 'forged_probability', 'forgery_probability', 'forgery_score', 'edited', 'casia', 'forgery_detector']));
  let ela = pick(['ela_map', 'ela', 'ela_image', 'ela_base64']);
  if (typeof ela === 'string' && ela && !/^(data:|https?:|\/)/.test(ela)) ela = 'data:image/png;base64,' + ela;
  if (ai === null || forged === null || ai === undefined || forged === undefined) throw new Error('Unexpected response shape');
  return { ai, forged, ela: ela || null };
}

/* ---------- 2. TRANSLATIONS ---------- */
const STR = {
  en: {
    skip: 'Skip to content', tagline: 'Image Forensics & Safety', getHelp: 'Get Help Now',
    'nav.label': 'Main sections', 'nav.dashboard': 'Dashboard', 'nav.analyze': 'Check an image', 'nav.recent': 'Recent scans', 'nav.learn': 'Scenario Lab', 'nav.help': 'Report & Help',
    'lang.label': 'Language', 'theme.toggle': 'Switch theme',
    'dash.title': 'Overview', 'dash.sub': 'Your activity on this device', 'dash.breakdown': 'Verdict breakdown', 'dash.tip': 'Safety tip', 'dash.nextTip': 'Another tip',
    'dash.cta1': 'Check an image', 'dash.cta1s': 'Find out if a photo was edited or AI-made',
    'dash.cta2': 'Practise a scenario', 'dash.cta2s': 'Learn the safest first move for common scams',
    'dash.cta3': 'Need help right now?', 'dash.cta3s': 'Hotlines, reporting portals and removal tools',
    'dash.s1': 'Images checked', 'dash.s2': 'Flagged', 'dash.s3': 'Likely authentic', 'dash.s4': 'Inconclusive',
    'dash.empty': 'No scans yet. Check your first image to see your stats here.', 'dash.images': 'images',
    'an.title': 'Check an image', 'an.sub': 'Our models scan for signs of editing and AI generation. You get a score, not a guess.',
    'an.drop': 'Drop an image here, or click to choose one', 'an.formats': 'JPG or PNG, up to 16 MB',
    'an.view': 'Image view', 'an.original': 'Original', 'an.ela': 'ELA map', 'an.elaHelp': 'ELA highlights areas saved at a different compression level, which can hint at editing.',
    'an.elaNone': 'The server did not return an ELA map for this image.',
    'an.emptyResult': 'Your result will appear here.', 'an.analyzing': 'Analyzing the image…',
    'an.demo': 'Demo result: the PixelProof backend could not be reached, so these numbers are sample values.',
    'an.ai': 'AI-generated', 'an.aiNote': 'Model trained on CIFAKE (real vs AI images)',
    'an.forged': 'Forged or edited', 'an.fgNote': 'Model trained on CASIA 2 (spliced and edited photos)',
    'an.hash': 'File fingerprint (SHA-256)',
    'an.caution': 'Results are estimates, not proof. Use them together with the source and context of the image.',
    'an.reverse': 'Reverse image search', 'an.report': 'Report this image', 'an.again': 'Check another',
    'an.errType': 'Please choose a JPG or PNG image.', 'an.errSize': 'That file is larger than 16 MB.', 'an.errServer': 'The server could not analyze this image. Please try again.',
    'v.ai': 'Likely AI-generated', 'v.aiT': 'This image looks more like AI-generated images than real photos.',
    'v.forged': 'Likely edited or forged', 'v.forgedT': 'Parts of this image look spliced or altered after it was taken.',
    'v.both': 'AI-generated and edited', 'v.bothT': 'Both models raised strong warnings. Treat this image as unreliable.',
    'v.clean': 'No signs of manipulation', 'v.cleanT': 'Neither model found strong signs of editing or AI generation. That does not prove the image is genuine.',
    'v.unsure': 'Inconclusive', 'v.unsureT': 'The evidence is mixed. Look for the original source before trusting or sharing it.',
    'rc.title': 'Recent scans', 'rc.sub': 'Saved only in this browser.', 'rc.clear': 'Clear all', 'rc.empty': 'No scans yet.', 'rc.delete': 'Delete scan',
    'rc.confirm': 'Delete all saved scans from this browser?', 'rc.go': 'Check an image',
    'ln.title': 'Scenario Lab', 'ln.sub': 'Practise the right first move before it happens to you.',
    'ln.urgentT': 'Dealing with an active threat or extortion right now?', 'ln.urgentD': 'You do not need to finish this module first.', 'ln.urgentB': 'Open help directory',
    'ln.jump': 'Jump to scenario', 'ln.step': 'Scenario {n} of {total}', 'ln.done': '{n} of {total} completed',
    'ln.safe': 'Recommended', 'ln.risky': 'Risky', 'ln.whySafe': 'Why this is the safe choice', 'ln.whyRisky': 'Why this is risky', 'ln.better': 'Safer move:',
    'ln.prompt': 'Choose an answer to see what happens.', 'ln.protocol': 'Protocol: what to actually do',
    'ln.retry': 'Try again', 'ln.next': 'Next scenario', 'ln.resetAll': 'Reset all', 'ln.finished': 'You have completed every scenario. Keep the Report & Help tab handy.',
    'hp.title': 'Report & Help', 'hp.sub': 'Official reporting portals, hotlines and platform removal tools',
    'hp.dangerT': 'In immediate physical danger?', 'hp.dangerD': 'If someone is threatening violence or self-harm, call your local emergency number now:',
    'hp.checkT': 'Before you report: quick evidence checklist', 'hp.checkS': 'Preserve digital proof without engaging or re-sharing the content.', 'hp.copy': 'Copy checklist', 'hp.copied': 'Checklist copied',
    'hp.portals': 'Official cybercrime & law-enforcement portals', 'hp.platforms': 'Direct platform removal tools', 'hp.platformsS': 'The fastest way to remove abusive or impersonating media is through the platform hosting it:',
    'hp.noticeT': 'Important notice:', 'hp.noticeD': 'PixelProof provides automated technical estimates and educational guidance. It is not a law-enforcement agency, a crisis counsellor or a substitute for legal action. If you face harassment or extortion, file a formal report with the authorities above.',
    'hp.help': 'Help Center', 'hp.safety': 'Safety Center', 'hp.call': 'Call', 'hp.free': 'Free / Global', 'hp.minors': 'Under 18',
    footer: 'Digital Safety & Resource Network'
  },
  hi: {
    skip: 'सामग्री पर जाएँ', tagline: 'छवि फ़ोरेंसिक व सुरक्षा', getHelp: 'अभी मदद लें',
    'nav.label': 'मुख्य अनुभाग', 'nav.dashboard': 'डैशबोर्ड', 'nav.analyze': 'छवि जाँचें', 'nav.recent': 'हाल की जाँचें', 'nav.learn': 'परिदृश्य अभ्यास', 'nav.help': 'रिपोर्ट व सहायता',
    'lang.label': 'भाषा', 'theme.toggle': 'थीम बदलें',
    'dash.title': 'अवलोकन', 'dash.sub': 'इस डिवाइस पर आपकी गतिविधि', 'dash.breakdown': 'निष्कर्षों का विवरण', 'dash.tip': 'सुरक्षा सुझाव', 'dash.nextTip': 'दूसरा सुझाव',
    'dash.cta1': 'छवि जाँचें', 'dash.cta1s': 'पता करें कि फ़ोटो एडिट की गई है या AI से बनी है',
    'dash.cta2': 'परिदृश्य का अभ्यास करें', 'dash.cta2s': 'आम घोटालों में सबसे सुरक्षित पहला कदम सीखें',
    'dash.cta3': 'अभी मदद चाहिए?', 'dash.cta3s': 'हेल्पलाइन, रिपोर्टिंग पोर्टल और हटवाने के टूल',
    'dash.s1': 'जाँची गई छवियाँ', 'dash.s2': 'संदिग्ध', 'dash.s3': 'संभवतः असली', 'dash.s4': 'अनिर्णायक',
    'dash.empty': 'अभी तक कोई जाँच नहीं हुई। अपनी पहली छवि जाँचें, आँकड़े यहाँ दिखेंगे।', 'dash.images': 'छवियाँ',
    'an.title': 'छवि जाँचें', 'an.sub': 'हमारे मॉडल एडिटिंग और AI निर्माण के संकेतों की जाँच करते हैं। आपको अनुमान नहीं, एक स्कोर मिलता है।',
    'an.drop': 'छवि यहाँ छोड़ें, या चुनने के लिए क्लिक करें', 'an.formats': 'JPG या PNG, अधिकतम 16 MB',
    'an.view': 'छवि का दृश्य', 'an.original': 'मूल', 'an.ela': 'ELA मैप', 'an.elaHelp': 'ELA उन हिस्सों को उभारता है जो अलग संपीड़न स्तर पर सहेजे गए हैं, जो एडिटिंग का संकेत हो सकता है।',
    'an.elaNone': 'सर्वर ने इस छवि के लिए ELA मैप नहीं भेजा।',
    'an.emptyResult': 'आपका नतीजा यहाँ दिखेगा।', 'an.analyzing': 'छवि की जाँच हो रही है…',
    'an.demo': 'डेमो नतीजा: PixelProof बैकएंड से संपर्क नहीं हो सका, इसलिए ये संख्याएँ नमूना मात्र हैं।',
    'an.ai': 'AI से बनी', 'an.aiNote': 'CIFAKE (असली बनाम AI छवियाँ) पर प्रशिक्षित मॉडल',
    'an.forged': 'जाली या एडिट की गई', 'an.fgNote': 'CASIA 2 (जोड़-तोड़ और एडिट की गई तस्वीरें) पर प्रशिक्षित मॉडल',
    'an.hash': 'फ़ाइल फ़िंगरप्रिंट (SHA-256)',
    'an.caution': 'नतीजे अनुमान हैं, प्रमाण नहीं। इन्हें छवि के स्रोत और संदर्भ के साथ मिलाकर देखें।',
    'an.reverse': 'रिवर्स इमेज सर्च', 'an.report': 'इस छवि की रिपोर्ट करें', 'an.again': 'दूसरी छवि जाँचें',
    'an.errType': 'कृपया JPG या PNG छवि चुनें।', 'an.errSize': 'वह फ़ाइल 16 MB से बड़ी है।', 'an.errServer': 'सर्वर इस छवि की जाँच नहीं कर सका। कृपया फिर कोशिश करें।',
    'v.ai': 'संभवतः AI से बनी', 'v.aiT': 'यह छवि असली फ़ोटो की तुलना में AI से बनी छवियों जैसी दिखती है।',
    'v.forged': 'संभवतः एडिट या जाली', 'v.forgedT': 'इस छवि के कुछ हिस्से फ़ोटो खींचे जाने के बाद जोड़े या बदले हुए लगते हैं।',
    'v.both': 'AI से बनी और एडिट की गई', 'v.bothT': 'दोनों मॉडलों ने मज़बूत चेतावनी दी। इस छवि को अविश्वसनीय मानें।',
    'v.clean': 'छेड़छाड़ के संकेत नहीं मिले', 'v.cleanT': 'किसी मॉडल को एडिटिंग या AI निर्माण के मज़बूत संकेत नहीं मिले। इसका मतलब यह नहीं कि छवि असली ही है।',
    'v.unsure': 'अनिर्णायक', 'v.unsureT': 'सबूत मिले-जुले हैं। भरोसा करने या साझा करने से पहले मूल स्रोत खोजें।',
    'rc.title': 'हाल की जाँचें', 'rc.sub': 'केवल इस ब्राउज़र में सहेजी गईं।', 'rc.clear': 'सब हटाएँ', 'rc.empty': 'अभी तक कोई जाँच नहीं।', 'rc.delete': 'जाँच हटाएँ',
    'rc.confirm': 'इस ब्राउज़र से सभी सहेजी गई जाँचें हटाएँ?', 'rc.go': 'छवि जाँचें',
    'ln.title': 'परिदृश्य अभ्यास', 'ln.sub': 'आपके साथ होने से पहले ही सही पहला कदम सीखें।',
    'ln.urgentT': 'क्या आप अभी किसी धमकी या जबरन वसूली से जूझ रहे हैं?', 'ln.urgentD': 'आपको यह मॉड्यूल पहले पूरा करने की ज़रूरत नहीं है।', 'ln.urgentB': 'सहायता निर्देशिका खोलें',
    'ln.jump': 'परिदृश्य पर जाएँ', 'ln.step': 'परिदृश्य {n} / {total}', 'ln.done': '{total} में से {n} पूरे',
    'ln.safe': 'सुझाया गया', 'ln.risky': 'जोखिम भरा', 'ln.whySafe': 'यह सुरक्षित विकल्प क्यों है', 'ln.whyRisky': 'यह जोखिम भरा क्यों है', 'ln.better': 'सुरक्षित कदम:',
    'ln.prompt': 'नतीजा देखने के लिए एक विकल्प चुनें।', 'ln.protocol': 'प्रोटोकॉल: असल में क्या करें',
    'ln.retry': 'फिर कोशिश करें', 'ln.next': 'अगला परिदृश्य', 'ln.resetAll': 'सब रीसेट करें', 'ln.finished': 'आपने सभी परिदृश्य पूरे कर लिए। रिपोर्ट व सहायता टैब हाथ के पास रखें।',
    'hp.title': 'रिपोर्ट व सहायता', 'hp.sub': 'आधिकारिक रिपोर्टिंग पोर्टल, हेल्पलाइन और प्लेटफ़ॉर्म से हटवाने के टूल',
    'hp.dangerT': 'क्या आप तुरंत शारीरिक खतरे में हैं?', 'hp.dangerD': 'अगर कोई हिंसा या खुद को नुकसान पहुँचाने की धमकी दे रहा है, तो अभी अपना स्थानीय आपातकालीन नंबर मिलाएँ:',
    'hp.checkT': 'रिपोर्ट से पहले: साक्ष्य की त्वरित सूची', 'hp.checkS': 'सामग्री से उलझे या उसे दोबारा साझा किए बिना डिजिटल सबूत सुरक्षित रखें।', 'hp.copy': 'सूची कॉपी करें', 'hp.copied': 'सूची कॉपी हो गई',
    'hp.portals': 'आधिकारिक साइबर अपराध व कानून-प्रवर्तन पोर्टल', 'hp.platforms': 'प्लेटफ़ॉर्म से सीधे हटवाने के टूल', 'hp.platformsS': 'अपमानजनक या प्रतिरूपण वाली सामग्री हटवाने का सबसे तेज़ तरीका उसी प्लेटफ़ॉर्म के ज़रिए है जहाँ वह है:',
    'hp.noticeT': 'महत्वपूर्ण सूचना:', 'hp.noticeD': 'PixelProof स्वचालित तकनीकी अनुमान और शैक्षिक मार्गदर्शन देता है। यह कोई कानून-प्रवर्तन एजेंसी, संकट-परामर्शदाता या कानूनी कार्रवाई का विकल्प नहीं है। अगर आप उत्पीड़न या जबरन वसूली का सामना कर रहे हैं, तो ऊपर दिए अधिकारियों के पास औपचारिक रिपोर्ट दर्ज करें।',
    'hp.help': 'सहायता केंद्र', 'hp.safety': 'सुरक्षा केंद्र', 'hp.call': 'कॉल करें', 'hp.free': 'मुफ़्त / वैश्विक', 'hp.minors': '18 से कम',
    footer: 'डिजिटल सुरक्षा व संसाधन नेटवर्क'
  }
};

const TIPS = [
  { en: 'Pause before you forward. Shock is how fakes spread.', hi: 'फ़ॉरवर्ड करने से पहले रुकें। चौंकाने वाली चीज़ें ही नकली सामग्री फैलाती हैं।' },
  { en: 'A voice or video call can be cloned. Agree on a family safe word.', hi: 'आवाज़ या वीडियो कॉल की नक़ल बन सकती है। परिवार के साथ एक गुप्त शब्द तय करें।' },
  { en: 'Never pay or send more photos to someone blackmailing you.', hi: 'ब्लैकमेल करने वाले को कभी पैसे या और तस्वीरें न भेजें।' },
  { en: 'Reverse-search a viral image before you trust it.', hi: 'वायरल तस्वीर पर भरोसा करने से पहले उसे रिवर्स-सर्च करें।' }
];

const CHECKLIST = [
  { t: { en: 'Screenshot everything', hi: 'सब कुछ स्क्रीनशॉट करें' }, d: { en: 'Images, messages, dates and sender profile URLs.', hi: 'तस्वीरें, संदेश, तारीख़ें और भेजने वाले की प्रोफ़ाइल के URL।' } },
  { t: { en: 'Do not engage', hi: 'जवाब न दें' }, d: { en: 'Never send money or more photos to extortionists.', hi: 'जबरन वसूली करने वालों को कभी पैसे या और तस्वीरें न भेजें।' } },
  { t: { en: "Don't delete yet", hi: 'अभी डिलीट न करें' }, d: { en: 'Keep the conversation history saved for investigators.', hi: 'जाँच के लिए बातचीत का इतिहास सहेजकर रखें।' } },
  { t: { en: 'Report promptly', hi: 'जल्दी रिपोर्ट करें' }, d: { en: 'File with both the host app and the law-enforcement portals below.', hi: 'होस्ट ऐप और नीचे दिए कानून-प्रवर्तन पोर्टल, दोनों पर शिकायत करें।' } }
];

const PORTALS = [
  { flag: 'IN', name: { en: 'India: National Cyber Crime Portal', hi: 'भारत: राष्ट्रीय साइबर अपराध पोर्टल' }, badge: '1930',
    desc: { en: 'Government of India portal to report cyber fraud, morphed or non-consensual images and extortion. Call 1930 for financial fraud.', hi: 'साइबर धोखाधड़ी, एडिट की गई या बिना सहमति की तस्वीरों और जबरन वसूली की रिपोर्ट के लिए भारत सरकार का पोर्टल। वित्तीय धोखाधड़ी के लिए 1930 पर कॉल करें।' },
    url: 'https://cybercrime.gov.in', label: 'cybercrime.gov.in', tel: '1930' },
  { flag: 'WW', name: { en: 'StopNCII (intimate image removal)', hi: 'StopNCII (अंतरंग तस्वीरें हटवाना)' }, badge: 'free',
    desc: { en: 'Creates a private digital fingerprint on your device so participating platforms can block intimate images from being shared. Free and global.', hi: 'आपके डिवाइस पर निजी डिजिटल फ़िंगरप्रिंट बनाता है, ताकि भागीदार प्लेटफ़ॉर्म अंतरंग तस्वीरों को साझा होने से रोक सकें। मुफ़्त और वैश्विक।' },
    url: 'https://stopncii.org', label: 'stopncii.org' },
  { flag: 'WW', name: { en: 'Take It Down (under 18)', hi: 'Take It Down (18 से कम उम्र)' }, badge: 'minors',
    desc: { en: 'For images of someone under 18: helps remove or stop the spread of nude or sexual images. Run by NCMEC.', hi: '18 वर्ष से कम उम्र के व्यक्ति की तस्वीरों के लिए: नग्न या यौन तस्वीरों को हटाने या फैलने से रोकने में मदद करता है। NCMEC द्वारा संचालित।' },
    url: 'https://takeitdown.ncmec.org', label: 'takeitdown.ncmec.org' },
  { flag: 'US', name: { en: 'United States: FBI IC3', hi: 'अमेरिका: FBI IC3' },
    desc: { en: 'Internet Crime Complaint Center for scams, sextortion, synthetic identity theft and online impersonation.', hi: 'घोटालों, सेक्सटॉर्शन, नकली पहचान की चोरी और ऑनलाइन प्रतिरूपण के लिए FBI का इंटरनेट अपराध शिकायत केंद्र।' },
    url: 'https://www.ic3.gov', label: 'ic3.gov' },
  { flag: 'GB', name: { en: 'United Kingdom: Action Fraud', hi: 'ब्रिटेन: Action Fraud' },
    desc: { en: 'UK national reporting centre for fraud, cyber crime and online extortion.', hi: 'धोखाधड़ी, साइबर अपराध और ऑनलाइन जबरन वसूली के लिए ब्रिटेन का राष्ट्रीय रिपोर्टिंग केंद्र।' },
    url: 'https://www.actionfraud.police.uk', label: 'actionfraud.police.uk' }
];

const PLATFORMS = [
  { name: 'Instagram', url: 'https://help.instagram.com/', kind: 'hp.help' },
  { name: 'Facebook', url: 'https://www.facebook.com/help/', kind: 'hp.help' },
  { name: 'WhatsApp', url: 'https://www.whatsapp.com/safety', kind: 'hp.safety' },
  { name: 'X / Twitter', url: 'https://help.x.com/', kind: 'hp.help' },
  { name: 'YouTube', url: 'https://support.google.com/youtube/', kind: 'hp.help' },
  { name: 'Google', url: 'https://support.google.com/websearch/answer/9116649', kind: 'hp.help' }
];

const SCENARIOS = [
  {
    cat: { en: 'Impersonation & defamation', hi: 'प्रतिरूपण और मानहानि' },
    q: { en: 'Someone messages you a photo that looks like you or a friend, but altered to say or do something you never did. What is your first move?',
         hi: 'कोई आपको ऐसी तस्वीर भेजता है जो आप या आपके दोस्त जैसी दिखती है, पर उसे ऐसा कुछ कहते या करते दिखाने के लिए बदला गया है जो आपने कभी नहीं किया। आपका पहला कदम क्या होगा?' },
    opts: [
      { safe: false, t: { en: 'Reply and ask them to take it down', hi: 'जवाब देकर उनसे इसे हटाने को कहें' },
        f: { en: 'Replying tells the sender you are reachable and can encourage them to continue or escalate. It also does nothing about copies that are already shared.', hi: 'जवाब देने से भेजने वाले को पता चलता है कि आप उपलब्ध हैं, और वह इसे बढ़ा सकता है। इससे पहले से साझा हुई प्रतियाँ भी नहीं हटतीं।' } },
      { safe: true, t: { en: 'Screenshot it for evidence, then report it on the platform', hi: 'सबूत के लिए स्क्रीनशॉट लें, फिर प्लेटफ़ॉर्म पर रिपोर्ट करें' },
        f: { en: 'Evidence first protects you. Screenshots with dates and profile URLs support a report to the platform and the police, and you avoid feeding the sender\'s attention.', hi: 'पहले साक्ष्य सहेजना आपको सुरक्षित रखता है। तारीख़ और प्रोफ़ाइल URL वाले स्क्रीनशॉट प्लेटफ़ॉर्म और पुलिस को रिपोर्ट करने में काम आते हैं, और आप भेजने वाले को प्रतिक्रिया नहीं देते।' } },
      { safe: false, t: { en: 'Share it with friends to warn them', hi: 'दोस्तों को सचेत करने के लिए उन्हें भेज दें' },
        f: { en: 'Sharing spreads the fake further, can hurt the person shown, and in some places can itself be an offence. Warn people in words without forwarding the image.', hi: 'साझा करने से नकली तस्वीर और फैलती है, जिसमें दिख रहे व्यक्ति को नुकसान हो सकता है, और कुछ जगहों पर यह खुद अपराध भी हो सकता है। तस्वीर आगे भेजे बिना शब्दों में लोगों को सावधान करें।' } },
      { safe: false, t: { en: 'Ignore it completely without documenting', hi: 'कुछ भी सहेजे बिना पूरी तरह अनदेखा कर दें' },
        f: { en: 'Ignoring may feel calm, but without saved evidence you cannot prove what happened if the image resurfaces or you need to report it later.', hi: 'अनदेखा करना शांत लग सकता है, पर सबूत सहेजे बिना, अगर तस्वीर दोबारा सामने आए या आपको बाद में रिपोर्ट करनी पड़े, तो आप साबित नहीं कर पाएँगे कि क्या हुआ था।' } }
    ],
    steps: [
      { t: { en: 'Capture', hi: 'सहेजें' }, d: { en: 'Screenshot the image, message, date and sender profile URL.', hi: 'तस्वीर, संदेश, तारीख़ और भेजने वाले की प्रोफ़ाइल का URL स्क्रीनशॉट करें।' } },
      { t: { en: "Don't engage", hi: 'जवाब न दें' }, d: { en: 'Do not reply, argue or forward the image.', hi: 'न जवाब दें, न बहस करें, न तस्वीर आगे भेजें।' } },
      { t: { en: 'Report it', hi: 'रिपोर्ट करें' }, d: { en: "Use the platform's report tool, then file at cybercrime.gov.in if it harms you.", hi: 'प्लेटफ़ॉर्म का रिपोर्ट टूल इस्तेमाल करें, और नुकसान हो तो cybercrime.gov.in पर शिकायत करें।' } },
      { t: { en: 'Tell someone you trust', hi: 'किसी भरोसेमंद को बताएँ' }, d: { en: 'Share how you feel with a friend or family member, not the image.', hi: 'अपनी बात किसी दोस्त या परिवार के सदस्य को बताएँ, तस्वीर नहीं भेजें।' } }
    ]
  },
  {
    cat: { en: 'Sextortion & blackmail', hi: 'सेक्सटॉर्शन और ब्लैकमेल' },
    q: { en: 'A stranger says they have an edited intimate image of you and will send it to your contacts unless you pay. What do you do?',
         hi: 'कोई अजनबी कहता है कि उसके पास आपकी एडिट की हुई अंतरंग तस्वीर है और पैसे न देने पर वह उसे आपके संपर्कों को भेज देगा। आप क्या करेंगे?' },
    opts: [
      { safe: false, t: { en: 'Pay once so they delete it', hi: 'एक बार पैसे दे दें ताकि वे उसे डिलीट कर दें' },
        f: { en: 'Payment almost never ends it. It shows you will pay, and demands usually grow. They may also keep the image.', hi: 'पैसे देने से यह शायद ही कभी रुकता है। इससे पता चलता है कि आप पैसे देंगे, और माँगें आमतौर पर बढ़ती जाती हैं। वे तस्वीर अपने पास भी रख सकते हैं।' } },
      { safe: true, t: { en: 'Stop replying, keep the evidence, and report to 1930 or cybercrime.gov.in', hi: 'जवाब देना बंद करें, सबूत रखें, और 1930 या cybercrime.gov.in पर रिपोर्ट करें' },
        f: { en: 'Cutting contact removes their leverage, while saved evidence lets investigators act. Reporting early also lets platforms block the account.', hi: 'संपर्क तोड़ने से उनकी पकड़ कमज़ोर होती है, और सहेजे हुए सबूत से जाँचकर्ता कार्रवाई कर पाते हैं। जल्दी रिपोर्ट करने से प्लेटफ़ॉर्म खाता भी ब्लॉक कर सकते हैं।' } },
      { safe: false, t: { en: 'Send real photos to prove the edited one is fake', hi: 'एडिट की गई तस्वीर को नकली साबित करने के लिए असली तस्वीरें भेजें' },
        f: { en: 'Never send more images. Real photos give the blackmailer more material and more power over you.', hi: 'कभी और तस्वीरें न भेजें। असली तस्वीरें ब्लैकमेल करने वाले को और सामग्री और आप पर और ज़्यादा ताकत देती हैं।' } },
      { safe: false, t: { en: 'Delete the chat and your account right away', hi: 'चैट और अपना खाता तुरंत डिलीट कर दें' },
        f: { en: 'Deleting destroys the evidence police need, and the threat does not disappear just because your account does.', hi: 'डिलीट करने से पुलिस को ज़रूरी सबूत नष्ट हो जाते हैं, और आपका खाता हटने से धमकी खत्म नहीं हो जाती।' } }
    ],
    steps: [
      { t: { en: 'Stop contact', hi: 'संपर्क बंद करें' }, d: { en: 'Do not reply or pay. Block only after you have saved the chat.', hi: 'न जवाब दें, न पैसे दें। चैट सहेजने के बाद ही ब्लॉक करें।' } },
      { t: { en: 'Save evidence', hi: 'सबूत सहेजें' }, d: { en: 'Screenshot messages, payment demands, account links and numbers.', hi: 'संदेश, पैसे की माँग, खातों के लिंक और नंबर स्क्रीनशॉट करें।' } },
      { t: { en: 'Report fast', hi: 'तुरंत रिपोर्ट करें' }, d: { en: 'Call 1930 or file at cybercrime.gov.in, and report the account to the platform.', hi: '1930 पर कॉल करें या cybercrime.gov.in पर शिकायत करें, और प्लेटफ़ॉर्म को खाते की रिपोर्ट करें।' } },
      { t: { en: 'Stop the spread', hi: 'फैलाव रोकें' }, d: { en: 'Use StopNCII.org (adults) or Take It Down (under 18) to block sharing on major platforms.', hi: 'बड़े प्लेटफ़ॉर्म पर साझा होने से रोकने के लिए StopNCII.org (वयस्क) या Take It Down (18 से कम) इस्तेमाल करें।' } }
    ]
  },
  {
    cat: { en: 'Voice-clone fraud', hi: 'आवाज़ क्लोन धोखाधड़ी' },
    q: { en: 'You get a call in your cousin\'s voice, in a panic, asking you to send money right now. What is your move?',
         hi: 'आपको अपने चचेरे भाई की आवाज़ में घबराया हुआ फ़ोन आता है, जो अभी पैसे भेजने को कह रहा है। आपका कदम क्या होगा?' },
    opts: [
      { safe: false, t: { en: 'Send the money quickly, then ask questions later', hi: 'जल्दी से पैसे भेज दें, सवाल बाद में पूछें' },
        f: { en: 'Scammers create urgency on purpose. Money sent by UPI or bank transfer is hard to recover, so verify first.', hi: 'ठग जान-बूझकर जल्दबाज़ी का माहौल बनाते हैं। UPI या बैंक ट्रांसफ़र से गए पैसे वापस पाना कठिन होता है, इसलिए पहले पुष्टि करें।' } },
      { safe: true, t: { en: 'Hang up and call back on their saved number, or ask for your family safe word', hi: 'फ़ोन काटें और उनके सहेजे हुए नंबर पर वापस कॉल करें, या परिवार का गुप्त शब्द पूछें' },
        f: { en: 'A call back to a number you already trust, or a pre-agreed safe word, is something a cloned voice cannot pass.', hi: 'आपके भरोसेमंद नंबर पर वापस कॉल, या पहले से तय गुप्त शब्द, ऐसी चीज़ें हैं जिन्हें क्लोन की गई आवाज़ पास नहीं कर सकती।' } },
      { safe: false, t: { en: 'Ask them to send a selfie to prove it is them', hi: 'पहचान के लिए उनसे सेल्फ़ी भेजने को कहें' },
        f: { en: 'Photos and even live video can be faked. A selfie is weak proof compared with calling back on a known number.', hi: 'तस्वीरें और लाइव वीडियो तक नकली बनाए जा सकते हैं। जाने-पहचाने नंबर पर वापस कॉल की तुलना में सेल्फ़ी कमज़ोर सबूत है।' } },
      { safe: false, t: { en: 'Share the OTP they ask for so they can sort it out', hi: 'वे जो OTP माँग रहे हैं, वह दे दें ताकि मामला सुलझ जाए' },
        f: { en: 'An OTP gives direct access to your accounts. Never share it with anyone, whatever the story.', hi: 'OTP से आपके खातों तक सीधी पहुँच मिलती है। कहानी कुछ भी हो, इसे किसी से साझा न करें।' } }
    ],
    steps: [
      { t: { en: 'Pause', hi: 'रुकें' }, d: { en: 'Slow down. Urgency is the main trick.', hi: 'धीमे हो जाएँ। जल्दबाज़ी ही ठगों की मुख्य चाल है।' } },
      { t: { en: 'Verify another way', hi: 'दूसरे तरीके से पुष्टि करें' }, d: { en: 'Call back on a saved number or ask a family member who is nearby.', hi: 'सहेजे हुए नंबर पर वापस कॉल करें या पास के किसी परिजन से पूछें।' } },
      { t: { en: 'Use a safe word', hi: 'गुप्त शब्द रखें' }, d: { en: 'Agree on a private family word and ask for it on any money request.', hi: 'परिवार का एक निजी शब्द तय करें और पैसे की हर माँग पर उसे पूछें।' } },
      { t: { en: 'Report', hi: 'रिपोर्ट करें' }, d: { en: 'If you lost money, call 1930 quickly and report at cybercrime.gov.in.', hi: 'अगर पैसे चले गए हों, तो तुरंत 1930 पर कॉल करें और cybercrime.gov.in पर रिपोर्ट करें।' } }
    ]
  },
  {
    cat: { en: 'Viral misinformation', hi: 'वायरल गलत सूचना' },
    q: { en: 'A shocking image of a public event is spreading in WhatsApp groups and everyone is sharing it. What do you do?',
         hi: 'किसी सार्वजनिक घटना की चौंकाने वाली तस्वीर WhatsApp ग्रुपों में फैल रही है और सब उसे साझा कर रहे हैं। आप क्या करेंगे?' },
    opts: [
      { safe: false, t: { en: 'Forward it with "is this true?" so others can check', hi: '"क्या यह सच है?" लिखकर आगे भेज दें ताकि बाकी लोग जाँच लें' },
        f: { en: 'Even with a question, forwarding spreads the image to far more people than will ever see your doubt.', hi: 'सवाल के साथ भी, आगे भेजने से तस्वीर उन लोगों तक पहुँचती है जो आपका संदेह कभी नहीं देखेंगे।' } },
      { safe: true, t: { en: 'Check the source: reverse-search it, scan it with PixelProof, look for credible reports', hi: 'स्रोत जाँचें: रिवर्स-सर्च करें, PixelProof से स्कैन करें, विश्वसनीय खबरें देखें' },
        f: { en: 'Checking where the image first appeared and whether trusted outlets confirm it catches most fakes before they spread.', hi: 'यह देखना कि तस्वीर पहली बार कहाँ दिखी और क्या भरोसेमंद मीडिया उसकी पुष्टि करता है, ज़्यादातर नकली तस्वीरों को फैलने से पहले पकड़ लेता है।' } },
      { safe: false, t: { en: 'Trust it because so many people are sharing it', hi: 'इतने लोग साझा कर रहे हैं, इसलिए सच मान लें' },
        f: { en: 'Popularity is not proof. Fakes often spread fastest precisely because they are shocking.', hi: 'लोकप्रियता सबूत नहीं है। नकली चीज़ें अक्सर इसीलिए सबसे तेज़ फैलती हैं क्योंकि वे चौंकाती हैं।' } },
      { safe: false, t: { en: 'Reply angrily in the group', hi: 'ग्रुप में गुस्से में जवाब दें' },
        f: { en: 'Anger boosts engagement and can spread the image even further. A calm, factual correction helps more.', hi: 'गुस्सा बातचीत को बढ़ाता है और तस्वीर को और फैला सकता है। शांत, तथ्यात्मक सुधार ज़्यादा मदद करता है।' } }
    ],
    steps: [
      { t: { en: 'Pause', hi: 'रुकें' }, d: { en: 'Do not forward until you know where it came from.', hi: 'जब तक पता न हो कि यह कहाँ से आई, आगे न भेजें।' } },
      { t: { en: 'Search', hi: 'खोजें' }, d: { en: 'Reverse-image search it and read the original source.', hi: 'रिवर्स-इमेज सर्च करें और मूल स्रोत पढ़ें।' } },
      { t: { en: 'Scan', hi: 'स्कैन करें' }, d: { en: 'Check it with PixelProof for signs of editing or AI.', hi: 'एडिटिंग या AI के संकेतों के लिए PixelProof से जाँचें।' } },
      { t: { en: 'Correct kindly', hi: 'विनम्रता से सुधारें' }, d: { en: 'Share the fact-check, not the fake, with the group.', hi: 'ग्रुप में नकली तस्वीर नहीं, उसकी तथ्य-जाँच साझा करें।' } }
    ]
  }
];

/* ---------- 3. STATE & HELPERS ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const store = {
  get(k, d) { try { const v = localStorage.getItem('pixelproof.' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('pixelproof.' + k, JSON.stringify(v)); } catch (e) { /* storage full or blocked */ } }
};

const TABS = ['dashboard', 'analyze', 'recent', 'learn', 'help'];
const state = {
  lang: store.get('lang', 'en'),
  tab: 'dashboard',
  scenario: 0,
  answers: [null, null, null, null],   // chosen option index per scenario
  tip: 0,
  currentFile: null,
  currentResult: null,
  view: 'orig'
};

const t = (key, vars) => {
  let s = (STR[state.lang] && STR[state.lang][key]) ?? STR.en[key] ?? key;
  if (vars) for (const k in vars) s = s.replace('{' + k + '}', vars[k]);
  return s;
};
const L = (o) => o[state.lang] ?? o.en;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const icon = (n, cls = '') => `<svg class="i ${cls}" aria-hidden="true"><use href="#i-${n}"/></svg>`;

function toast(msg) {
  const el = $('#toast');
  el.textContent = msg; el.classList.add('show');
  clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('show'), 2200);
}

/* ---------- 4. LANGUAGE & THEME ---------- */
function applyI18n() {
  document.documentElement.lang = state.lang;
  $$('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  $$('[data-i18n-aria]').forEach((el) => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
  $$('[data-lang]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === state.lang)));
}
function setLang(l) {
  state.lang = l; store.set('lang', l);
  applyI18n(); renderAll();
}
function setTheme(th) {
  document.documentElement.setAttribute('data-theme', th);
  try { localStorage.setItem('pixelproof.theme', th); } catch (e) {}
}

/* ---------- 5. TABS ---------- */
function showTab(name, focus) {
  if (!TABS.includes(name)) name = 'dashboard';
  state.tab = name;
  TABS.forEach((n) => {
    const on = n === name;
    const btn = $('#tabbtn-' + n);
    btn.setAttribute('aria-selected', String(on));
    btn.tabIndex = on ? 0 : -1;
    $('#tab-' + n).hidden = !on;
  });
  if (location.hash !== '#' + name) history.replaceState(null, '', '#' + name);
  if (focus) $('#tabbtn-' + name).focus();
  window.scrollTo({ top: 0 });
  renderAll();
}

/* ---------- 6. SCANS STORAGE ---------- */
const getScans = () => store.get('scans', []);
const setScans = (a) => store.set('scans', a.slice(0, CONFIG.MAX_SAVED));

function verdictOf(ai, fg) {
  if (ai >= CONFIG.HIGH && fg >= CONFIG.HIGH) return 'both';
  if (ai >= CONFIG.HIGH) return 'ai';
  if (fg >= CONFIG.HIGH) return 'forged';
  if (ai < CONFIG.LOW && fg < CONFIG.LOW) return 'clean';
  return 'unsure';
}
const TONE = { both: 'bad', ai: 'ai', forged: 'bad', clean: 'good', unsure: 'warn' };
const VICON = { both: 'alert', ai: 'alert', forged: 'alert', clean: 'check', unsure: 'search' };

/* ---------- 7. RENDER: DASHBOARD ---------- */
function renderDashboard() {
  const scans = getScans();
  const total = scans.length;
  const flagged = scans.filter((s) => ['ai', 'forged', 'both'].includes(s.verdict)).length;
  const clean = scans.filter((s) => s.verdict === 'clean').length;
  const unsure = scans.filter((s) => s.verdict === 'unsure').length;

  $('#stats').innerHTML = [
    ['dash.s1', total, ''], ['dash.s2', flagged, 'is-bad'], ['dash.s3', clean, 'is-good'], ['dash.s4', unsure, 'is-warn']
  ].map(([k, v, c]) => `<div class="stat ${c}"><span>${esc(t(k))}</span><b>${v}</b></div>`).join('');

  const box = $('#breakdown');
  if (!total) {
    box.innerHTML = `<div class="empty"><span class="empty-ic">${icon('scan')}</span><p>${esc(t('dash.empty'))}</p></div>`;
  } else {
    const parts = [
      ['v.ai', scans.filter((s) => s.verdict === 'ai').length, 'var(--bar-ai)'],
      ['v.forged', scans.filter((s) => s.verdict === 'forged').length, 'var(--bar-fg)'],
      ['v.both', scans.filter((s) => s.verdict === 'both').length, '#8A2A5C'],
      ['v.clean', clean, 'var(--bar-ok)'],
      ['v.unsure', unsure, 'var(--bar-warn)']
    ].filter((p) => p[1] > 0);
    let acc = 0;
    const stops = parts.map(([, n, c]) => { const a = acc / total * 100; acc += n; return `${c} ${a}% ${acc / total * 100}%`; }).join(', ');
    box.innerHTML = `<div class="breakdown">
      <div class="donut" style="background:conic-gradient(${stops})" role="img" aria-label="${esc(t('dash.breakdown'))}"><span class="donut-n">${total}</span></div>
      <ul class="legend">${parts.map(([k, n, c]) => `<li><i style="background:${c}"></i>${esc(t(k))}<b>${n}</b></li>`).join('')}</ul>
    </div>`;
  }
  $('#tipText').textContent = L(TIPS[state.tip % TIPS.length]);
}

/* ---------- 8. RENDER: RECENT ---------- */
function fmtTime(ts) {
  try { return new Intl.DateTimeFormat(state.lang === 'hi' ? 'hi-IN' : 'en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(ts)); }
  catch (e) { return new Date(ts).toLocaleString(); }
}
function renderRecent() {
  const scans = getScans();
  const list = $('#recentList');
  $('#clearBtn').hidden = !scans.length;
  if (!scans.length) {
    list.innerHTML = `<div class="card"><div class="empty"><span class="empty-ic">${icon('clock')}</span><p>${esc(t('rc.empty'))}</p>
      <button class="btn" type="button" data-goto="analyze">${icon('scan')}<span>${esc(t('rc.go'))}</span></button></div></div>`;
    return;
  }
  list.innerHTML = `<div class="scan-list">${scans.map((s) => `
    <article class="scan">
      <img class="scan-thumb" src="${s.thumb || ''}" alt="">
      <div>
        <div class="scan-name">${esc(s.name)}</div>
        <div class="scan-meta">${esc(fmtTime(s.time))}</div>
        <div class="scan-scores"><span>${esc(t('an.ai'))}: <b>${s.ai.toFixed(1)}%</b></span><span>${esc(t('an.forged'))}: <b>${s.forged.toFixed(1)}%</b></span></div>
      </div>
      <span class="chip" data-tone="${TONE[s.verdict]}">${esc(t('v.' + s.verdict))}</span>
      <button class="icon-only" type="button" data-del="${s.id}" aria-label="${esc(t('rc.delete'))}">${icon('trash')}</button>
    </article>`).join('')}</div>`;
}

/* ---------- 9. RENDER: SCENARIO LAB ---------- */
function renderScenario() {
  const i = state.scenario, sc = SCENARIOS[i], chosen = state.answers[i], answered = chosen !== null;
  const doneCount = state.answers.filter((a) => a !== null).length;

  $('#stepLabel').textContent = t('ln.step', { n: i + 1, total: SCENARIOS.length }) + ' · ' + t('ln.done', { n: doneCount, total: SCENARIOS.length });
  $('#dots').innerHTML = SCENARIOS.map((s, k) =>
    `<button type="button" class="dot ${k === i ? 'is-active' : ''} ${state.answers[k] !== null ? 'is-done' : ''}" data-dot="${k}" aria-label="${esc(t('ln.step', { n: k + 1, total: SCENARIOS.length }))}" ${k === i ? 'aria-current="step"' : ''}></button>`).join('');

  const keys = ['A', 'B', 'C', 'D'];
  const opts = sc.opts.map((o, k) => {
    let cls = '', tag = '';
    if (answered) {
      if (o.safe) { cls = 'is-safe'; tag = `<span class="opt-tag">${icon('check')}${esc(t('ln.safe'))}</span>`; }
      else if (k === chosen) { cls = 'is-risky'; tag = `<span class="opt-tag">${icon('x')}${esc(t('ln.risky'))}</span>`; }
      else cls = 'is-dim';
    }
    return `<button type="button" class="opt ${cls}" data-opt="${k}" aria-disabled="${answered}" ${answered && k === chosen ? 'aria-current="true"' : ''}>
      <span class="opt-key">${keys[k]}</span><span class="opt-text">${esc(L(o.t))}</span>${tag}</button>`;
  }).join('');

  let fb = `<p class="prompt">${esc(t('ln.prompt'))}</p>`, protocol = '';
  if (answered) {
    const o = sc.opts[chosen], good = o.safe;
    const best = sc.opts.findIndex((x) => x.safe);
    fb = `<div class="feedback" data-tone="${good ? 'good' : 'bad'}" role="status">
      <h3>${esc(t(good ? 'ln.whySafe' : 'ln.whyRisky'))}</h3><p>${esc(L(o.f))}</p>
      ${good ? '' : `<p class="better"><strong>${esc(t('ln.better'))}</strong> ${esc(L(sc.opts[best].t))}</p>`}
    </div>`;
    protocol = `<div class="protocol"><h3>${esc(t('ln.protocol'))}</h3><ol class="step-grid">${sc.steps.map((s, k) =>
      `<li class="step"><span class="step-n">${k + 1}</span><strong>${esc(L(s.t))}</strong><span>${esc(L(s.d))}</span></li>`).join('')}</ol></div>`;
  }

  const last = i === SCENARIOS.length - 1;
  const allDone = doneCount === SCENARIOS.length;
  $('#scenario').innerHTML = `
    <p class="sc-kicker">${esc(L(sc.cat))}</p>
    <h2 class="sc-q">“${esc(L(sc.q))}”</h2>
    <div class="options" role="group" aria-label="${esc(L(sc.cat))}">${opts}</div>
    ${fb}${protocol}
    ${allDone && answered ? `<p class="prompt">${esc(t('ln.finished'))}</p>` : ''}
    <div class="sc-actions">
      <button type="button" class="btn btn-ghost" data-act="retry" ${answered ? '' : 'disabled style="opacity:.5;cursor:default"'}>${icon('refresh')}<span>${esc(t('ln.retry'))}</span></button>
      <button type="button" class="btn btn-ghost" data-act="resetAll">${esc(t('ln.resetAll'))}</button>
      <span class="spacer"></span>
      ${last ? '' : `<button type="button" class="btn" data-act="next"><span>${esc(t('ln.next'))}</span>${icon('arrow')}</button>`}
    </div>`;
}

/* ---------- 10. RENDER: HELP ---------- */
function renderHelp() {
  $('#checkGrid').innerHTML = CHECKLIST.map((c) => `<li><b>${esc(L(c.t))}</b>${esc(L(c.d))}</li>`).join('');
  $('#portalGrid').innerHTML = PORTALS.map((p) => {
    const badge = p.badge === 'free' ? t('hp.free') : p.badge === 'minors' ? t('hp.minors') : p.badge ? t('hp.call') + ' ' + p.badge : '';
    return `<article class="portal">
      <div class="portal-top"><h3>${esc(L(p.name))}</h3>${badge ? `<span class="badge">${esc(badge)}</span>` : ''}</div>
      <p>${esc(L(p.desc))}</p>
      <div class="portal-links">
        <a href="${p.url}" target="_blank" rel="noopener noreferrer">${esc(p.label)}${icon('ext', 'i-sm')}</a>
        ${p.tel ? `<a href="tel:${p.tel}">${icon('phone', 'i-sm')}${esc(t('hp.call'))} ${p.tel}</a>` : ''}
      </div></article>`;
  }).join('');
  $('#platformGrid').innerHTML = PLATFORMS.map((p) =>
    `<a class="platform" href="${p.url}" target="_blank" rel="noopener noreferrer"><strong>${esc(p.name)}</strong><span>${esc(t(p.kind))}${icon('ext', 'i-sm')}</span></a>`).join('');
}

function renderAll() {
  if (state.tab === 'dashboard') renderDashboard();
  if (state.tab === 'recent') renderRecent();
  if (state.tab === 'learn') renderScenario();
  if (state.tab === 'help') renderHelp();
  if (state.tab === 'analyze' && state.currentResult) paintResult(state.currentResult);
}

/* ---------- 11. IMAGE CHECK ---------- */
const drop = () => $('#drop');

function showError(key) {
  const el = $('#anError');
  if (!key) { el.hidden = true; return; }
  el.textContent = t(key); el.hidden = false; el.dataset.key = key;
}

function setView(v) {
  state.view = v;
  const hasEla = !!(state.currentResult && state.currentResult.ela);
  const showEla = v === 'ela' && hasEla;
  $('#previewImg').hidden = showEla;
  $('#elaImg').hidden = !showEla;
  $('#viewOrig').setAttribute('aria-pressed', String(!showEla));
  $('#viewEla').setAttribute('aria-pressed', String(showEla));
  $('#viewEla').disabled = !hasEla;
  $('#viewEla').title = hasEla ? '' : t('an.elaNone');
  $('#elaHelp').hidden = !showEla;
}

async function sha256(file) {
  try {
    const buf = await file.arrayBuffer();
    const h = await crypto.subtle.digest('SHA-256', buf);
    return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch (e) { return null; }
}

function makeThumb(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const s = 120, c = document.createElement('canvas'); c.width = c.height = s;
      const r = Math.max(s / img.width, s / img.height), w = img.width * r, h = img.height * r;
      c.getContext('2d').drawImage(img, (s - w) / 2, (s - h) / 2, w, h);
      try { resolve(c.toDataURL('image/jpeg', 0.6)); } catch (e) { resolve(''); }
    };
    img.onerror = () => resolve('');
    img.src = url;
  });
}

function resetAnalyze() {
  state.currentFile = null; state.currentResult = null;
  $('#fileInput').value = '';
  $('#viewer').hidden = true; $('#result').hidden = true; $('#loading').hidden = true; $('#resultEmpty').hidden = false;
  showError(null);
}

function paintResult(r) {
  const v = r.verdict, tone = TONE[v];
  $('#verdictBox').dataset.tone = tone;
  $('#verdictIcon').innerHTML = icon(VICON[v]);
  $('#verdictTitle').textContent = t('v.' + v);
  $('#verdictText').textContent = t('v.' + v + 'T');
  $('#aiPct').textContent = r.ai.toFixed(1) + '%';
  $('#fgPct').textContent = r.forged.toFixed(1) + '%';
  $('#aiBar').style.width = Math.min(100, r.ai) + '%';
  $('#fgBar').style.width = Math.min(100, r.forged) + '%';
  $('#demoBanner').hidden = !r.demo;
  $('#hashBox').hidden = !r.sha; if (r.sha) $('#hashVal').textContent = r.sha;
  setView(state.view);
}

async function analyze(file) {
  showError(null);
  if (!/^image\/(jpeg|png)$/.test(file.type)) return showError('an.errType');
  if (file.size > CONFIG.MAX_MB * 1024 * 1024) return showError('an.errSize');

  state.currentFile = file; state.currentResult = null; state.view = 'orig';
  const url = URL.createObjectURL(file);
  $('#previewImg').src = url; $('#previewImg').alt = file.name;
  $('#elaImg').removeAttribute('src');
  $('#viewer').hidden = false;
  $('#resultEmpty').hidden = true; $('#result').hidden = true; $('#loading').hidden = false;
  setView('orig');

  let res = null, demo = false;
  try {
    const fd = new FormData(); fd.append(CONFIG.FILE_FIELD, file);
    const resp = await fetch(CONFIG.API_URL, { method: 'POST', body: fd });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    res = normalizeResponse(await resp.json());
  } catch (err) {
    console.error('PixelProof analyze failed:', err);
    if (err instanceof TypeError) {
      // Network error: backend not reachable. Show a clearly labelled demo result.
      demo = true;
      res = { ai: 78.3, forged: 72.8, ela: null };
    } else {
      $('#loading').hidden = true; $('#resultEmpty').hidden = false;
      return showError('an.errServer');
    }
  } finally {
    $('#loading').hidden = true;        // always clear the spinner
  }

  const sha = await sha256(file);
  const verdict = verdictOf(res.ai, res.forged);
  state.currentResult = { ...res, verdict, demo, sha };
  if (res.ela) $('#elaImg').src = res.ela;
  $('#result').hidden = false;
  paintResult(state.currentResult);

  if (!demo) {
    const thumb = await makeThumb(url);
    setScans([{ id: Date.now() + '', name: file.name, time: Date.now(), ai: res.ai, forged: res.forged, verdict, thumb, sha }, ...getScans()]);
  }
}

/* ---------- 12. EVENTS ---------- */
document.addEventListener('click', (e) => {
  const go = e.target.closest('[data-goto]'); if (go) return showTab(go.dataset.goto);
  const del = e.target.closest('[data-del]');
  if (del) { setScans(getScans().filter((s) => s.id !== del.dataset.del)); return renderRecent(); }
  const dot = e.target.closest('[data-dot]'); if (dot) { state.scenario = +dot.dataset.dot; return renderScenario(); }
  const opt = e.target.closest('[data-opt]');
  if (opt && state.answers[state.scenario] === null) { state.answers[state.scenario] = +opt.dataset.opt; return renderScenario(); }
  const act = e.target.closest('[data-act]');
  if (act && !act.disabled) {
    if (act.dataset.act === 'retry') state.answers[state.scenario] = null;
    if (act.dataset.act === 'next') state.scenario = Math.min(SCENARIOS.length - 1, state.scenario + 1);
    if (act.dataset.act === 'resetAll') { state.answers = [null, null, null, null]; state.scenario = 0; }
    renderScenario();
  }
});

$$('.nav-item').forEach((b) => b.addEventListener('click', () => showTab(b.dataset.tab)));
$('.nav').addEventListener('keydown', (e) => {
  const i = TABS.indexOf(state.tab);
  let n = null;
  if (e.key === 'ArrowDown' || e.key === 'ArrowRight') n = (i + 1) % TABS.length;
  if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') n = (i - 1 + TABS.length) % TABS.length;
  if (n !== null) { e.preventDefault(); showTab(TABS[n], true); }
});

$('#helpBtn').addEventListener('click', () => showTab('help'));
$$('[data-lang]').forEach((b) => b.addEventListener('click', () => setLang(b.dataset.lang)));
$('#themeBtn').addEventListener('click', () => setTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'));
$('#tipNext').addEventListener('click', () => { state.tip = (state.tip + 1) % TIPS.length; renderDashboard(); });
$('#clearBtn').addEventListener('click', () => { if (confirm(t('rc.confirm'))) { setScans([]); renderRecent(); } });

$('#fileInput').addEventListener('change', (e) => { const f = e.target.files[0]; if (f) analyze(f); });
['dragenter', 'dragover'].forEach((ev) => drop().addEventListener(ev, (e) => { e.preventDefault(); drop().classList.add('is-over'); }));
['dragleave', 'drop'].forEach((ev) => drop().addEventListener(ev, (e) => { e.preventDefault(); drop().classList.remove('is-over'); }));
drop().addEventListener('drop', (e) => { const f = e.dataTransfer.files[0]; if (f) analyze(f); });
$('#viewOrig').addEventListener('click', () => setView('orig'));
$('#viewEla').addEventListener('click', () => setView('ela'));
$('#againBtn').addEventListener('click', () => { resetAnalyze(); $('#fileInput').click(); });

$('#copyBtn').addEventListener('click', async () => {
  const text = (state.lang === 'hi' ? 'रिपोर्ट से पहले साक्ष्य की सूची\n' : 'Evidence checklist before you report\n') +
    CHECKLIST.map((c, i) => `${i + 1}. ${L(c.t)}: ${L(c.d)}`).join('\n');
  try { await navigator.clipboard.writeText(text); toast(t('hp.copied')); }
  catch (e) {
    const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); toast(t('hp.copied')); } catch (_) {} ta.remove();
  }
});

window.addEventListener('hashchange', () => { const h = location.hash.slice(1); if (TABS.includes(h) && h !== state.tab) showTab(h); });

/* ---------- 13. INIT ---------- */
applyI18n();
state.tip = Math.floor(Math.random() * TIPS.length);
showTab(TABS.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'dashboard');