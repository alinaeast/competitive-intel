import React from 'react';

export function SourceBadge({ label, url }) {
  if (!label) return null;
  const cls =
    'inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 border border-gray-200 leading-none';
  if (url) {
    return (
      <a href={url} target="_blank" rel="noreferrer" className={`${cls} hover:text-indigo-600 hover:border-indigo-300 transition-colors`}>
        <span className="opacity-60">↗</span> {label}
      </a>
    );
  }
  return <span className={cls}>{label}</span>;
}

export function SectionHeader({ title, subtitle, children }) {
  return (
    <div className="flex items-baseline justify-between mb-4">
      <div>
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export function EmptySection({ message = 'No data available.' }) {
  return (
    <div className="rounded-lg border border-dashed border-gray-200 px-5 py-6 text-sm text-gray-400 text-center">
      {message}
    </div>
  );
}

export function Card({ children, className = '' }) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm ${className}`}>
      {children}
    </div>
  );
}
