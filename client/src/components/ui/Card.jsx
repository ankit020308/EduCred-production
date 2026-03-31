export default function Card({ children, className = "" }) {
  return (
    <div className={`card glass depth-md hover:depth-lg transition-all duration-500 overflow-hidden relative group ${className}`}>
      {/* Dynamic Hover Glow Overlay */}
      <div className="absolute inset-0 bg-blue-600/0 group-hover:bg-blue-600/5 transition-colors duration-700 pointer-events-none" />
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
