# PayAgent — מפרט אשף הקליטה (Onboarding Wizard)

> **סטטוס:** טיוטה לאישור  
> **תאריך:** 2026-04-05  
> **מטרה:** משתמש חדש שנרשם נוחת על דשבורד ריק עם אפסים — מבלבל ומרתיע. אשף קליטה ילווה אותו ב-5 שלבים עד שיש לו דאטה אמיתי במערכת.

---

## תוכן עניינים

1. [זיהוי הצורך בקליטה](#1-זיהוי-הצורך-בקליטה)
2. [מיקום ב-Routing](#2-מיקום-ב-routing)
3. [עיצוב Progress Indicator](#3-עיצוב-progress-indicator)
4. [ניווט — דילוג וחזרה](#4-ניווט--דילוג-וחזרה)
5. [שלב 1 — ברוך הבא](#5-שלב-1--ברוך-הבא)
6. [שלב 2 — פרטי סוכן](#6-שלב-2--פרטי-סוכן)
7. [שלב 3 — חברות ביטוח](#7-שלב-3--חברות-ביטוח)
8. [שלב 4 — העלאת קבצים](#8-שלב-4--העלאת-קבצים)
9. [שלב 5 — סיכום](#9-שלב-5--סיכום)
10. [Store ו-State Management](#10-store-ו-state-management)
11. [מבנה קבצים](#11-מבנה-קבצים)
12. [מקרי קצה](#12-מקרי-קצה)

---

## 1. זיהוי הצורך בקליטה

### לוגיקה

משתמש צריך onboarding אם **כל** התנאים הבאים מתקיימים:

```ts
const needsOnboarding =
  authStore.isAuthenticated &&
  authStore.userMode === 'new' &&
  !authStore.profile?.onboardingCompleted;
```

### שדה חדש ב-`UserProfile`

```ts
// authStore.ts — הוספה ל-UserProfile
onboardingCompleted: boolean;  // ברירת מחדל: false
onboardingStep?: number;       // 1-5, לשמירת מיקום אם המשתמש יצא באמצע
```

### מתי לא מציגים

- משתמש demo (`userMode === 'demo'`) — תמיד ישר לדשבורד
- משתמש שסיים onboarding (`onboardingCompleted === true`)
- משתמש שלחץ "דלג על ההגדרה" (מסמן `onboardingCompleted = true` ב-store)

### שמירה

- `onboardingCompleted` ו-`onboardingStep` נשמרים ב-`authStore` עם `persist` (כבר קיים)
- בנוסף: API call ל-`PATCH /api/v1/agents/:id` עם `{ onboardingCompleted: true }` כדי שהשרת ידע

---

## 2. מיקום ב-Routing

### שינוי ב-`App.tsx`

```tsx
const OnboardingPage = lazy(() => import('./pages/OnboardingPage'));

// בתוך ProtectedRoute, לפני ה-AppLayout:
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const needsOnboarding = useAuthStore((s) =>
    s.isAuthenticated &&
    s.userMode === 'new' &&
    !s.profile?.onboardingCompleted
  );

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (needsOnboarding) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}

// Route חדש — ללא AppLayout (full-screen experience):
<Route path="/onboarding" element={
  <OnboardingGuard>
    <OnboardingPage />
  </OnboardingGuard>
} />
```

### `OnboardingGuard`

```tsx
function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const onboardingCompleted = useAuthStore((s) => s.profile?.onboardingCompleted);

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (onboardingCompleted) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}
```

### תרשים זרימה

```
Register → /onboarding (שלבים 1-5) → /dashboard
Login (returning user) → /dashboard (ישירות)
Login (user with incomplete onboarding) → /onboarding (ממשיך משלב שנשמר)
```

---

## 3. עיצוב Progress Indicator

### Layout כללי

```
┌─────────────────────────────────────────────────┐
│  PAYAGENT logo (top-right)     [דלג על ההגדרה]  │
│                                                 │
│  ●────●────○────○────○   שלב 2 מתוך 5          │
│  ברוך   פרטי  חברות  קבצים  סיכום              │
│  הבא   סוכן  ביטוח                             │
│                                                 │
│  ┌─────────────────────────────────────────┐    │
│  │                                         │    │
│  │         תוכן השלב הנוכחי               │    │
│  │                                         │    │
│  └─────────────────────────────────────────┘    │
│                                                 │
│  [← חזרה]                        [המשך →]      │
└─────────────────────────────────────────────────┘
```

### קומפוננטת Progress

```tsx
// OnboardingProgress.tsx
interface Props {
  currentStep: number; // 1-5
  completedSteps: Set<number>;
}
```

**עיצוב:**
- קו אופקי עם 5 עיגולים (circles)
- שלב שהושלם: `bg-secondary` עם אייקון `check` לבן
- שלב נוכחי: `bg-primary` עם מספר לבן, `ring-4 ring-primary/20` (glow effect)
- שלב עתידי: `bg-surface-container-high` עם מספר `text-on-surface-variant`
- הקו בין השלבים: `bg-secondary` לשלבים שהושלמו, `bg-outline-variant` לשאר
- מתחת לכל עיגול: label קצר (`font-label text-[10px] uppercase tracking-widest`)
- אנימציית transition בין שלבים: `transition-all duration-500`

**מובייל:**
- Labels מוסתרים (`hidden sm:block`)
- רק העיגולים והקו נשארים
- כותרת השלב מוצגת מתחת ל-progress bar

---

## 4. ניווט — דילוג וחזרה

### כללי ניווט

| פעולה | זמינות | התנהגות |
|-------|---------|---------|
| **המשך** | רק כשהשלב valid | `currentStep++`, שומר דאטה |
| **חזרה** | שלבים 2-5 | `currentStep--`, לא מאבד דאטה |
| **דלג על ההגדרה** | שלבים 1-4 | dialog אישור → דשבורד |
| **דלג על שלב זה** | שלב 3 (חברות), שלב 4 (קבצים) | ממשיך לשלב הבא |

### כפתור "דלג על ההגדרה" (Skip All)

- מוצג ב-top-left (בכיוון RTL, כלומר ויזואלית למעלה-שמאל)
- טקסט: `text-on-surface-variant text-sm` — לא בולט
- בלחיצה: dialog מודאלי קטן
  - "בטוח? תוכל להשלים את ההגדרות בכל עת מדף ההגדרות."
  - כפתורים: [חזרה להגדרה] [דלג והמשך]
- לא מופיע בשלב 5 (סיכום) — שם יש רק CTA לדשבורד

### Keyboard Navigation

- `Enter` = כפתור "המשך"
- `Escape` = כפתור "חזרה" (או סגירת dialog)
- Tab order הגיוני בכל שלב

---

## 5. שלב 1 — ברוך הבא

### מטרה
ערך ראשוני, הסבר מה הולך לקרות, הנעה לפעולה.

### Layout

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│   [אייקון/אילוסטרציה — account_balance_wallet, גדול]  │
│                                                         │
│   ברוך הבא ל-PayAgent, {שם}!                           │
│                                                         │
│   בדקות הקרובות נגדיר יחד את המערכת שלך.               │
│   בסוף התהליך תראה את תמונת העמלות המלאה שלך.          │
│                                                         │
│   ┌──────────────┐ ┌──────────────┐ ┌──────────────┐   │
│   │ 📋 פרטי סוכן │ │ 🏢 חברות    │ │ 📄 העלאת     │   │
│   │ רישיון, מס   │ │ ביטוח       │ │ קבצים        │   │
│   │ 30 שניות     │ │ 30 שניות    │ │ 2 דקות       │   │
│   └──────────────┘ └──────────────┘ └──────────────┘   │
│                                                         │
│   ⏱ התהליך לוקח כ-3 דקות                              │
│                                                         │
│                              [בואו נתחיל →]             │
└─────────────────────────────────────────────────────────┘
```

### קומפוננטות

```tsx
// OnboardingWelcome.tsx
interface Props {
  userName: string;  // מ-authStore.profile.name
  onNext: () => void;
}
```

### עיצוב

- **רקע:** `bg-surface` — כמו שאר האפליקציה
- **כותרת:** `font-headline text-4xl font-black text-on-surface` — כמו LoginPage hero
- **תיאור:** `text-on-surface-variant font-body text-lg leading-relaxed`
- **3 כרטיסים:** `bg-surface-container-lowest rounded-lg p-6 shadow-editorial-sm`
  - כל כרטיס עם אייקון Material (`description`, `business`, `upload_file`)
  - כותרת bold, תיאור קצר, זמן משוער
  - צבעי אייקונים: `text-primary`, `text-secondary`, `text-on-tertiary-container`
- **כפתור CTA:** `editorial-gradient text-on-primary font-headline font-bold py-4 px-12 rounded-lg shadow-editorial-btn` — זהה לכפתור "כניסה לחשבון דמו" ב-LoginPage
- **זמן:** `text-on-surface-variant text-sm` עם אייקון `schedule`

### מובייל
- הכרטיסים עוברים ל-stack אנכי (`grid-cols-1` במקום `grid-cols-3`)
- הכותרת קטנה ל-`text-3xl`

### States
- **Default:** כפתור "בואו נתחיל" פעיל תמיד
- **אין states נוספים** — שלב סטטי

### Transitions
- כניסה: `animate-fadeIn` (opacity 0→1, translateY 10px→0, duration 500ms)
- יציאה: slide-left

### שמירה
- אין שמירת דאטה בשלב זה
- מעביר ל-`step 2`

---

## 6. שלב 2 — פרטי סוכן

### מטרה
השלמת פרופיל הסוכן — שדות שאולי לא מולאו בהרשמה.

### שדות

| שדה | סוג | חובה | ולידציה | ערך ברירת מחדל |
|-----|------|------|---------|---------------|
| שם מלא | text | כן | min 2 chars | `profile.name` |
| מספר רישיון סוכן | text | כן | pattern: `\d{3}-\d{6}-\d{1}` | `profile.licenseNumber` |
| ת.ז / ח.פ | text | כן | 9 ספרות, ולידציה של ספרת ביקורת | ריק |
| סטטוס מס | radio | כן | — | `profile.taxStatus` |
| טלפון | tel | כן | pattern: `05\d-?\d{7}` | `profile.phone` |

### Layout

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│   השלימו את פרטי הסוכן                              │
│   הפרטים ישמשו לחישוב מדויק של שכר נטו ודיווח מס   │
│                                                     │
│   ┌─────────────────────────────────────────┐       │
│   │                                         │       │
│   │   שם מלא          [ישראל ישראלי      ] │       │
│   │                                         │       │
│   │   מספר רישיון      [052-______-_      ] │       │
│   │                                         │       │
│   │   ת.ז / ח.פ       [_________         ] │       │
│   │                                         │       │
│   │   סטטוס מס                              │       │
│   │   (●) עצמאי    ( ) שכיר                │       │
│   │                                         │       │
│   │   טלפון            [054-_______       ] │       │
│   │                                         │       │
│   └─────────────────────────────────────────┘       │
│                                                     │
│   [← חזרה]                        [המשך →]         │
└─────────────────────────────────────────────────────┘
```

### קומפוננטות

```tsx
// OnboardingAgentProfile.tsx
interface Props {
  initialData: {
    name: string;
    licenseNumber: string;
    taxId: string;
    taxStatus: 'self_employed' | 'employee';
    phone: string;
  };
  onNext: (data: AgentProfileData) => void;
  onBack: () => void;
}
```

### עיצוב Inputs

- זהה ל-LoginPage: `bg-surface-container-high border-none rounded-lg p-4 focus:ring-2 focus:ring-primary/40`
- Labels: `text-xs font-label font-semibold uppercase tracking-wider text-on-surface-variant`
- שדה עם שגיאה: `ring-2 ring-error/40 bg-error-container/10`
- טקסט שגיאה: `text-error text-xs mt-1`

### Radio Buttons (סטטוס מס)

```
┌─────────────────────┐  ┌─────────────────────┐
│ ● עצמאי / עוסק מורשה│  │ ○ שכיר               │
│   מחשב מע"מ, ביטוח   │  │   ניכוי במקור לפי    │
│   לאומי, מס הכנסה    │  │   תלוש שכר           │
└─────────────────────┘  └─────────────────────┘
```

- **נבחר:** `bg-primary-fixed/30 border-2 border-primary rounded-lg p-4`
- **לא נבחר:** `bg-surface-container-low border-2 border-transparent rounded-lg p-4 hover:border-outline-variant`

### States

| State | כפתור "המשך" | הערה |
|-------|-------------|------|
| **ולידציה עוברת** | `bg-primary-container text-white` — פעיל | — |
| **ולידציה נכשלת** | `opacity-60 cursor-not-allowed` — כבוי | שדות שגויים מסומנים באדום |
| **שמירה** | spinner כמו ב-LoginPage | API call ב-background |
| **שגיאת שרת** | `bg-error-container` banner מעל הטופס | כפתור "נסה שוב" |

### Validation — Real-time

- כל שדה מאומת ב-`onBlur`
- מספר רישיון: format mask `XXX-XXXXXX-X`
- ת.ז: אלגוריתם Luhn ישראלי (ספרת ביקורת)
- טלפון: regex `^05\d-?\d{7}$`

### מובייל
- שדות full-width, מרווחים גדולים יותר בין שדות (`space-y-5`)
- Radio buttons ב-stack (`grid-cols-1` במקום `grid-cols-2`)

### שמירה

1. **מקומי:** עדכון `authStore.profile` עם השדות החדשים
2. **שרת:** `PATCH /api/v1/agents/:id` עם:
   ```json
   {
     "name": "...",
     "licenseNumber": "...",
     "taxId": "...",
     "taxStatus": "self_employed",
     "phone": "..."
   }
   ```
3. **onboardingStep:** עדכון ל-`3` ב-store

---

## 7. שלב 3 — חברות ביטוח

### מטרה
סימון חברות הביטוח שהסוכן עובד איתן — משפיע על שלב 4 (איזה קבצים להעלות) ועל הדשבורד.

### רשימת חברות

```ts
const INSURANCE_COMPANIES = [
  { id: 'harel',       name: 'הראל',          logo: 'harel.svg' },
  { id: 'migdal',      name: 'מגדל',          logo: 'migdal.svg' },
  { id: 'phoenix',     name: 'הפניקס',        logo: 'phoenix.svg' },
  { id: 'clal',        name: 'כלל',           logo: 'clal.svg' },
  { id: 'menora',      name: 'מנורה מבטחים',   logo: 'menora.svg' },
  { id: 'hachshara',   name: 'הכשרה',         logo: 'hachshara.svg' },
  { id: 'altshuler',   name: 'אלטשולר שחם',   logo: 'altshuler.svg' },
  { id: 'meitav',      name: 'מיטב דש',       logo: 'meitav.svg' },
  { id: 'psagot',      name: 'פסגות',         logo: 'psagot.svg' },
] as const;
```

### Layout

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│   עם איזה חברות ביטוח אתה עובד?                         │
│   בחר את כל החברות שמהן אתה מקבל עמלות                 │
│                                                         │
│   ┌──────────┐ ┌──────────┐ ┌──────────┐               │
│   │  [logo]  │ │  [logo]  │ │  [logo]  │               │
│   │  הראל  ✓ │ │  מגדל    │ │ הפניקס ✓ │               │
│   └──────────┘ └──────────┘ └──────────┘               │
│   ┌──────────┐ ┌──────────┐ ┌──────────┐               │
│   │  [logo]  │ │  [logo]  │ │  [logo]  │               │
│   │  כלל   ✓ │ │  מנורה   │ │ הכשרה    │               │
│   └──────────┘ └──────────┘ └──────────┘               │
│   ┌──────────┐ ┌──────────┐ ┌──────────┐               │
│   │  [logo]  │ │  [logo]  │ │  [logo]  │               │
│   │ אלטשולר  │ │ מיטב דש  │ │ פסגות    │               │
│   └──────────┘ └──────────┘ └──────────┘               │
│                                                         │
│   נבחרו 3 חברות                                         │
│                                                         │
│   [← חזרה]    [דלג על שלב זה]     [המשך →]            │
└─────────────────────────────────────────────────────────┘
```

### קומפוננטת כרטיס חברה

```tsx
// InsuranceCompanyCard.tsx
interface Props {
  company: InsuranceCompany;
  selected: boolean;
  onToggle: () => void;
}
```

### עיצוב כרטיס

**לא נבחר:**
```
bg-surface-container-lowest
border-2 border-transparent
rounded-lg p-6
shadow-editorial-sm
hover:border-primary/30 hover:shadow-editorial
transition-all duration-200
cursor-pointer
```

**נבחר:**
```
bg-primary-fixed/20
border-2 border-primary
rounded-lg p-6
shadow-editorial
```
- אייקון `check_circle` ב-`text-secondary` בפינה השמאלית-עליונה (LTR) / ימנית-עליונה (RTL → top-left ויזואלית)
- אנימציית scale: `scale-[1.02]` ברגע הבחירה

**לוגו:**
- אם יש לוגו SVG: `w-12 h-12 object-contain`
- fallback: עיגול עם 2 אותיות ראשונות, `bg-primary-fixed-dim text-primary font-headline font-bold`

### Grid

- Desktop: `grid grid-cols-3 gap-4`
- Tablet: `grid grid-cols-3 gap-3`
- Mobile: `grid grid-cols-2 gap-3`

### States

| State | כפתור "המשך" | הערה |
|-------|-------------|------|
| **0 חברות נבחרו** | disabled — `opacity-60` | טקסט: "בחר לפחות חברה אחת" |
| **1+ חברות נבחרו** | פעיל | טקסט: "המשך עם {n} חברות" |
| **"דלג על שלב זה"** | — | ממשיך לשלב 4 עם רשימה ריקה |

### מונה

- מתחת ל-grid: `text-sm font-medium text-on-surface-variant`
- "נבחרו {n} חברות" — עם אנימציית count-up קלה

### שמירה

1. **מקומי:** שמירה ב-`onboardingStore.selectedCompanies: string[]`
2. **שרת:** `POST /api/v1/agents/:id/companies` עם `{ companies: ['harel', 'phoenix', 'clal'] }`
3. **onboardingStep:** עדכון ל-`4`

---

## 8. שלב 4 — העלאת קבצים

### מטרה
העלאת קבצי עמלות לכל חברה שנבחרה בשלב 3. זו הפעולה העיקרית של כל האשף.

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   העלאת קבצי עמלות                                          │
│   העלה את דוחות העמלות שקיבלת מחברות הביטוח                │
│                                                             │
│   ┌─── Company Tabs ────────────────────────────────┐       │
│   │  [הראל ✓]  [הפניקס ○]  [כלל ○]                │       │
│   └─────────────────────────────────────────────────┘       │
│                                                             │
│   ┌─── Upload Area for: הראל ────────────────────────┐      │
│   │                                                   │      │
│   │   ┌─────────────────────────────────────────┐    │      │
│   │   │     ☁️ גרור ושחרר קבצים כאן             │    │      │
│   │   │     XLS, XLSX, CSV                       │    │      │
│   │   │     [בחר קובץ מהמחשב]                   │    │      │
│   │   └─────────────────────────────────────────┘    │      │
│   │                                                   │      │
│   │   ✅ commissions_harel_0326.xlsx — 1,240 רשומות  │      │
│   │                                                   │      │
│   └───────────────────────────────────────────────────┘      │
│                                                             │
│   [← חזרה]    [דלג על שלב זה]     [המשך →]                │
└─────────────────────────────────────────────────────────────┘
```

### תת-ניווט: Company Tabs

- טאב לכל חברה שנבחרה בשלב 3
- **טאב לא הועלה:** עיגול ריק `○` ליד השם — `bg-surface-container-high text-on-surface-variant`
- **טאב הועלה בהצלחה:** אייקון `check_circle` ירוק — `bg-secondary-container/20 text-secondary font-bold`
- **טאב נוכחי:** `bg-primary-container text-white border-b-2 border-primary`
- **טאב שגיאה:** אייקון `error` אדום — `bg-error-container/20 text-error`

### אם המשתמש דילג על שלב 3

- מוצג select חברה (כמו ב-CommissionUploadPage הקיים) במקום tabs
- טקסט: "לא בחרת חברות ביטוח — בחר חברה ידנית"

### אזור ההעלאה

**שימוש חוזר:** הלוגיקה זהה ל-`CommissionUploadPage` — drag & drop, file input, parsing.

```tsx
// OnboardingUpload.tsx
interface Props {
  selectedCompanies: string[];   // מגיע משלב 3
  uploads: Record<string, UploadStatus>;
  onUpload: (company: string, file: File) => Promise<void>;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

interface UploadStatus {
  fileName: string;
  status: 'uploading' | 'parsing' | 'completed' | 'error';
  recordCount?: number;
  errorMessage?: string;
}
```

### עיצוב אזור Drag & Drop

- **זהה לחלוטין** ל-CommissionUploadPage הקיים — אותו עיצוב, אותם צבעים
- ההבדל: אין בחירת חברה (כי היא נבחרה דרך ה-tabs)
- סוג דוח: "זיהוי אוטומטי" — כמו בדף הקיים

### רשימת קבצים שהועלו (per company)

מתחת ל-drop zone, רשימה של קבצים שכבר הועלו לחברה הנוכחית:

```
┌────────────────────────────────────────────────────┐
│ ✅ commissions_harel_0326.xlsx  │  1,240 רשומות   │
│ ✅ harel_nifraim_q1.csv        │  432 רשומות     │
│ ❌ broken_file.xls             │  שגיאה בפרסור   │ [נסה שוב] [הסר]
└────────────────────────────────────────────────────┘
```

- **הצלחה:** `bg-secondary-container/10 border-s-4 border-secondary rounded-lg p-4`
- **שגיאה:** `bg-error-container/10 border-s-4 border-error rounded-lg p-4`
- **בעיבוד:** spinner + `bg-primary-fixed/10 border-s-4 border-primary`

### States

| State | כפתור "המשך" | הערה |
|-------|-------------|------|
| **0 קבצים הועלו** | פעיל — "המשך ללא קבצים" | מאפשר לדלג |
| **קבצים הועלו בהצלחה** | פעיל — "המשך לסיכום" | ירוק, בולט |
| **קובץ בעיבוד** | disabled עם spinner | מחכה לסיום |
| **כל הקבצים שגיאה** | פעיל — "המשך בכל זאת" | אזהרה שאין דאטה |

### Progress per Company (visual)

מעל ה-tabs, mini progress:

```
הועלו קבצים ל-2 מתוך 3 חברות
████████████████░░░░░░░ 67%
```

- `bg-surface-container-high` ל-track, `bg-secondary` ל-fill
- טקסט: `text-xs font-medium text-on-surface-variant`

### שמירה

1. **קובץ:** `POST /api/v1/uploads/parse` (FormData) — **זהה לקיים**
2. **מקומי:** `dataStore.addUpload(upload)` — **זהה לקיים**
3. **onboardingStep:** עדכון ל-`5` כשלוחצים "המשך"

### מובייל
- Tabs הופכים ל-horizontal scroll (overflow-x-auto) עם snap
- Drop zone קטן יותר (p-8 במקום p-12)
- רשימת קבצים: font-size קטן יותר

---

## 9. שלב 5 — סיכום

### מטרה
תמונה מסכמת של מה הוגדר, preview של דאטה שנקלט, CTA חזק לדשבורד.

### Layout

```
┌───────────────────────────────────────────────────────────────┐
│                                                               │
│   🎉 הכל מוכן!                                               │
│   המערכת מוגדרת ומוכנה לעבודה                                │
│                                                               │
│   ┌─── Summary Cards ─────────────────────────────────┐       │
│   │                                                   │       │
│   │  ┌──────────┐  ┌──────────┐  ┌──────────┐       │       │
│   │  │ פרטי סוכן │  │ 3 חברות  │  │ 1,672    │       │       │
│   │  │ ✓ מלאים  │  │ ביטוח    │  │ רשומות   │       │       │
│   │  └──────────┘  └──────────┘  └──────────┘       │       │
│   │                                                   │       │
│   └───────────────────────────────────────────────────┘       │
│                                                               │
│   ┌─── Preview (if data exists) ─────────────────────┐       │
│   │                                                   │       │
│   │   סה"כ עמלות שנקלטו: ₪13,899                     │       │
│   │   חלוקה לפי חברה:                                 │       │
│   │   הראל    ████████████  ₪6,240                    │       │
│   │   הפניקס  ██████        ₪3,120                    │       │
│   │   כלל     ████████      ₪4,539                    │       │
│   │                                                   │       │
│   └───────────────────────────────────────────────────┘       │
│                                                               │
│                    [כניסה לדשבורד →]                          │
│                                                               │
│   💡 טיפ: תוכל להעלות קבצים נוספים בכל עת מדף "העלאת עמלות" │
└───────────────────────────────────────────────────────────────┘
```

### קומפוננטות

```tsx
// OnboardingSummary.tsx
interface Props {
  profile: UserProfile;
  selectedCompanies: string[];
  uploadStats: {
    totalFiles: number;
    totalRecords: number;
    successfulFiles: number;
    failedFiles: number;
  };
  commissionPreview: {
    total: number;
    byCompany: { name: string; amount: number }[];
  } | null;
  onComplete: () => void;
}
```

### Summary Cards (שורה עליונה)

3 כרטיסים בשורה:

1. **פרטי סוכן** — `bg-surface-container-lowest` + אייקון `person` ירוק
   - "{שם}" + "רישיון: {מספר}"
   - badge: "✓ פרטים מלאים" או "⚠ חסרים פרטים"

2. **חברות ביטוח** — `bg-surface-container-lowest` + אייקון `business`
   - "{n} חברות נבחרו"
   - שמות החברות ב-comma separated

3. **קבצים** — `bg-surface-container-lowest` + אייקון `upload_file`
   - "{n} קבצים הועלו"
   - "{m} רשומות עובדו"
   - אם 0: "לא הועלו קבצים — ניתן להעלות מאוחר יותר"

### Preview Section

**אם יש רשומות:**
- סה"כ עמלות: מספר גדול ב-`text-primary font-black text-4xl`
- Bar chart פשוט (CSS בלבד) — חלוקה לפי חברה
- כל bar: `bg-primary/80 rounded-full h-3` עם שם חברה וסכום

**אם אין רשומות:**
- `bg-surface-container-low rounded-lg p-8 text-center`
- אייקון `insights` גדול, חיוור
- "לא נקלטו נתונים עדיין — העלה קבצים מדף ההעלאות"
- כפתור משני: "העלה קבצים עכשיו" → `/upload`

### כפתור CTA

```
editorial-gradient text-on-primary font-headline font-bold
py-5 px-16 rounded-lg shadow-editorial-btn
text-lg
hover:opacity-95 active:scale-[0.98]
```

- טקסט: "כניסה לדשבורד" + אייקון `arrow_back` (RTL = חץ ימינה ויזואלית)
- Confetti animation קלה ברגע שהעמוד נטען (אופציונלי — CSS keyframes בלבד, בלי ספריה)

### טיפ תחתון

- `bg-secondary-container/20 rounded-lg p-4 flex items-center gap-3`
- אייקון `lightbulb` + טקסט
- "תוכל להעלות קבצים נוספים בכל עת מדף «העלאת עמלות» בתפריט."

### States

- **Loading:** spinner בזמן שליפת preview data מהשרת
- **Error:** fallback ל"אין preview" — לא חוסם את המשך התהליך
- **Success:** הכל מוצג

### שמירה

בלחיצה על "כניסה לדשבורד":

1. `authStore.profile.onboardingCompleted = true`
2. `authStore.profile.onboardingStep = 5` (או מחיקת השדה)
3. `PATCH /api/v1/agents/:id` עם `{ onboardingCompleted: true }`
4. `navigate('/dashboard')`
5. `dataStore.fetchFromApi()` — רענון כל הדאטה

---

## 10. Store ו-State Management

### אופציה: Store ייעודי לאונבורדינג

```tsx
// store/onboardingStore.ts
import { create } from 'zustand';

interface OnboardingState {
  currentStep: number;
  completedSteps: Set<number>;

  // Step 2 data
  agentProfile: {
    name: string;
    licenseNumber: string;
    taxId: string;
    taxStatus: 'self_employed' | 'employee';
    phone: string;
  };

  // Step 3 data
  selectedCompanies: string[];

  // Step 4 data
  uploads: Record<string, UploadStatus[]>; // key = company id

  // Actions
  setStep: (step: number) => void;
  completeStep: (step: number) => void;
  setAgentProfile: (data: Partial<OnboardingState['agentProfile']>) => void;
  toggleCompany: (companyId: string) => void;
  addUploadForCompany: (companyId: string, upload: UploadStatus) => void;
  updateUploadStatus: (companyId: string, fileName: string, status: UploadStatus) => void;
  reset: () => void;
}
```

### מה נשמר איפה

| דאטה | Store | API | הערה |
|------|-------|-----|------|
| currentStep | `onboardingStore` (persist) | — | לשחזור מיקום |
| completedSteps | `onboardingStore` (persist) | — | לשחזור מיקום |
| Agent profile | `authStore.profile` | `PATCH /agents/:id` | עדכון פרופיל קיים |
| Selected companies | `onboardingStore` (persist) | `POST /agents/:id/companies` | API חדש |
| Uploads | `dataStore.uploads` | `POST /uploads/parse` | API קיים |
| onboardingCompleted | `authStore.profile` | `PATCH /agents/:id` | flag סיום |

### Persist Strategy

- `onboardingStore` משתמש ב-`persist` middleware של zustand (כמו `authStore`)
- key: `payagent-onboarding`
- מנקים את ה-store כש-`onboardingCompleted = true`

---

## 11. מבנה קבצים

```
client/src/
├── pages/
│   └── OnboardingPage.tsx          ← Main orchestrator (step router)
├── components/
│   └── onboarding/
│       ├── OnboardingProgress.tsx   ← Step indicator bar
│       ├── OnboardingWelcome.tsx    ← Step 1
│       ├── OnboardingProfile.tsx    ← Step 2
│       ├── OnboardingCompanies.tsx  ← Step 3
│       ├── OnboardingUpload.tsx     ← Step 4
│       ├── OnboardingSummary.tsx    ← Step 5
│       ├── InsuranceCompanyCard.tsx ← Reusable card for step 3
│       └── SkipOnboardingDialog.tsx ← Confirmation dialog
├── store/
│   └── onboardingStore.ts          ← Dedicated store
```

### `OnboardingPage.tsx` — Main Orchestrator

```tsx
export default function OnboardingPage() {
  const { currentStep, setStep, completedSteps } = useOnboardingStore();
  const profile = useAuthStore((s) => s.profile);

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Top Bar */}
      <header className="flex justify-between items-center px-8 py-6">
        <h1 className="text-xl font-bold text-primary font-headline">PAYAGENT</h1>
        {currentStep < 5 && <SkipButton />}
      </header>

      {/* Progress */}
      <OnboardingProgress
        currentStep={currentStep}
        completedSteps={completedSteps}
      />

      {/* Step Content — centered, max-w-2xl */}
      <main className="flex-1 flex items-start justify-center px-4 py-8">
        <div className="w-full max-w-2xl">
          {currentStep === 1 && <OnboardingWelcome ... />}
          {currentStep === 2 && <OnboardingProfile ... />}
          {currentStep === 3 && <OnboardingCompanies ... />}
          {currentStep === 4 && <OnboardingUpload ... />}
          {currentStep === 5 && <OnboardingSummary ... />}
        </div>
      </main>

      {/* Bottom Navigation */}
      {currentStep < 5 && (
        <footer className="px-8 py-6 flex justify-between items-center border-t border-outline-variant/10">
          {currentStep > 1 ? (
            <button onClick={() => setStep(currentStep - 1)}
              className="flex items-center gap-2 text-on-surface-variant hover:text-primary font-medium">
              <Icon name="arrow_forward" size="sm" /> {/* RTL: forward = visual right = back */}
              חזרה
            </button>
          ) : <div />}

          <NextButton step={currentStep} />
        </footer>
      )}
    </div>
  );
}
```

**תוכן ממורכז:** `max-w-2xl mx-auto` — רוחב קריאה נוח, לא full-width
**שלב 4 (uploads):** `max-w-4xl` — צריך יותר מרווח בגלל tabs + file list

---

## 12. מקרי קצה

### משתמש יוצא באמצע האשף

- `currentStep` ו-`completedSteps` נשמרים ב-persist
- בכניסה הבאה: חוזר לשלב שנשמר
- דאטה שמולא (פרופיל, חברות) כבר נשמר — לא צריך למלא שוב

### משתמש עושה logout ו-login מחדש

- אם `onboardingCompleted = false` ב-DB: redirect חזרה ל-onboarding
- `onboardingStep` בשרת מאפשר לשחזר מיקום גם אם localStorage נמחק

### משתמש demo

- **אף פעם** לא רואה onboarding — redirect ישירות ל-dashboard

### רשת איטית / שגיאות API

- שלב 2: שומר מקומית גם אם ה-API נכשל — retry בשלב 5 או ב-background
- שלב 4: שגיאת upload מוצגת per-file עם כפתור retry
- שלב 5: אם `fetchFromApi` נכשל — מציג "לא הצלחנו לטעון preview" עם כפתור retry

### דפדפן אחורה (browser back)

- `onpopstate` listener — מעביר `currentStep--` במקום באמת לצאת מהעמוד
- חלופית: `useNavigate` עם state לכל שלב (`/onboarding?step=3`) — מאפשר back/forward רגיל

### אין חברות ביטוח (דילג על שלב 3)

- שלב 4: מציג select חברה ידני (dropdown כמו בדף upload הקיים)
- שלב 5: מציג "0 חברות נבחרו — ניתן להוסיף מאוחר יותר"

### אין קבצים (דילג על שלב 4)

- שלב 5: מציג הודעה ידידותית, CTA להעלאה מדף ההעלאות
- הדשבורד יציג empty state כרגיל (כמו היום) — אבל המשתמש כבר יודע מה לעשות

### קובץ גדול מאוד

- Limit: 50MB per file (client-side check)
- אם חורג: `setParseError('הקובץ גדול מ-50MB. נסה לפצל לקבצים קטנים יותר.')`

### RTL Edge Cases

- כל ה-layout הוא `dir="rtl"` — כבר מוגדר ב-app
- חיצי navigation: `arrow_forward` = חזרה (ימינה ויזואלית), `arrow_back` = קדימה (שמאלה ויזואלית)
- Progress bar: שמאל לימין (1→5 מימין ויזואלית) — **תקין ב-RTL, מתאים לכיוון הקריאה**

### Accessibility

- כל שלב הוא `<section>` עם `aria-label`
- Progress: `role="progressbar"` עם `aria-valuenow`, `aria-valuemin`, `aria-valuemax`
- Focus management: כשמעברים שלב, focus עובר לכותרת השלב
- Radio buttons: proper `<fieldset>` + `<legend>` לסטטוס מס
- File upload: `aria-describedby` עם הוראות

---

## API Endpoints נדרשים (חדשים)

| Method | Path | Body | תיאור |
|--------|------|------|--------|
| `PATCH` | `/api/v1/agents/:id` | `{ taxId, onboardingCompleted, onboardingStep }` | עדכון פרופיל — **להרחיב endpoint קיים** |
| `POST` | `/api/v1/agents/:id/companies` | `{ companies: string[] }` | שמירת חברות ביטוח — **חדש** |
| `GET` | `/api/v1/agents/:id/companies` | — | שליפת חברות — **חדש** |

שאר ה-endpoints (upload, commissions, etc.) כבר קיימים ומשמשים כמו שהם.

---

## Design Tokens בשימוש (סיכום)

כל הצבעים מגיעים מ-`tailwind.config.ts` הקיים. אין צורך להוסיף צבעים חדשים.

| שימוש | Token |
|-------|-------|
| רקע עמוד | `bg-surface` |
| כרטיסים | `bg-surface-container-lowest` |
| input רקע | `bg-surface-container-high` |
| כפתור ראשי | `editorial-gradient` / `bg-primary-container` |
| כפתור משני | `bg-surface-container-high text-on-surface-variant` |
| הצלחה | `bg-secondary-container text-on-secondary-container` / `text-secondary` |
| שגיאה | `bg-error-container text-on-error-container` / `text-error` |
| טקסט ראשי | `text-on-surface` |
| טקסט משני | `text-on-surface-variant` |
| כותרות | `font-headline font-black` |
| גוף טקסט | `font-body` |
| labels | `font-label text-xs uppercase tracking-widest` |
