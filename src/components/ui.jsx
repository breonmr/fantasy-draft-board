export function Button({ className = "", ...props }) {
  return (
    <button
      {...props}
      className={`px-2.5 py-1.5 rounded-xl shadow text-xs hover:shadow-md active:scale-[0.99] ${
        props.disabled ? "opacity-50 cursor-not-allowed" : ""
      } ${className}`}
    />
  );
}

export function IconToggle({ on, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-2 py-1 rounded-full text-xs font-semibold ${
        on ? "bg-slate-800 text-white" : "bg-slate-300 text-slate-900"
      }`}
      title="Toggle dark mode"
    >
      {on ? "Dark" : "Light"}
    </button>
  );
}

export function Input({ className = "", ...props }) {
  return (
    <input
      {...props}
      className={`px-2.5 py-1.5 rounded-lg border text-sm focus:outline-none focus:ring w-full ${className}`}
    />
  );
}
