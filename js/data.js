/* Demo data for the prototype. In production this comes from the database,
   filtered by the logged-in user's project permissions. */

// The demo is frozen on 15.10.2026. The real system uses today's date.
const TODAY = (() => {
  let demo = true;
  try { demo = !(window.CASA_CONFIG && CASA_CONFIG.url) || localStorage.getItem('casa-mode') === 'demo'; } catch (e) { /* ignore */ }
  if (demo) return '2026-10-15';
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
})();

const SPACES = ['מטבח', 'סלון', 'פינת אוכל', 'חדר הורים', 'חדרי ילדים', 'חדרי רחצה', 'שירותי אורחים', 'מרפסת', 'גינה', 'שטחים כלליים'];

const PLAN_CATEGORIES = ['כתב כמויות', 'הריסה', 'בניה', 'העמדה', 'חשמל', 'אינסטלציה', 'הנמכות תקרה', 'ריהוט', 'אלומיניום', 'מסגרות'];

const BUDGET_CATEGORIES = ['ביצוע ושיפוץ', 'מטבח', 'נגרות', 'ריצוף וחיפויים', 'סניטריה', 'תאורה', 'חשמל', 'מיזוג', 'אלומיניום', 'ריהוט', 'מוצרי חשמל', 'טקסטיל ווילונות', 'גינה וחוץ', 'מערכות חכמות', 'דקורציה ואקססוריז', 'בעלי מקצוע', 'שונות'];

const DOC_CATEGORIES = ['הסכם התקשרות', 'הצעת מחיר', 'מפרט', 'נספחים', 'ביטוחים', 'אישורים', 'חשבוניות', 'קבלות', 'מסמכי ספקים', 'תעודות אחריות', 'מסמכי מסירה', 'שינויים ותוספות'];

const PRO_CATEGORIES = ['נגר', 'חשמלאי', 'אינסטלטור', 'מיזוג', 'מטבח', 'שיש', 'אלומיניום', 'פרקט', 'תאורה', 'זכוכית', 'גינון', 'בית חכם'];

const TEAM = {
  pm: { name: 'חורחה עברין', role: 'מנהל פרויקט', phone: '050-7123456', email: 'jorge@casa-pueblo.co.il' },
  architect: { name: 'דנה לוין', role: 'אדריכלית ומעצבת', phone: '052-6654321', email: 'dana@casa-pueblo.co.il' },
  office: { name: 'מיכל אדרי', role: 'הנהלת חשבונות', phone: '09-7654321', email: 'office@casa-pueblo.co.il' },
};

function seedData() {
  return {
    project: {
      id: 'p-avrahami',
      name: 'בית אברהמי',
      family: 'אברהמי',
      address: 'רחוב הדקל 14, רמת השרון',
      image: 'assets/img/hero-home.jpg',
      stage: 'עבודות גמר',
      progress: 68,
      start: '2026-03-01',
      handover: '2027-02-15',
      pm: 'pm',
      scope: 'שיפוץ מקיף של בית פרטי דו-קומתי, 220 מ"ר: הריסת קירות פנים, תשתיות חדשות, מטבח ונגרות בהתאמה אישית, 3 חדרי רחצה ומרפסת.',
      area: '220 מ"ר',
      budget: 1500000,
      weekly: {
        updated: '2026-10-13',
        text: 'אנחנו בשלב עבודות הצבע והתקנת הנגרות. השבוע הסתיים הריצוף בקומה העליונה, ובשבוע הבא מתחילה התקנת הארונות בחדרי הילדים. ספריית הסלון מתעכבת בשבוע אצל הנגר. אנחנו בקשר צמוד איתו, והמסירה לא זזה.',
      },
    },

    members: [
      { name: 'אורי אברהמי', role: 'בעל הבית', email: 'ori@example.com', phone: '054-1112233', status: 'פעיל' },
      { name: 'נועה אברהמי', role: 'בת זוג', email: 'noa@example.com', phone: '054-4445566', status: 'פעיל' },
      { name: 'שירן גל', role: 'מעצבת מטעם המשפחה', email: 'shiran@example.com', phone: '053-7778899', status: 'הוזמנה' },
    ],

    timeline: [
      { name: 'אפיון ופרוגרמה', ps: '2026-01-05', pe: '2026-01-31', as: '2026-01-05', ae: '2026-01-28', status: 'done', note: 'נחתמה פרוגרמה סופית.', photos: [] },
      { name: 'תכנון', ps: '2026-02-01', pe: '2026-02-28', as: '2026-01-29', ae: '2026-02-26', status: 'done', note: '', photos: [] },
      { name: 'בחירת חומרים', ps: '2026-02-15', pe: '2026-04-15', as: '2026-02-15', ae: '2026-04-20', status: 'done', note: 'כל החומרים נבחרו, כולל ריצוף וסניטריה.', photos: ['assets/img/j-55.jpg'] },
      { name: 'הריסה', ps: '2026-03-01', pe: '2026-03-31', as: '2026-03-02', ae: '2026-03-29', status: 'done', note: '', photos: ['assets/img/before-kitchen.jpg', 'assets/img/before-1.jpg'] },
      { name: 'בנייה', ps: '2026-04-01', pe: '2026-06-10', as: '2026-04-01', ae: '2026-06-08', status: 'done', note: '', photos: [] },
      { name: 'תשתיות', ps: '2026-05-15', pe: '2026-08-05', as: '2026-05-18', ae: '2026-08-04', status: 'done', note: 'חשמל, אינסטלציה ומיזוג. כל הבדיקות עברו.', photos: [] },
      { name: 'עבודות גמר', ps: '2026-08-06', pe: '2026-11-20', as: '2026-08-06', ae: null, status: 'active', note: 'ריצוף הסתיים. צבע וטיח בביצוע.', photos: ['assets/img/j-35.jpg', 'assets/img/j-8.jpg'] },
      { name: 'נגרות', ps: '2026-09-15', pe: '2026-11-30', as: '2026-09-22', ae: null, status: 'delay', note: 'ספריית הסלון מתעכבת בכשבוע אצל הנגר. המסירה לא מושפעת.', photos: ['assets/img/j-63.jpg'] },
      { name: 'התקנות', ps: '2026-12-01', pe: '2027-01-20', as: null, ae: null, status: 'future', note: '', photos: [] },
      { name: 'מסירה', ps: '2027-02-01', pe: '2027-02-15', as: null, ae: null, status: 'future', note: '', photos: [] },
    ],

    plans: [
      { id: 'pl1', cat: 'חשמל', title: 'תכנית חשמל – קומת קרקע וקומה א׳', status: 'pending', exec: 'draft', versions: [
        { v: 4, date: '2026-10-12', by: 'דנה לוין', note: 'הוספת שקעים באי המטבח ונקודת טעינה לרכב', file: 'PDF', size: '3.2MB' },
        { v: 3, date: '2026-07-02', by: 'דנה לוין', note: 'התאמה לתכנית מיזוג', file: 'PDF', size: '3.0MB' },
        { v: 2, date: '2026-05-20', by: 'דנה לוין', note: '', file: 'PDF', size: '2.8MB' },
        { v: 1, date: '2026-02-18', by: 'דנה לוין', note: 'גרסה ראשונה', file: 'PDF', size: '2.6MB' }] },
      { id: 'pl2', cat: 'חשמל', title: 'תכנית תאורה וגופי תאורה', status: 'pending', exec: 'draft', versions: [
        { v: 3, date: '2026-10-09', by: 'דנה לוין', note: 'פסי LED בתקרת הסלון ותאורה תלויה מעל פינת האוכל', file: 'PDF', size: '2.1MB' },
        { v: 2, date: '2026-06-14', by: 'דנה לוין', note: '', file: 'PDF', size: '2.0MB' },
        { v: 1, date: '2026-02-22', by: 'דנה לוין', note: '', file: 'PDF', size: '1.8MB' }] },
      { id: 'pl3', cat: 'העמדה', title: 'תכנית העמדה ומידות – כל הקומות', status: 'approved', exec: 'approved', execBy: 'חורחה עברין', execAt: '2026-09-01', versions: [
        { v: 6, date: '2026-04-28', by: 'דנה לוין', note: 'גרסה מאושרת לביצוע', file: 'DWG', size: '5.4MB' },
        { v: 5, date: '2026-03-30', by: 'דנה לוין', note: '', file: 'DWG', size: '5.3MB' },
        { v: 4, date: '2026-02-26', by: 'דנה לוין', note: '', file: 'PDF', size: '4.9MB' }] },
      { id: 'pl4', cat: 'כתב כמויות', title: 'כתב כמויות לביצוע', status: 'approved', exec: 'approved', execBy: 'חורחה עברין', execAt: '2026-09-01', versions: [
        { v: 3, date: '2026-03-10', by: 'חורחה עברין', note: 'עדכון לאחר הריסה', file: 'XLS', size: '0.4MB' },
        { v: 2, date: '2026-02-27', by: 'חורחה עברין', note: '', file: 'XLS', size: '0.4MB' }] },
      { id: 'pl5', cat: 'הריסה', title: 'תכנית הריסה ובינוי', status: 'approved', exec: 'approved', execBy: 'חורחה עברין', execAt: '2026-09-01', versions: [
        { v: 2, date: '2026-02-24', by: 'דנה לוין', note: '', file: 'PDF', size: '1.6MB' },
        { v: 1, date: '2026-02-12', by: 'דנה לוין', note: '', file: 'PDF', size: '1.5MB' }] },
      { id: 'pl6', cat: 'בניה', title: 'תכנית בנייה – קירות וחדירות', status: 'approved', exec: 'approved', execBy: 'חורחה עברין', execAt: '2026-09-01', versions: [
        { v: 3, date: '2026-03-25', by: 'דנה לוין', note: '', file: 'PDF', size: '2.2MB' }] },
      { id: 'pl7', cat: 'אינסטלציה', title: 'תכנית אינסטלציה ונקודות מים', status: 'approved', exec: 'approved', execBy: 'חורחה עברין', execAt: '2026-09-01', versions: [
        { v: 3, date: '2026-05-05', by: 'דנה לוין', note: 'הזזת ניקוז מקלחת הורים', file: 'PDF', size: '1.9MB' },
        { v: 2, date: '2026-03-18', by: 'דנה לוין', note: '', file: 'PDF', size: '1.8MB' }] },
      { id: 'pl8', cat: 'מיזוג', title: 'תכנית מיזוג – מיני מרכזי', status: 'approved', exec: 'approved', execBy: 'חורחה עברין', execAt: '2026-09-01', versions: [
        { v: 2, date: '2026-05-12', by: 'יועץ מיזוג', note: '', file: 'PDF', size: '1.4MB' }] },
      { id: 'pl9', cat: 'ריצוף וחיפויים', title: 'פריסת ריצוף וחיפויי קירות', status: 'approved', exec: 'approved', execBy: 'חורחה עברין', execAt: '2026-09-01', versions: [
        { v: 2, date: '2026-06-30', by: 'דנה לוין', note: 'הוספת חיפוי קיר באמבטיית הורים', file: 'PDF', size: '2.6MB' }] },
      { id: 'pl10', cat: 'ריהוט', title: 'נגרות – ארונות, ספרייה ונישות', status: 'approved', exec: 'approved', execBy: 'חורחה עברין', execAt: '2026-09-01', versions: [
        { v: 4, date: '2026-08-21', by: 'דנה לוין', note: '', file: 'PDF', size: '3.7MB' },
        { v: 3, date: '2026-07-15', by: 'דנה לוין', note: '', file: 'PDF', size: '3.5MB' }] },
      { id: 'pl11', cat: 'ריהוט', title: 'מטבח – חזיתות, אי ופריסה', status: 'approved', exec: 'approved', execBy: 'חורחה עברין', execAt: '2026-09-01', versions: [
        { v: 5, date: '2026-06-18', by: 'מטבחי אלון', note: 'אושר וחתום', file: 'PDF', size: '4.1MB' }] },
      { id: 'pl12', cat: 'הנמכות תקרה', title: 'תקרות מונמכות וקרניזים', status: 'approved', exec: 'approved', execBy: 'חורחה עברין', execAt: '2026-09-01', versions: [
        { v: 2, date: '2026-07-08', by: 'דנה לוין', note: '', file: 'PDF', size: '1.2MB' }] },
      { id: 'pl13', cat: 'אלומיניום', title: 'פתחים ואלומיניום', status: 'approved', exec: 'approved', execBy: 'חורחה עברין', execAt: '2026-09-01', versions: [
        { v: 1, date: '2026-04-02', by: 'קליל פרו', note: '', file: 'PDF', size: '1.1MB' }] },
      { id: 'pl15', cat: 'מסגרות', title: 'מסגרות – מעקה מדרגות ושער כניסה', status: 'new', exec: 'draft', versions: [
        { v: 1, date: '2026-10-11', by: 'דנה לוין', note: 'גרסה ראשונה', file: 'PDF', size: '1.3MB' }] },
      { id: 'pl14', cat: 'פיתוח חוץ', title: 'פיתוח חוץ ומרפסת', status: 'new', exec: 'draft', versions: [
        { v: 1, date: '2026-10-14', by: 'דנה לוין', note: 'סקיצה ראשונה להתייחסות', file: 'PDF', size: '2.4MB' }] },
    ],

    planCategories: ['מיזוג', 'ריצוף וחיפויים', 'פיתוח חוץ'],

    materials: [
      { id: 'm1', name: 'אריח קיר', cat: 'ריצוף וחיפויים', space: 'חדרי רחצה', maker: 'Porcelanosa', model: 'Bottega Caliza', sku: '45821', color: 'Sand', supplier: 'נגב קרמיקה', price: 280, unit: 'מ"ר', link: 'https://www.porcelanosa.com', warranty: '10 שנים', notes: 'אמבטיית הורים, קיר מקלחת עד התקרה', status: 'הוזמן', swatch: '#d9cbb4', contactName: 'שרון לוי', contactPhone: '052-4433221', order: { name: 'הזמנה 7781 – נגב קרמיקה.pdf', type: 'PDF', date: '2026-09-15' }, invoice: { name: 'חשבונית 20931 – נגב קרמיקה.pdf', type: 'PDF', date: '2026-09-17' } },
      { id: 'm2', name: 'ריצוף פורצלן 60×120', cat: 'ריצוף וחיפויים', space: 'סלון', maker: 'Marazzi', model: 'Grande Stone', sku: 'M0ZG', color: 'Greige', supplier: 'נגב קרמיקה', price: 245, unit: 'מ"ר', link: '', warranty: '10 שנים', notes: 'גם במטבח ובמסדרון', status: 'סופק', swatch: '#b9b1a5' },
      { id: 'm3', name: 'פרקט עץ אלון', cat: 'ריצוף וחיפויים', space: 'חדר הורים', maker: 'Kährs', model: 'Oak Nouveau', sku: 'K-151', color: 'Natural Matt', supplier: 'עץ הפרקט', price: 390, unit: 'מ"ר', link: '', warranty: '25 שנים', notes: 'גם בחדרי הילדים', status: 'הותקן', img: 'assets/img/j-58.jpg' },
      { id: 'm4', name: 'חזיתות מטבח', cat: 'מטבח', space: 'מטבח', maker: 'מטבחי אלון', model: 'Fenix NTM', sku: 'FX-0720', color: 'Grigio Londra', supplier: 'מטבחי אלון', price: null, unit: '', link: '', warranty: '7 שנים', notes: 'ידיות שקועות, ציר טריקה שקטה', status: 'הוזמן', img: 'assets/img/j-35.jpg' },
      { id: 'm5', name: 'משטח שיש קוורץ', cat: 'מטבח', space: 'מטבח', maker: 'קיסר', model: '5143', sku: '5143-20', color: 'White Attica', supplier: 'שיש הגליל', price: null, unit: '', link: 'https://www.caesarstone.co.il', warranty: '25 שנים', notes: 'עובי 2 ס"מ, אי עם נפילה לרצפה', status: 'נמדד', swatch: '#ece9e4' },
      { id: 'm6', name: 'ברז מטבח נשלף', cat: 'סניטריה', space: 'מטבח', maker: 'Hansgrohe', model: 'Talis M54', sku: '72808000', color: 'כרום', supplier: 'אלוני סניטריה', price: 1850, unit: 'יח׳', link: '', warranty: '5 שנים', notes: '', status: 'הוזמן', swatch: '#c6cbd1', contactName: 'אבי אלוני', contactPhone: '054-7788990' },
      { id: 'm7', name: 'ברז אמבטיה עומד', cat: 'סניטריה', space: 'חדרי רחצה', maker: 'Hansgrohe', model: '', sku: '', color: '', supplier: 'אלוני סניטריה', price: null, unit: '', link: '', warranty: '', notes: 'ממתין לבחירה בין שתי אפשרויות', status: 'ממתין לבחירה', swatch: '#e7e3dc' },
      { id: 'm8', name: 'אסלה תלויה', cat: 'סניטריה', space: 'שירותי אורחים', maker: 'Duravit', model: 'ME by Starck', sku: '2529090000', color: 'לבן', supplier: 'אלוני סניטריה', price: 2400, unit: 'יח׳', link: '', warranty: '10 שנים', notes: 'כולל מושב טריקה שקטה', status: 'סופק', swatch: '#f4f3ef' },
      { id: 'm9', name: 'מנורות תלויות', cat: 'תאורה', space: 'פינת אוכל', maker: 'Flos', model: 'IC Lights S1', sku: 'F3175059', color: 'פליז', supplier: 'קמחי תאורה', price: 3200, unit: 'יח׳', link: '', warranty: '2 שנים', notes: '3 יחידות מעל השולחן', status: 'הוזמן', img: 'assets/img/t-110.jpg' },
      { id: 'm10', name: 'גוף תאורה שקוע', cat: 'תאורה', space: 'שטחים כלליים', maker: 'Delta Light', model: 'Reo', sku: 'DL-202', color: 'שחור מט', supplier: 'קמחי תאורה', price: 260, unit: 'יח׳', link: '', warranty: '3 שנים', notes: '42 יחידות', status: 'הותקן', swatch: '#3b3b3b' },
      { id: 'm11', name: 'צבע קירות', cat: 'שונות', space: 'סלון', maker: 'טמבור', model: 'סופרקריל', sku: '', color: 'Linen White 1025', supplier: 'טמבור', price: null, unit: '', link: '', warranty: '', notes: 'כל הקומה', status: 'בביצוע', swatch: '#efe8da' },
      { id: 'm12', name: 'ספריית סלון', cat: 'נגרות', space: 'סלון', maker: 'נגריית השרון', model: 'בהתאמה אישית', sku: '', color: 'אלון מעושן', supplier: 'נגריית השרון', price: null, unit: '', link: '', warranty: '5 שנים', notes: 'לפי תכנית נגרות V4', status: 'בייצור', img: 'assets/img/j-63.jpg' },
      { id: 'm13', name: 'ארונות קיר', cat: 'נגרות', space: 'חדרי ילדים', maker: 'נגריית השרון', model: 'בהתאמה אישית', sku: '', color: 'לבן משי', supplier: 'נגריית השרון', price: null, unit: '', link: '', warranty: '5 שנים', notes: '', status: 'בייצור', swatch: '#f2f0ea' },
      { id: 'm14', name: 'מקלחון ויטרינה', cat: 'סניטריה', space: 'חדרי רחצה', maker: 'זכוכית הדר', model: 'Walk-in', sku: '', color: 'שקוף, פרופיל שחור', supplier: 'זכוכית הדר', price: 4800, unit: 'יח׳', link: '', warranty: '3 שנים', notes: 'ימדד לאחר החיפוי', status: 'נבחר', img: 'assets/img/j-49.jpg' },
      { id: 'm15', name: 'דק עץ', cat: 'גינה וחוץ', space: 'מרפסת', maker: 'Ipe', model: '', sku: '', color: 'טבעי', supplier: 'עץ הפרקט', price: null, unit: '', link: '', warranty: '', notes: 'ממתין לתכנית פיתוח', status: 'ממתין לבחירה', swatch: '#8a6a4c' },
      { id: 'm16', name: 'מיטה זוגית מרופדת', cat: 'ריהוט', space: 'חדר הורים', maker: 'Natuzzi', model: 'Ludovico', sku: '', color: 'פשתן', supplier: 'נטוצי ישראל', price: null, unit: '', link: '', warranty: '', notes: '', status: 'נבחר', img: 'assets/img/j-43.jpg' },
      { id: 'm17', name: 'מערכת מיזוג מיני מרכזי', cat: 'מיזוג', space: 'שטחים כלליים', maker: 'Tadiran', model: 'Mini Central 3 יח׳', sku: '', color: '', supplier: 'אוויר טק', price: null, unit: '', link: '', warranty: '3 שנים', warrantyUntil: '2029-08-15', notes: '', status: 'הותקן', swatch: '#e6e9ee', contactName: 'רן גולן', contactPhone: '053-1234567', invoice: { name: 'חשבונית אוויר טק.pdf', type: 'PDF', date: '2026-08-15' } },
      { id: 'm18', name: 'מקרר', cat: 'מוצרי חשמל', space: 'מטבח', maker: 'Samsung', model: 'Bespoke 4 דלתות', sku: 'RF65', color: 'Satin Beige', supplier: 'מחסני חשמל', price: 14900, unit: 'יח׳', link: '', warranty: '', warrantyUntil: '2028-01-10', notes: '', status: 'סופק', swatch: '#d8cdbb' },
      { id: 'm19', name: 'מדיח כלים', cat: 'מוצרי חשמל', space: 'מטבח', maker: 'Bosch', model: 'Serie 6 אינטגרלי', sku: 'SMV6', color: '', supplier: 'מחסני חשמל', price: 3900, unit: 'יח׳', link: '', warranty: '', warrantyUntil: '2027-01-05', notes: 'מוצג לדוגמה: נשארו פחות מ־3 חודשים', status: 'הותקן', swatch: '#cfd3d8' },
      { id: 'm20', name: 'כיריים אינדוקציה', cat: 'מוצרי חשמל', space: 'מטבח', maker: 'Miele', model: 'KM 7564', sku: '', color: 'שחור', supplier: 'מחסני חשמל', price: 8200, unit: 'יח׳', link: '', warranty: '', warrantyUntil: '2028-03-01', notes: '', status: 'סופק', swatch: '#2f3134' },
    ],

    // Each expense lives once and feeds finance, materials, suppliers and documents.
    expenses: [
      { id: 'e1', date: '2026-03-01', supplier: 'קאסה פואבלו', cat: 'ביצוע ושיפוץ', spaces: ['שטחים כלליים'], item: 'הסכם ביצוע – תכנון, פיקוח וביצוע', total: 505000, status: 'בביצוע', method: 'העברה בנקאית', doc: 'הסכם', notes: 'לפי אבני דרך', casa: true,
        payments: [{ date: '2026-03-01', amount: 75000 }, { date: '2026-04-15', amount: 80000 }, { date: '2026-06-10', amount: 100000 }, { date: '2026-08-05', amount: 110000 }, { date: '2026-09-20', amount: 89000 }], next: '2026-11-10' },
      { id: 'e2', date: '2026-06-25', supplier: 'מטבחי אלון', cat: 'מטבח', spaces: ['מטבח'], item: 'מטבח – ארונות, חזיתות ואי', maker: 'מטבחי אלון', total: 120000, status: 'הוזמן', method: 'העברה בנקאית', doc: 'הזמנה', notes: 'מקדמה ותשלום בייצור, יתרה בהתקנה',
        payments: [{ date: '2026-07-01', amount: 30000 }, { date: '2026-09-15', amount: 20000 }], next: '2026-12-05', material: 'm4' },
      { id: 'e3', date: '2026-09-20', supplier: 'שיש הגליל', cat: 'מטבח', spaces: ['מטבח'], item: 'משטח קוורץ קיסר 5143', maker: 'Caesarstone', total: 22000, status: 'הוזמן', method: 'אשראי', doc: 'חשבונית', notes: '',
        payments: [{ date: '2026-09-28', amount: 20000 }], next: '2026-12-10', material: 'm5' },
      { id: 'e4', date: '2026-06-15', supplier: 'נגריית השרון', cat: 'נגרות', spaces: ['חדר הורים', 'חדרי ילדים'], item: 'ארונות קיר לחדרים', total: 110000, status: 'בייצור', method: 'העברה בנקאית', doc: 'הצעת מחיר', notes: '',
        payments: [{ date: '2026-06-20', amount: 40000 }, { date: '2026-09-01', amount: 30000 }], next: '2026-11-20', material: 'm13' },
      { id: 'e5', date: '2026-08-05', supplier: 'נגריית השרון', cat: 'נגרות', spaces: ['סלון', 'שטחים כלליים'], item: 'ספריית סלון ונישות', total: 85000, status: 'בייצור', method: 'העברה בנקאית', doc: 'הזמנה', notes: 'כולל תוספת נישה (שינוי #3)',
        payments: [{ date: '2026-08-10', amount: 50000 }], next: '2026-11-25', material: 'm12' },
      { id: 'e6', date: '2026-08-12', supplier: 'עץ הפרקט', cat: 'ריצוף וחיפויים', spaces: ['חדר הורים', 'חדרי ילדים', 'סלון'], item: 'פרקט עץ אלון', maker: 'Kährs', total: 48000, status: 'הותקן', method: 'אשראי', doc: 'חשבונית', notes: '',
        payments: [{ date: '2026-08-20', amount: 48000 }], material: 'm3' },
      { id: 'e7', date: '2026-09-17', supplier: 'נגב קרמיקה', cat: 'ריצוף וחיפויים', spaces: ['חדרי רחצה'], item: 'אריח קיר', maker: 'Porcelanosa', model: 'Bottega Caliza', sku: '45821', color: 'Sand', qty: 32, unit: 'מ"ר', unitPrice: 280, total: 8960, status: 'הוזמן', method: 'אשראי', doc: 'חשבונית', notes: 'כולל הובלה',
        payments: [{ date: '2026-09-17', amount: 4480 }], next: '2026-10-01', material: 'm1' },
      { id: 'e8', date: '2026-07-20', supplier: 'נגב קרמיקה', cat: 'ריצוף וחיפויים', spaces: ['מטבח', 'שטחים כלליים', 'מרפסת'], item: 'ריצוף פורצלן 60×120', maker: 'Marazzi', total: 27040, status: 'סופק', method: 'אשראי', doc: 'חשבונית', notes: '',
        payments: [{ date: '2026-07-25', amount: 19520 }], next: '2026-10-25', material: 'm2' },
      { id: 'e9', date: '2026-09-01', supplier: 'אלוני סניטריה', cat: 'סניטריה', spaces: ['חדרי רחצה', 'שירותי אורחים'], item: 'כלים סניטריים ואסלות תלויות', maker: 'Duravit', total: 28000, status: 'סופק', method: 'אשראי', doc: 'חשבונית', notes: '',
        payments: [{ date: '2026-09-05', amount: 18000 }], next: '2026-11-05', material: 'm8' },
      { id: 'e10', date: '2026-09-22', supplier: 'אלוני סניטריה', cat: 'סניטריה', spaces: ['חדרי רחצה', 'מטבח'], item: 'ברזים ומערכות מקלחת', maker: 'Hansgrohe', total: 20000, status: 'הוזמן', method: 'אשראי', doc: 'הזמנה', notes: '',
        payments: [{ date: '2026-09-25', amount: 12000 }], next: '2026-11-15', material: 'm6' },
      { id: 'e11', date: '2026-08-20', supplier: 'קמחי תאורה', cat: 'תאורה', spaces: ['שטחים כלליים'], item: 'גופי תאורה שקועים ופסי LED', maker: 'Delta Light', total: 26000, status: 'הותקן', method: 'אשראי', doc: 'חשבונית', notes: '',
        payments: [{ date: '2026-08-28', amount: 26000 }], material: 'm10' },
      { id: 'e12', date: '2026-09-30', supplier: 'קמחי תאורה', cat: 'תאורה', spaces: ['פינת אוכל'], item: 'מנורות תלויות לפינת האוכל', maker: 'Flos', total: 16000, status: 'הוזמן', method: 'אשראי', doc: 'הזמנה', notes: '',
        payments: [{ date: '2026-10-02', amount: 9000 }], next: '2026-12-01', material: 'm9' },
      { id: 'e13', date: '2026-05-25', supplier: 'אוויר טק', cat: 'מיזוג', spaces: ['שטחים כלליים'], item: 'מערכת מיני מרכזי – 3 יחידות', maker: 'Tadiran', total: 44000, status: 'הותקן', method: 'העברה בנקאית', doc: 'חשבונית', notes: '',
        payments: [{ date: '2026-06-01', amount: 22000 }, { date: '2026-08-15', amount: 22000 }] },
      { id: 'e14', date: '2026-04-28', supplier: 'קליל פרו', cat: 'אלומיניום', spaces: ['שטחים כלליים', 'מרפסת'], item: 'חלונות ודלתות הזזה', maker: 'Klil', total: 60000, status: 'בייצור', method: 'העברה בנקאית', doc: 'הזמנה', notes: 'התקנה בדצמבר',
        payments: [{ date: '2026-05-10', amount: 30000 }, { date: '2026-07-10', amount: 15000 }], next: '2026-12-15' },
    ],

    categoryBudgets: {
      'ביצוע ושיפוץ': 520000, 'מטבח': 150000, 'נגרות': 180000, 'ריצוף וחיפויים': 90000, 'סניטריה': 55000,
      'תאורה': 60000, 'מיזוג': 45000, 'אלומיניום': 85000, 'ריהוט': 120000, 'מוצרי חשמל': 60000,
      'טקסטיל ווילונות': 35000, 'גינה וחוץ': 40000, 'מערכות חכמות': 30000, 'שונות': 30000,
    },

    casaMilestones: [
      { name: 'מקדמה בחתימת הסכם', amount: 75000, due: '2026-03-01', paid: '2026-03-01', invoice: 'חשבונית 1042' },
      { name: 'סיום הריסה', amount: 80000, due: '2026-04-15', paid: '2026-04-15', invoice: 'חשבונית 1077' },
      { name: 'סיום בנייה', amount: 100000, due: '2026-06-10', paid: '2026-06-10', invoice: 'חשבונית 1121' },
      { name: 'סיום תשתיות', amount: 110000, due: '2026-08-05', paid: '2026-08-05', invoice: 'חשבונית 1168' },
      { name: 'תחילת עבודות גמר', amount: 89000, due: '2026-09-20', paid: '2026-09-20', invoice: 'חשבונית 1203' },
      { name: 'סיום עבודות גמר', amount: 26000, due: '2026-11-10', paid: null },
      { name: 'מסירת הבית', amount: 25000, due: '2027-02-15', paid: null },
    ],

    changes: [
      { id: 'c1', no: 1, title: 'הוספת נקודת טעינה לרכב חשמלי', amount: 4200, status: 'approved', date: '2026-06-02' },
      { id: 'c2', no: 2, title: 'שדרוג פרקט לעץ אלון מלא', amount: 9800, status: 'approved', date: '2026-07-14' },
      { id: 'c3', no: 3, title: 'תוספת נישה מוארת בקיר הסלון', amount: 6500, status: 'pending', date: '2026-10-08' },
    ],

    updates: [
      { id: 'u1', date: '2026-10-13', title: 'הגמרים בקומה העליונה', stage: 'עבודות גמר', stages: ['טיח וצבע', 'ריצוף וחיפויים'], desc: 'הריצוף בקומה העליונה הושלם, ושכבת הצבע הראשונה כבר על הקירות. חדר ההורים מקבל את צורתו הסופית.', photos: ['assets/img/j-43.jpg', 'assets/img/j-28.jpg', 'assets/img/j-8.jpg', 'assets/img/j-22.jpg', 'assets/img/j-1.jpg'] },
      { id: 'u2', date: '2026-10-06', title: 'התחלנו בהתקנת הנגרות', stage: 'נגרות', stages: ['נגרות'], desc: 'הגיעו גופי הארונות לחדרי הילדים. הספרייה בסלון עדיין בייצור.', photos: ['assets/img/j-63.jpg', 'assets/img/j-55.jpg'] },
      { id: 'u3', date: '2026-09-24', title: 'חיפוי אמבטיית ההורים', stage: 'עבודות גמר', stages: ['ריצוף וחיפויים'], desc: 'אריחי Porcelanosa בגוון Sand הותקנו על קיר המקלחת עד התקרה.', photos: ['assets/img/j-49.jpg', 'assets/img/j-40.jpg'] },
      { id: 'u4', date: '2026-08-04', title: 'תשתיות הושלמו', stage: 'תשתיות', stages: ['אינסטלציה', 'חשמל', 'מיזוג אוויר'], desc: 'חשמל, אינסטלציה ומיזוג. כל הבדיקות עברו בהצלחה.', photos: ['assets/img/before-4.jpg', 'assets/img/j-31.jpg'] },
      { id: 'u5', date: '2026-06-08', title: 'סיום שלב הבנייה', stage: 'בנייה', stages: ['בנייה'], desc: 'הקירות החדשים עומדים והפתחים מוכנים לאלומיניום.', photos: ['assets/img/before-1.jpg', 'assets/img/j-33.jpg'] },
      { id: 'u6', date: '2026-03-02', title: 'לפני שמתחילים', stage: 'לפני', stages: ['לפני'], desc: 'תיעוד מצב קיים לפני ההריסה.', photos: ['assets/img/before-living.jpg', 'assets/img/before-kitchen.jpg', 'assets/img/before-2.jpg', 'assets/img/before-3.jpg', 'assets/img/before-bath.jpg'] },
    ],

    documents: [
      { id: 'd1', cat: 'הסכם התקשרות', title: 'הסכם תכנון וביצוע – חתום', date: '2026-02-28', type: 'PDF', size: '1.2MB' },
      { id: 'd2', cat: 'הצעת מחיר', title: 'הצעת מחיר קאסה פואבלו – גרסה סופית', date: '2026-02-20', type: 'PDF', size: '0.8MB' },
      { id: 'd3', cat: 'מפרט', title: 'מפרט טכני לביצוע', date: '2026-02-28', type: 'PDF', size: '2.3MB' },
      { id: 'd4', cat: 'נספחים', title: 'נספח לוח תשלומים', date: '2026-02-28', type: 'PDF', size: '0.2MB' },
      { id: 'd5', cat: 'ביטוחים', title: 'פוליסת ביטוח קבלנים', date: '2026-02-27', type: 'PDF', size: '0.6MB' },
      { id: 'd6', cat: 'אישורים', title: 'אישור מהנדס – פתח בקיר נושא', date: '2026-03-20', type: 'PDF', size: '0.4MB' },
      { id: 'd7', cat: 'חשבוניות', title: 'חשבונית 1203 – קאסה פואבלו', date: '2026-09-20', type: 'PDF', size: '0.1MB', expense: 'e1' },
      { id: 'd8', cat: 'חשבוניות', title: 'חשבונית נגב קרמיקה – אריח קיר', date: '2026-09-17', type: 'PDF', size: '0.1MB', expense: 'e7' },
      { id: 'd9', cat: 'קבלות', title: 'קבלה – מטבחי אלון, תשלום 2', date: '2026-09-15', type: 'PDF', size: '0.1MB', expense: 'e2' },
      { id: 'd10', cat: 'מסמכי ספקים', title: 'הזמנת עבודה – נגריית השרון', date: '2026-08-05', type: 'PDF', size: '0.5MB', expense: 'e5' },
      { id: 'd11', cat: 'תעודות אחריות', title: 'תעודת אחריות – מערכת מיזוג Tadiran', date: '2026-08-15', type: 'PDF', size: '0.3MB', expense: 'e13' },
      { id: 'd12', cat: 'שינויים ותוספות', title: 'שינוי #3 – נישה מוארת בסלון', date: '2026-10-08', type: 'PDF', size: '0.3MB' },
      { id: 'd13', cat: 'שינויים ותוספות', title: 'שינוי #2 – שדרוג פרקט', date: '2026-07-14', type: 'PDF', size: '0.3MB' },
    ],

    pros: [
      { id: 'pr1', cat: 'נגר', name: 'אבי שרעבי', company: 'נגריית השרון', phone: '052-3344556', note: 'ארונות, ספרייה ונישות', warranty: '2031-11' },
      { id: 'pr2', cat: 'חשמלאי', name: 'מוטי אלקיים', company: 'א.מ חשמל', phone: '054-2233445', note: 'חשמלאי מוסמך, לוח חשמל חדש', warranty: '2028-08' },
      { id: 'pr3', cat: 'אינסטלטור', name: 'יוסי בן חמו', company: 'בן חמו אינסטלציה', phone: '050-9988776', note: '', warranty: '2028-08' },
      { id: 'pr4', cat: 'מיזוג', name: 'רן גולן', company: 'אוויר טק', phone: '053-1234567', note: 'Tadiran מיני מרכזי', warranty: '2029-08' },
      { id: 'pr5', cat: 'מטבח', name: 'שי אלון', company: 'מטבחי אלון', phone: '09-7712233', note: '', warranty: '2033-12' },
      { id: 'pr6', cat: 'שיש', name: 'סאמר חורי', company: 'שיש הגליל', phone: '04-6655443', note: 'קוורץ קיסר', warranty: '2051-12' },
      { id: 'pr7', cat: 'אלומיניום', name: 'דודי פרץ', company: 'קליל פרו', phone: '052-5566778', note: '', warranty: '2031-12' },
      { id: 'pr8', cat: 'פרקט', name: 'עמית רז', company: 'עץ הפרקט', phone: '054-6677889', note: 'כולל חידוש שמן אחרי שנה', warranty: '2051-08' },
      { id: 'pr9', cat: 'תאורה', name: 'ליאת קמחי', company: 'קמחי תאורה', phone: '03-5544332', note: '', warranty: '2028-10' },
      { id: 'pr10', cat: 'זכוכית', name: 'הדר נחום', company: 'זכוכית הדר', phone: '050-4433221', note: 'מקלחונים ומעקות', warranty: '2029-12' },
      { id: 'pr11', cat: 'גינון', name: 'עידו שקד', company: 'שקד גינון', phone: '052-8877665', note: 'ייכנס בשלב הפיתוח', warranty: '' },
      { id: 'pr12', cat: 'בית חכם', name: 'אלון ברק', company: 'סמארט הום פלוס', phone: '053-9988112', note: 'בקרת תאורה ותריסים', warranty: '2028-12' },
    ],

    tickets: [
      { id: 't1', no: 1007, title: 'רטיבות קלה ליד חלון חדר הילדים', date: '2026-10-11', status: 'בטיפול', cat: 'אלומיניום', by: 'נועה אברהמי', reply: 'קליל פרו יגיעו לבדיקה ביום ראשון 18.10.' },
      { id: 't2', no: 1003, title: 'שאלה על גוון הרובה במקלחת', date: '2026-09-26', status: 'נסגר', cat: 'ריצוף', by: 'אורי אברהמי', reply: 'נבחר גוון Bahama Beige, מתאים לאריח.' },
    ],

    tasks: [
      { id: 'k1', type: 'approval', title: 'אישור תכנית חשמל V4', sub: 'דנה ביקשה את אישורך · 12.10', ref: { page: 'plans', id: 'pl1' }, level: 'red', done: false },
      { id: 'k2', type: 'approval', title: 'אישור תכנית תאורה V3', sub: 'נדרש לפני הזמנת גופי התאורה · 09.10', ref: { page: 'plans', id: 'pl2' }, level: 'red', done: false },
      { id: 'k3', type: 'approval', title: 'אישור שינוי #3: נישה מוארת בסלון', sub: '₪6,500 תוספת · 08.10', ref: { page: 'change', id: 'c3' }, level: 'yellow', done: false },
      { id: 'k4', type: 'choice', title: 'בחירת ברז אמבטיה עומד', sub: 'שתי אפשרויות ממתינות לבחירתכם', ref: { page: 'materials', id: 'm7' }, level: 'yellow', done: false },
      { id: 'k5', type: 'info', title: 'התייחסות לסקיצת פיתוח החוץ', sub: 'אין דחיפות · עד 30.10', ref: { page: 'plans', id: 'pl14' }, level: 'blue', done: false },
    ],

    notifications: [
      { id: 'n1', text: 'נוספה תכנית חדשה: פיתוח חוץ ומרפסת', when: '2026-10-14 16:20', read: false, link: 'plans' },
      { id: 'n2', text: 'נוספו 3 תמונות חדשות מהפרויקט', when: '2026-10-13 18:05', read: false, link: 'photos' },
      { id: 'n3', text: 'נדרש אישורך לתכנית החשמל V4', when: '2026-10-12 13:42', read: false, link: 'tasks' },
      { id: 'n4', text: 'נדרש אישורך לתכנית התאורה', when: '2026-10-09 11:10', read: true, link: 'tasks' },
      { id: 'n5', text: 'התשלום הבא מתקרב: ₪26,000 ב-10.11', when: '2026-10-08 09:00', read: true, link: 'finance' },
      { id: 'n6', text: 'התוספת שאישרת (שדרוג פרקט) הועברה לביצוע', when: '2026-07-16 10:30', read: true, link: 'documents' },
    ],

    audit: [
      { when: '2026-10-14 16:20', who: 'דנה לוין', what: 'העלתה תכנית פיתוח חוץ V1' },
      { when: '2026-10-13 18:05', who: 'חורחה עברין', what: 'העלה 3 תמונות ליומן הפרויקט' },
      { when: '2026-10-13 09:30', who: 'חורחה עברין', what: 'עדכן את הסיכום השבועי' },
      { when: '2026-10-12 13:42', who: 'דנה לוין', what: 'העלתה תכנית חשמל V4 וביקשה אישור' },
      { when: '2026-10-12 15:04', who: 'אורי אברהמי', what: 'צפה בתכנית חשמל V4' },
      { when: '2026-10-09 11:10', who: 'דנה לוין', what: 'העלתה תכנית תאורה V3 וביקשה אישור' },
      { when: '2026-10-08 10:00', who: 'חורחה עברין', what: 'הוסיף שינוי #3 – נישה מוארת בסלון' },
      { when: '2026-09-20 12:00', who: 'מיכל אדרי', what: 'עדכנה תשלום: תחילת עבודות גמר ₪89,000' },
    ],

    todos: [
      { id: 'td1', title: 'לבחור ידיות לארונות המטבח', desc: 'שלוש אפשרויות באולם התצוגה של מטבחי אלון', owner: 'נועה אברהמי', due: '2026-10-20', done: false },
      { id: 'td2', title: 'להזמין וילונות לחדר ההורים', desc: 'למדוד אחרי הצבע', owner: 'אורי אברהמי', due: '2026-11-05', done: false },
      { id: 'td3', title: 'לפנות את המחסן לפני הריצוף', desc: '', owner: 'אורי אברהמי', due: '2026-10-01', done: true },
    ],

    weeklySummaries: [
      { id: 'w2', week: '2026-10-16', status: 'draft', done: ['הריצוף בקומה העליונה הושלם', 'הגיעו גופי הארונות לחדרי הילדים', 'הועלתה תכנית החשמל המעודכנת (גרסה 4)'], next: ['התקנת הארונות בחדרי הילדים', 'שכבת צבע שנייה בקומה העליונה', 'מחכה לאישור שלכם: תכנית החשמל ותכנית התאורה'] },
      { id: 'w1', week: '2026-10-09', status: 'sent', approvedBy: 'חורחה עברין', sentAt: '2026-10-09T17:00:00', done: ['חיפוי הקיר באמבטיית ההורים הותקן', 'התחלנו בהתקנת הנגרות', 'הועלתה תכנית התאורה (גרסה 3)'], next: ['סיום הריצוף בקומה העליונה', 'הגעת גופי הארונות לחדרי הילדים', 'אישור תכנית התאורה לפני הזמנת הגופים'] },
    ],

    // Back-office portfolio (other families shown only to staff)
    portfolio: [
      { id: 'p-avrahami', name: 'בית אברהמי', client: 'אורי ונועה אברהמי', city: 'רמת השרון', pm: 'חורחה עברין', stage: 'עבודות גמר', progress: 68, openTasks: 5, pendingApprovals: 3, schedule: 'delay', alerts: 1, img: 'assets/img/hero-home.jpg' },
      { id: 'p-shalev', name: 'דירת שליו', client: 'משפחת שליו', city: 'תל אביב', pm: 'חורחה עברין', stage: 'תשתיות', progress: 41, openTasks: 2, pendingApprovals: 1, schedule: 'ok', alerts: 0, img: 'assets/img/hero-1.jpg' },
      { id: 'p-katz', name: 'וילה כץ', client: 'משפחת כץ', city: 'כפר שמריהו', pm: 'עדי פרידמן', stage: 'תכנון', progress: 14, openTasks: 4, pendingApprovals: 2, schedule: 'ok', alerts: 0, img: 'assets/img/t-101.jpg' },
      { id: 'p-bendavid', name: 'פנטהאוז בן דוד', client: 'משפחת בן דוד', city: 'הרצליה', pm: 'עדי פרידמן', stage: 'התקנות', progress: 86, openTasks: 1, pendingApprovals: 0, schedule: 'ok', alerts: 0, img: 'assets/img/hero-5.jpg' },
      { id: 'p-mor', name: 'בית מור', client: 'משפחת מור', city: 'כפר סבא', pm: 'חורחה עברין', stage: 'הריסה', progress: 22, openTasks: 3, pendingApprovals: 0, schedule: 'risk', alerts: 2, img: 'assets/img/hero-3.jpg' },
      { id: 'p-golan', name: 'בית גולן', client: 'משפחת גולן', city: 'רעננה', pm: 'עדי פרידמן', stage: 'מסירה', progress: 100, openTasks: 0, pendingApprovals: 0, schedule: 'done', alerts: 0, img: 'assets/img/t-108.jpg' },
    ],
  };
}

const STAGE_TEMPLATE = ['אפיון ופרוגרמה', 'תכנון', 'בחירת חומרים', 'הריסה', 'בנייה', 'תשתיות', 'עבודות גמר', 'נגרות', 'התקנות', 'מסירה'];

// A new, empty project for the real system. With a template the stages are spread evenly between start and handover.
function emptyProjectData({ name = '', family = '', address = '', client = '', start = TODAY, handover = '', budget = 0, team = null, image = 'assets/img/hero-home.jpg', members = [], template = true } = {}) {
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const s = parseDate(start || TODAY);
  const e = handover ? parseDate(handover) : new Date(s.getFullYear() + 1, s.getMonth(), s.getDate());
  const step = Math.max(1, (e - s) / STAGE_TEMPLATE.length);
  const timeline = template ? STAGE_TEMPLATE.map((n, i) => ({
    name: n, ps: iso(new Date(+s + step * i)), pe: iso(new Date(+s + step * (i + 1) - 864e5)),
    as: i === 0 ? iso(s) : null, ae: null, status: i === 0 ? 'active' : 'future', note: '', photos: [],
  })) : [];
  return {
    project: {
      id: '', name, family, address, client: client || (family ? `משפחת ${family}` : ''), image,
      stage: timeline.length ? timeline[0].name : '', progress: 0, start: start || TODAY, handover: iso(e), pm: 'pm',
      scope: '', area: '', budget: budget || 0,
      weekly: { updated: start || TODAY, text: 'ברוכים הבאים לאזור האישי של הפרויקט. כאן נעדכן אתכם בכל שבוע.' },
    },
    team: team || JSON.parse(JSON.stringify(TEAM)),
    members, timeline, plans: [], materials: [], expenses: [], categoryBudgets: {}, casaMilestones: [], changes: [],
    updates: [], documents: [], pros: [], tickets: [], tasks: [], notifications: [], audit: [], portfolio: [], weeklySummaries: [], todos: [], planCategories: [],
  };
}

// "About Casa Pueblo" tiles. Wording taken from casa-pueblo.co.il (home + about pages).
const ABOUT = {
  tagline: 'הבית שלכם, המקצוענות שלנו.',
  intro: 'משמעות השם "קאסה פואבלו" היא "בית לעם", וזה בדיוק החזון שהצבנו לעצמנו: כל לקוח יוכל לעשות שינוי בביתו ולהפוך אותו לשלו.',
  tiles: [
    { big: '30+', title: 'שנות ניסיון', text: 'חורחה עברין, מנכ"ל החברה והאדריכל הראשי, מלווה את הפרויקט מהשרטוט הראשון ועד הכניסה בפועל, בשקיפות מלאה, בדיוק ובמקצועיות.' },
    { big: '1', title: 'תחנה אחת לכל התהליך', text: 'שיטת האדריכלות היישומית מעניקה את כל השירותים במקום אחד, משלבי התכנון הראשונים ועד לסיבוב הקניות בסוף השיפוץ.' },
    { big: '2', title: 'מחלקות, גג אחד', text: 'מחלקת התכנון, ומחלקת הבנייה, הפיקוח והניהול. בניגוד לרוב משרדי האדריכלים, אנחנו ממשיכים ללוות אתכם גם אחרי השרטוט.' },
    { icon: 'sun', title: 'אור, אוויר ותאורה חמה', text: 'הרבה אור טבעי, חלוקה נכונה של המרחב, קווים נקיים ועדינים ותאורה חמה ורכה.' },
    { icon: 'home', title: 'כל בית הוא יצירה', text: 'כל פרויקט שאנחנו לוקחים על עצמנו הופך ליצירה עצמאית, אישית וייחודית, בהתאם לתכנון שגיבשנו יחד איתכם.' },
    { icon: 'shield', title: 'שקט נפשי', text: 'חברת Casa Pueblo תעניק לכם את השקט הנפשי הנדיר, שמגיע רק כשעובדים עם מקצוענים.' },
  ],
};

// Who may do what. From Itzik's permissions questionnaire (29.10.2026). all = family and team, staff = the team
// (and the family's own designer in her project), jorge = Jorge only, view = family sees, the team changes.
const PERMS = [
  ['תכניות', [['העלאת תכנית או גרסה (חורחה מקבל מייל)', 'all'], ['סימון "מאושר לביצוע" או "טיוטה"', 'staff'], ['הוספת קטגוריה', 'all'], ['אישור תכנית מטעם המשפחה (חורחה מקבל מייל)', 'all']]],
  ['חומרים ובחירות', [['הוספה ועריכה, כולל איש קשר', 'all'], ['הזמנה וחשבונית', 'all'], ['מחיקת חומר', 'view']]],
  ['כספים', [['רישום תשלום לקאסה פואבלו', 'jorge'], ['תקציב הבית: צפייה והוספת הוצאות', 'all']]],
  ['מסמכים', [['העלאת מסמך (חורחה מקבל מייל)', 'all'], ['מחיקת מסמך', 'jorge'], ['מסמכים פנימיים', 'jorge']]],
  ['לוח זמנים, תמונות וסיכום שבועי', [['עדכון לוח הזמנים', 'view'], ['העלאת תמונות', 'all'], ['כתיבת הסיכום השבועי', 'staff'], ['אישור ושליחת הסיכום השבועי', 'jorge']]],
  ['שינויים ומטלות', [['יצירת שינוי או תוספת', 'jorge'], ['אישור שינוי או תוספת', 'all'], ['בעלי מקצוע', 'all'], ['המטלות של המשפחה', 'all']]],
  ['ניהול', [['פרויקט חדש ופרטי פרויקט', 'jorge'], ['הזמנת בני משפחה והסרתם', 'jorge'], ['אנשי צוות', 'jorge'], ['יומן פעילות', 'staff']]],
];
const PERM_LABELS = { all: ['green', 'משפחה וצוות'], staff: ['blue', 'צוות'], jorge: ['red', 'חורחה בלבד'], view: ['gray', 'משפחה צופה, צוות משנה'] };

// Team photos for the "about" section (from Itzik, 29.10.2026).
const TEAM_NAMES = ['חורחה', 'יניב', 'עינב', 'אלכס', 'אולג'];
const TEAM_PHOTOS = ['assets/img/team.jpg'];

// Real before / after pairs from the Ramat Hasharon project on the company site.
const BEFORE_AFTER = [
  { name: 'סלון', before: 'assets/img/before-living.jpg', after: 'assets/img/after-living.jpg' },
  { name: 'מטבח', before: 'assets/img/before-kitchen.jpg', after: 'assets/img/after-kitchen.jpg' },
  { name: 'חדר רחצה', before: 'assets/img/before-bath.jpg', after: 'assets/img/after-bath.jpg' },
];
