import { useRef, useState } from 'react';
import Icon from '../components/ui/Icon';
import { useDataStore, type UploadRow } from '../store/dataStore';

interface ParsedRecord {
  reportType: string;
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
}

const REPORT_TYPE_LABELS: Record<string, string> = {
  nifraim: 'נפרעים — עמלות שוטפות על פרמיות',
  hekef: 'היקף — עמלה חד-פעמית (ניוד/הצטרפות)',
  accumulation_nifraim: 'נפרעים צבירה — גמל/השתלמות (ללא פנסיה)',
  accumulation_hekef: 'היקף צבירה — תגמול על ניוד גמל/השתלמות',
  branch_distribution: 'התפלגות ענפים — סיכום לפי ענף',
  agent_data: 'רשימת נתונים לסוכן — מוצרי צבירה',
  product_distribution: 'התפלגות מוצרים — סיכום כולל',
};

export default function CommissionUploadPage() {
  const uploads = useDataStore((s) => s.uploads);
  const addUpload = useDataStore((s) => s.addUpload);

  const [isDragging, setIsDragging] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedReportType, setSelectedReportType] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parseResults, setParseResults] = useState<ParseResult[] | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [companyRequired, setCompanyRequired] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
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

    if (!isExcel && !isCsv) {
      setParseError('יש להעלות קובץ מסוג XLS, XLSX, או CSV בלבד');
      return;
    }

    // Company is required — most Excel files don't contain company identification
    if (!selectedCompany) {
      setCompanyRequired(true);
      setPendingFile(file);
      setParseError('יש לבחור חברת ביטוח לפני העלאת הקובץ — רוב הדוחות לא מכילים זיהוי חברה');
      return;
    }

    setCompanyRequired(false);
    setPendingFile(null);

    if (isExcel) {
      await parseExcelFile(file);
    } else {
      const upload: UploadRow = {
        id: crypto.randomUUID(),
        fileName: file.name,
        company: selectedCompany,
        date: new Date().toLocaleDateString('he-IL'),
        records: 0,
        status: 'completed',
      };
      addUpload(upload);
    }
  }

  async function parseExcelFile(file: File) {
    setParsing(true);
    setParseError(null);
    setParseResults(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const token = localStorage.getItem('payagent-token');
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

      addUpload({
        id: crypto.randomUUID(),
        fileName: file.name,
        company: selectedCompany || 'זוהה אוטומטית',
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

  function downloadSampleCsv() {
    const headers = 'policy_number,client_name,client_id,product_type,premium_amount,commission_pct,recurring_pct,start_date,insurance_company\n';
    const rows = [
      'POL-001,ישראל ישראלי,301234567,pension,8500,15,1.5,2026-01-15,הראל',
      'POL-002,שרה כהן,302345678,health,3200,18,3,2026-02-01,מגדל',
      'POL-003,דוד לוי,303456789,life_insurance,12000,15,2.5,2026-02-10,הפניקס',
    ].join('\n');
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'payagent_sample_commissions.csv';
    a.click();
    URL.revokeObjectURL(url);
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
              {/* Company + Report Type selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="company-select" className="text-sm font-bold text-on-surface-variant uppercase tracking-widest block">
                    חברת ביטוח <span className="text-error">*</span>
                    {companyRequired && !selectedCompany && (
                      <span className="normal-case tracking-normal text-error text-xs ms-2">— חובה</span>
                    )}
                  </label>
                  <div className="relative">
                    <select
                      id="company-select"
                      className={`w-full appearance-none border-none rounded-lg px-5 py-4 font-semibold text-primary focus:ring-2 focus:ring-primary/40 transition-all ${
                        companyRequired && !selectedCompany
                          ? 'bg-error-container/30 ring-2 ring-error/40'
                          : 'bg-surface-container-high'
                      }`}
                      value={selectedCompany}
                      onChange={(e) => {
                        const company = e.target.value;
                        setSelectedCompany(company);
                        setCompanyRequired(false);
                        setParseError(null);
                        if (company && pendingFile) {
                          const file = pendingFile;
                          setPendingFile(null);
                          setTimeout(() => processFile(file), 0);
                        }
                      }}
                    >
                      <option value="">בחר חברה...</option>
                      <option value="הראל">הראל</option>
                      <option value="מגדל">מגדל</option>
                      <option value="מנורה מבטחים">מנורה מבטחים</option>
                      <option value="הפניקס">הפניקס</option>
                      <option value="כלל">כלל ביטוח</option>
                      <option value="הכשרה">הכשרה</option>
                      <option value="אלטשולר שחם">אלטשולר שחם</option>
                      <option value="מיטב דש">מיטב דש</option>
                      <option value="פסגות">פסגות</option>
                    </select>
                    <Icon name="expand_more" className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-primary" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="report-type-select" className="text-sm font-bold text-on-surface-variant uppercase tracking-widest block">
                    סוג דוח
                    <span className="normal-case tracking-normal text-on-surface-variant/60 text-xs ms-2">זיהוי אוטומטי</span>
                  </label>
                  <div className="relative">
                    <select
                      id="report-type-select"
                      className="w-full appearance-none bg-surface-container-high border-none rounded-lg px-5 py-4 font-semibold text-primary focus:ring-2 focus:ring-primary/40 transition-all"
                      value={selectedReportType}
                      onChange={(e) => setSelectedReportType(e.target.value)}
                    >
                      <option value="">זיהוי אוטומטי מהגיליון</option>
                      <optgroup label="עמלות שוטפות">
                        <option value="nifraim">נפרעים — עמלות שוטפות על פרמיות</option>
                        <option value="accumulation_nifraim">נפרעים צבירה — גמל/השתלמות (ללא פנסיה)</option>
                      </optgroup>
                      <optgroup label="עמלות חד-פעמיות">
                        <option value="hekef">היקף — עמלה חד-פעמית (ניוד/הצטרפות)</option>
                        <option value="accumulation_hekef">היקף צבירה — תגמול על ניוד גמל/השתלמות</option>
                      </optgroup>
                      <optgroup label="דוחות סיכום">
                        <option value="branch_distribution">התפלגות ענפים</option>
                        <option value="agent_data">רשימת נתונים לסוכן</option>
                        <option value="product_distribution">התפלגות מוצרים</option>
                      </optgroup>
                    </select>
                    <Icon name="expand_more" className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-primary" />
                  </div>
                </div>
              </div>

              {/* Selected context indicator */}
              {selectedCompany && (
                <div className="flex items-center gap-3 bg-primary-fixed/20 rounded-lg px-4 py-3">
                  <Icon name="business" size="sm" className="text-primary" />
                  <span className="text-sm font-medium text-primary">
                    מעלה קבצים עבור <strong>{selectedCompany}</strong>
                    {selectedReportType && (
                      <> — {REPORT_TYPE_LABELS[selectedReportType]}</>
                    )}
                  </span>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xls,.xlsx"
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
                      תמיכה בקבצי <strong>XLS, XLSX</strong> (דוחות חברות ביטוח) ו-<strong>CSV</strong>.
                      המערכת מזהה אוטומטית את סוג הדוח.
                    </p>
                    <div className="flex gap-3 mt-4">
                      <span className="bg-primary-fixed text-primary text-xs font-bold px-3 py-1 rounded-full">.xls</span>
                      <span className="bg-primary-fixed text-primary text-xs font-bold px-3 py-1 rounded-full">.xlsx</span>
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
                onClick={downloadSampleCsv}
                className="mt-8 w-full py-3 bg-on-primary-container text-primary font-bold rounded-lg hover:bg-white transition-colors"
              >
                הורד קובץ CSV לדוגמה
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
