import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  suffix?: string;
  prefix?: string;
  required?: boolean;
}

export default function Input({ label, error, hint, suffix, prefix, required, className = '', ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <div className="relative flex items-center">
        {prefix && (
          <span className="absolute left-3 text-sm text-gray-500 select-none">{prefix}</span>
        )}
        <input
          {...props}
          className={`
            w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900
            placeholder:text-gray-400 outline-none
            focus:border-blue-500 focus:ring-2 focus:ring-blue-100
            disabled:bg-gray-50 disabled:text-gray-500
            ${error ? 'border-red-400 focus:border-red-400 focus:ring-red-100' : ''}
            ${prefix ? 'pl-8' : ''}
            ${suffix ? 'pr-12' : ''}
            ${className}
          `}
        />
        {suffix && (
          <span className="absolute right-3 text-sm text-gray-500 select-none">{suffix}</span>
        )}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      {hint && !error && <p className="text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  options: { value: string; label: string }[];
}

export function Select({ label, error, hint, required, options, className = '', ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <select
        {...props}
        className={`
          w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900
          outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100
          disabled:bg-gray-50 disabled:text-gray-500
          ${error ? 'border-red-400' : ''}
          ${className}
        `}
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {error && <p className="text-xs text-red-500">{error}</p>}
      {hint && !error && <p className="text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Textarea({ label, error, hint, className = '', ...props }: TextareaProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
      <textarea
        {...props}
        className={`
          w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900
          placeholder:text-gray-400 outline-none resize-none
          focus:border-blue-500 focus:ring-2 focus:ring-blue-100
          ${error ? 'border-red-400' : ''}
          ${className}
        `}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
      {hint && !error && <p className="text-xs text-gray-400">{hint}</p>}
    </div>
  );
}
