export default function Button({ children, variant = "primary", className = "", ...props }) {
  const base = "px-6 py-3 rounded-xl text-sm font-bold uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2";

  const styles = {
    primary: "bg-blue-600 hover:bg-blue-500 text-white shadow-[0_10px_40px_rgba(37,99,235,0.3)] hover:shadow-[0_20px_60px_rgba(37,99,235,0.5)]",
    secondary: "glass border border-white/10 text-white hover:bg-white/5 shadow-2xl"
  };

  return (
    <button className={`${base} ${styles[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}
