import React, { useEffect, useMemo, useState } from 'react';
import { getFlagEmoji } from '../../types/languages';

interface FlagIconProps {
  countryCode: string;
  className?: string;
  fallbackClassName?: string;
  label?: string;
}

const normalizeCountryCode = (countryCode: string): string => {
  return (countryCode || '').trim().toUpperCase();
};

const getFlagImageUrl = (countryCode: string): string => {
  return `https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`;
};

export const FlagIcon: React.FC<FlagIconProps> = ({
  countryCode,
  className = 'w-5 h-4 rounded-sm object-cover shrink-0',
  fallbackClassName,
  label,
}) => {
  const normalized = useMemo(() => normalizeCountryCode(countryCode), [countryCode]);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [normalized]);

  if (!normalized || !/^[A-Z]{2}$/.test(normalized)) {
    return <span aria-hidden="true" className={fallbackClassName}>🌐</span>;
  }

  if (!imageFailed) {
    return (
      <img
        src={getFlagImageUrl(normalized)}
        alt={`${label || normalized} flag`}
        className={className}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setImageFailed(true)}
      />
    );
  }

  return (
    <span aria-hidden="true" className={fallbackClassName}>
      {getFlagEmoji(normalized) || normalized}
    </span>
  );
};
