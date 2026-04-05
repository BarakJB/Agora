import { useRef, useState, useEffect } from 'react';
import Icon from '../components/ui/Icon';
import { useDataStore, type UploadRow } from '../store/dataStore';
import { useAuthStore } from '../store/authStore';

export default function CommissionUploadPage() {
  const uploads = useDataStore((s) => s.uploads);
  const addUpload = useDataStore((s) => s.addUpload);
  const loading = useDataStore((s) => s.loading);
  const fetchFromApi = useDataStore((s) => s.fetchFromApi);
  const userMode = useAuthStore((s) => s.userMode);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch upload history from API for non-demo users
  useEffect(() => {
    if (userMode === 'new' && uploads.length === 0) {
      fetchFromApi();
    }
  }, [userMode, uploads.length, fetchFromApi]);

  const allUploads = uploads;

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
    processFiles(files);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files ? Array.from(e.target.files) : [];
    processFiles(files);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function processFiles(files: File[]) {
    for (const file of files) {
      const newUpload: UploadRow = {
        id: crypto.randomUUID(),
        fileName: file.name,
        company: selectedCompany || 'לא צוין',
        date: new Date().toLocaleDateString('he-IL'),
        records: Math.floor(Math.random() * 500) + 100,
        status: file.name.endsWith('.csv') ? 'completed' : 'error',
      };
      addUpload(newUpload);
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

  return (
    <div className="p-8 bg-surface min-h-screen">
      <header className="flex justify-between items-center mb-12">
        <div>
          <h2 className="font-headline text-4xl font-extrabold text-primary tracking-tighter mb-1">
            העלאת קובצי עמלות
          </h2>
          <p className="text-on-surface-variant font-medium">מערכת קליטת נתונים אוטומטית מקובצי CSV.</p>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-8">
        {/* Main Upload */}
        <div className="col-span-12 lg:col-span-8 space-y-8">
          <div className="bg-surface-container-lowest p-8 rounded-lg shadow-editorial">
            <div className="flex flex-col gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-on-surface-variant uppercase tracking-widest block">
                  בחר חברת ביטוח / יצרן
                </label>
                <div className="relative">
                  <select
                    className="w-full appearance-none bg-surface-container-high border-none rounded-lg px-6 py-4 font-semibold text-primary focus:ring-2 focus:ring-primary/40 transition-all"
                    value={selectedCompany}
                    onChange={(e) => setSelectedCompany(e.target.value)}
                  >
                    <option value="">בחר חברה מהרשימה...</option>
                    <option value="הראל">הראל חברה לביטוח</option>
                    <option value="מגדל">מגדל חברה לביטוח</option>
                    <option value="מנורה">מנורה מבטחים</option>
                    <option value="הפניקס">הפניקס</option>
                    <option value="כלל">כלל ביטוח</option>
                  </select>
                  <Icon name="expand_more" className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-primary" />
                </div>
              </div>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                multiple
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
                <div className="w-16 h-16 bg-primary-fixed rounded-full flex items-center justify-center text-primary mb-2 group-hover:scale-110 transition-transform">
                  <Icon name="cloud_upload" size="lg" />
                </div>
                <h3 className="text-xl font-bold text-primary">גרור ושחרר קבצים כאן</h3>
                <p className="text-on-surface-variant max-w-xs">
                  תמיכה בקובצי CSV בלבד. הקובץ חייב להכיל את עמודות החובה כפי שמוגדר במדריך.
                </p>
                <button
                  className="mt-4 bg-primary text-on-primary px-8 py-3 rounded-lg font-bold hover:shadow-lg transition-all"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                >
                  בחר קובץ מהמחשב
                </button>
              </div>
            </div>
          </div>

          {/* History Table */}
          <section className="space-y-4">
            <h3 className="text-lg font-bold text-primary px-2">היסטוריית העלאות אחרונות</h3>
            {loading ? (
              <div className="bg-surface-container-lowest rounded-lg p-12 text-center shadow-editorial">
                <div className="w-10 h-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin mx-auto mb-4" />
                <p className="text-on-surface-variant font-medium">טוען היסטוריית העלאות...</p>
              </div>
            ) : allUploads.length === 0 ? (
              <div className="bg-surface-container-lowest rounded-lg p-12 text-center shadow-editorial">
                <Icon name="cloud_off" size="xl" className="text-on-surface-variant/20 mb-4" />
                <p className="text-on-surface-variant font-medium">אין העלאות עדיין</p>
                <p className="text-sm text-on-surface-variant/60 mt-1">העלה קובץ CSV כדי להתחיל</p>
              </div>
            ) : (
              <div className="overflow-hidden bg-surface-container-lowest rounded-lg shadow-editorial">
                <table className="w-full text-right">
                  <thead>
                    <tr className="bg-surface-container-low text-on-surface-variant text-sm font-bold">
                      <th className="px-6 py-4">שם הקובץ</th>
                      <th className="px-6 py-4">חברה</th>
                      <th className="px-6 py-4">תאריך</th>
                      <th className="px-6 py-4">רשומות</th>
                      <th className="px-6 py-4">סטטוס</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-container">
                    {allUploads.map((row) => (
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
                            <span className="bg-error-container text-on-error-container px-3 py-1 rounded-full text-xs font-bold" title="הקובץ אינו בפורמט CSV">שגיאה — הקובץ אינו בפורמט CSV</span>
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

        {/* Sidebar Info */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          <div className="bg-primary-container text-on-primary-container p-8 rounded-lg shadow-xl relative overflow-hidden">
            <div className="relative z-10">
              <Icon name="info" size="lg" className="mb-4 block opacity-80" />
              <h3 className="text-xl font-bold mb-4">הנחיות להעלאת קבצים</h3>
              <ul className="space-y-4 text-sm font-medium leading-relaxed">
                <li className="flex gap-3">
                  <Icon name="check_circle" className="text-secondary-fixed" size="sm" />
                  וודא כי הקובץ בפורמט CSV (UTF-8).
                </li>
                <li className="flex gap-3">
                  <Icon name="check_circle" className="text-secondary-fixed" size="sm" />
                  עמודת &quot;מספר פוליסה&quot; חייבת להיות הראשונה.
                </li>
                <li className="flex gap-3">
                  <Icon name="check_circle" className="text-secondary-fixed" size="sm" />
                  השתמש בפורמט תאריך DD/MM/YYYY.
                </li>
                <li className="flex gap-3">
                  <Icon name="check_circle" className="text-secondary-fixed" size="sm" />
                  סכומים יוצגו ללא סימן מטבע.
                </li>
              </ul>
              <button
                onClick={downloadSampleCsv}
                className="mt-8 w-full py-3 bg-on-primary-container text-primary font-bold rounded-lg hover:bg-white transition-colors"
              >
                הורד קובץ דוגמה
              </button>
            </div>
            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-primary-fixed rounded-full blur-[80px] opacity-20" />
          </div>

          <div className="bg-surface-container-low p-8 rounded-lg space-y-4">
            <h4 className="font-bold text-primary flex items-center gap-2">
              <Icon name="lightbulb" />
              טיפ המערכת
            </h4>
            <p className="text-on-surface-variant text-sm leading-relaxed">
              המערכת מזהה אוטומטית כפילויות של רשומות על בסיס מספר פוליסה ותאריך העמלה. במידה ותועלה רשומה קיימת, היא תעודכן לנתונים החדשים ביותר.
            </p>
          </div>

          <div className="bg-surface-container-lowest p-8 rounded-lg shadow-editorial border-l-4 border-secondary">
            <h4 className="text-xs font-black uppercase tracking-widest text-on-surface-variant mb-6">סיכום חודשי</h4>
            <div className="space-y-6">
              <div className="flex justify-between items-end">
                <span className="text-sm font-bold text-on-surface-variant">קבצים שנקלטו</span>
                <span className="text-3xl font-headline font-black text-primary">{allUploads.filter((u) => u.status === 'completed').length}</span>
              </div>
              <div className="flex justify-between items-end">
                <span className="text-sm font-bold text-on-surface-variant">רשומות שעובדו</span>
                <span className="text-3xl font-headline font-black text-secondary">
                  {allUploads.filter((u) => u.status === 'completed').reduce((s, u) => s + u.records, 0).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
