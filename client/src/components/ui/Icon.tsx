import { clsx } from 'clsx';

interface IconProps {
  name: string;
  filled?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeMap = {
  sm: 'text-sm',
  md: 'text-xl',
  lg: 'text-3xl',
  xl: 'text-6xl',
};

export default function Icon({ name, filled, className, size = 'md' }: IconProps) {
  return (
    <span
      className={clsx(
        'material-symbols-outlined',
        filled && 'material-filled',
        sizeMap[size],
        className
      )}
    >
      {name}
    </span>
  );
}
