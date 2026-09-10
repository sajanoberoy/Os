import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Plus,
  Trash2,
  Edit3,
  RefreshCw,
  Search,
  Upload,
  CheckCircle2,
  AlertCircle,
  LogOut,
  MessageSquare,
  Eye,
  X,
  Save,
  Layers,
  Database,
  Shield,
  FileCode,
  Check,
  ChevronRight,
  Sparkles,
  Users,
  Globe,
  Clock,
  Monitor
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AdminDocument, UserProfile } from '../types';

interface AdminPanelProps {
  token: string;
  user: UserProfile;
  onLogout: () => void;
  onSwitchToChat: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  token,
  user,
  onLogout,
  onSwitchToChat,
}) => {
  const [documents, setDocuments] = useState<AdminDocument[]>([]);
  const [totalChunks, setTotalChunks] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Tab Control and Student Statistics states
  const [activeTab, setActiveTab] = useState<'documents' | 'students'>('documents');
  const [students, setStudents] = useState<any[]>([]);
  const [isStudentsLoading, setIsStudentsLoading] = useState<boolean>(false);
  const [studentsSearchQuery, setStudentsSearchQuery] = useState<string>('');

  const [userToDelete, setUserToDelete] = useState<any | null>(null);
  const [userToChangePassword, setUserToChangePassword] = useState<any | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [userActionLoading, setUserActionLoading] = useState(false);


  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [editingDoc, setEditingDoc] = useState<{ filename: string; content: string; originalFilename: string } | null>(null);
  const [viewingDoc, setViewingDoc] = useState<{ filename: string; content: string; title: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // New document form state
  const [newFilename, setNewFilename] = useState<string>('');
  const [newContent, setNewContent] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Test search tester state
  const [testQuery, setTestQuery] = useState<string>('');
  const [testResults, setTestResults] = useState<any[] | null>(null);
  const [isTestingSearch, setIsTestingSearch] = useState<boolean>(false);

  // Fetch documents on mount
  useEffect(() => {
    fetchDocuments();
  }, []);

  // Fetch students directory and analytics
  const fetchStudents = async (silent: boolean = false) => {
    if (!silent) setIsStudentsLoading(true);
    try {
      const res = await fetch('/api/admin/students', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.students) {
        setStudents(data.students);
      } else {
        if (!silent) showNotification(data.error || 'Failed to load students directory', 'error');
      }
    } catch (err: any) {
      if (!silent) showNotification('Network error while loading students', 'error');
    } finally {
      if (!silent) setIsStudentsLoading(false);
    }
  };

  // Poll students when active tab is active for real-time online updates!
  useEffect(() => {
    if (activeTab === 'students') {
      fetchStudents(false);
      const interval = setInterval(() => fetchStudents(true), 8000);
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  const showNotification = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMessage({ text, type });
    setTimeout(() => {
      setStatusMessage(null);
    }, 4000);
  };

  const handleDeleteUser = async (userId: string) => {
    setUserActionLoading(true);
    try {
      const res = await fetch(`/api/admin/students/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        showNotification('User deleted successfully');
        setUserToDelete(null);
        fetchStudents(true);
      } else {
        showNotification(data.error || 'Failed to delete user', 'error');
      }
    } catch (err: any) {
      showNotification(err.message, 'error');
    } finally {
      setUserActionLoading(false);
    }
  };

  const handleChangePassword = async (userId: string) => {
    if (!newPassword || newPassword.length < 6) {
      showNotification('Password must be at least 6 characters', 'error');
      return;
    }
    setUserActionLoading(true);
    try {
      const res = await fetch(`/api/admin/students/${userId}/password`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ newPassword })
      });
      const data = await res.json();
      if (data.success) {
        showNotification('Password updated successfully');
        setUserToChangePassword(null);
        setNewPassword('');
      } else {
        showNotification(data.error || 'Failed to update password', 'error');
      }
    } catch (err: any) {
      showNotification(err.message, 'error');
    } finally {
      setUserActionLoading(false);
    }
  };

  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/documents', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.documents) {
        setDocuments(data.documents);
        setTotalChunks(data.totalChunks || 0);
      } else {
        showNotification(data.error || 'Failed to load documents', 'error');
      }
    } catch (err: any) {
      showNotification('Network error while loading documents', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReindex = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/admin/reindex', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        showNotification(`Knowledge base synced! ${data.result.chunksCount} chunks across ${data.result.documentsCount} documents indexed.`);
        await fetchDocuments();
      } else {
        showNotification(data.error || 'Re-index failed', 'error');
      }
    } catch (err: any) {
      showNotification('Re-index connection error', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = async (filename: string) => {
    try {
      const res = await fetch(`/api/admin/documents/${encodeURIComponent(filename)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setEditingDoc({
          filename: data.filename,
          originalFilename: data.filename,
          content: data.content,
        });
      } else {
        showNotification(data.error || 'Failed to load document content', 'error');
      }
    } catch (err: any) {
      showNotification('Error loading document content', 'error');
    }
  };

  // Open View Modal
  const handleOpenView = async (doc: AdminDocument) => {
    try {
      const res = await fetch(`/api/admin/documents/${encodeURIComponent(doc.filename)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setViewingDoc({
          filename: data.filename,
          content: data.content,
          title: doc.title,
        });
      } else {
        showNotification(data.error || 'Failed to load file', 'error');
      }
    } catch (err: any) {
      showNotification('Error opening document preview', 'error');
    }
  };

  // Save Edited Document
  const handleSaveEdit = async () => {
    if (!editingDoc) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/documents/${encodeURIComponent(editingDoc.originalFilename)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: editingDoc.content,
          newFilename: editingDoc.filename,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification(`Updated & re-indexed '${editingDoc.filename}' successfully!`);
        setEditingDoc(null);
        await fetchDocuments();
      } else {
        showNotification(data.error || 'Failed to update document', 'error');
      }
    } catch (err: any) {
      showNotification('Error updating document', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Document
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/documents/${encodeURIComponent(deleteTarget)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        showNotification(`Document '${deleteTarget}' deleted and removed from RAG index.`);
        setDeleteTarget(null);
        await fetchDocuments();
      } else {
        showNotification(data.error || 'Failed to delete document', 'error');
      }
    } catch (err: any) {
      showNotification('Error deleting document', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Create New Document
  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFilename.trim() || !newContent.trim()) {
      setUploadError('Please provide both a filename and document content.');
      return;
    }

    setIsSubmitting(true);
    setUploadError(null);

    try {
      const res = await fetch('/api/admin/documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          filename: newFilename.trim(),
          content: newContent,
        }),
      });
      const data = await res.json();

      if (data.success) {
        showNotification(`Created & indexed new document: ${data.filename}`);
        setIsAddModalOpen(false);
        setNewFilename('');
        setNewContent('');
        await fetchDocuments();
      } else {
        setUploadError(data.error || 'Failed to create document');
      }
    } catch (err: any) {
      setUploadError('Connection error while saving document');
    } finally {
      setIsSubmitting(false);
    }
  };

  // File Upload Handler (Drag & Drop or File Selection)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const cleanName = file.name.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
      setNewFilename(cleanName);
      setNewContent(content);
      setUploadError(null);
    };
    reader.onerror = () => {
      setUploadError('Failed to read file content.');
    };
    reader.readAsText(file);
  };

  // Test Retrieval Sandbox
  const handleTestSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testQuery.trim()) return;
    setIsTestingSearch(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ question: testQuery }),
      });
      const data = await res.json();
      setTestResults(data.sources || []);
    } catch (err: any) {
      showNotification('Error testing retrieval', 'error');
    } finally {
      setIsTestingSearch(false);
    }
  };

  const filteredDocs = documents.filter(doc =>
    doc.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.preview.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Top Admin Header */}
      <header className="bg-slate-900 text-white px-6 py-3.5 border-b border-slate-800 flex items-center justify-between sticky top-0 z-20 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 font-bold flex items-center justify-center text-xs text-white shadow-xs">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-sm text-white tracking-tight">Campus AI Admin Console</h1>
              <span className="bg-blue-500/20 text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-400/30">
                Source Manager
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Knowledge Base & RAG Document Sources</p>
          </div>
        </div>

        {/* Global Action Tools */}
        <div className="flex items-center gap-2.5">
          {/* Quick RAG Index Stats */}
          <div className="hidden lg:flex items-center gap-3 bg-slate-800/80 px-3 py-1.5 rounded-lg text-xs border border-slate-700/60 mr-2">
            <div className="flex items-center gap-1.5 text-slate-300">
              <FileText className="w-3.5 h-3.5 text-blue-400" />
              <span>{documents.length} Source Documents</span>
            </div>
            <span className="text-slate-600">•</span>
            <div className="flex items-center gap-1.5 text-slate-300">
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              <span>{totalChunks} Indexed Chunks</span>
            </div>
          </div>

          {/* Sync & Reindex Button */}
          <button
            onClick={handleReindex}
            disabled={isSyncing}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
            title="Re-chunk and update embeddings for all files"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${isSyncing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{isSyncing ? 'Syncing...' : 'Sync Index'}</span>
          </button>

          {/* Switch to Student Chat View */}
          <button
            onClick={onSwitchToChat}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-xs"
            title="Test chatbot as student"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Open Chatbot</span>
          </button>

          <div className="h-4 w-px bg-slate-700 mx-1"></div>

          {/* Admin User info & logout */}
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <span className="hidden sm:inline font-medium text-slate-400">{user.email}</span>
            <button
              onClick={onLogout}
              className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-md transition-colors cursor-pointer"
              title="Log out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Admin Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Floating / Banner Notification */}
        <AnimatePresence>
          {statusMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`p-3.5 rounded-xl border flex items-center gap-2.5 text-xs font-medium shadow-sm ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              )}
              <span className="flex-1">{statusMessage.text}</span>
              <button
                onClick={() => setStatusMessage(null)}
                className="p-1 hover:bg-black/5 rounded cursor-pointer"
              >
                <X className="w-3.5 h-3.5 opacity-60" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab('documents')}
            className={`flex items-center gap-2 px-5 py-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${
              activeTab === 'documents'
                ? 'border-blue-600 text-blue-600 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>RAG Knowledge Base ({documents.length})</span>
          </button>
          
          <button
            onClick={() => setActiveTab('students')}
            className={`flex items-center gap-2 px-5 py-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${
              activeTab === 'students'
                ? 'border-blue-600 text-blue-600 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Registered Students Directory ({students.length})</span>
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
            </span>
          </button>
        </div>

        {activeTab === 'documents' ? (
          <>
            {/* Section 1: Top Controls & Search */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900 tracking-tight">
                    Knowledge Base Source Files
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Manage handbooks, policies, and regulations ingested by the AI chatbot. Any change automatically updates the search index.
                  </p>
                </div>

                <button
                  onClick={() => {
                    setNewFilename('');
                    setNewContent('');
                    setUploadError(null);
                    setIsAddModalOpen(true);
                  }}
                  className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add New Source Document</span>
                </button>
              </div>

              {/* Search bar */}
              <div className="flex items-center gap-3">
                <div className="flex-1 flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm">
                  <Search className="w-4 h-4 text-slate-400 shrink-0" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filter source documents by title, filename, or keywords..."
                    className="w-full bg-transparent border-none outline-none text-xs text-slate-800 placeholder:text-slate-400 font-normal focus:ring-0"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <button
                  onClick={() => {}}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs shrink-0"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Search</span>
                </button>
              </div>
            </div>

            {/* Section 2: Documents Grid / List */}
            {isLoading ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-3">
                <RefreshCw className="w-6 h-6 text-blue-600 animate-spin mx-auto" />
                <p className="text-xs font-semibold text-slate-600">Loading ingested knowledge sources...</p>
              </div>
            ) : filteredDocs.length === 0 ? (
              <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center space-y-3">
                <FileText className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-sm font-semibold text-slate-700">No documents found matching "{searchQuery}"</p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Add your first handbook or policy file using the "Add New Source Document" button above.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredDocs.map((doc) => (
                  <div
                    key={doc.filename}
                    className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs hover:shadow-sm hover:border-blue-200 transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 border border-blue-100">
                            <FileCode className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-xs font-bold text-slate-900 truncate" title={doc.title}>
                              {doc.title}
                            </h3>
                            <span className="text-[11px] font-mono text-slate-400 truncate block">
                              {doc.filename}
                            </span>
                          </div>
                        </div>

                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                          {doc.chunkCount} {doc.chunkCount === 1 ? 'chunk' : 'chunks'}
                        </span>
                      </div>

                      {/* Document snippet preview */}
                      <p className="text-xs text-slate-600 line-clamp-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100 font-normal leading-relaxed mb-4">
                        {doc.preview || 'No text preview available.'}
                      </p>
                    </div>

                    {/* Metadata & Actions Footer */}
                    <div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100 mb-3">
                        <span>{(doc.sizeBytes / 1024).toFixed(1)} KB • {doc.linesCount} lines</span>
                        <span>{new Date(doc.modifiedAt).toLocaleDateString()}</span>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <button
                          onClick={() => handleOpenView(doc)}
                          className="flex items-center justify-center gap-1 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                          title="Inspect full document"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-500" />
                          <span>View</span>
                        </button>

                        <button
                          onClick={() => handleOpenEdit(doc.filename)}
                          className="flex items-center justify-center gap-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                          title="Edit document text"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                          <span>Edit</span>
                        </button>

                        <button
                          onClick={() => setDeleteTarget(doc.filename)}
                          className="flex items-center justify-center gap-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                          title="Delete document"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-600" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Section 3: Live RAG Retrieval Testing Sandbox */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <h2 className="text-sm font-bold text-slate-900">RAG Verification Sandbox</h2>
              </div>
              <p className="text-xs text-slate-500">
                Test how queries match against your updated documents. Check the source chunks and relevance scores in real time.
              </p>

              <form onSubmit={handleTestSearch} className="flex gap-2">
                <input
                  type="text"
                  value={testQuery}
                  onChange={(e) => setTestQuery(e.target.value)}
                  placeholder="Enter a test question (e.g. 'What is the attendance policy?' or 'How do I pay hostel fees?')"
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                />
                <button
                  type="submit"
                  disabled={isTestingSearch || !testQuery.trim()}
                  className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer disabled:opacity-60 flex items-center gap-1.5 shrink-0"
                >
                  {isTestingSearch ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                  <span>Test Query</span>
                </button>
              </form>

              {testResults && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Retrieved Source Citations ({testResults.length}):
                  </div>
                  {testResults.length === 0 ? (
                    <p className="text-xs text-amber-700 bg-amber-50 p-3 rounded-xl border border-amber-200">
                      No matching document chunks found with sufficient relevance score.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {testResults.map((res: any, idx: number) => (
                        <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800 truncate">{res.title}</span>
                            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 bg-blue-100 text-blue-800 rounded">
                              Score: {(res.relevanceScore * 100).toFixed(0)}%
                            </span>
                          </div>
                          <p className="text-slate-600 text-[11px] line-clamp-2 leading-relaxed">{res.snippet}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          /* Students Tab */
          <div className="space-y-6">
            {/* Real-time Statistics Header Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Stat 1: Total Registered */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] font-medium text-slate-500 block uppercase tracking-wider">Total Registered</span>
                  <span className="text-2xl font-black text-slate-900 leading-none">{students.length}</span>
                  <span className="text-[10px] text-slate-400 block mt-1">student profiles</span>
                </div>
              </div>

              {/* Stat 2: Active Now (Online within last 2 mins) */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs flex items-center gap-4 relative overflow-hidden">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shrink-0 relative">
                  <span className="absolute top-1 right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <RefreshCw className="w-5 h-5 animate-spin-slow" />
                </div>
                <div>
                  <span className="text-[11px] font-medium text-slate-500 block uppercase tracking-wider">Live Active Now</span>
                  <span className="text-2xl font-black text-slate-900 leading-none">
                    {students.filter(s => Date.now() - new Date(s.lastActive).getTime() < 120000).length}
                  </span>
                  <span className="text-[10px] text-emerald-600 font-semibold block mt-1 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                    <span>Monitoring Real-time</span>
                  </span>
                </div>
              </div>

              {/* Stat 3: Verified Accounts */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] font-medium text-slate-500 block uppercase tracking-wider">Email Verified</span>
                  <span className="text-2xl font-black text-slate-900 leading-none">
                    {students.filter(s => s.verified).length}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-1">
                    {students.filter(s => !s.verified).length} pending verification
                  </span>
                </div>
              </div>

              {/* Stat 4: AI Queries Asked */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100 shrink-0">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] font-medium text-slate-500 block uppercase tracking-wider">Total AI Chat Queries</span>
                  <span className="text-2xl font-black text-slate-900 leading-none">
                    {students.reduce((acc, curr) => acc + (curr.questionsCount || 0), 0)}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-1">asked across handbook</span>
                </div>
              </div>
            </div>

            {/* Student Directory Panel */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Student Directory & Traffic Log</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">Real-time session tracker logging connection details, IP addresses, verification status, and AI query usage.</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fetchStudents(false)}
                    disabled={isStudentsLoading}
                    className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isStudentsLoading ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </button>
                </div>
              </div>

              {/* Filter controls */}
              <div className="px-5 py-3 bg-slate-50/50 border-b border-slate-100 flex items-center gap-3">
                <div className="flex-1 flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3.5 py-2 shadow-2xs">
                  <Search className="w-4 h-4 text-slate-400 shrink-0" />
                  <input
                    type="text"
                    value={studentsSearchQuery}
                    onChange={(e) => setStudentsSearchQuery(e.target.value)}
                    placeholder="Search users by name or email address..."
                    className="w-full bg-transparent border-none outline-none text-xs text-slate-800 placeholder:text-slate-400 font-normal focus:ring-0"
                  />
                  {studentsSearchQuery && (
                    <button onClick={() => setStudentsSearchQuery('')} className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer">
                      Clear
                    </button>
                  )}
                </div>
                <button
                  onClick={() => {}}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs shrink-0"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Search</span>
                </button>
              </div>

              {/* Directory Content */}
              {isStudentsLoading && students.length === 0 ? (
                <div className="p-12 text-center space-y-3">
                  <RefreshCw className="w-6 h-6 text-blue-600 animate-spin mx-auto" />
                  <p className="text-xs font-semibold text-slate-600">Loading student profiles & connections...</p>
                </div>
              ) : students.length === 0 ? (
                <div className="p-12 text-center text-slate-400 space-y-2">
                  <Users className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="text-xs font-bold text-slate-700">No students registered yet</p>
                  <p className="text-[11px] text-slate-400">New student sign-ups will populate this directory in real time.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        <th className="py-3 px-5">Student</th>
                        <th className="py-3 px-4">Verification</th>
                        <th className="py-3 px-4">Activity Status</th>
                        <th className="py-3 px-4">AI Queries</th>
                        <th className="py-3 px-4">Network Info</th>
                        <th className="py-3 px-5">Signed Up At</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                      {students
                        .filter(s => {
                          const query = studentsSearchQuery.toLowerCase();
                          return (
                            s.name.toLowerCase().includes(query) ||
                            s.email.toLowerCase().includes(query) ||
                            s.ipAddress.toLowerCase().includes(query) ||
                            s.userAgent.toLowerCase().includes(query)
                          );
                        })
                        .map(student => {
                          const isOnlineNow = Date.now() - new Date(student.lastActive).getTime() < 120000;
                          
                          // Simple parse user agent
                          const browser = student.userAgent.includes('Chrome') && student.userAgent.includes('Safari') && !student.userAgent.includes('Edg')
                            ? 'Chrome' : student.userAgent.includes('Safari') && !student.userAgent.includes('Chrome')
                            ? 'Safari' : student.userAgent.includes('Firefox')
                            ? 'Firefox' : student.userAgent.includes('Edg')
                            ? 'Edge' : 'Browser';

                          const os = student.userAgent.includes('Windows')
                            ? 'Windows' : student.userAgent.includes('Macintosh') || student.userAgent.includes('Mac OS')
                            ? 'macOS' : student.userAgent.includes('Linux')
                            ? 'Linux' : student.userAgent.includes('Android')
                            ? 'Android' : student.userAgent.includes('iPhone') || student.userAgent.includes('iPad')
                            ? 'iOS' : 'OS';

                          // Capital letters for Avatar
                          const initials = student.name
                            .split(' ')
                            .map((n: string) => n[0])
                            .slice(0, 2)
                            .join('')
                            .toUpperCase();

                          return (
                            <tr key={student.userId} className="hover:bg-slate-50/50 transition-colors">
                              {/* 1. Student Identity */}
                              <td className="py-4 px-5">
                                <div className="flex items-center gap-3">
                                  <div className="w-8.5 h-8.5 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-extrabold flex items-center justify-center text-xs shadow-2xs shrink-0">
                                    {initials || 'ST'}
                                  </div>
                                  <div>
                                    <div className="font-bold text-slate-950 text-xs leading-snug">{student.name}</div>
                                    <div className="text-[11px] text-slate-400 font-medium">{student.email}</div>
                                  </div>
                                </div>
                              </td>

                              {/* 2. Verification */}
                              <td className="py-4 px-4">
                                {student.verified ? (
                                  <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                                    <Check className="w-3 h-3 text-emerald-600" />
                                    <span>Verified</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200">
                                    <Clock className="w-3 h-3 text-amber-600 animate-pulse" />
                                    <span>Pending</span>
                                  </span>
                                )}
                              </td>

                              {/* 3. Activity Status */}
                              <td className="py-4 px-4">
                                {isOnlineNow ? (
                                  <span className="inline-flex items-center gap-1.5 font-bold text-emerald-600 text-xs">
                                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
                                    <span>Online</span>
                                  </span>
                                ) : (
                                  <div className="space-y-0.5">
                                    <div className="text-slate-400 text-xs font-semibold">Offline</div>
                                    <div className="text-[10px] text-slate-400 leading-none">
                                      Active {(() => {
                                        const diff = Date.now() - new Date(student.lastActive).getTime();
                                        if (diff < 60000) return 'just now';
                                        const mins = Math.floor(diff / 60000);
                                        if (mins < 60) return `${mins}m ago`;
                                        const hrs = Math.floor(mins / 60);
                                        if (hrs < 24) return `${hrs}h ago`;
                                        return new Date(student.lastActive).toLocaleDateString();
                                      })()}
                                    </div>
                                  </div>
                                )}
                              </td>

                              {/* 4. Questions count */}
                              <td className="py-4 px-4">
                                <div className="inline-flex items-center gap-1 bg-purple-50 text-purple-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-purple-200">
                                  <span>{student.questionsCount || 0}</span>
                                  <span className="text-purple-400 font-medium">queries</span>
                                </div>
                              </td>

                              {/* 5. Network Identity (IP & OS/Browser) */}
                              <td className="py-4 px-4 space-y-1">
                                <div className="flex items-center gap-1 text-[11px] font-mono font-semibold text-slate-600">
                                  <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  <span>{student.ipAddress}</span>
                                </div>
                                <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                                  <Monitor className="w-3 h-3 text-slate-300 shrink-0" />
                                  <span>{browser} ({os})</span>
                                </div>
                              </td>

                              {/* 6. Signed Up */}
                              <td className="py-4 px-5 text-slate-500 text-[11px]">
                                <div>{new Date(student.createdAt).toLocaleDateString()}</div>
                                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                  {new Date(student.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>

                              </td>
                              
                              {/* 7. Actions */}
                              <td className="py-4 px-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => setUserToChangePassword(student)}
                                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                    title="Change Password"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                                  </button>
                                  <button
                                    onClick={() => setUserToDelete(student)}
                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                    title="Delete User"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                                  </button>
                                </div>
                              </td>
                            </tr>

                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      
      {/* MODAL: DELETE USER */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white border border-slate-200 rounded-2xl w-full max-w-md flex flex-col shadow-xl overflow-hidden"
          >
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-red-50/50">
              <h3 className="font-bold text-red-700 text-lg">Delete User</h3>
              <button onClick={() => setUserToDelete(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-700 leading-relaxed mb-4">
                Are you sure you want to permanently delete <strong>{userToDelete.name}</strong> ({userToDelete.email})? 
                This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setUserToDelete(null)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 transition-colors cursor-pointer"
                  disabled={userActionLoading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteUser(userToDelete.userId)}
                  disabled={userActionLoading}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 border border-transparent transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {userActionLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                  Delete User
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* MODAL: CHANGE PASSWORD */}
      {userToChangePassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white border border-slate-200 rounded-2xl w-full max-w-md flex flex-col shadow-xl overflow-hidden"
          >
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-lg">Change Password</h3>
              <button onClick={() => { setUserToChangePassword(null); setNewPassword(''); }} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-600 mb-4">
                Set a new password for <strong>{userToChangePassword.name}</strong> ({userToChangePassword.email}).
              </p>
              
              <div className="mb-6">
                <label className="block text-xs font-semibold text-slate-700 mb-2">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min 6 chars)"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  autoFocus
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => { setUserToChangePassword(null); setNewPassword(''); }}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 transition-colors cursor-pointer"
                  disabled={userActionLoading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleChangePassword(userToChangePassword.userId)}
                  disabled={userActionLoading || !newPassword || newPassword.length < 6}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 border border-transparent transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {userActionLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                  Save Password
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ADD NEW SOURCE DOCUMENT */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-xl"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Add New Source Document</h2>
                  <p className="text-[11px] text-slate-500">Provide document text or upload a .txt / .md file</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleCreateDocument} className="flex-1 overflow-y-auto p-6 space-y-4">
              {uploadError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              {/* Upload file trigger */}
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".txt,.md,.json,.csv"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-xl p-4 text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-blue-50/20 group"
                >
                  <Upload className="w-5 h-5 text-slate-400 group-hover:text-blue-600 mx-auto mb-1 transition-colors" />
                  <p className="text-xs font-semibold text-slate-700">Click to upload file from your computer</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Supports .txt, .md, .json text documents</p>
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  File Name <span className="text-slate-400 font-normal">(e.g. course_registration_rules.txt)</span>
                </label>
                <input
                  type="text"
                  value={newFilename}
                  onChange={(e) => setNewFilename(e.target.value)}
                  placeholder="library_policy_2026.txt"
                  required
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Document Content & Policy Text
                  </label>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {newContent.length} chars • {newContent.split('\n').length} lines
                  </span>
                </div>
                <textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  rows={10}
                  placeholder={`# University Policy Title\n\nSECTION 1: GENERAL OVERVIEW\nWrite or paste the official document regulations here...\n\nSECTION 2: REQUIREMENTS\n- Minimum criteria...\n- Working hours...`}
                  required
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 resize-y"
                />
              </div>

              <div className="bg-blue-50/60 border border-blue-200/60 p-3 rounded-xl text-[11px] text-blue-900 leading-relaxed">
                💡 <strong>Tip:</strong> You can divide sections using headings (`# Section Title` or `SECTION 1:`) to help the RAG engine generate pinpoint citations.
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newFilename || !newContent}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {isSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>Save & Index Document</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: EDIT EXISTING SOURCE DOCUMENT */}
      {/* ========================================================================= */}
      {editingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white border border-slate-200 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-xl"
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Edit Source Document</h2>
                  <p className="text-[11px] font-mono text-slate-500">{editingDoc.originalFilename}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingDoc(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Filename
                </label>
                <input
                  type="text"
                  value={editingDoc.filename}
                  onChange={(e) => setEditingDoc({ ...editingDoc, filename: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Document Text Content
                  </label>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {editingDoc.content.length} chars • {editingDoc.content.split('\n').length} lines
                  </span>
                </div>
                <textarea
                  value={editingDoc.content}
                  onChange={(e) => setEditingDoc({ ...editingDoc, content: e.target.value })}
                  rows={14}
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 resize-y"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingDoc(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={isSubmitting || !editingDoc.content}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {isSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>Save Changes & Re-Index</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: VIEW DOCUMENT PREVIEW */}
      {/* ========================================================================= */}
      {viewingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white border border-slate-200 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-xl"
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                  <Eye className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">{viewingDoc.title}</h2>
                  <p className="text-[11px] font-mono text-slate-400">{viewingDoc.filename}</p>
                </div>
              </div>
              <button
                onClick={() => setViewingDoc(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <pre className="text-xs text-slate-800 font-mono bg-slate-50 border border-slate-200 rounded-xl p-4 whitespace-pre-wrap leading-relaxed">
                {viewingDoc.content}
              </pre>
            </div>

            <div className="px-6 py-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setViewingDoc(null)}
                className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: CONFIRM DELETE */}
      {/* ========================================================================= */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-xl space-y-4"
          >
            <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900">Delete Knowledge Source?</h3>
              <p className="text-xs text-slate-500">
                Are you sure you want to permanently delete <strong className="font-mono text-slate-800">{deleteTarget}</strong>?
                This will remove all associated chunks from the chatbot's knowledge base.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isSubmitting}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                {isSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>Yes, Delete Document</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
