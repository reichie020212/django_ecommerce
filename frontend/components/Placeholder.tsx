// Striped tone-tinted placeholder — port of prototype/components.jsx:Placeholder.
// Used until real product imagery lands (catalog.Image is empty in v1).

type Props = { tone: string; label?: string };

export function Placeholder({ tone, label }: Props) {
  return (
    <div className={`ph tone-${tone}`}>
      <div className="ph-stripes" />
      {label ? <div className="ph-label">{label}</div> : null}
    </div>
  );
}
