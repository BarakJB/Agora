import { useRef, useState, useMemo } from 'react';
import Icon from '../components/ui/Icon';
import { useDataStore } from '../store/dataStore';

interface ParsedRecord {
  reportType: string;
  agentNumber: string | null;
  agentName: string | null;
  processingMonth: string;
  branch: string;
  subBranch: string;
  productName: string;
  insuredName: string;
  insuredId: string;
  policyNumber: string;
  premium: number;
  commission: number;
  collectionFee: number;
  paymentAmount: number;
  accumulationBalance: number;
  managementFeePct: number;
  managementFeeAmount: number;
  amountBeforeVat: number;
  amountWithVat: number;
  employerName: string;
  fundType: string;
  planType: string;
}

interface ParseResult {
  reportType: string;
  sheetName: string;
  records: ParsedRecord[];
  errors: { row: number; message: string }[];
  detectedCompany: string | null;
}

interface ParseMeta {
  detectedCompany: string | null;
  agentNumber: string | null;
  agentTaxId: string | null;
  totalRecords: number;
  totalErrors: number;
  isAgreement: boolean;
  skippedDueMismatch: number;
  mismatchWarning: string | null;
}

const REPORT_TYPE_LABELS: Record<string, string> = {
  nifraim: 'נפרעים — עמלות שוטפות על פרמיות',
  hekef: 'היקף / נפרעים — עמלות חד-פעמיות',
  accumulation_nifraim: 'נפרעים צבירה — גמל/השתלמות',
  accumulation_hekef: 'היקף צבירה — תגמול על ניוד גמל/השתלמות',
  branch_distribution: 'התפלגות ענפים — סיכום לפי ענף',
  agent_data: 'רשימת נתונים לסוכן — מוצרי צבירה',
  product_distribution: 'התפלגות מוצרים — סיכום כולל',
};

export default function CommissionUploadPage() {
  const uploads = useDataStore((s) => s.uploads);
  const addUpload = useDataStore((s) => s.addUpload);
  const policies = useDataStore((s) => s.policies);

  const contractRates = useMemo(() => {
    const map = new Map<string, { hekef: number[]; nifraim: number[] }>();
    for (const p of policies) {
      if (!map.has(p.productTypeHe)) map.set(p.productTypeHe, { hekef: [], nifraim: [] });
      const entry = map.get(p.productTypeHe)!;
      if (p.commissionPct > 0) entry.hekef.push(p.commissionPct);
      if (p.recurringPct > 0) entry.nifraim.push(p.recurringPct);
    }
    return Array.from(map.entries()).map(([type, { hekef, nifraim }]) => ({
      type,
      hekef: hekef.length ? Math.max(...hekef) : null,
      nifraim: nifraim.length ? Math.max(...nifraim) : null,
    }));
  }, [policies]);

  const [isDragging, setIsDragging] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parseResults, setParseResults] = useState<ParseResult[] | null>(null);
  const [parseMeta, setParseMeta] = useState<ParseMeta | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    if (files.length > 0) processFile(files[0]);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length > 0) processFile(files[0]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function processFile(file: File) {
    const ext = file.name.toLowerCase();
    const isExcel = ext.endsWith('.xls') || ext.endsWith('.xlsx');
    const isCsv = ext.endsWith('.csv');
    const isZip = ext.endsWith('.zip');

    if (!isExcel && !isCsv && !isZip) {
      setParseError('יש להעלות קובץ מסוג XLS, XLSX, ZIP, או CSV בלבד');
      return;
    }

    await parseExcelFile(file);
  }

  async function parseExcelFile(file: File) {
    setParsing(true);
    setParseError(null);
    setParseResults(null);
    setParseMeta(null);

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
        setParseError(json.error || 'שגיאה בפרסור הקובץ');
        addUpload({
          id: crypto.randomUUID(),
          fileName: file.name,
          company: selectedCompany || 'זוהה אוטומטית',
          date: new Date().toLocaleDateString('he-IL'),
          records: 0,
          status: 'error',
        });
        return;
      }

      const results = json.data as ParseResult[];
      setParseResults(results);

      const totalRecords = results.reduce((s: number, r: ParseResult) => s + r.records.length, 0);
      const detectedCompany = (json.meta?.detectedCompany as string | null)
        ?? results.find((r) => r.detectedCompany)?.detectedCompany ?? null;
      const company = selectedCompany || detectedCompany || 'זוהה אוטומטית';

      // Extract agent number from first record that has it
      const firstAgentNumber = results
        .flatMap((r) => r.records)
        .find((rec) => rec.agentNumber)?.agentNumber ?? json.meta?.agentNumber ?? null;

      setParseMeta({
        detectedCompany: company,
        agentNumber: firstAgentNumber,
        agentTaxId: json.meta?.agentTaxId ?? null,
        totalRecords,
        totalErrors: results.reduce((s: number, r: ParseResult) => s + r.errors.length, 0),
        isAgreement: json.meta?.isAgreement ?? false,
        skippedDueMismatch: json.meta?.skippedDueMismatch ?? 0,
        mismatchWarning: json.meta?.mismatchWarning ?? null,
      });

      // Auto-set company if detected and not already selected
      if (detectedCompany && !selectedCompany) {
        setSelectedCompany(detectedCompany);
      }

      addUpload({
        id: crypto.randomUUID(),
        fileName: file.name,
        company,
        date: new Date().toLocaleDateString('he-IL'),
        records: totalRecords,
        status: totalRecords > 0 ? 'completed' : 'error',
      });
    } catch {
      setParseError('לא ניתן להתחבר לשרת. ודא שהשרת פועל (npm run dev:server)');
      addUpload({
        id: crypto.randomUUID(),
        fileName: file.name,
        company: selectedCompany || 'לא צוין',
        date: new Date().toLocaleDateString('he-IL'),
        records: 0,
        status: 'error',
      });
    } finally {
      setParsing(false);
    }
  }

  function downloadSampleAgreement() {
    const a = document.createElement('a');
    a.href = '/api/v1/rates/sample';
    a.download = 'agora_sample_commission_agreement.xlsx';
    a.click();
  }

  const fmt = (n: number) => n.toLocaleString('he-IL', { maximumFractionDigits: 2 });

  return (
    <div className="p-8 bg-surface min-h-screen">
      <header className="flex flex-col lg:flex-row justify-between lg:items-center mb-8 gap-4">
        <div>
          <h2 className="font-headline text-3xl lg:text-4xl font-extrabold text-on-surface tracking-tighter mb-1">
            העלאת קובצי עמלות
          </h2>
          <p className="text-on-surface-variant font-medium">
            קליטת דוחות עמלות מחברות ביטוח — XLS, XLSX, CSV
          </p>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-8">
        {/* Main Upload */}
        <div className="col-span-12 lg:col-span-8 space-y-8">
          <div className="bg-surface-container-lowest p-8 rounded-lg shadow-editorial">
            <div className="flex flex-col gap-6">

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xls,.xlsx,.zip"
                className="hidden"
                onChange={handleFileSelect}
              />

              {/* Drag & Drop */}
              <div
                className={`border-2 border-dashed rounded-lg p-12 flex flex-col items-center justify-center text-center space-y-4 cursor-pointer group transition-colors ${
                  isDragging
                    ? 'border-primary bg-primary-fixed/30'
                    : 'border-outline-variant hover:bg-primary-fixed/20'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                {parsing ? (
                  <>
                    <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                    <h3 className="text-xl font-bold text-primary">מפרסר את הקובץ...</h3>
                    <p className="text-on-surface-variant">מזהה סוג דוח ומחלץ נתונים</p>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 bg-primary-fixed rounded-full flex items-center justify-center text-primary mb-2 group-hover:scale-110 transition-transform">
                      <Icon name="cloud_upload" size="lg" />
                    </div>
                    <h3 className="text-xl font-bold text-primary">גרור ושחרר קבצים כאן</h3>
                    <p className="text-on-surface-variant max-w-sm">
                      תמיכה בקבצי <strong>XLS, XLSX</strong> (הראל, הפניקס, אנליסט), <strong>ZIP</strong> (מנורה) ו-<strong>CSV</strong>.
                      המערכת מזהה אוטומטית את חברת הביטוח וסוג הדוח.
                    </p>
                    <div className="flex gap-3 mt-4">
                      <span className="bg-primary-fixed text-primary text-xs font-bold px-3 py-1 rounded-full">.xls</span>
                      <span className="bg-primary-fixed text-primary text-xs font-bold px-3 py-1 rounded-full">.xlsx</span>
                      <span className="bg-primary-fixed text-primary text-xs font-bold px-3 py-1 rounded-full">.zip</span>
                      <span className="bg-surface-container-high text-on-surface-variant text-xs font-bold px-3 py-1 rounded-full">.csv</span>
                    </div>
                    <button
                      className="mt-4 bg-primary text-on-primary px-8 py-3 rounded-lg font-bold hover:shadow-lg transition-all"
                      onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    >
                      בחר קובץ מהמחשב
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Parse Error */}
          {parseError && (
            <div className="bg-error-container text-on-error-container p-6 rounded-lg flex items-start gap-4">
              <Icon name="error" className="mt-0.5" />
              <div>
                <p className="font-bold mb-1">שגיאה בעיבוד הקובץ</p>
                <p className="text-sm">{parseError}</p>
              </div>
            </div>
          )}

          {/* Parse Results */}
          {parseResults && parseResults.length > 0 && (
            <section className="space-y-6">
              <div className="flex items-center gap-3">
                <Icon name="check_circle" className="text-secondary" />
                <h3 className="text-lg font-bold text-on-surface">
                  זוהו {parseResults.length} דוחות —{' '}
                  {parseResults.reduce((s, r) => s + r.records.length, 0).toLocaleString()} רשומות
                </h3>
              </div>

              {/* Summary card */}
              {parseMeta && (
                <div className="bg-secondary-container/30 border border-secondary/20 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Icon name="badge" className="text-secondary text-lg" />
                    <span className="font-bold text-on-surface text-sm">
                      {parseMeta.isAgreement ? 'פרטי הסכם עמלות' : 'פרטי דוח עמלות'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-headline">חברת ביטוח</p>
                      <p className="font-bold text-on-surface">{parseMeta.detectedCompany || '—'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-headline">מספר סוכן</p>
                      <p className="font-bold text-on-surface font-mono">{parseMeta.agentNumber || '—'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-headline">ת.ז. סוכן</p>
                      <p className="font-bold text-on-surface font-mono">{parseMeta.agentTaxId || '—'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-headline">סה"כ רשומות</p>
                      <p className="font-bold text-on-surface">{parseMeta.totalRecords.toLocaleString()}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-headline">סה"כ עמלות</p>
                      <p className="font-bold text-secondary text-lg">
                        ₪{parseResults
                          .flatMap((r) => r.records)
                          .reduce((s, rec) => s + (rec.amountWithVat || rec.commission || rec.paymentAmount || 0), 0)
                          .toLocaleString('he-IL', { maximumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-headline">תקופה</p>
                      <p className="font-bold text-on-surface">
                        {parseResults.flatMap((r) => r.records).find((rec) => rec.processingMonth)?.processingMonth || '—'}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-headline">שגיאות</p>
                      <p className={`font-bold ${parseMeta.totalErrors > 0 ? 'text-error' : 'text-secondary'}`}>
                        {parseMeta.totalErrors > 0 ? parseMeta.totalErrors : '✓ ללא שגיאות'}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-headline">סוג קובץ</p>
                      <p className="font-bold text-on-surface">{parseMeta.isAgreement ? 'הסכם עמלות' : 'דוח עמלות'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Mismatch warning */}
              {parseMeta?.mismatchWarning && (
                <div className="bg-tertiary-container/40 border border-tertiary/30 rounded-lg px-5 py-4 flex items-start gap-3">
                  <Icon name="warning" className="text-tertiary mt-0.5 shrink-0" />
                  <div>
                    <p className="font-bold text-on-surface text-sm mb-0.5">שורות לא נכללו בחישוב</p>
                    <p className="text-sm text-on-surface-variant">{parseMeta.mismatchWarning}</p>
                  </div>
                </div>
              )}

              {parseResults.map((result) => (
                <div key={result.sheetName} className="bg-surface-container-lowest rounded-lg overflow-hidden">
                  <div className="px-6 py-4 bg-surface-container-low flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-on-surface">
                        {REPORT_TYPE_LABELS[result.reportType] || result.reportType}
                      </h4>
                      <p className="text-xs text-on-surface-variant">
                        גיליון: {result.sheetName} — {result.records.length} רשומות
                        {result.errors.length > 0 && (
                          <span className="text-error ms-2">({result.errors.length} שגיאות)</span>
                        )}
                      </p>
                    </div>
                    <span className="bg-secondary-container text-on-secondary-container px-3 py-1 rounded-full text-xs font-bold">
                      {result.records.length} רשומות
                    </span>
                  </div>

                  {result.records.length > 0 && (
                    <div className="overflow-x-auto max-h-64 overflow-y-auto">
                      <table className="w-full text-right text-sm">
                        <caption className="sr-only">{REPORT_TYPE_LABELS[result.reportType]}</caption>
                        <thead className="sticky top-0">
                          <tr className="bg-surface-container text-[10px] uppercase tracking-widest text-on-surface-variant font-headline">
                            {result.reportType === 'nifraim' && (
                              <>
                                <th className="px-4 py-3">שם מבוטח</th>
                                <th className="px-4 py-3">ענף</th>
                                <th className="px-4 py-3">סוג פוליסה</th>
                                <th className="px-4 py-3">פרמיה</th>
                                <th className="px-4 py-3">עמלה</th>
                                <th className="px-4 py-3">סכום תשלום</th>
                              </>
                            )}
                            {result.reportType === 'agent_data' && (
                              <>
                                <th className="px-4 py-3">שם לקוח</th>
                                <th className="px-4 py-3">סוג קופה</th>
                                <th className="px-4 py-3">יתרת צבירה</th>
                                <th className="px-4 py-3">אחוז ד"נ</th>
                                <th className="px-4 py-3">עמלה לפני מע"מ</th>
                                <th className="px-4 py-3">עמלה כולל מע"מ</th>
                              </>
                            )}
                            {result.reportType === 'branch_distribution' && (
                              <>
                                <th className="px-4 py-3">ענף</th>
                                <th className="px-4 py-3">מוצר על</th>
                                <th className="px-4 py-3">פרמיה לתגמול</th>
                                <th className="px-4 py-3">אחוז עמלה</th>
                                <th className="px-4 py-3">עמלה</th>
                              </>
                            )}
                            {result.reportType === 'product_distribution' && (
                              <>
                                <th className="px-4 py-3">שם מוצר</th>
                                <th className="px-4 py-3">פרמיה לתגמול</th>
                                <th className="px-4 py-3">עמלה כולל מע"מ</th>
                                <th className="px-4 py-3">ללא מע"מ</th>
                              </>
                            )}
                            {(result.reportType === 'hekef' || result.reportType === 'accumulation_nifraim' || result.reportType === 'accumulation_hekef') && (
                              <>
                                <th className="px-4 py-3">שם מבוטח</th>
                                <th className="px-4 py-3">ענף / מוצר</th>
                                <th className="px-4 py-3">מס' פוליסה</th>
                                <th className="px-4 py-3">פרמיה</th>
                                <th className="px-4 py-3">עמלה</th>
                              </>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {result.records.slice(0, 15).map((rec, i) => (
                            <tr key={i} className="hover:bg-surface-container-low transition-colors">
                              {result.reportType === 'nifraim' && (
                                <>
                                  <td className="px-4 py-3 font-medium">{rec.insuredName}</td>
                                  <td className="px-4 py-3">{rec.branch}</td>
                                  <td className="px-4 py-3">{rec.subBranch}</td>
                                  <td className="px-4 py-3">{fmt(rec.premium)}</td>
                                  <td className="px-4 py-3 font-bold text-secondary">{fmt(rec.commission)}</td>
                                  <td className="px-4 py-3">{fmt(rec.paymentAmount)}</td>
                                </>
                              )}
                              {result.reportType === 'agent_data' && (
                                <>
                                  <td className="px-4 py-3 font-medium">{rec.insuredName}</td>
                                  <td className="px-4 py-3">{rec.fundType}</td>
                                  <td className="px-4 py-3">{fmt(rec.accumulationBalance)}</td>
                                  <td className="px-4 py-3">{rec.managementFeePct}%</td>
                                  <td className="px-4 py-3">{fmt(rec.amountBeforeVat)}</td>
                                  <td className="px-4 py-3 font-bold text-secondary">{fmt(rec.amountWithVat)}</td>
                                </>
                              )}
                              {result.reportType === 'branch_distribution' && (
                                <>
                                  <td className="px-4 py-3 font-medium">{rec.branch}</td>
                                  <td className="px-4 py-3">{rec.productName}</td>
                                  <td className="px-4 py-3">{fmt(rec.premium)}</td>
                                  <td className="px-4 py-3">{rec.commission > 0 ? `${rec.managementFeePct}%` : '—'}</td>
                                  <td className="px-4 py-3 font-bold text-secondary">{fmt(rec.commission)}</td>
                                </>
                              )}
                              {result.reportType === 'product_distribution' && (
                                <>
                                  <td className="px-4 py-3 font-medium">{rec.productName}</td>
                                  <td className="px-4 py-3">{fmt(rec.premium)}</td>
                                  <td className="px-4 py-3 font-bold text-secondary">{fmt(rec.amountWithVat)}</td>
                                  <td className="px-4 py-3">{fmt(rec.amountBeforeVat)}</td>
                                </>
                              )}
                              {(result.reportType === 'hekef' || result.reportType === 'accumulation_nifraim' || result.reportType === 'accumulation_hekef') && (
                                <>
                                  <td className="px-4 py-3 font-medium">{rec.insuredName}</td>
                                  <td className="px-4 py-3">{rec.branch || rec.productName || rec.fundType}</td>
                                  <td className="px-4 py-3 font-mono text-xs">{rec.policyNumber}</td>
                                  <td className="px-4 py-3">{rec.premium ? fmt(rec.premium) : rec.accumulationBalance ? fmt(rec.accumulationBalance) : '—'}</td>
                                  <td className="px-4 py-3 font-bold text-secondary">{fmt(rec.commission)}</td>
                                </>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {result.records.length > 15 && (
                        <div className="p-3 text-center text-xs text-on-surface-variant bg-surface-container-low">
                          מוצגות 15 מתוך {result.records.length} רשומות
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </section>
          )}

          {/* History Table */}
          <section className="space-y-4">
            <h3 className="text-lg font-bold text-on-surface px-2">היסטוריית העלאות</h3>
            {uploads.length === 0 ? (
              <div className="bg-surface-container-lowest rounded-lg p-12 text-center">
                <Icon name="cloud_off" size="xl" className="text-on-surface-variant/20 mb-4" />
                <p className="text-on-surface-variant font-medium">אין העלאות עדיין</p>
                <p className="text-sm text-on-surface-variant/60 mt-1">העלה קובץ XLS או CSV כדי להתחיל</p>
              </div>
            ) : (
              <div className="overflow-hidden bg-surface-container-lowest rounded-lg">
                <table className="w-full text-right">
                  <caption className="sr-only">היסטוריית העלאות קבצים</caption>
                  <thead>
                    <tr className="bg-surface-container-low text-on-surface-variant text-sm font-bold">
                      <th className="px-6 py-4">שם הקובץ</th>
                      <th className="px-6 py-4">חברה</th>
                      <th className="px-6 py-4">תאריך</th>
                      <th className="px-6 py-4">רשומות</th>
                      <th className="px-6 py-4">סטטוס</th>
                    </tr>
                  </thead>
                  <tbody>
                    {uploads.map((row) => (
                      <tr key={row.id} className="hover:bg-surface-container-low transition-colors">
                        <td className="px-6 py-5 font-semibold">{row.fileName}</td>
                        <td className="px-6 py-5">{row.company}</td>
                        <td className="px-6 py-5 text-sm">{row.date}</td>
                        <td className="px-6 py-5 font-mono">{row.records.toLocaleString()}</td>
                        <td className="px-6 py-5">
                          {row.status === 'completed' && (
                            <span className="bg-secondary-container text-on-secondary-container px-3 py-1 rounded-full text-xs font-bold">הושלם</span>
                          )}
                          {row.status === 'error' && (
                            <span className="bg-error-container text-on-error-container px-3 py-1 rounded-full text-xs font-bold">שגיאה</span>
                          )}
                          {row.status === 'processing' && (
                            <span className="bg-primary-fixed text-primary px-3 py-1 rounded-full text-xs font-bold">בעיבוד</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        {/* Sidebar */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          <div className="bg-primary-container text-on-primary-container p-8 rounded-lg relative overflow-hidden">
            <div className="relative z-10">
              <Icon name="info" size="lg" className="mb-4 block opacity-80" />
              <h3 className="text-xl font-bold mb-4">סוגי דוחות נתמכים</h3>
              <ul className="space-y-4 text-sm font-medium leading-relaxed">
                <li className="flex gap-3">
                  <Icon name="autorenew" className="text-secondary-fixed" size="sm" />
                  <span><strong>נפרעים</strong> — עמלות שוטפות על פרמיות שנגבו</span>
                </li>
                <li className="flex gap-3">
                  <Icon name="bolt" className="text-secondary-fixed" size="sm" />
                  <span><strong>היקף</strong> — עמלה חד-פעמית על ניוד/הצטרפות</span>
                </li>
                <li className="flex gap-3">
                  <Icon name="savings" className="text-secondary-fixed" size="sm" />
                  <span><strong>נפרעים צבירה</strong> — גמל, השתלמות (ללא פנסיה)</span>
                </li>
                <li className="flex gap-3">
                  <Icon name="swap_horiz" className="text-secondary-fixed" size="sm" />
                  <span><strong>היקף צבירה</strong> — תגמול על ניוד גמל/השתלמות</span>
                </li>
              </ul>
              <button
                onClick={downloadSampleAgreement}
                className="mt-8 w-full py-3 bg-on-primary-container text-primary font-bold rounded-lg hover:bg-white transition-colors"
              >
                הורד הסכם עמלות לדוגמה
              </button>
            </div>
            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-primary-fixed rounded-full blur-[80px] opacity-20" />
          </div>

          <div className="bg-surface-container-low p-8 rounded-lg space-y-4">
            <h4 className="font-bold text-primary flex items-center gap-2">
              <Icon name="lightbulb" />
              זיהוי אוטומטי
            </h4>
            <p className="text-on-surface-variant text-sm leading-relaxed">
              המערכת מזהה אוטומטית את סוג הדוח לפי שם הגיליון באקסל.
              אין צורך לבחור סוג ידנית — פשוט העלה את הקובץ כפי שקיבלת אותו מחברת הביטוח.
            </p>
          </div>

          {/* Contract Rates Panel */}
          {contractRates.length > 0 && (
            <div className="bg-surface-container-lowest p-6 rounded-lg border-s-4 border-primary">
              <div className="flex items-center gap-2 mb-4">
                <Icon name="contract" className="text-primary" size="sm" />
                <h4 className="text-xs font-black uppercase tracking-widest text-on-surface-variant">אחוזי עמלה — החוזה שלי</h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="text-on-surface-variant border-b border-outline-variant">
                      <th className="pb-2 font-bold">מוצר</th>
                      <th className="pb-2 font-bold text-center">היקף %</th>
                      <th className="pb-2 font-bold text-center">נפרעים %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/30">
                    {contractRates.map((row) => (
                      <tr key={row.type} className="hover:bg-surface-container-low transition-colors">
                        <td className="py-2.5 font-medium text-on-surface">{row.type}</td>
                        <td className="py-2.5 text-center">
                          {row.hekef != null
                            ? <span className="font-bold text-primary">{row.hekef}%</span>
                            : <span className="text-on-surface-variant/40">—</span>}
                        </td>
                        <td className="py-2.5 text-center">
                          {row.nifraim != null
                            ? <span className="font-bold text-secondary">{row.nifraim}%</span>
                            : <span className="text-on-surface-variant/40">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[10px] text-on-surface-variant/50 mt-3">מבוסס על הפוליסות הפעילות בתיק</p>
            </div>
          )}

          <div className="bg-surface-container-lowest p-8 rounded-lg border-s-4 border-secondary">
            <h4 className="text-xs font-black uppercase tracking-widest text-on-surface-variant mb-6">סיכום חודשי</h4>
            <div className="space-y-6">
              <div className="flex justify-between items-end">
                <span className="text-sm font-bold text-on-surface-variant">קבצים שנקלטו</span>
                <span className="text-3xl font-headline font-black text-primary">
                  {uploads.filter((u) => u.status === 'completed').length}
                </span>
              </div>
              <div className="flex justify-between items-end">
                <span className="text-sm font-bold text-on-surface-variant">רשומות שעובדו</span>
                <span className="text-3xl font-headline font-black text-secondary">
                  {uploads.filter((u) => u.status === 'completed').reduce((s, u) => s + u.records, 0).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
