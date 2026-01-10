
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Calendar, 
  BarChart2, 
  ChevronRight, 
  ArrowLeft, 
  Trash2, 
  UserPlus,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Home,
  Download,
  FileText,
  Database,
  Edit3,
  History,
  Filter,
  FileDown,
  Settings,
  Globe,
  FileSpreadsheet
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { AttendanceStatus, Attendee, Event, ViewState, Person } from './types';

// --- HELPERS ---

const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('pt-BR');
};

const getEventsInPeriod = (allEvents: Event[], title: string | null, period: 'current' | 'monthly' | 'quarterly' | 'semiannual' | 'final' | 'global') => {
  let baseEvents = period === 'global' ? allEvents : allEvents.filter(e => e.name === title);
  
  if (baseEvents.length === 0) return [];
  
  if (period === 'final' || period === 'global') {
    return [...baseEvents].sort((a, b) => a.date.localeCompare(b.date));
  }

  const sorted = [...baseEvents].sort((a, b) => b.date.localeCompare(a.date));
  const referenceEvent = sorted[0];
  
  if (period === 'current') return [referenceEvent];

  const refDate = new Date(referenceEvent.date + 'T00:00:00');
  
  const filtered = baseEvents.filter(e => {
    const eDate = new Date(e.date + 'T00:00:00');
    const diffMonths = (refDate.getFullYear() - eDate.getFullYear()) * 12 + (refDate.getMonth() - eDate.getMonth());
    
    if (period === 'monthly') return diffMonths === 0;
    if (period === 'quarterly') return diffMonths >= 0 && diffMonths < 3;
    if (period === 'semiannual') return diffMonths >= 0 && diffMonths < 6;
    return false;
  });

  return filtered.sort((a, b) => a.date.localeCompare(b.date));
};

// --- COMPONENTS ---

const Logo = () => (
  <div className="flex items-center gap-2">
    <div className="bg-white p-1 rounded-xl shadow-sm">
      <img 
        src="https://generativelanguage.googleapis.com/v1beta/files/input_file_0.png" 
        alt="CHECK - GL Logo" 
        className="h-10 w-auto object-contain"
      />
    </div>
  </div>
);

const Header: React.FC<{ title: string | React.ReactNode, showBack?: boolean, onBack?: () => void, actions?: React.ReactNode }> = ({ title, showBack, onBack, actions }) => (
  <header className="sticky top-0 z-20 bg-[#001f3f] text-white p-4 shadow-md flex items-center justify-between">
    <div className="flex items-center gap-3 overflow-hidden">
      {showBack && (
        <button onClick={(e) => { e.stopPropagation(); onBack?.(); }} className="p-1 hover:bg-white/10 rounded-full transition-colors flex-shrink-0">
          <ArrowLeft size={24} />
        </button>
      )}
      <div className="truncate font-bold text-xl">{title}</div>
    </div>
    <div className="flex items-center gap-2">
      {actions}
    </div>
  </header>
);

const StatusBtn: React.FC<{ active: boolean, color: 'emerald' | 'rose' | 'amber', onClick: () => void, children: React.ReactNode }> = ({ active, color, onClick, children }) => {
  const colors = {
    emerald: active ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-emerald-600 border-emerald-100',
    rose: active ? 'bg-rose-600 text-white border-rose-600' : 'bg-white text-rose-600 border-rose-100',
    amber: active ? 'bg-amber-600 text-white border-amber-600' : 'bg-white text-amber-600 border-amber-100'
  };
  return (
    <button onClick={onClick} className={`flex items-center justify-center gap-1 py-2 px-1 rounded-2xl border font-bold text-[10px] transition-all ${colors[color]}`}>
      {children}
    </button>
  );
};

const EventFormView: React.FC<{ 
  onCancel: () => void, 
  onSubmit: (name: string, date: string, importPeople?: boolean) => void, 
  onDelete?: () => void,
  initialData?: Event | null,
  baseCount: number
}> = ({ onCancel, onSubmit, onDelete, initialData, baseCount }) => {
  const [name, setName] = useState(initialData?.name || '');
  const [date, setDate] = useState(initialData?.date || new Date().toISOString().split('T')[0]);
  const [importPeople, setImportPeople] = useState(true);

  return (
    <div className="flex-1 flex flex-col h-full bg-white animate-in slide-in-from-right">
      <Header title={initialData ? "Editar Registro" : "Novo Registro"} showBack onBack={onCancel} />
      <div className="p-6 space-y-6">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Título</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Ensaio de Louvor" className="w-full bg-gray-50 border-none p-4 rounded-3xl text-lg font-bold outline-none focus:ring-2 ring-indigo-500/20" />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Data</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-gray-50 border-none p-4 rounded-3xl text-lg font-bold outline-none" />
        </div>
        {!initialData && (
          <div className="bg-indigo-50 p-6 rounded-[32px] border border-indigo-100 flex items-center justify-between">
            <div className="flex-1">
              <h4 className="font-bold text-indigo-900 text-sm">Importar Base ({baseCount})</h4>
              <p className="text-[10px] text-indigo-500 font-bold uppercase">Iniciar com nomes registrados</p>
            </div>
            <button onClick={() => setImportPeople(!importPeople)} className={`w-12 h-6 rounded-full transition-colors relative ${importPeople ? 'bg-indigo-600' : 'bg-gray-300'}`}>
               <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${importPeople ? 'left-7' : 'left-1'}`} />
            </button>
          </div>
        )}
        <div className="pt-4 space-y-3">
          <button onClick={() => name && date && onSubmit(name, date, importPeople)} className="w-full bg-indigo-600 text-white font-black py-5 rounded-[32px] shadow-xl shadow-indigo-200 active:scale-95 transition-all">SALVAR REGISTRO</button>
          {onDelete && (
             <button onClick={onDelete} className="w-full py-4 text-rose-500 font-bold uppercase text-[10px] flex items-center justify-center gap-2"><Trash2 size={14}/> Excluir Permanente</button>
          )}
        </div>
      </div>
    </div>
  );
};

const BottomNav: React.FC<{ active: ViewState, onChange: (v: ViewState) => void }> = ({ active, onChange }) => (
  <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-1 py-2 flex justify-around items-center z-20">
    <button onClick={() => onChange('events')} className={`flex flex-col items-center gap-1 flex-1 ${active === 'events' ? 'text-indigo-600' : 'text-gray-400'}`}>
      <Home size={20} />
      <span className="text-[9px] font-bold">Início</span>
    </button>
    <button onClick={() => onChange('database')} className={`flex flex-col items-center gap-1 flex-1 ${active === 'database' ? 'text-indigo-600' : 'text-gray-400'}`}>
      <Database size={20} />
      <span className="text-[9px] font-bold">Base</span>
    </button>
    <button onClick={() => onChange('reports')} className={`flex flex-col items-center gap-1 flex-1 ${active === 'reports' ? 'text-indigo-600' : 'text-gray-400'}`}>
      <FileDown size={20} />
      <span className="text-[9px] font-bold">Exportar</span>
    </button>
    <button onClick={() => onChange('global')} className={`flex flex-col items-center gap-1 flex-1 ${active === 'global' ? 'text-indigo-600' : 'text-gray-400'}`}>
      <Globe size={20} />
      <span className="text-[9px] font-bold">Todos</span>
    </button>
    <button onClick={() => onChange('stats')} className={`flex flex-col items-center gap-1 flex-1 ${active === 'stats' ? 'text-indigo-600' : 'text-gray-400'}`}>
      <BarChart2 size={20} />
      <span className="text-[9px] font-bold">Geral</span>
    </button>
  </nav>
);

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('events');
  const [events, setEvents] = useState<Event[]>(() => {
    const saved = localStorage.getItem('presencatotal_events');
    return saved ? JSON.parse(saved) : [];
  });
  const [people, setPeople] = useState<Person[]>(() => {
    const saved = localStorage.getItem('presencatotal_people');
    if (!saved) return [];
    const parsed: Person[] = JSON.parse(saved);
    return parsed.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  });

  const [headerInfo, setHeaderInfo] = useState(() => {
    const saved = localStorage.getItem('presencatotal_header');
    return saved ? JSON.parse(saved) : {
      louvorPolo: '',
      pastor: '',
      resp1: '',
      resp2: '',
      secretaria: ''
    };
  });

  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportTargetTitle, setExportTargetTitle] = useState<string | null>(null);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'xlsx' | null>(null);

  useEffect(() => {
    localStorage.setItem('presencatotal_events', JSON.stringify(events));
  }, [events]);

  useEffect(() => {
    localStorage.setItem('presencatotal_people', JSON.stringify(people));
  }, [people]);

  useEffect(() => {
    localStorage.setItem('presencatotal_header', JSON.stringify(headerInfo));
  }, [headerInfo]);

  const selectedEvent = useMemo(() => events.find(e => e.id === selectedEventId) || null, [events, selectedEventId]);

  const uniqueTitles = useMemo(() => {
    const titles = events.map(e => e.name);
    return Array.from(new Set(titles)).sort();
  }, [events]);

  const generatePDF = (title: string | null, period: 'current' | 'monthly' | 'quarterly' | 'semiannual' | 'final' | 'global') => {
    const filteredEvents = getEventsInPeriod(events, title, period);
    if (filteredEvents.length === 0) return;

    const doc = new jsPDF('landscape');
    const now = new Date().toLocaleDateString('pt-BR');
    
    doc.setFillColor(0, 31, 63); 
    doc.rect(0, 0, 297, 50, 'F');
    doc.setTextColor(255, 255, 255);
    
    doc.setFontSize(20);
    doc.text(`Relatório de Assiduidade - ${period === 'global' ? 'Geral' : title}`, 14, 18);
    
    doc.setFontSize(8);
    doc.text(`Grupo de Louvor/Pólo: ${headerInfo.louvorPolo || '-'} | Pastor: ${headerInfo.pastor || '-'}`, 14, 28);
    doc.text(`1º Resp: ${headerInfo.resp1 || '-'} | 2º Resp: ${headerInfo.resp2 || '-'} | Secretaria(o): ${headerInfo.secretaria || '-'}`, 14, 34);
    doc.text(`Data: ${now} | Eventos Processados: ${filteredEvents.length}`, 14, 42);

    const tableHeader = ['Nome', ...filteredEvents.map(e => `${formatDate(e.date)}\n${e.name}`), 'P', 'F', 'J'];
    const tableBody = people.map(p => {
      let counts = { p: 0, f: 0, j: 0 };
      const rowStatuses = filteredEvents.map(e => {
        const attendee = e.attendees.find(a => a.name === p.name);
        if (!attendee) return '-';
        if (attendee.status === AttendanceStatus.PRESENT) { counts.p++; return 'P'; }
        if (attendee.status === AttendanceStatus.ABSENT) { counts.f++; return 'F'; }
        if (attendee.status === AttendanceStatus.JUSTIFIED) { counts.j++; return 'J'; }
        return '-';
      });
      return [p.name, ...rowStatuses, counts.p, counts.f, counts.j];
    });

    (doc as any).autoTable({
      startY: 55,
      head: [tableHeader],
      body: tableBody,
      headStyles: { fillColor: [0, 31, 63], fontSize: 6, halign: 'center', cellPadding: 1 },
      styles: { fontSize: 7, halign: 'center', cellPadding: 1, overflow: 'linebreak' },
      columnStyles: { 
        0: { halign: 'left', fontStyle: 'bold', cellWidth: 35 },
        [tableHeader.length - 3]: { fillColor: [236, 253, 245], fontStyle: 'bold' },
        [tableHeader.length - 2]: { fillColor: [254, 242, 242], fontStyle: 'bold' },
        [tableHeader.length - 1]: { fillColor: [255, 251, 235], fontStyle: 'bold' }
      },
      didParseCell: (data: any) => {
        if (data.section === 'body' && data.column.index > 0 && data.column.index < tableHeader.length - 3) {
          const val = data.cell.raw;
          if (val === 'P') data.cell.styles.textColor = [16, 185, 129];
          else if (val === 'F') data.cell.styles.textColor = [220, 38, 38];
          else if (val === 'J') data.cell.styles.textColor = [245, 158, 11];
        }
      }
    });

    doc.save(`Relatorio_${(title || 'Global').replace(/\s+/g, '_')}.pdf`);
    setShowExportModal(false);
  };

  const generateXLSX = (title: string | null, period: 'current' | 'monthly' | 'quarterly' | 'semiannual' | 'final' | 'global') => {
    const filteredEvents = getEventsInPeriod(events, title, period);
    if (filteredEvents.length === 0) return;

    const matrix = [
      ["Relatório de Assiduidade Analítico"],
      ["Título:", title || 'Geral'],
      ["Grupo/Pólo:", headerInfo.louvorPolo, "Pastor:", headerInfo.pastor],
      ["Responsáveis:", headerInfo.resp1, headerInfo.resp2],
      ["Secretaria:", headerInfo.secretaria],
      [],
      ["Nome", ...filteredEvents.map(e => `${formatDate(e.date)} - ${e.name}`), "Total Presenças", "Total Faltas", "Total Justificadas"]
    ];

    people.forEach(p => {
      let pCount = 0, fCount = 0, jCount = 0;
      const rowStatuses = filteredEvents.map(e => {
        const attendee = e.attendees.find(a => a.name === p.name);
        if (!attendee) return '-';
        if (attendee.status === AttendanceStatus.PRESENT) { pCount++; return 'P'; }
        if (attendee.status === AttendanceStatus.ABSENT) { fCount++; return 'F'; }
        if (attendee.status === AttendanceStatus.JUSTIFIED) { jCount++; return 'J'; }
        return '-';
      });
      matrix.push([p.name, ...rowStatuses, pCount, fCount, jCount]);
    });

    const ws = XLSX.utils.aoa_to_sheet(matrix);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Assiduidade");
    XLSX.writeFile(wb, `Relatorio_${(title || 'Global').replace(/\s+/g, '_')}.xlsx`);
    setShowExportModal(false);
  };

  const handleAddPerson = () => {
    const input = document.getElementById('new-person') as HTMLInputElement;
    const name = input?.value.trim();
    if (name) {
      if (people.some(p => p.name.toLowerCase() === name.toLowerCase())) {
        alert('Nome já cadastrado.');
        return;
      }
      setPeople(prev => [...prev, { id: crypto.randomUUID(), name }].sort((a,b) => a.name.localeCompare(b.name)));
      input.value = '';
    }
  };

  return (
    <div className="min-h-screen pb-20 flex flex-col max-w-md mx-auto bg-gray-50 relative overflow-hidden">
      
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in" onClick={() => { setShowExportModal(false); setExportFormat(null); }}></div>
          <div className="relative bg-white w-full rounded-t-[40px] p-8 shadow-2xl animate-in slide-in-from-bottom">
            {!exportFormat ? (
              <div className="grid grid-cols-2 gap-4 mb-6">
                <button onClick={() => setExportFormat('pdf')} className="flex flex-col items-center gap-3 p-6 bg-indigo-50 rounded-3xl border border-indigo-100 active:scale-95 transition-all"><FileText className="text-indigo-600" size={32} /><span className="font-bold text-xs uppercase">Gerar PDF</span></button>
                <button onClick={() => setExportFormat('xlsx')} className="flex flex-col items-center gap-3 p-6 bg-emerald-50 rounded-3xl border border-emerald-100 active:scale-95 transition-all"><FileSpreadsheet className="text-emerald-600" size={32} /><span className="font-bold text-xs uppercase">Gerar Excel</span></button>
              </div>
            ) : (
              <div className="space-y-2 mb-6">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest px-1 mb-2">Selecione o Período</h3>
                {[
                  { id: 'current', label: 'Evento Atual (Mais recente)', icon: <Calendar size={18}/> },
                  { id: 'monthly', label: 'Evento Mensal', icon: <History size={18}/> },
                  { id: 'quarterly', label: 'Evento Trimestral', icon: <Filter size={18}/> },
                  { id: 'semiannual', label: 'Evento Semestral', icon: <BarChart2 size={18}/> },
                  { id: 'final', label: 'Resultado Final do Título', icon: <CheckCircle2 size={18}/> }
                ].map(opt => (
                  <button key={opt.id} onClick={() => exportFormat === 'pdf' ? generatePDF(exportTargetTitle, opt.id as any) : generateXLSX(exportTargetTitle, opt.id as any)} className="flex items-center gap-4 w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 text-left active:bg-indigo-50 transition-all">
                    <div className="text-indigo-500">{opt.icon}</div><span className="font-bold text-gray-700 text-sm">{opt.label}</span>
                  </button>
                ))}
              </div>
            )}
            <button onClick={() => { setShowExportModal(false); setExportFormat(null); }} className="w-full py-4 text-gray-400 font-bold uppercase text-[10px] tracking-widest">Cancelar</button>
          </div>
        </div>
      )}

      {view === 'events' && (
        <>
          <Header title={<Logo />} />
          <div className="p-4 flex-1 overflow-y-auto no-scrollbar space-y-4">
             <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center gap-3 mb-2">
                <img src="https://generativelanguage.googleapis.com/v1beta/files/input_file_0.png" className="h-20 w-auto object-contain" alt="CHECK - GL" />
                <h2 className="text-xs font-black text-[#001f3f] uppercase tracking-widest">Registros de Presença</h2>
             </div>
             {events.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-200"><Calendar className="mx-auto text-gray-200 mb-4" size={48} /><p className="text-gray-400 font-medium">Nenhum evento registrado.</p></div>
             ) : (
               events.map(event => (
                  <div key={event.id} onClick={() => { setSelectedEventId(event.id); setView('details'); }} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex items-center justify-between active:scale-[0.98] transition-all">
                    <div className="flex-1"><h3 className="font-black text-gray-800 text-lg leading-tight">{event.name}</h3><p className="text-xs text-gray-400 font-medium mt-1 uppercase tracking-tight">{formatDate(event.date)}</p></div>
                    <ChevronRight className="text-gray-300 ml-4" size={20} />
                  </div>
               ))
             )}
          </div>
          <button onClick={() => setView('create')} className="fixed bottom-24 right-6 bg-[#001f3f] text-white p-5 rounded-3xl shadow-2xl active:scale-90 transition-transform"><Plus size={28} strokeWidth={3} /></button>
        </>
      )}

      {view === 'create' && (
        <EventFormView onCancel={() => setView('events')} onSubmit={(n, d, i) => {
          const newEvent: Event = { id: crypto.randomUUID(), name: n, date: d, attendees: i ? people.map(p => ({ id: crypto.randomUUID(), name: p.name, status: AttendanceStatus.ABSENT })) : [] };
          setEvents(prev => [newEvent, ...prev]);
          setView('events');
        }} baseCount={people.length} />
      )}

      {view === 'details' && selectedEvent && (
        <>
          <Header title={selectedEvent.name} showBack onBack={() => setView('events')} actions={<button onClick={() => setView('edit')} className="p-2 bg-white/20 rounded-lg"><Edit3 size={18} /></button>} />
          <div className="p-4 flex-1 overflow-y-auto no-scrollbar space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-emerald-50 p-4 rounded-3xl border border-emerald-100 text-center"><div className="text-2xl font-black text-emerald-600">{selectedEvent.attendees.filter(a => a.status === AttendanceStatus.PRESENT).length}</div><div className="text-[10px] font-bold uppercase text-emerald-600">Presentes</div></div>
              <div className="bg-rose-50 p-4 rounded-3xl border border-rose-100 text-center"><div className="text-2xl font-black text-rose-600">{selectedEvent.attendees.filter(a => a.status === AttendanceStatus.ABSENT).length}</div><div className="text-[10px] font-bold uppercase text-rose-600">Faltas</div></div>
              <div className="bg-amber-50 p-4 rounded-3xl border border-amber-100 text-center"><div className="text-2xl font-black text-amber-600">{selectedEvent.attendees.filter(a => a.status === AttendanceStatus.JUSTIFIED).length}</div><div className="text-[10px] font-bold uppercase text-amber-600">Justif.</div></div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between px-2"><h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{formatDate(selectedEvent.date)}</h3><button onClick={() => { const name = prompt('Nome extra:'); if(name) setEvents(prev => prev.map(e => e.id === selectedEvent.id ? {...e, attendees: [...e.attendees, {id: crypto.randomUUID(), name, status: AttendanceStatus.ABSENT}].sort((a,b) => a.name.localeCompare(b.name))} : e)); }} className="text-indigo-600 text-[10px] font-black uppercase tracking-tight">+ Adicionar Nome</button></div>
              {selectedEvent.attendees.map(attendee => (
                <div key={attendee.id} className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex flex-col gap-3 animate-in fade-in">
                  <div className="flex items-center justify-between"><h4 className="font-bold text-gray-800">{attendee.name}</h4><button onClick={() => setEvents(prev => prev.map(e => e.id === selectedEvent.id ? {...e, attendees: e.attendees.filter(a => a.id !== attendee.id)} : e))} className="text-gray-300 hover:text-rose-500 transition-colors p-1"><Trash2 size={16} /></button></div>
                  <div className="grid grid-cols-3 gap-2">
                    <StatusBtn active={attendee.status === AttendanceStatus.PRESENT} color="emerald" onClick={() => setEvents(prev => prev.map(e => e.id === selectedEvent.id ? {...e, attendees: e.attendees.map(a => a.id === attendee.id ? {...a, status: AttendanceStatus.PRESENT} : a)} : e))}><CheckCircle2 size={14} /> OK</StatusBtn>
                    <StatusBtn active={attendee.status === AttendanceStatus.ABSENT} color="rose" onClick={() => setEvents(prev => prev.map(e => e.id === selectedEvent.id ? {...e, attendees: e.attendees.map(a => a.id === attendee.id ? {...a, status: AttendanceStatus.ABSENT} : a)} : e))}><XCircle size={14} /> F</StatusBtn>
                    <StatusBtn active={attendee.status === AttendanceStatus.JUSTIFIED} color="amber" onClick={() => setEvents(prev => prev.map(e => e.id === selectedEvent.id ? {...e, attendees: e.attendees.map(a => a.id === attendee.id ? {...a, status: AttendanceStatus.JUSTIFIED} : a)} : e))}><AlertCircle size={14} /> J</StatusBtn>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {view === 'edit' && selectedEvent && (
        <EventFormView onCancel={() => setView('details')} onSubmit={(n, d) => { setEvents(prev => prev.map(e => e.id === selectedEvent.id ? { ...e, name: n, date: d } : e)); setView('details'); }} onDelete={() => { setEvents(prev => prev.filter(e => e.id !== selectedEvent.id)); setView('events'); }} initialData={selectedEvent} baseCount={people.length} />
      )}

      {view === 'database' && (
        <>
          <Header title="Lista Mestra" />
          <div className="p-4 flex-1 overflow-y-auto no-scrollbar space-y-4">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100"><p className="text-[10px] text-gray-400 mb-4 font-black uppercase tracking-widest">Novo Integrante</p><div className="flex gap-2"><input id="new-person" type="text" placeholder="Nome completo..." className="flex-1 bg-gray-50 border-none p-4 rounded-2xl text-sm outline-none focus:ring-2 ring-indigo-500/20" onKeyDown={(e) => e.key === 'Enter' && handleAddPerson()} /><button onClick={handleAddPerson} className="bg-indigo-600 text-white p-4 rounded-2xl active:scale-95 transition-all"><UserPlus size={20} /></button></div></div>
            <div className="space-y-3 px-1"><h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Integrantes Cadastrados ({people.length})</h3>{people.map(person => (<div key={person.id} className="bg-white p-4 rounded-3xl border border-gray-50 flex items-center justify-between shadow-sm animate-in slide-in-from-left"><p className="font-bold text-gray-700">{person.name}</p><button onClick={() => setPeople(people.filter(p => p.id !== person.id))} className="text-gray-300 hover:text-rose-500 p-2"><Trash2 size={18} /></button></div>))}</div>
          </div>
        </>
      )}

      {view === 'reports' && (
        <>
          <Header title="Exportar Dados" />
          <div className="p-4 flex-1 overflow-y-auto no-scrollbar space-y-4">
             <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><Settings size={14}/> Dados do Cabeçalho</h3>
                <div className="grid grid-cols-1 gap-2">
                   <input type="text" placeholder="Grupo de Louvor/Pólo" value={headerInfo.louvorPolo} onChange={e => setHeaderInfo({...headerInfo, louvorPolo: e.target.value})} className="w-full bg-gray-50 border-none p-3 rounded-xl text-xs outline-none focus:ring-1 ring-indigo-500" />
                   <input type="text" placeholder="Pastor Responsável" value={headerInfo.pastor} onChange={e => setHeaderInfo({...headerInfo, pastor: e.target.value})} className="w-full bg-gray-50 border-none p-3 rounded-xl text-xs outline-none focus:ring-1 ring-indigo-500" />
                   <input type="text" placeholder="1º Responsável" value={headerInfo.resp1} onChange={e => setHeaderInfo({...headerInfo, resp1: e.target.value})} className="w-full bg-gray-50 border-none p-3 rounded-xl text-xs outline-none focus:ring-1 ring-indigo-500" />
                   <input type="text" placeholder="2º Responsável" value={headerInfo.resp2} onChange={e => setHeaderInfo({...headerInfo, resp2: e.target.value})} className="w-full bg-gray-50 border-none p-3 rounded-xl text-xs outline-none focus:ring-1 ring-indigo-500" />
                   <input type="text" placeholder="Secretaria(o)" value={headerInfo.secretaria} onChange={e => setHeaderInfo({...headerInfo, secretaria: e.target.value})} className="w-full bg-gray-50 border-none p-3 rounded-xl text-xs outline-none focus:ring-1 ring-indigo-500" />
                </div>
             </div>
             <div className="space-y-3">
               <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">Exportar por Título</h3>
               {uniqueTitles.map(title => (
                  <button key={title} onClick={() => { setExportTargetTitle(title); setShowExportModal(true); }} className="w-full bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex items-center justify-between active:scale-95 transition-all text-left"><div><h4 className="font-bold text-gray-800">{title}</h4><p className="text-[10px] text-indigo-500 font-bold uppercase">{events.filter(e => e.name === title).length} registros</p></div><Download size={20} className="text-indigo-500" /></button>
               ))}
             </div>
          </div>
        </>
      )}

      {view === 'global' && (
        <>
          <Header title="Consolidado Geral" />
          <div className="p-6 flex-1 flex flex-col items-center justify-center text-center space-y-6">
             <div className="w-24 h-24 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center shadow-lg animate-bounce">
                <Globe size={48} />
             </div>
             <div>
                <img src="https://generativelanguage.googleapis.com/v1beta/files/input_file_0.png" alt="CHECK - GL" className="h-16 w-auto mx-auto mb-4 opacity-50" />
                <h3 className="text-xl font-black text-gray-800">Todos os Relatórios</h3>
                <p className="text-sm text-gray-400 px-10 mt-2 leading-relaxed">Gere um documento único com todos os ensaios e todos os títulos registrados no app.</p>
             </div>
             <div className="w-full grid grid-cols-2 gap-4">
                <button onClick={() => generatePDF(null, 'global')} className="bg-[#001f3f] text-white font-bold py-5 rounded-3xl flex flex-col items-center gap-2 shadow-lg active:scale-95 transition-all"><FileText size={24}/><span>PDF Geral</span></button>
                <button onClick={() => generateXLSX(null, 'global')} className="bg-emerald-600 text-white font-bold py-5 rounded-3xl flex flex-col items-center gap-2 shadow-lg active:scale-95 transition-all"><FileSpreadsheet size={24}/><span>Excel Geral</span></button>
             </div>
             <p className="text-[10px] text-gray-300 font-bold uppercase tracking-widest">Ideal para fechamentos periódicos</p>
          </div>
        </>
      )}

      {view === 'stats' && (
        <>
          <Header title="Estatísticas" />
          <div className="p-4 flex-1 overflow-y-auto no-scrollbar space-y-6">
            <div className="bg-[#001f3f] p-8 rounded-[40px] text-white shadow-xl relative overflow-hidden">
               <p className="text-indigo-100 text-xs font-black uppercase tracking-widest mb-2">Presença Média</p>
               <h2 className="text-5xl font-black">{events.length > 0 ? Math.round(events.reduce((acc, e) => acc + (e.attendees.filter(a => a.status === AttendanceStatus.PRESENT).length / (e.attendees.length || 1)), 0) / events.length * 100) : 0}%</h2>
               <div className="mt-6 bg-white/10 h-3 rounded-full overflow-hidden"><div className="bg-white h-full" style={{ width: `${events.length > 0 ? Math.round(events.reduce((acc, e) => acc + (e.attendees.filter(a => a.status === AttendanceStatus.PRESENT).length / (e.attendees.length || 1)), 0) / events.length * 100) : 0}%` }} /></div>
            </div>
            <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={events.slice().reverse().map(e => ({ name: formatDate(e.date).substring(0, 5), perc: Math.round((e.attendees.filter(a => a.status === AttendanceStatus.PRESENT).length / (e.attendees.length || 1)) * 100) }))}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" /><XAxis dataKey="name" fontSize={9} axisLine={false} tickLine={false} /><YAxis fontSize={9} axisLine={false} tickLine={false} domain={[0, 100]} /><Tooltip /><Bar dataKey="perc" fill="#001f3f" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div>
          </div>
        </>
      )}

      <BottomNav active={view} onChange={setView} />
    </div>
  );
};

export default App;
