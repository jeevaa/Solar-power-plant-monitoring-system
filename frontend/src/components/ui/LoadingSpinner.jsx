import React from 'react';

const LoadingSpinner = ({ message = 'Loading system telemetry...', className = 'py-12' }) => {
  return (
    <div className={`flex flex-col items-center justify-center space-y-3 ${className}`}>
      <div className="relative w-10 h-10">
        <div className="w-10 h-10 rounded-full border-3 border-emerald-200 border-t-emerald-600 animate-spin"></div>
      </div>
      <p className="text-xs font-medium text-slate-500 tracking-wide uppercase">{message}</p>
    </div>
  );
};

export default LoadingSpinner;
