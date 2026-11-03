type Scene = 'welcome' | 'water' | 'mix' | 'owl-icon';

/** Shared original mascot assets from the mobile application. */
export default function Mascot({ scene = 'welcome', className = '', eager = false }: { scene?: Scene; className?: string; eager?: boolean }) {
  return <img className={`farm-mascot ${className}`} src={`/mascot/${scene}.png`} alt="" aria-hidden="true" width={scene === 'owl-icon' ? 256 : 480} height={scene === 'owl-icon' ? 256 : 360} loading={eager ? 'eager' : 'lazy'} decoding="async" />;
}
