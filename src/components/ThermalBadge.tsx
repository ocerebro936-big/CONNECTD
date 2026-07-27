import { getTemperatureStyles } from '../lib/thermal-utils';

interface ThermalBadgeProps {
  temperature: number;
  className?: string;
}

export function ThermalBadge({ temperature, className = '' }: ThermalBadgeProps) {
  const styles = getTemperatureStyles(temperature);
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider uppercase backdrop-blur-md ${styles.badge} ${className}`}
      title={`${styles.emoji} ${styles.label} — ${temperature}°T`}
    >
      <span>{styles.emoji}</span>
      <span>{temperature}°T</span>
    </span>
  );
}
