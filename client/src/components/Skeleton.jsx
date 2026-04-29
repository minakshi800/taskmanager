import './Skeleton.css';

export default function Skeleton({ className = '', style = {}, type = 'text', count = 1 }) {
  const skeletons = Array(count).fill(0);

  return (
    <>
      {skeletons.map((_, i) => (
        <div 
          key={i} 
          className={`skeleton skeleton-${type} ${className}`} 
          style={style}
        />
      ))}
    </>
  );
}
