import Icon from '../ui/Icon';
import { fmt } from '../../utils/dateFormat';
import type { Anomaly } from '../../utils/anomalies';
import CompanyLogo from '../common/CompanyLogo';

const TYPE_TITLES: Record<Anomaly['type'], string> = {
  total_drop: 'ירידה כללית בהכנסה',
  client_lost: 'לקוח שאבד',
  client_negative: 'ביטול/החזר',
  client_spike: 'ירידה חדה אצל לקוח',
  total_spike: 'עלייה חדה',
  policy_lost: 'פוליסה שנעלמה',
};

const SEVERITY_BORDER: Record<Anomaly['severity'], string> = {
  high: 'border-r-4 border-r-[#B91C1C]',
  medium: 'border-r-4 border-r-[#D97706]',
  low: 'border-r-4 border-r-[#CA8A04]',
};

const SEVERITY_ICON_BG: Record<Anomaly['severity'], string> = {
  high: 'bg-error-container',
  medium: 'bg-tertiary-fixed',
  low: 'bg-surface-container-high',
};

const SEVERITY_ICON_COLOR: Record<Anomaly['severity'], string> = {
  high: 'text-error',
  medium: 'text-on-tertiary-container',
  low: 'text-on-surface-variant',
};

const SEVERITY_TITLE_COLOR: Record<Anomaly['severity'], string> = {
  high: 'text-error',
  medium: 'text-on-surface',
  low: 'text-on-surface',
};

const SEVERITY_BG: Record<Anomaly['severity'], string> = {
  high: 'bg-error-container/20',
  medium: 'bg-tertiary-fixed/20',
  low: 'bg-surface-container-lowest',
};

interface AnomalyCardProps {
  anomaly: Anomaly;
  onClick?: () => void;
}

export default function AnomalyCard({ anomaly, onClick }: AnomalyCardProps) {
  const isPositive = anomaly.type === 'total_spike';

  return (
    <article
      role="article"
      aria-label={`${TYPE_TITLES[anomaly.type]}: ${anomaly.message}`}
      onClick={onClick}
      className={`rounded-lg overflow-hidden ${SEVERITY_BG[anomaly.severity]} ${SEVERITY_BORDER[anomaly.severity]} ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
    >
      <div className="p-4 flex items-start gap-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${SEVERITY_ICON_BG[anomaly.severity]}`}>
          <Icon
            name={anomaly.icon}
            size="sm"
            className={isPositive ? 'text-secondary' : SEVERITY_ICON_COLOR[anomaly.severity]}
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`font-bold text-xs uppercase tracking-wider mb-0.5 ${SEVERITY_ICON_COLOR[anomaly.severity]}`}>
            {TYPE_TITLES[anomaly.type]}
          </p>
          <p className={`font-bold text-sm ${SEVERITY_TITLE_COLOR[anomaly.severity]}`}>
            {anomaly.message}
          </p>
          <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">{anomaly.detail}</p>
        </div>
      </div>

      {anomaly.clients && anomaly.clients.length > 0 && (() => {
        const clients = anomaly.clients;
        const hasPolicyNumber = clients.some(c => c.policyNumber);
        const hasCompany = clients.some(c => c.insuranceCompany);
        const extraCols = (hasPolicyNumber ? 1 : 0) + (hasCompany ? 1 : 0);
        return (
          <div className="px-4 pb-4">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[10px] uppercase tracking-widest text-on-surface-variant/60 font-headline">
                  <th className="text-start py-2 pe-3">שם</th>
                  <th className="text-start py-2 pe-3">ת.ז</th>
                  <th className="text-start py-2 pe-3">מוצר</th>
                  {hasPolicyNumber && <th className="text-start py-2 pe-3">פוליסה</th>}
                  {hasCompany && <th className="text-start py-2 pe-3">חברה</th>}
                  <th className="text-end py-2">סכום</th>
                </tr>
              </thead>
              <tbody>
                {clients.filter(c => Math.abs(c.amount) >= 1).map((client, i) => (
                  <tr key={i} className="text-on-surface">
                    <td className="py-1.5 pe-3 font-medium">{client.name}</td>
                    <td className="py-1.5 pe-3 text-on-surface-variant">{client.id || '—'}</td>
                    <td className="py-1.5 pe-3 text-on-surface-variant truncate max-w-[120px]">{client.product}</td>
                    {hasPolicyNumber && (
                      <td className="py-1.5 pe-3">
                        {client.policyNumber
                          ? <span className="inline-block bg-surface-container-high text-on-surface-variant rounded px-1.5 py-0.5 text-[10px] font-mono">{client.policyNumber}</span>
                          : <span className="text-on-surface-variant">—</span>
                        }
                      </td>
                    )}
                    {hasCompany && (
                      <td className="py-1.5 pe-3">
                        {client.insuranceCompany
                          ? <span className="inline-flex items-center gap-1 text-on-surface-variant">
                              <CompanyLogo company={client.insuranceCompany} size="xs" />
                              {client.insuranceCompany}
                            </span>
                          : <span className="text-on-surface-variant">—</span>
                        }
                      </td>
                    )}
                    <td className={`py-1.5 text-end font-bold ${
                      anomaly.type === 'client_lost' || anomaly.type === 'client_spike' || anomaly.type === 'policy_lost' || client.amount < 0
                        ? 'text-error'
                        : 'text-on-surface'
                    }`}>
                      {anomaly.type === 'client_negative' && <>{fmt(Math.round(Math.abs(client.amount)))}₪ החזר</>}
                      {anomaly.type === 'client_lost' && <>-{fmt(Math.round(Math.abs(client.amount)))}₪ אובדן</>}
                      {anomaly.type === 'client_spike' && <>-{fmt(Math.round(Math.abs(client.amount)))}₪ ירידה</>}
                      {anomaly.type === 'policy_lost' && <>-{fmt(Math.round(Math.abs(client.amount)))}₪</>}
                      {!['client_negative', 'client_lost', 'client_spike', 'policy_lost'].includes(anomaly.type) && (
                        <>{fmt(Math.round(Math.abs(client.amount)))}₪</>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-bold text-on-surface">
                  <td colSpan={3 + extraCols} className="py-2 pt-3">
                    סה״כ {clients.length} {anomaly.type === 'policy_lost' ? 'פוליסות' : 'לקוחות'}
                  </td>
                  <td className={`py-2 pt-3 text-end ${anomaly.type === 'client_negative' ? 'text-error' : 'text-primary'}`}>
                    {fmt(Math.round(Math.abs(clients.reduce((s, c) => s + c.amount, 0))))}₪
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        );
      })()}
    </article>
  );
}
