import { useState } from 'react';
import { normalizeCompanyName, getCompanyDisplay, getCompanyMeta } from '../../utils/insuranceCompanies';

type LogoSize = 'xs' | 'sm' | 'md' | 'lg';

interface CompanyLogoProps {
  company: string;
  size?: LogoSize;
  className?: string;
}

const SIZE_PX: Record<LogoSize, number> = {
  xs: 20,
  sm: 28,
  md: 40,
  lg: 56,
};

const SIZE_TEXT: Record<LogoSize, string> = {
  xs: 'text-[8px]',
  sm: 'text-[10px]',
  md: 'text-sm',
  lg: 'text-base',
};

export function CompanyLogo({ company, size = 'md', className = '' }: CompanyLogoProps) {
  const [imgFailed, setImgFailed] = useState(false);

  const code = normalizeCompanyName(company) ?? company;
  const meta = getCompanyMeta(company);
  const display = getCompanyDisplay(code);

  const px = SIZE_PX[size];
  const textClass = SIZE_TEXT[size];

  const showImg = !imgFailed && meta?.hasLogo && meta?.logoExt;

  const containerStyle: React.CSSProperties = {
    width: px,
    height: px,
    minWidth: px,
    minHeight: px,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  };

  if (showImg) {
    return (
      <span
        style={{
          ...containerStyle,
          background: '#ffffff',
          boxShadow: '0 1px 4px rgba(0,0,0,0.10)',
          border: '1px solid rgba(0,6,102,0.08)',
        }}
        className={className}
        aria-hidden="true"
      >
        <img
          src={`/logos/${code}.${meta!.logoExt}`}
          alt={display.name}
          loading="lazy"
          style={{ width: '80%', height: '80%', objectFit: 'contain' }}
          onError={() => setImgFailed(true)}
        />
      </span>
    );
  }

  return (
    <span
      style={{
        ...containerStyle,
        background: '#000666',
      }}
      className={`${textClass} font-black text-white ${className}`}
      role="img"
      aria-label={display.name}
    >
      {display.initials}
    </span>
  );
}

export default CompanyLogo;
