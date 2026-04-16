import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../components/ui/Icon';
import { useAuthStore } from '../store/authStore';
import { useDataStore, type UploadRow } from '../store/dataStore';

/* ───────── Constants ───────── */

const STEPS = [
  { label: 'ברוך הבא', icon: 'waving_hand' },
  { label: 'פרטי סוכן', icon: 'person' },
  { label: 'חברות ביטוח', icon: 'business' },
  { label: 'העלאת קבצים', icon: 'upload_file' },
  { label: 'סיכום', icon: 'check_circle' },
] as const;

const INSURANCE_COMPANIES = [
  { id: 'harel', name: 'הראל', initials: 'הר' },
  { id: 'migdal', name: 'מגדל', initials: 'מג' },
  { id: 'phoenix', name: 'הפניקס', initials: 'הפ' },
  { id: 'clal', name: 'כלל', initials: 'כל' },
  { id: 'menora', name: 'מנורה מבטחים', initials: 'מנ' },
  { id: 'hachshara', name: 'הכשרה', initials: 'הכ' },
  { id: 'altshuler', name: 'אלטשולר שחם', initials: 'אש' },
  { id: 'meitav', name: 'מיטב דש', initials: 'מד' },
  { id: 'psagot', name: 'פסגות', initials: 'פס' },
  { id: 'analyst', name: 'אנליסט', initials: 'אנ' },
] as const;

interface UploadStatus {
  fileName: string;
  status: 'uploading' | 'completed' | 'error';
  recordCount: number;
  errorMessage?: string;
}

/* ───────── Main Component ───────── */

export default function OnboardingPage() {
  const navigate = useNavigate();
  const profile = useAuthStore((s) => s.profile);
  const completeOnboarding = useAuthStore((s) => s.completeOnboarding);
  const addUpload = useDataStore((s) => s.addUpload);

  const [currentStep, setCurrentStep] = useState(1);
  const [direction, setDirection] = useState<'next' | 'back'>('next');
  const [animating, setAnimating] = useState(false);
  const [showSkipDialog, setShowSkipDialog] = useState(false);

  // Step 2 — Agent profile
  const [licenseNumber, setLicenseNumber] = useState(profile?.licenseNumber || '');
  const [taxId, setTaxId] = useState('');
  const taxStatus = 'self_employed' as const;
  const [phone, setPhone] = useState(profile?.phone || '');
  const [step2Errors, setStep2Errors] = useState<Record<string, string>>({});

  // Step 3 — Companies
  const [selectedCompanies, setSelectedCompanies] = useState<Set<string>>(new Set());

  // Step 4 — Uploads
  const [uploadStatus, setUploadStatus] = useState<Record<string, UploadStatus[]>>({});
  const [activeCompanyTab, setActiveCompanyTab] = useState('');

  // Set initial active tab when entering step 4
  useEffect(() => {
    if (currentStep === 4 && selectedCompanies.size > 0 && !activeCompanyTab) {
      setActiveCompanyTab([...selectedCompanies][0]);
    }
  }, [currentStep, selectedCompanies, activeCompanyTab]);

  // Block Escape from accidentally leaving
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (showSkipDialog) {
          setShowSkipDialog(false);
        } else if (currentStep > 1) {
          goBack();
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  // Block browser back
  useEffect(() => {
    function handlePopState(e: PopStateEvent) {
      e.preventDefault();
      window.history.pushState(null, '', '/onboarding');
      if (currentStep > 1) {
        goBack();
      }
    }
    window.history.pushState(null, '', '/onboarding');
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  });

  /* ───── Navigation ───── */

  function goNext() {
    if (animating) return;
    setDirection('next');
    setAnimating(true);
    setTimeout(() => {
      setCurrentStep((s) => Math.min(s + 1, 5));
      setAnimating(false);
    }, 250);
  }

  function goBack() {
    if (animating || currentStep <= 1) return;
    setDirection('back');
    setAnimating(true);
    setTimeout(() => {
      setCurrentStep((s) => Math.max(s - 1, 1));
      setAnimating(false);
    }, 250);
  }

  function skipAll() {
    completeOnboarding();
    navigate('/dashboard', { replace: true });
  }

  function finish() {
    completeOnboarding();
    navigate('/dashboard', { replace: true });
  }

  /* ───── Step 2 Validation ───── */

  function validateStep2(): boolean {
    const errors: Record<string, string> = {};
    if (!licenseNumber.trim()) errors.licenseNumber = 'שדה חובה';
    if (!taxId.trim()) errors.taxId = 'שדה חובה';
    else if (!/^\d{9}$/.test(taxId.replace(/\D/g, ''))) errors.taxId = 'יש להזין 9 ספרות';
    if (!phone.trim()) errors.phone = 'שדה חובה';
    else if (!/^05\d-?\d{7}$/.test(phone)) errors.phone = 'מספר טלפון לא תקין';
    setStep2Errors(errors);
    return Object.keys(errors).length === 0;
  }

  function handleStep2Next() {
    if (validateStep2()) goNext();
  }

  /* ───── Step 3 Helpers ───── */

  function toggleCompany(id: string) {
    setSelectedCompanies((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selectedCompanies.size === INSURANCE_COMPANIES.length) {
      setSelectedCompanies(new Set());
    } else {
      setSelectedCompanies(new Set(INSURANCE_COMPANIES.map((c) => c.id)));
    }
  }

  /* ───── Step 4 Upload ───── */

  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleUpload = useCallback(async (companyId: string, file: File) => {
    const ext = file.name.toLowerCase();
    if (!ext.endsWith('.xls') && !ext.endsWith('.xlsx') && !ext.endsWith('.csv')) return;

    // Mark uploading
    setUploadStatus((prev) => ({
      ...prev,
      [companyId]: [...(prev[companyId] || []), { fileName: file.name, status: 'uploading', recordCount: 0 }],
    }));

    const idx = (uploadStatus[companyId] || []).length;

    try {
      const formData = new FormData();
      formData.append('file', file);

      const token = localStorage.getItem('agora-token');
      const response = await fetch('/api/v1/uploads/parse', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      const json = await response.json();

      if (!response.ok) {
        setUploadStatus((prev) => {
          const list = [...(prev[companyId] || [])];
          list[idx] = { fileName: file.name, status: 'error', recordCount: 0, errorMessage: json.error || 'שגיאה' };
          return { ...prev, [companyId]: list };
        });
        addUpload({
          id: crypto.randomUUID(),
          fileName: file.name,
          company: INSURANCE_COMPANIES.find((c) => c.id === companyId)?.name || companyId,
          date: new Date().toLocaleDateString('he-IL'),
          records: 0,
          status: 'error',
        });
        return;
      }

      const results = json.data as { records: unknown[] }[];
      const totalRecords = results.reduce((s: number, r) => s + r.records.length, 0);

      setUploadStatus((prev) => {
        const list = [...(prev[companyId] || [])];
        list[idx] = { fileName: file.name, status: 'completed', recordCount: totalRecords };
        return { ...prev, [companyId]: list };
      });

      addUpload({
        id: crypto.randomUUID(),
        fileName: file.name,
        company: INSURANCE_COMPANIES.find((c) => c.id === companyId)?.name || companyId,
        date: new Date().toLocaleDateString('he-IL'),
        records: totalRecords,
        status: totalRecords > 0 ? 'completed' : 'error',
      } as UploadRow);
    } catch {
      setUploadStatus((prev) => {
        const list = [...(prev[companyId] || [])];
        list[idx] = { fileName: file.name, status: 'error', recordCount: 0, errorMessage: 'לא ניתן להתחבר לשרת' };
        return { ...prev, [companyId]: list };
      });
    }
  }, [uploadStatus, addUpload]);

  /* ───── Summary Stats ───── */

  const companiesConnected = selectedCompanies.size;
  const filesUploaded = Object.values(uploadStatus).flat().filter((u) => u.status === 'completed').length;
  const totalRecords = Object.values(uploadStatus).flat().reduce((s, u) => s + u.recordCount, 0);

  /* ───── Slide Animation Classes ───── */

  const slideClass = animating
    ? direction === 'next'
      ? 'opacity-0 translate-x-8'
      : 'opacity-0 -translate-x-8'
    : 'opacity-100 translate-x-0';

  /* ───────── RENDER ───────── */

  return (
    <div className="min-h-screen bg-surface flex flex-col" dir="rtl">
      {/* Top gradient bar */}
      <div className="h-1.5 editorial-gradient w-full shrink-0" />

      {/* Skip dialog */}
      {showSkipDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/40">
          <div className="bg-surface-container-lowest rounded-lg shadow-editorial p-8 max-w-md mx-4 space-y-4">
            <h3 className="font-headline text-xl font-bold text-on-surface">בטוח?</h3>
            <p className="text-on-surface-variant leading-relaxed">
              תוכל להשלים את ההגדרות בכל עת מדף ההגדרות.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowSkipDialog(false)}
                className="flex-1 py-3 rounded-lg font-bold text-primary bg-surface-container-high hover:bg-surface-container-highest transition-colors"
              >
                חזרה להגדרה
              </button>
              <button
                onClick={skipAll}
                className="flex-1 py-3 rounded-lg font-bold text-on-primary editorial-gradient hover:opacity-90 transition-opacity"
              >
                דלג והמשך
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        {/* Card wrapper */}
        <div className="w-full max-w-2xl">
          {/* Progress bar */}
          <div className="mb-8">
            <div className="flex items-center justify-between relative">
              {/* Connecting line */}
              <div className="absolute top-4 right-4 left-4 h-0.5 bg-surface-container-high z-0" />
              <div
                className="absolute top-4 right-4 h-0.5 bg-secondary z-0 transition-all duration-500"
                style={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` }}
              />

              {STEPS.map((step, i) => {
                const stepNum = i + 1;
                const isCompleted = stepNum < currentStep;
                const isCurrent = stepNum === currentStep;
                return (
                  <div key={stepNum} className="flex flex-col items-center z-10">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500 ${
                        isCompleted
                          ? 'bg-secondary text-on-secondary'
                          : isCurrent
                            ? 'bg-primary text-on-primary ring-4 ring-primary/20'
                            : 'bg-surface-container-high text-on-surface-variant'
                      }`}
                    >
                      {isCompleted ? <Icon name="check" size="sm" /> : stepNum}
                    </div>
                    <span className="hidden sm:block mt-2 text-[10px] font-label font-semibold uppercase tracking-widest text-on-surface-variant">
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="sm:hidden text-center mt-3 text-xs font-medium text-on-surface-variant">
              שלב {currentStep} מתוך 5 — {STEPS[currentStep - 1].label}
            </p>
          </div>

          {/* Card */}
          <div className="bg-surface-container-lowest rounded-lg shadow-editorial p-6 sm:p-10">
            <div className={`transition-all duration-250 ${slideClass}`}>
              {currentStep === 1 && <StepWelcome userName={profile?.name || ''} onNext={goNext} onSkip={() => setShowSkipDialog(true)} />}
              {currentStep === 2 && (
                <StepAgentProfile
                  licenseNumber={licenseNumber}
                  setLicenseNumber={setLicenseNumber}
                  taxId={taxId}
                  setTaxId={setTaxId}
                  taxStatus={taxStatus}
                  phone={phone}
                  setPhone={setPhone}
                  errors={step2Errors}
                  onNext={handleStep2Next}
                  onBack={goBack}
                />
              )}
              {currentStep === 3 && (
                <StepCompanies
                  selectedCompanies={selectedCompanies}
                  onToggle={toggleCompany}
                  onToggleAll={toggleAll}
                  onNext={goNext}
                  onBack={goBack}
                />
              )}
              {currentStep === 4 && (
                <StepUpload
                  selectedCompanies={selectedCompanies}
                  activeTab={activeCompanyTab}
                  setActiveTab={setActiveCompanyTab}
                  uploadStatus={uploadStatus}
                  onUpload={handleUpload}
                  fileInputRef={fileInputRef}
                  onNext={goNext}
                  onBack={goBack}
                />
              )}
              {currentStep === 5 && (
                <StepSummary
                  companiesConnected={companiesConnected}
                  filesUploaded={filesUploaded}
                  totalRecords={totalRecords}
                  onComplete={finish}
                />
              )}
            </div>
          </div>

          {/* Skip link — not on step 5 */}
          {currentStep < 5 && currentStep > 1 && (
            <div className="text-center mt-4">
              <button
                onClick={() => setShowSkipDialog(true)}
                className="text-sm text-on-surface-variant hover:text-primary transition-colors"
              >
                דלג על ההגדרה
              </button>
            </div>
          )}
        </div>

        {/* Bottom logo */}
        <div className="fixed bottom-4 left-4 flex items-center gap-2 text-on-surface-variant/40">
          <Icon name="account_balance_wallet" size="sm" />
          <span className="text-xs font-headline font-bold">Agora</span>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   STEP 1 — Welcome
   ═══════════════════════════════════════════════════════ */

function StepWelcome({ userName, onNext, onSkip }: { userName: string; onNext: () => void; onSkip: () => void }) {
  const benefits = [
    { icon: 'calculate', text: 'חישוב עמלות אוטומטי — בלי אקסלים, בלי טעויות' },
    { icon: 'verified_user', text: 'השוואה מול דוחות חברות הביטוח בלחיצה' },
    { icon: 'trending_up', text: 'תמונה ברורה של ההכנסות שלך — חודש בחודש' },
  ];

  return (
    <div className="text-center space-y-8">
      <div>
        {userName && (
          <p className="text-on-surface-variant font-medium mb-2">שלום, {userName}</p>
        )}
        <h1 className="font-headline text-3xl sm:text-4xl font-black text-on-surface tracking-tight mb-3">
          הכסף שלך. החישוב שלנו.
        </h1>
        <p className="text-on-surface-variant font-body text-lg leading-relaxed max-w-lg mx-auto">
          בוא נגדיר את החשבון שלך ב-3 דקות — ותתחיל לראות בדיוק כמה מגיע לך מכל פוליסה.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {benefits.map((b) => (
          <div key={b.icon} className="bg-surface-container-low rounded-lg p-5 text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-primary-fixed flex items-center justify-center">
              <Icon name={b.icon} className="text-primary" />
            </div>
            <p className="text-sm font-medium text-on-surface leading-relaxed">{b.text}</p>
          </div>
        ))}
      </div>

      <div className="space-y-3 pt-2">
        <button
          onClick={onNext}
          className="w-full sm:w-auto editorial-gradient text-on-primary font-headline font-bold py-4 px-12 rounded-lg shadow-editorial-btn hover:shadow-editorial transition-all"
        >
          בואו נתחיל
        </button>
        <div>
          <button
            onClick={onSkip}
            className="text-sm text-on-surface-variant hover:text-primary transition-colors"
          >
            אני מכיר את המערכת, קח אותי לדשבורד
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   STEP 2 — Agent Profile
   ═══════════════════════════════════════════════════════ */

interface StepAgentProfileProps {
  licenseNumber: string;
  setLicenseNumber: (v: string) => void;
  taxId: string;
  setTaxId: (v: string) => void;
  taxStatus: 'self_employed' | 'employee';
  phone: string;
  setPhone: (v: string) => void;
  errors: Record<string, string>;
  onNext: () => void;
  onBack: () => void;
}

function StepAgentProfile({
  licenseNumber, setLicenseNumber,
  taxId, setTaxId,
  phone, setPhone,
  errors,
  onNext, onBack,
}: StepAgentProfileProps) {
  const inputClass = (field: string) =>
    `w-full bg-surface-container-high border-none rounded-lg p-4 focus:ring-2 focus:ring-primary/40 transition-all text-on-surface font-medium ${
      errors[field] ? 'ring-2 ring-error/40' : ''
    }`;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-headline text-2xl font-bold text-on-surface mb-2">קצת עליך</h2>
        <p className="text-on-surface-variant leading-relaxed">
          הפרטים האלה נדרשים כדי להתאים את חישוב העמלות למבנה העסק שלך.
        </p>
      </div>

      <div className="space-y-5">
        {/* License Number */}
        <div>
          <label className="text-xs font-label font-semibold uppercase tracking-wider text-on-surface-variant block mb-2">
            מספר רישיון סוכן
          </label>
          <input
            type="text"
            className={inputClass('licenseNumber')}
            placeholder="052-XXXXXX-X"
            value={licenseNumber}
            onChange={(e) => setLicenseNumber(e.target.value)}
          />
          {errors.licenseNumber && <p className="text-error text-xs mt-1">{errors.licenseNumber}</p>}
        </div>

        {/* Tax ID */}
        <div>
          <label className="text-xs font-label font-semibold uppercase tracking-wider text-on-surface-variant block mb-2">
            ת.ז / ח.פ
          </label>
          <input
            type="text"
            className={inputClass('taxId')}
            placeholder="9 ספרות"
            maxLength={9}
            value={taxId}
            onChange={(e) => setTaxId(e.target.value.replace(/\D/g, ''))}
          />
          {errors.taxId && <p className="text-error text-xs mt-1">{errors.taxId}</p>}
        </div>


        {/* Phone */}
        <div>
          <label className="text-xs font-label font-semibold uppercase tracking-wider text-on-surface-variant block mb-2">
            טלפון
          </label>
          <input
            type="tel"
            className={inputClass('phone')}
            placeholder="054-XXXXXXX"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          {errors.phone && <p className="text-error text-xs mt-1">{errors.phone}</p>}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-on-surface-variant font-medium hover:text-primary transition-colors"
        >
          <Icon name="arrow_forward" size="sm" />
          חזרה
        </button>
        <button
          onClick={onNext}
          className="editorial-gradient text-on-primary font-headline font-bold py-3 px-8 rounded-lg shadow-editorial-btn hover:shadow-editorial transition-all"
        >
          המשך
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   STEP 3 — Insurance Companies
   ═══════════════════════════════════════════════════════ */

interface StepCompaniesProps {
  selectedCompanies: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  onNext: () => void;
  onBack: () => void;
}

function StepCompanies({ selectedCompanies, onToggle, onToggleAll, onNext, onBack }: StepCompaniesProps) {
  const allSelected = selectedCompanies.size === INSURANCE_COMPANIES.length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-headline text-2xl font-bold text-on-surface mb-2">עם מי אתה עובד?</h2>
        <p className="text-on-surface-variant leading-relaxed">
          סמן את חברות הביטוח ובתי ההשקעות שמהם אתה מקבל עמלות.
        </p>
      </div>

      {/* Select all */}
      <div className="flex items-center justify-between">
        <button
          onClick={onToggleAll}
          className="text-sm font-medium text-primary hover:underline transition-colors"
        >
          {allSelected ? 'בטל הכל' : 'בחר הכל'}
        </button>
        <span className="text-sm font-medium text-on-surface-variant">
          {selectedCompanies.size} חברות נבחרו
        </span>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {INSURANCE_COMPANIES.map((company) => {
          const isSelected = selectedCompanies.has(company.id);
          return (
            <button
              key={company.id}
              onClick={() => onToggle(company.id)}
              className={`relative rounded-lg p-5 text-center transition-all duration-200 cursor-pointer ${
                isSelected
                  ? 'bg-primary-fixed-dim/30 text-primary ring-2 ring-primary scale-[1.02]'
                  : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              {isSelected && (
                <div className="absolute top-2 left-2">
                  <Icon name="check_circle" size="sm" className="text-secondary" filled />
                </div>
              )}
              <div
                className={`w-10 h-10 mx-auto rounded-full flex items-center justify-center text-sm font-bold mb-2 ${
                  isSelected ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface-variant'
                }`}
              >
                {company.initials}
              </div>
              <span className="text-sm font-bold block">{company.name}</span>
            </button>
          );
        })}
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-on-surface-variant font-medium hover:text-primary transition-colors"
        >
          <Icon name="arrow_forward" size="sm" />
          חזרה
        </button>
        <button
          onClick={onNext}
          disabled={selectedCompanies.size === 0}
          className={`font-headline font-bold py-3 px-8 rounded-lg transition-all ${
            selectedCompanies.size === 0
              ? 'bg-surface-container-high text-on-surface-variant opacity-60 cursor-not-allowed'
              : 'editorial-gradient text-on-primary shadow-editorial-btn hover:shadow-editorial'
          }`}
        >
          המשך
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   STEP 4 — File Upload
   ═══════════════════════════════════════════════════════ */

interface StepUploadProps {
  selectedCompanies: Set<string>;
  activeTab: string;
  setActiveTab: (id: string) => void;
  uploadStatus: Record<string, UploadStatus[]>;
  onUpload: (companyId: string, file: File) => Promise<void>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onNext: () => void;
  onBack: () => void;
}

function StepUpload({
  selectedCompanies, activeTab, setActiveTab,
  uploadStatus, onUpload, fileInputRef,
  onNext, onBack,
}: StepUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const companies = INSURANCE_COMPANIES.filter((c) => selectedCompanies.has(c.id));
  const isUploading = Object.values(uploadStatus).flat().some((u) => u.status === 'uploading');

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave() {
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0 && activeTab) onUpload(activeTab, files[0]);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length > 0 && activeTab) onUpload(activeTab, files[0]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  const activeUploads = uploadStatus[activeTab] || [];
  const uploadedCompanies = companies.filter((c) => (uploadStatus[c.id] || []).some((u) => u.status === 'completed')).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-headline text-2xl font-bold text-on-surface mb-2">העלאת קבצים</h2>
        <p className="text-on-surface-variant leading-relaxed">
          העלה הסכם עמלות (מכסה את כל החברות) ו/או דוחות חודשיים לפי חברה.
        </p>
      </div>

      {/* Agreement download */}
      <div className="rounded-xl border border-outline-variant bg-surface-container-low p-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary-fixed text-primary">
            <Icon name="contract" size="sm" />
          </div>
          <div>
            <p className="font-bold text-on-surface text-sm">הסכם עמלות — כל החברות בקובץ אחד</p>
            <p className="text-xs text-on-surface-variant">הורד את הקובץ, מלא את השיעורים והעלה במסך העלאות</p>
          </div>
        </div>
        <a
          href="/api/v1/rates/sample"
          download="agora_sample_commission_agreement.xlsx"
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-on-primary text-xs font-bold hover:shadow-md transition-all shrink-0"
        >
          <Icon name="download" size="sm" />
          הורד דוגמה
        </a>
      </div>

      {/* Progress */}
      {companies.length > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-medium text-on-surface-variant">
            <span>הועלו קבצים ל-{uploadedCompanies} מתוך {companies.length} חברות</span>
            <span>{companies.length > 0 ? Math.round((uploadedCompanies / companies.length) * 100) : 0}%</span>
          </div>
          <div className="h-2 bg-surface-container-high rounded-full overflow-hidden">
            <div
              className="h-full bg-secondary rounded-full transition-all duration-500"
              style={{ width: `${companies.length > 0 ? (uploadedCompanies / companies.length) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {/* Company tabs */}
      {companies.length > 0 ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {companies.map((c) => {
            const uploads = uploadStatus[c.id] || [];
            const hasSuccess = uploads.some((u) => u.status === 'completed');
            const hasError = uploads.some((u) => u.status === 'error') && !hasSuccess;
            const isCurrent = activeTab === c.id;

            return (
              <button
                key={c.id}
                onClick={() => setActiveTab(c.id)}
                className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  isCurrent
                    ? 'bg-primary-container text-on-primary-container'
                    : hasSuccess
                      ? 'bg-secondary-container/20 text-secondary'
                      : hasError
                        ? 'bg-error-container/20 text-error'
                        : 'bg-surface-container-high text-on-surface-variant'
                }`}
              >
                {hasSuccess && <Icon name="check_circle" size="sm" className="text-secondary" />}
                {hasError && <Icon name="error" size="sm" className="text-error" />}
                {!hasSuccess && !hasError && <span className="w-2 h-2 rounded-full bg-surface-container-highest" />}
                {c.name}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="bg-surface-container-low rounded-lg p-6 text-center text-on-surface-variant">
          לא נבחרו חברות ביטוח. ניתן לחזור לשלב הקודם או להמשיך.
        </div>
      )}

      {/* Drop zone */}
      {activeTab && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xls,.xlsx"
            className="hidden"
            onChange={handleFileSelect}
          />
          <div
            className={`border-2 border-dashed rounded-lg p-8 sm:p-12 flex flex-col items-center justify-center text-center space-y-3 cursor-pointer group transition-colors ${
              isDragging
                ? 'border-primary bg-primary-fixed/30'
                : 'border-outline-variant hover:bg-primary-fixed/20'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="w-14 h-14 bg-primary-fixed rounded-full flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
              <Icon name="cloud_upload" size="lg" />
            </div>
            <h3 className="text-lg font-bold text-primary">גרור ושחרר קבצים כאן</h3>
            <p className="text-on-surface-variant text-sm">
              XLS, XLSX, CSV
            </p>
            <div className="flex gap-2">
              <span className="bg-primary-fixed text-primary text-xs font-bold px-3 py-1 rounded-full">.xls</span>
              <span className="bg-primary-fixed text-primary text-xs font-bold px-3 py-1 rounded-full">.xlsx</span>
              <span className="bg-surface-container-high text-on-surface-variant text-xs font-bold px-3 py-1 rounded-full">.csv</span>
            </div>
            <div className="flex gap-2 mt-2">
              <button
                className="bg-primary text-on-primary px-6 py-2.5 rounded-lg font-bold text-sm hover:shadow-lg transition-all"
                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
              >
                בחר קובץ מהמחשב
              </button>
            </div>
          </div>

          {/* Uploaded files list */}
          {activeUploads.length > 0 && (
            <div className="space-y-2">
              {activeUploads.map((upload, i) => (
                <div
                  key={i}
                  className={`rounded-lg p-4 flex items-center gap-3 ${
                    upload.status === 'completed'
                      ? 'bg-secondary-container/10 border-s-4 border-secondary'
                      : upload.status === 'error'
                        ? 'bg-error-container/10 border-s-4 border-error'
                        : 'bg-primary-fixed/10 border-s-4 border-primary'
                  }`}
                >
                  {upload.status === 'uploading' && (
                    <div className="w-5 h-5 rounded-full border-2 border-primary/20 border-t-primary animate-spin shrink-0" />
                  )}
                  {upload.status === 'completed' && <Icon name="check_circle" size="sm" className="text-secondary shrink-0" />}
                  {upload.status === 'error' && <Icon name="error" size="sm" className="text-error shrink-0" />}
                  <span className="text-sm font-medium text-on-surface truncate flex-1">{upload.fileName}</span>
                  {upload.status === 'completed' && (
                    <span className="text-xs text-on-surface-variant shrink-0">{upload.recordCount.toLocaleString()} רשומות</span>
                  )}
                  {upload.status === 'error' && upload.errorMessage && (
                    <span className="text-xs text-error shrink-0">{upload.errorMessage}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Navigation */}
      <div className="flex justify-between items-center pt-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-on-surface-variant font-medium hover:text-primary transition-colors"
        >
          <Icon name="arrow_forward" size="sm" />
          חזרה
        </button>
        <div className="flex items-center gap-4">
          <button
            onClick={onNext}
            className="text-sm text-on-surface-variant hover:text-primary transition-colors"
          >
            אדלג ואעלה אחר כך
          </button>
          <button
            onClick={onNext}
            disabled={isUploading}
            className={`font-headline font-bold py-3 px-8 rounded-lg transition-all ${
              isUploading
                ? 'bg-surface-container-high text-on-surface-variant opacity-60 cursor-not-allowed'
                : 'editorial-gradient text-on-primary shadow-editorial-btn hover:shadow-editorial'
            }`}
          >
            המשך
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   STEP 5 — Summary
   ═══════════════════════════════════════════════════════ */

interface StepSummaryProps {
  companiesConnected: number;
  filesUploaded: number;
  totalRecords: number;
  onComplete: () => void;
}

function StepSummary({ companiesConnected, filesUploaded, totalRecords, onComplete }: StepSummaryProps) {
  const stats = [
    { icon: 'business', label: 'חברות מחוברות', value: companiesConnected.toString() },
    { icon: 'upload_file', label: 'קבצים שהועלו', value: filesUploaded.toString() },
    { icon: 'receipt_long', label: 'רשומות שנקלטו', value: totalRecords.toLocaleString() },
  ];

  const nextSteps = [
    'צפה בדשבורד לראות סיכום העמלות שלך',
    'העלה קבצים נוספים מדף ההעלאות בכל עת',
    'עקוב אחר פוליסות ועמלות חודש בחודש',
  ];

  return (
    <div className="space-y-8 text-center">
      <div>
        <div className="w-16 h-16 mx-auto rounded-full bg-secondary-container flex items-center justify-center mb-4">
          <Icon name="celebration" size="lg" className="text-secondary" />
        </div>
        <h2 className="font-headline text-3xl font-black text-on-surface mb-2">הכל מוכן</h2>
        <p className="text-on-surface-variant leading-relaxed">
          החשבון שלך מוגדר. מכאן המערכת עובדת בשבילך.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {stats.map((s) => (
          <div key={s.icon} className="bg-surface-container-low rounded-lg p-5 space-y-2">
            <Icon name={s.icon} className="text-primary mx-auto" />
            <div className="text-2xl font-headline font-black text-on-surface">{s.value}</div>
            <div className="text-xs text-on-surface-variant font-medium">{s.label}</div>
          </div>
        ))}
      </div>

      {/* What's next */}
      <div className="bg-surface-container-low rounded-lg p-6 text-right space-y-3">
        <h3 className="font-bold text-on-surface flex items-center gap-2">
          <Icon name="lightbulb" size="sm" className="text-primary" />
          מה הלאה?
        </h3>
        <ul className="space-y-2">
          {nextSteps.map((step, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-on-surface-variant">
              <Icon name="arrow_back" size="sm" className="text-secondary shrink-0 mt-0.5" />
              {step}
            </li>
          ))}
        </ul>
      </div>

      {/* CTA */}
      <button
        onClick={onComplete}
        className="w-full sm:w-auto bg-secondary text-on-secondary font-headline font-bold py-4 px-12 rounded-lg shadow-editorial-btn hover:shadow-editorial transition-all text-lg"
      >
        קח אותי לדשבורד
      </button>
    </div>
  );
}
