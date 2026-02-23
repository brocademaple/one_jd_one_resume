import { useState } from 'react';
import { FileText, Edit3, Save, X, Download, ChevronDown } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Resume } from '../types';
import { updateResume, getExportPdfUrl, getExportMarkdownUrl } from '../api';

interface ResumePanelProps {
  resume: Resume | null;
  onResumeUpdated: (resume: Resume) => void;
}

export function ResumePanel({ resume, onResumeUpdated }: ResumePanelProps) {
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const startEdit = () => {
    if (!resume) return;
    setEditTitle(resume.title || '');
    let content = resume.content;
    content = content.replace(/===RESUME_START===\n?/g, '').replace(/===RESUME_END===\n?/g, '');
    setEditContent(content);
    setEditing(true);
  };

  const handleSave = async () => {
    if (!resume) return;
    setSaving(true);
    try {
      const updated = await updateResume(resume.id, {
        title: editTitle,
        content: editContent,
      });
      onResumeUpdated(updated);
      setEditing(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const getDisplayContent = (content: string) => {
    return content
      .replace(/===RESUME_START===\n?/g, '')
      .replace(/===RESUME_END===\n?/g, '');
  };

  if (!resume) {
    return (
      <div className="flex flex-col h-full bg-gray-50 border-r border-gray-200">
        <div className="panel-header">
          <span className="panel-title">
            <FileText size={16} className="text-green-500" />
            简历内容
          </span>
        </div>
        <div className="flex-1 flex items-center justify-center text-gray-400">
          <div className="text-center">
            <FileText size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">与Agent对话后简历将显示在此</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 border-r border-gray-200">
      {/* Header */}
      <div className="panel-header">
        <div className="panel-title flex-1 min-w-0">
          <FileText size={16} className="text-green-500 flex-shrink-0" />
          {editing ? (
            <input
              className="flex-1 border-b border-primary-400 outline-none text-sm font-semibold text-gray-800 bg-transparent min-w-0"
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              placeholder="简历标题"
            />
          ) : (
            <div className="flex-1 min-w-0">
              <span className="truncate block">{resume.title || `简历 v${resume.version}`}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 ml-2 flex-shrink-0">
          {editing ? (
            <>
              <button
                className="p-1.5 rounded-lg bg-primary-600 text-white hover:bg-primary-700 text-xs px-3 disabled:opacity-50"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? '保存中' : <><Save size={13} className="inline mr-1" />保存</>}
              </button>
              <button
                className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100"
                onClick={() => setEditing(false)}
              >
                <X size={14} />
              </button>
            </>
          ) : (
            <>
              <button
                className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-primary-600"
                onClick={startEdit}
                title="编辑简历"
              >
                <Edit3 size={14} />
              </button>

              {/* Export button */}
              <div className="relative">
                <button
                  className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-green-600 text-xs"
                  onClick={() => setShowExportMenu(!showExportMenu)}
                >
                  <Download size={13} />
                  导出
                  <ChevronDown size={11} />
                </button>
                {showExportMenu && (
                  <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 min-w-[120px]">
                    <a
                      href={getExportPdfUrl(resume.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
                      onClick={() => setShowExportMenu(false)}
                    >
                      导出 PDF
                    </a>
                    <a
                      href={getExportMarkdownUrl(resume.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
                      onClick={() => setShowExportMenu(false)}
                    >
                      导出 Markdown
                    </a>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto" onClick={() => setShowExportMenu(false)}>
        {editing ? (
          <textarea
            className="w-full h-full p-4 text-sm text-gray-700 outline-none resize-none font-mono leading-relaxed bg-white"
            value={editContent}
            onChange={e => setEditContent(e.target.value)}
            placeholder="简历内容（Markdown格式）..."
          />
        ) : (
          <div className="p-4 markdown-content bg-white min-h-full">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {getDisplayContent(resume.content)}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
