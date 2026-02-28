import { useState } from 'react';
import { FileText, Edit3, Save, X, Download, ChevronDown, Expand, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Resume } from '../types';
import { updateResume, getPreviewPdfUrl, downloadResumePdf, downloadResumeWord } from '../api';

interface ResumePanelProps { resume: Resume | null; onResumeUpdated: (resume: Resume) => void; }

export function ResumePanel({ resume, onResumeUpdated }: ResumePanelProps) {
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exporting, setExporting] = useState<'pdf' | 'word' | null>(null);

  const clean = (content: string) => content.replace(/===RESUME_START===\n?/g, '').replace(/===RESUME_END===\n?/g, '');
  const startEdit = () => { if (!resume) return; setEditTitle(resume.title || ''); setEditContent(clean(resume.content)); setEditing(true); };

  if (!resume) return <div className="flex flex-col h-full bg-gray-50 border-r border-gray-200"><div className="panel-header"><span className="panel-title"><FileText size={16} className="text-green-500" />简历内容</span></div></div>;

  return <div className="flex flex-col h-full bg-gray-50 border-r border-gray-200">
    <div className="panel-header">
      <div className="panel-title flex-1 min-w-0"><FileText size={16} className="text-green-500" />{editing ? <input className="flex-1 border-b" value={editTitle} onChange={e => setEditTitle(e.target.value)} /> : <span className="truncate block">{resume.title || `简历 v${resume.version}`}</span>}</div>
      <div className="flex items-center gap-1 ml-2">
        {!editing && <button className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100" title="放大查看（PDF）" onClick={() => window.open(getPreviewPdfUrl(resume.id), '_blank')}><Expand size={14} /></button>}
        {editing ? <><button className="p-1.5 rounded-lg bg-primary-600 text-white" disabled={saving} onClick={async () => { setSaving(true); const updated = await updateResume(resume.id, { title: editTitle, content: editContent }); onResumeUpdated(updated); setSaving(false); setEditing(false); }}>{saving ? '保存中' : <><Save size={13} className="inline mr-1" />保存</>}</button><button className="p-1.5" onClick={() => setEditing(false)}><X size={14} /></button></> : <>
          <button className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100" onClick={startEdit}><Edit3 size={14} /></button>
          <div className="relative">
            <button className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-gray-500 hover:bg-gray-100 text-xs disabled:opacity-70" onClick={() => setShowExportMenu(v => !v)} disabled={!!exporting}>
              {exporting ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
              导出<ChevronDown size={11} />
            </button>
            {showExportMenu && <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 min-w-[120px]">
              <button
                type="button"
                className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 disabled:opacity-50"
                onClick={async () => {
                  setShowExportMenu(false);
                  setExporting('word');
                  try {
                    await downloadResumeWord(resume.id);
                  } catch (e) {
                    alert(e instanceof Error ? e.message : '导出 Word 失败');
                  } finally {
                    setExporting(null);
                  }
                }}
              >
                导出 Word
              </button>
              <button
                type="button"
                className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 disabled:opacity-50"
                onClick={async () => {
                  setShowExportMenu(false);
                  setExporting('pdf');
                  try {
                    await downloadResumePdf(resume.id);
                  } catch (e) {
                    alert(e instanceof Error ? e.message : '导出 PDF 失败');
                  } finally {
                    setExporting(null);
                  }
                }}
              >
                导出 PDF
              </button>
            </div>}
          </div>
        </>}
      </div>
    </div>
    <div className="flex-1 overflow-y-auto" onClick={() => setShowExportMenu(false)}>{editing ? <textarea className="w-full h-full p-4" value={editContent} onChange={e => setEditContent(e.target.value)} /> : <div className="p-4 markdown-content bg-white min-h-full"><ReactMarkdown remarkPlugins={[remarkGfm]}>{clean(resume.content)}</ReactMarkdown></div>}</div>
  </div>;
}
