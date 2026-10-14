import React from 'react';

const StatCard = ({ title, value, unit, icon: Icon, trend, trendLabel, subtitle, color = 'emerald' }) => {
  const colorMap = {
    emerald: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    amber: 'text-amber-600 bg-amber-50 border-amber-100',
    red: 'text-rose-600 bg-rose-50 border-rose-100',
    blue: 'text-sky-600 bg-sky-50 border-sky-100',
    indigo: 'text-indigo-600 bg-indigo-50 border-indigo-100',
  };

  const iconClasses = colorMap[color] || colorMap.emerald;

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm hover:shadow transition-shadow duration-200">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</p>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-2xl font-bold tracking-tight text-slate-900">{value}</span>
            {unit && <span className="text-sm font-medium text-slate-500">{unit}</span>}
          </div>
        </div>
        {Icon && (
          <div className={`p-2.5 rounded-lg border ${iconClasses}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      {(trend !== undefined || subtitle) && (
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
          {trend !== undefined && (
            <div className="flex items-center space-x-1">
              <span className={`font-semibold ${trend >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {trend >= 0 ? `+${trend}%` : `${trend}%`}
              </span>
              {trendLabel && <span className="text-slate-500">{trendLabel}</span>}
            </div>
          )}
          {subtitle && (
            <span className="text-slate-500 truncate" title={subtitle}>
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default StatCard;
