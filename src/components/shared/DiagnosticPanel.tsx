import { AlertCircle, AlertTriangle, Info, ChevronDown, ChevronRight, Lightbulb } from 'lucide-react';
import { useState } from 'react';
import type { DiagnosticReport, DiagnosticIssue } from '../../types';

const severityConfig = {
  HIGH: { icon: <AlertCircle size={16} />, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', label: '🔴 高优先级' },
  MEDIUM: { icon: <AlertTriangle size={16} />, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', label: '🟡 中优先级' },
  LOW: { icon: <Info size={16} />, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', label: '🔵 低优先级' },
};

function IssueCard({ issue, onAction }: { issue: DiagnosticIssue; onAction?: (action: string, params?: Record<string, unknown>) => void }) {
  const [expanded, setExpanded] = useState(true);
  const cfg = severityConfig[issue.severity];

  return (
    <div className={`rounded-xl border ${cfg.border} ${cfg.bg} overflow-hidden`}>
      <button
        className={`w-full flex items-center gap-2 p-3 text-left ${cfg.color}`}
        onClick={() => setExpanded(e => !e)}
      >
        {cfg.icon}
        <span className="text-xs font-semibold uppercase tracking-wide">{cfg.label}</span>
        <span className="ml-2 font-medium text-gray-900 flex-1">{issue.title}</span>
        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          <div>
            <div className="text-xs font-medium text-gray-600 mb-1">现状描述</div>
            <p className="text-sm text-gray-700">{issue.description}</p>
          </div>
          <div>
            <div className="text-xs font-medium text-gray-600 mb-1">量化差距</div>
            <div className="text-sm font-mono bg-white rounded-lg px-3 py-2 border border-gray-100 text-gray-800">
              {issue.quantitativeGap}
            </div>
          </div>
          {issue.costImpact && (
            <div>
              <div className="text-xs font-medium text-gray-600 mb-1">成本影响</div>
              <p className="text-sm text-gray-700">{issue.costImpact}</p>
            </div>
          )}
          <div>
            <div className="text-xs font-medium text-gray-600 mb-2">建议操作</div>
            <div className="space-y-1.5">
              {issue.suggestions.map((s, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 font-semibold w-4">{'①②③'[idx]}</span>
                  {s.action ? (
                    <button
                      onClick={() => onAction?.(s.action!, s.actionParams)}
                      className="text-sm text-blue-700 hover:text-blue-900 underline decoration-dashed text-left"
                    >
                      {s.label}
                    </button>
                  ) : (
                    <span className="text-sm text-gray-700">{s.label}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface Props {
  report: DiagnosticReport;
  onAction?: (action: string, params?: Record<string, unknown>) => void;
}

export function DiagnosticPanel({ report, onAction }: Props) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-red-600">
          <AlertCircle size={18} />
          <span className="font-semibold">计算失败：当前约束条件下无可行解</span>
        </div>
        <div className="text-xs text-gray-400">
          诊断用时 {report.diagnosisTimeMs}ms · 发现 {report.issues.length} 个问题
        </div>
      </div>

      <div className="space-y-2">
        {report.issues
          .sort((a, b) => {
            const order = { HIGH: 0, MEDIUM: 1, LOW: 2 };
            return order[a.severity] - order[b.severity];
          })
          .map(issue => (
            <IssueCard key={issue.id} issue={issue} onAction={onAction} />
          ))}
      </div>

      {report.comprehensiveSuggestion && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
          <Lightbulb size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <div className="text-xs font-semibold text-blue-700 mb-1">💡 综合建议</div>
            <p className="text-sm text-blue-800">{report.comprehensiveSuggestion}</p>
          </div>
        </div>
      )}
    </div>
  );
}
