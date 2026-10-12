import { useState } from 'react';
import { FileText, Edit3, Save, X, Download, ChevronDown, Expand } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Resume } from '../types';
import { updateResume, getPreviewPdfUrl } from '../api';
import { ExportPreviewModal } from './ExportPreviewModal';

interface ResumePanelProps { resume: Resume | null; onResumeUpdated: (resume: Resume) => void; }

export function ResumePanel({ resume, onResumeUpdated }: ResumePanelProps) {
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exportModal, setExportModal] = useState<{ format: 'pdf' | 'word' } | null>(null);

  const clean = (content: string) => content.replace(/===RESUME_START===\n?/g, '').replace(/===RESUME_END===\n?/g, '');
  const startEdit = () => { if (!resume) return; setEditTitle(resume.title || ''); setEditContent(clean(resume.content)); setEditing(true); };

  if (!resume) return <div className="flex flex-col h-full bg-gray-50 border-r border-gray-200"><div className="panel-header"><span className="panel-title"><FileText size={14} className="text-green-500" />简历内容</span></div></div>;

  return <div className="flex flex-col h-full bg-gray-50 border-r border-gray-200">
    <div className="panel-header">
      <div className="panel-title flex-1 min-w-0"><FileText size={14} className="text-green-500 flex-shrink-0" />{editing ? <input className="flex-1 border-b text-sm min-w-0" value={editTitle} onChange={e => setEditTitle(e.target.value)} /> : <span className="truncate block">{resume.title || `简历 v${resume.version}`}</span>}</div>
      <div className="flex items-center gap-0.5 ml-1 flex-shrink-0">
        {!editing && <button className="p-1 rounded-md text-gray-500 hover:bg-gray-100" title="放大查看（PDF）" onClick={() => window.open(getPreviewPdfUrl(resume.id), '_blank')}><Expand size={13} /></button>}
        {editing ? <><button className="p-1 rounded-md bg-primary-600 text-white text-xs px-2" disabled={saving} onClick={async () => { setSaving(true); const updated = await updateResume(resume.id, { title: editTitle, content: editContent }); onResumeUpdated(updated); setSaving(false); setEditing(false); }}>{saving ? '保存中' : <><Save size={12} className="inline mr-0.5" />保存</>}</button><button className="p-1" onClick={() => setEditing(false)}><X size={13} /></button></> : <>
          <button className="p-1 rounded-md text-gray-500 hover:bg-gray-100" onClick={startEdit}><Edit3 size={13} /></button>
          <div className="relative">
            <button className="flex items-center gap-0.5 px-1.5 py-1 rounded-md text-gray-500 hover:bg-gray-100 text-[11px]" onClick={() => setShowExportMenu(v => !v)}>
              <Download size={13} />
              导出<ChevronDown size={11} />
            </button>
            {showExportMenu && <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 min-w-[120px]">
              <button
                type="button"
                className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50"
                onClick={() => { setShowExportMenu(false); setExportModal({ format: 'word' }); }}
              >
                导出 Word
              </button>
              <button
                type="button"
                className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50"
                onClick={() => { setShowExportMenu(false); setExportModal({ format: 'pdf' }); }}
              >
                导出 PDF
              </button>
            </div>}
          </div>
        </>}
      </div>
    </div>
    <div className="flex-1 overflow-y-auto min-h-0" onClick={() => setShowExportMenu(false)}>{editing ? <textarea className="w-full h-full p-3 text-[13px] leading-snug" value={editContent} onChange={e => setEditContent(e.target.value)} /> : <div className="px-3 py-2 markdown-content bg-white min-h-full"><ReactMarkdown remarkPlugins={[remarkGfm]}>{clean(resume.content)}</ReactMarkdown></div>}</div>

    {exportModal && (
      <ExportPreviewModal
        open={true}
        onClose={() => setExportModal(null)}
        format={exportModal.format}
        resumeId={resume.id}
        resumeTitle={resume.title || `简历 v${resume.version}`}
        content={resume.content}
      />
    )}
  </div>;
}
