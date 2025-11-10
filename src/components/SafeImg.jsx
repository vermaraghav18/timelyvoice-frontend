// src/components/SafeImg.jsx
import { useState } from 'react';

// keep a single source of truth for your fallback
const FALLBACK = 'https://res.cloudinary.com/damjdyqj2/image/upload/f_auto,q_auto,w_640/news-images/defaults/fallback-hero';

export default function SafeImg({ src, alt = '', ...rest }) {
  const [s, setS] = useState(src || FALLBACK);
  return (
    <img
      src={s}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => {
        if (s !== FALLBACK) setS(FALLBACK);
      }}
      {...rest}
    />
  );
}
