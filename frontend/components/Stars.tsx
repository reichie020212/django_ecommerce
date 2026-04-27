// Five-star rating row. Port of prototype/components.jsx:Stars.
import { Icon } from './Icon';

export function Stars({ value = 4.5, size = 12 }: { value?: number; size?: number }) {
  const full = Math.round(value);
  return (
    <span className="stars" aria-label={`${value} stars`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <Icon key={i} name={i < full ? 'star' : 'star-o'} size={size} />
      ))}
    </span>
  );
}
