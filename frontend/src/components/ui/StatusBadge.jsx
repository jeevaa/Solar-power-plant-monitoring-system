import React from 'react';

const StatusBadge = ({ status, className = '' }) => {
  const norm = (status || '').toUpperCase();

  const configs = {
    ONLINE: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
    OFFLINE: { bg: 'bg-slate-100 text-slate-700 border-slate-300', dot: 'bg-slate-400' },
    WARNING: { bg: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
    CRITICAL: { bg: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500' },
    ACTIVE: { bg: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500' },
    ACKNOWLEDGED: { bg: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
    RESOLVED: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
    SCHEDULED: { bg: 'bg-sky-50 text-sky-700 border-sky-200', dot: 'bg-sky-500' },
    IN_PROGRESS: { bg: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
    COMPLETED: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
    OVERDUE: { bg: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500' },
    CANCELLED: { bg: 'bg-slate-100 text-slate-700 border-slate-300', dot: 'bg-slate-400' },
    HIGH: { bg: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
    MEDIUM: { bg: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
    LOW: { bg: 'bg-slate-50 text-slate-700 border-slate-200', dot: 'bg-slate-400' },
    INFO: { bg: 'bg-sky-50 text-sky-700 border-sky-200', dot: 'bg-sky-500' }
  };

  const current = configs[norm] || configs.ONLINE;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${current.bg} ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${current.dot}`}></span>
      {status}
    </span>
  );
};

export default StatusBadge;
