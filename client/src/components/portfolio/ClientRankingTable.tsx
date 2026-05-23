import { useMemo } from 'react';
import type { ClientSummary } from '../../services/api';
import { TrafficLightDots } from '../common/TrafficLight';
import { evaluateClientProfit } from '../../utils/profitThresholds';
import { fmt } from '../../utils/dateFormat';
import Icon from '../ui/Icon';
import CompanyLogo from '../common/CompanyLogo';

interface ClientRankingTableProps {
  clients: ClientSummary[];
  onClientClick?: (clientId: string) => void;
  anomalyClientKeys?: Set<string>;
}

export default function ClientRankingTable({ clients, onClientClick, anomalyClientKeys }: ClientRankingTableProps) {
  const sorted = useMemo(
    () => [...clients].sort((a, b) => a.totalCommission - b.totalCommission),
    [clients],
  );

  const averageCommission = useMemo(() => {
    if (clients.length === 0) return 0;
    return clients.reduce((s, c) => s + c.totalCommission, 0) / clients.length;
  }, [clients]);

  const total = sorted.length;

  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto rounded-lg border border-outline-variant/30">
        <table className="w-full text-sm" aria-label="מידרוג לקוחות לפי רווחיות">
          <caption className="sr-only">מידרוג לקוחות מהפחות רווחי לרווחי ביותר</caption>
          <thead className="bg-surface-container-low">
            <tr className="text-[10px] uppercase tracking-widest text-on-surface-variant/60 font-headline">
              <th scope="col" className="px-5 py-3 font-black text-end w-12" aria-sort="ascending">#</th>
              <th scope="col" className="px-5 py-3 font-black text-end">שם לקוח</th>
              <th scope="col" className="px-5 py-3 font-black text-end">סך עמלות</th>
              <th scope="col" className="px-5 py-3 font-black text-end">% מהממוצע</th>
              <th scope="col" className="px-5 py-3 font-black text-end">רשומות</th>
              <th scope="col" className="px-5 py-3 font-black text-center">רמזור</th>
            </tr>
          </thead>
          <tbody className="bg-surface-container-lowest divide-y divide-outline-variant/20">
            {sorted.map((client, idx) => {
              const rank = idx + 1;
              const isBottom = rank <= 3;
              const isTop = rank > total - 3;
              const level = evaluateClientProfit(client.totalCommission, averageCommission);
              const pct = averageCommission > 0
                ? Math.round((client.totalCommission / averageCommission) * 100)
                : 0;
              const hasAnomaly = anomalyClientKeys
                ? (anomalyClientKeys.has(client.insuredId) || anomalyClientKeys.has(client.insuredName))
                : false;

              return (
                <tr
                  key={client.insuredId}
                  onClick={() => onClientClick?.(client.insuredId)}
                  className={`transition-colors ${onClientClick ? 'cursor-pointer hover:bg-primary-fixed/30' : ''}`}
                  aria-label={`${client.insuredName}, עמלה ${fmt(client.totalCommission)} שקל${hasAnomaly ? ', יש חריגה' : ''}`}
                >
                  <td className="px-5 py-3.5 text-end">
                    <span className="font-black text-on-surface-variant/40 text-xs">{rank}</span>
                  </td>
                  <td className="px-5 py-3.5 text-end">
                    <div className="flex items-center gap-2 justify-end">
                      <div className="flex flex-col items-end gap-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-on-surface">{client.insuredName}</span>
                          {hasAnomaly && (
                            <span
                              title="יש חריגה לקוח זה"
                              aria-label="יש חריגה לקוח זה"
                              className="inline-flex"
                            >
                              <Icon name="warning" size="sm" className="text-[#D97706]" />
                            </span>
                          )}
                        </div>
                        {client.insuranceCompanies.length > 0 && (
                          <span
                            className="flex items-center gap-0.5"
                            title={client.insuranceCompanies.join(', ')}
                            aria-label={`חברות: ${client.insuranceCompanies.join(', ')}`}
                          >
                            {client.insuranceCompanies.slice(0, 3).map((co) => (
                              <CompanyLogo key={co} company={co} size="xs" />
                            ))}
                            {client.insuranceCompanies.length > 3 && (
                              <span
                                title={client.insuranceCompanies.slice(3).join(', ')}
                                className="text-[9px] font-bold text-on-surface-variant/60 bg-surface-container px-1 py-0.5 rounded-full"
                              >
                                +{client.insuranceCompanies.length - 3}
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                      {isBottom && (
                        <span className="text-[9px] font-bold bg-error-container text-on-error-container px-1.5 py-0.5 rounded-full shrink-0">
                          בסיכון
                        </span>
                      )}
                      {isTop && (
                        <span className="text-[9px] font-bold bg-secondary-container text-on-secondary-container px-1.5 py-0.5 rounded-full shrink-0">
                          מוביל
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-end">
                    <span className="font-black font-headline text-primary">{fmt(Math.round(client.totalCommission))}</span>
                    <span className="text-xs text-primary/50 mr-0.5">&#8362;</span>
                  </td>
                  <td className="px-5 py-3.5 text-end">
                    <span className={`font-bold text-xs ${pct >= 100 ? 'text-secondary' : pct >= 50 ? 'text-amber-600' : 'text-error'}`}>
                      {pct}%
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-end text-on-surface-variant">
                    {client.recordCount}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex justify-center">
                      <TrafficLightDots level={level} size="sm" showLabel={false} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {sorted.map((client, idx) => {
          const rank = idx + 1;
          const isBottom = rank <= 3;
          const isTop = rank > total - 3;
          const level = evaluateClientProfit(client.totalCommission, averageCommission);
          const pct = averageCommission > 0
            ? Math.round((client.totalCommission / averageCommission) * 100)
            : 0;
          const hasAnomaly = anomalyClientKeys
            ? (anomalyClientKeys.has(client.insuredId) || anomalyClientKeys.has(client.insuredName))
            : false;

          return (
            <div
              key={client.insuredId}
              onClick={() => onClientClick?.(client.insuredId)}
              className={`bg-surface-container-lowest rounded-lg p-4 border border-outline-variant/20 flex items-center gap-3 ${onClientClick ? 'cursor-pointer active:bg-primary-fixed/30' : ''}`}
              role={onClientClick ? 'button' : undefined}
              aria-label={onClientClick ? `פרטי ${client.insuredName}${hasAnomaly ? ', יש חריגה' : ''}` : undefined}
            >
              <span className="font-black text-on-surface-variant/30 text-sm w-6 text-center shrink-0">{rank}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-semibold text-on-surface truncate">{client.insuredName}</span>
                  {hasAnomaly && (
                    <Icon name="warning" size="sm" className="text-[#D97706] shrink-0" aria-label="יש חריגה" />
                  )}
                  {isBottom && (
                    <span className="text-[9px] font-bold bg-error-container text-on-error-container px-1.5 py-0.5 rounded-full">בסיכון</span>
                  )}
                  {isTop && (
                    <span className="text-[9px] font-bold bg-secondary-container text-on-secondary-container px-1.5 py-0.5 rounded-full">מוביל</span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  <span className="font-black text-primary text-sm">{fmt(Math.round(client.totalCommission))} &#8362;</span>
                  <span className={`text-xs font-bold ${pct >= 100 ? 'text-secondary' : pct >= 50 ? 'text-amber-600' : 'text-error'}`}>
                    {pct}%
                  </span>
                  {client.insuranceCompanies.length > 0 && (
                    <span
                      className="flex items-center gap-0.5"
                      title={client.insuranceCompanies.join(', ')}
                      aria-label={`חברות: ${client.insuranceCompanies.join(', ')}`}
                    >
                      {client.insuranceCompanies.slice(0, 3).map((co) => (
                        <CompanyLogo key={co} company={co} size="xs" />
                      ))}
                      {client.insuranceCompanies.length > 3 && (
                        <span
                          title={client.insuranceCompanies.slice(3).join(', ')}
                          className="text-[9px] font-bold text-on-surface-variant/60 bg-surface-container px-1 py-0.5 rounded-full"
                        >
                          +{client.insuranceCompanies.length - 3}
                        </span>
                      )}
                    </span>
                  )}
                </div>
              </div>
              <div className="shrink-0 flex items-center gap-2">
                <TrafficLightDots level={level} size="sm" showLabel={false} />
                {onClientClick && <Icon name="chevron_left" size="sm" className="text-on-surface-variant/40" />}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
