import React, { useState, useEffect, useMemo } from 'react';
import { 
  Upload, 
  Trash2, 
  Plus, 
  Search, 
  FileText, 
  CheckCircle, 
  XCircle, 
  TrendingUp, 
  Briefcase,
  Download,
  AlertTriangle,
  X,
  Heart,
  Save
} from 'lucide-react';

// Coefficient: 1.0 (Fixed TS errors for strict build)

// --- Константы и Утилиты ---

const STATUS_OPTIONS = [
  { value: 'created', label: 'Подготовка', color: 'bg-slate-100 text-slate-700' },
  { value: 'sent', label: 'Отправлено', color: 'bg-blue-100 text-blue-700' },
  { value: 'registered', label: 'Зарегистрировано', color: 'bg-indigo-100 text-indigo-700' },
  { value: 'processing', label: 'В работе', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'satisfied', label: 'Удовлетворено / Исполнено', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'rejected', label: 'Отказано', color: 'bg-red-100 text-red-700' },
  { value: 'ignored', label: 'Игнорирование', color: 'bg-orange-100 text-orange-700' },
];

const INITIAL_META = {
  title: '',
  applicant: '',
  addressee: '',
  caseId: ''
};

const generateId = () => '_' + Math.random().toString(36).substr(2, 9);

// --- Компоненты UI ---

const Card = ({ children, className = '' }: { children?: React.ReactNode, className?: string }) => (
  <div className={`bg-white rounded-lg border border-slate-200 shadow-sm ${className}`}>
    {children}
  </div>
);

const StatCard = ({ title, value, subtext, icon: Icon, colorClass }: { title: string, value: string | number, subtext?: string, icon: any, colorClass: string }) => (
  <Card className="p-4 flex items-center justify-between">
    <div>
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{title}</p>
      <div className="text-2xl font-bold text-slate-800">{value}</div>
      {subtext && <div className="text-xs text-slate-400 mt-1">{subtext}</div>}
    </div>
    <div className={`p-3 rounded-full ${colorClass}`}>
      <Icon size={24} />
    </div>
  </Card>
);

const Button = ({ onClick, children, variant = 'primary', icon: Icon, className = '', type = 'button' }: { onClick?: () => void, children?: React.ReactNode, variant?: 'primary' | 'secondary' | 'danger' | 'ghost', icon?: any, className?: string, type?: 'button' | 'submit' | 'reset' }) => {
  const baseStyle = "flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2";
  const variants = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500",
    secondary: "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 focus:ring-indigo-500",
    danger: "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 focus:ring-red-500",
    ghost: "bg-transparent text-slate-600 hover:bg-slate-100"
  };

  return (
    <button type={type} onClick={onClick} className={`${baseStyle} ${variants[variant]} ${className}`}>
      {Icon && <Icon size={16} className="mr-2" />}
      {children}
    </button>
  );
};

// --- Основное Приложение ---

export default function CaseChronology() {
  // Состояние
  const [meta, setMeta] = useState(INITIAL_META);
  const [records, setRecords] = useState<any[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Состояние предупреждения о данных
  const [showDataWarning, setShowDataWarning] = useState(false);
  const [dontShowWarningAgain, setDontShowWarningAgain] = useState(false);

  // Состояние для подтверждения действий (замена window.confirm)
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'delete_one' | 'clear_all' | null;
    id: string | null;
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: null, 
    id: null,
    title: '',
    message: ''
  });

  // Форма записи
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    regNo: '',
    name: '',
    correspondent: '',
    status: 'created',
    note: ''
  });

  // 1. Инициализация (Загрузка из LocalStorage)
  useEffect(() => {
    const savedMeta = localStorage.getItem('chronos_meta');
    const savedRecords = localStorage.getItem('chronos_records');
    const warningDismissed = localStorage.getItem('chronos_warning_dismissed');

    if (savedMeta) setMeta(JSON.parse(savedMeta));
    if (savedRecords) setRecords(JSON.parse(savedRecords));
    
    // Показываем предупреждение, если пользователь его не скрыл ранее
    if (!warningDismissed) {
        setShowDataWarning(true);
    }
    
    setIsLoaded(true);
  }, []);

  // 2. Персистентность (Сохранение при изменении)
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('chronos_meta', JSON.stringify(meta));
      localStorage.setItem('chronos_records', JSON.stringify(records));
    }
  }, [meta, records, isLoaded]);

  // 3. Аналитика
  const stats = useMemo(() => {
    const total = records.length;
    // success variable removed as it was unused
    const finalSuccess = records.filter(r => r.status === 'satisfied').length;
    const fail = records.filter(r => ['rejected', 'ignored'].includes(r.status)).length;
    
    const closedCases = finalSuccess + fail;
    const efficiency = closedCases > 0 ? Math.round((finalSuccess / closedCases) * 100) : 0;

    return { total, finalSuccess, fail, efficiency };
  }, [records]);

  // 4. Фильтрация и Сортировка
  const sortedAndFilteredRecords = useMemo(() => {
    let data = [...records];

    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      data = data.filter(item => 
        Object.values(item).some(val => 
          String(val).toLowerCase().includes(lowerQuery)
        )
      );
    }

    if (sortConfig.key) {
      data.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
        if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return data;
  }, [records, searchQuery, sortConfig]);

  // 5. Обработчики
  const handleSort = (key: string) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleMetaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMeta({ ...meta, [e.target.name]: e.target.value });
  };

  const handleSubmitRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      setRecords(prev => prev.map(r => r.id === editingId ? { ...formData, id: editingId } : r));
      setEditingId(null);
    } else {
      setRecords(prev => [...prev, { ...formData, id: generateId() }]);
    }
    setFormData({
      date: new Date().toISOString().split('T')[0],
      regNo: '',
      name: '',
      correspondent: '',
      status: 'created',
      note: ''
    });
    setIsFormOpen(false);
  };

  // --- ЛОГИКА УДАЛЕНИЯ (БЕЗ window.confirm) ---
  
  const initiateDelete = (id: string) => {
    setConfirmModal({
        isOpen: true,
        type: 'delete_one',
        id: id,
        title: 'Удаление записи',
        message: 'Вы уверены, что хотите безвозвратно удалить эту запись?'
    });
  };

  const initiateClearAll = () => {
    setConfirmModal({
        isOpen: true,
        type: 'clear_all',
        id: null,
        title: 'Очистка базы данных',
        message: 'ВНИМАНИЕ: Вы собираетесь удалить ВСЕ записи и настройки дела. Это действие нельзя отменить. Продолжить?'
    });
  };

  const executeConfirmation = () => {
    if (confirmModal.type === 'delete_one' && confirmModal.id) {
        setRecords(prev => prev.filter(r => r.id !== confirmModal.id));
    } else if (confirmModal.type === 'clear_all') {
        setRecords([]);
        setMeta(INITIAL_META);
        localStorage.removeItem('chronos_records');
        localStorage.removeItem('chronos_meta');
    }
    setConfirmModal({ isOpen: false, type: null, id: null, title: '', message: '' });
  };

  const cancelConfirmation = () => {
    setConfirmModal({ isOpen: false, type: null, id: null, title: '', message: '' });
  };

  // Обработчик закрытия предупреждения
  const closeDataWarning = () => {
    if (dontShowWarningAgain) {
        localStorage.setItem('chronos_warning_dismissed', 'true');
    }
    setShowDataWarning(false);
  };

  // ---------------------------------------------

  const handleEdit = (record: any) => {
    setFormData(record);
    setEditingId(record.id);
    setIsFormOpen(true);
  };

  // 6. CSV Экспорт/Импорт
  const exportCSV = () => {
    const BOM = "\uFEFF"; 
    const metaRows = [
      `Дело:;${meta.title}`,
      `Номер:;${meta.caseId}`,
      `Заявитель:;${meta.applicant}`,
      `Адресат:;${meta.addressee}`,
      '' 
    ].join('\n');

    const headers = ['ID', 'Дата', 'Номер', 'Наименование', 'Корреспондент', 'Статус', 'Примечание'];
    
    const rows = records.map(r => {
      const statusLabel = STATUS_OPTIONS.find(opt => opt.value === r.status)?.label || r.status;
      return [
        r.id, r.date, r.regNo, r.name, r.correspondent, statusLabel, r.note
      ].map(field => `"${String(field || '').replace(/"/g, '""')}"`).join(';'); 
    });

    const csvContent = [metaRows, headers.join(';'), ...rows].join('\n');
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Chronology_${meta.caseId || 'Export'}_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const importCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split('\n').filter(line => line.trim() !== '');
      
      let headerRowIndex = -1;
      for (let i = 0; i < lines.length && i < 20; i++) { 
         if (lines[i].includes('ID') && lines[i].includes('Дата') && lines[i].includes('Статус')) {
             headerRowIndex = i;
             break;
         }
      }

      if (headerRowIndex > 0) {
        const newMeta = { ...INITIAL_META }; 
        for (let i = 0; i < headerRowIndex; i++) {
            const line = lines[i];
            const parts = line.split(';');
            if (parts.length < 2) continue;
            const key = parts[0].trim().toLowerCase().replace(':', '');
            const value = parts.slice(1).join(';').trim(); 
            if (key === 'дело') newMeta.title = value;
            if (key === 'номер') newMeta.caseId = value;
            if (key === 'заявитель') newMeta.applicant = value;
            if (key === 'адресат') newMeta.addressee = value;
        }
        if (newMeta.title || newMeta.caseId || newMeta.applicant || newMeta.addressee) {
            setMeta(prev => ({...prev, ...newMeta}));
        }
      }

      const startIdx = headerRowIndex >= 0 ? headerRowIndex + 1 : 0;
      const newRecords: any[] = [];
      const importedIds = new Set(); 
      
      for (let i = startIdx; i < lines.length; i++) {
        const cols = lines[i].split(';').map(col => col.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
        if (cols.length < 5) continue; 

        const [id, date, regNo, name, correspondent, statusRaw, note] = cols;
        const finalId = (id && id.length > 2) ? id : generateId();

        const existsInDb = records.some(r => r.id === finalId);
        const existsInBatch = importedIds.has(finalId);
        
        if (!existsInDb && !existsInBatch) {
          importedIds.add(finalId);
          
          const foundStatus = STATUS_OPTIONS.find(opt => opt.value === statusRaw || opt.label === statusRaw);
          const statusValue = foundStatus ? foundStatus.value : 'created';

          newRecords.push({
            id: finalId,
            date: date || new Date().toISOString().split('T')[0],
            regNo: regNo || '',
            name: name || 'Импорт',
            correspondent: correspondent || '',
            status: statusValue,
            note: note || ''
          });
        }
      }

      setRecords(prev => [...prev, ...newRecords]);
    };
    reader.readAsText(file);
    e.target.value = ''; 
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Шапка: Метаданные */}
        <div className="mb-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
                <h1 className="text-2xl font-bold text-slate-900 flex items-center">
                    <Briefcase className="mr-2 text-indigo-600" />
                    Хронология дел
                </h1>
                <div className="mt-2 md:mt-0 flex space-x-2">
                    <Button variant="secondary" onClick={exportCSV} icon={Download}>CSV</Button>
                    <label className="flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 cursor-pointer">
                        <Upload size={16} className="mr-2" />
                        Импорт
                        <input type="file" accept=".csv" onChange={importCSV} className="hidden" />
                    </label>
                     <Button 
                        variant="danger" 
                        onClick={initiateClearAll}
                        className="ml-2"
                        icon={AlertTriangle}
                    >
                        Очистить базу
                    </Button>
                </div>
            </div>

            <Card className="p-6 bg-white border-l-4 border-l-indigo-600">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase">Название Процесса / Дела</label>
                        <input 
                            name="title" 
                            value={meta.title} 
                            onChange={handleMetaChange} 
                            placeholder="Напр: Иск к ООО 'Ромашка'"
                            className="mt-1 block w-full border-b border-slate-300 focus:border-indigo-600 focus:ring-0 bg-transparent text-lg font-medium placeholder-slate-300"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase">Идентификатор (№)</label>
                        <input 
                            name="caseId" 
                            value={meta.caseId} 
                            onChange={handleMetaChange} 
                            placeholder="A40-12345/23"
                            className="mt-1 block w-full border-b border-slate-300 focus:border-indigo-600 focus:ring-0 bg-transparent text-slate-700"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase">Заявитель (Я)</label>
                        <input 
                            name="applicant" 
                            value={meta.applicant} 
                            onChange={handleMetaChange} 
                            placeholder="ФИО / ИП"
                            className="mt-1 block w-full border-b border-slate-300 focus:border-indigo-600 focus:ring-0 bg-transparent text-slate-700"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase">Адресат / Ответчик</label>
                        <input 
                            name="addressee" 
                            value={meta.addressee} 
                            onChange={handleMetaChange} 
                            placeholder="Организация"
                            className="mt-1 block w-full border-b border-slate-300 focus:border-indigo-600 focus:ring-0 bg-transparent text-slate-700"
                        />
                    </div>
                </div>
            </Card>
        </div>

        {/* Дашборд Аналитики */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard 
            title="Всего документов" 
            value={stats.total} 
            icon={FileText} 
            colorClass="bg-slate-100 text-slate-600" 
          />
          <StatCard 
            title="Успешно / Исполнено" 
            value={stats.finalSuccess} 
            icon={CheckCircle} 
            colorClass="bg-emerald-100 text-emerald-600" 
          />
          <StatCard 
            title="Отказы / Без ответа" 
            value={stats.fail} 
            icon={XCircle} 
            colorClass="bg-red-100 text-red-600" 
          />
          <StatCard 
            title="Эффективность (КПД)" 
            value={`${stats.efficiency}%`} 
            subtext="от закрытых дел"
            icon={TrendingUp} 
            colorClass="bg-indigo-100 text-indigo-600" 
          />
        </div>

        {/* Панель управления таблицей */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-4 space-y-3 sm:space-y-0">
            <div className="relative w-full sm:w-96">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-slate-400" />
                </div>
                <input
                    type="text"
                    className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-md leading-5 bg-white placeholder-slate-400 focus:outline-none focus:placeholder-slate-500 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="Поиск по всем полям..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
            <div className="flex space-x-2 w-full sm:w-auto">
                <Button onClick={() => {
                    setEditingId(null);
                    setFormData({
                        date: new Date().toISOString().split('T')[0],
                        regNo: '',
                        name: '',
                        correspondent: '',
                        status: 'created',
                        note: ''
                    });
                    setIsFormOpen(true);
                }} icon={Plus}>
                    Добавить запись
                </Button>
            </div>
        </div>

        {/* Таблица */}
        <Card className="overflow-hidden">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            {[
                                { k: 'date', t: 'Дата' },
                                { k: 'regNo', t: '№ Рег.' },
                                { k: 'name', t: 'Наименование' },
                                { k: 'correspondent', t: 'Корреспондент' },
                                { k: 'status', t: 'Статус' },
                                { k: 'note', t: 'Примечание' }
                            ].map(h => (
                                <th 
                                    key={h.k}
                                    onClick={() => handleSort(h.k)}
                                    className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
                                >
                                    <div className="flex items-center">
                                        {h.t}
                                        {sortConfig.key === h.k && (
                                            <span className="ml-1 text-slate-400">
                                                {sortConfig.direction === 'asc' ? '↑' : '↓'}
                                            </span>
                                        )}
                                    </div>
                                </th>
                            ))}
                            <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Действия</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                        {sortedAndFilteredRecords.length > 0 ? (
                            sortedAndFilteredRecords.map((record) => {
                                const statusObj = STATUS_OPTIONS.find(s => s.value === record.status) || STATUS_OPTIONS[0];
                                return (
                                    <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-mono">
                                            {record.date}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                                            {record.regNo || '—'}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-700 max-w-xs truncate" title={record.name}>
                                            {record.name}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-700">
                                            {record.correspondent}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusObj.color}`}>
                                                {statusObj.label}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-500 max-w-xs truncate" title={record.note}>
                                            {record.note}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button onClick={() => handleEdit(record)} className="text-indigo-600 hover:text-indigo-900 mr-3">
                                                <FileText size={18} />
                                            </button>
                                            <button 
                                                onClick={() => initiateDelete(record.id)} 
                                                className="text-red-600 hover:text-red-900 focus:outline-none"
                                                title="Удалить запись"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan={7} className="px-6 py-10 text-center text-slate-500">
                                    Нет данных для отображения. Добавьте запись или импортируйте CSV.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </Card>

        {/* Виджет донатов */}
        <div className="mt-8 flex justify-center">
            <Card className="w-full max-w-[550px] overflow-hidden shadow-md">
                <div className="bg-slate-50 p-3 border-b border-slate-100 flex items-center justify-center text-slate-600">
                    <Heart size={18} className="mr-2 text-rose-500" fill="currentColor" />
                    <span className="font-medium text-sm uppercase tracking-wide">Поддержать автора</span>
                </div>
                <div className="flex justify-center bg-white">
                    <iframe 
                        src="https://yoomoney.ru/quickpay/fundraise/widget?billNumber=1FEB8OPFFPT.260121&" 
                        width="500" 
                        height="480" 
                        frameBorder="0" 
                        allowTransparency={true}
                        scrolling="no"
                        style={{ maxWidth: '100%' }}
                    ></iframe>
                </div>
            </Card>
        </div>

        {/* Модальное окно: Предупреждение о сохранении данных */}
        {showDataWarning && (
          <div className="fixed inset-0 bg-slate-900 bg-opacity-60 flex items-center justify-center p-4 z-[70]">
            <Card className="w-full max-w-lg p-6 bg-white shadow-2xl relative border-t-4 border-indigo-600">
                <button 
                    onClick={closeDataWarning}
                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-500 transition-colors"
                >
                    <X size={20} />
                </button>
                <div className="flex items-start space-x-4 mb-4">
                    <div className="p-3 bg-indigo-100 rounded-full text-indigo-600 flex-shrink-0">
                        <AlertTriangle size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">Важно: Ваши данные хранятся локально</h3>
                        <p className="text-slate-600 mt-2 text-sm leading-relaxed">
                            Этот сайт работает автономно в вашем браузере и не передает информацию на сервер. 
                            Если вы очистите кэш или историю браузера, все введенные данные могут быть утеряны.
                        </p>
                        <p className="text-slate-600 mt-2 text-sm leading-relaxed font-medium">
                            Рекомендуем регулярно сохранять резервную копию, нажимая кнопку <span className="text-indigo-600">CSV Export</span>.
                        </p>
                    </div>
                </div>
                <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100 pt-4">
                    <label className="flex items-center space-x-2 text-sm text-slate-500 cursor-pointer hover:text-slate-700 select-none">
                        <input
                            type="checkbox"
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                            checked={dontShowWarningAgain}
                            onChange={(e) => setDontShowWarningAgain(e.target.checked)}
                        />
                        <span>Больше не показывать это окно</span>
                    </label>
                    <Button onClick={closeDataWarning} className="w-full sm:w-auto">
                        Всё понятно
                    </Button>
                </div>
            </Card>
          </div>
        )}

        {/* Модальное окно подтверждения действий */}
        {confirmModal.isOpen && (
             <div className="fixed inset-0 bg-slate-900 bg-opacity-50 flex items-center justify-center p-4 z-[60]">
                <Card className="w-full max-w-md p-6 bg-white shadow-xl relative">
                     <button 
                        onClick={cancelConfirmation}
                        className="absolute top-4 right-4 text-slate-400 hover:text-slate-500"
                    >
                        <X size={20} />
                    </button>
                    <div className="flex items-center mb-4 text-red-600">
                        <AlertTriangle size={24} className="mr-2" />
                        <h3 className="text-lg font-bold">{confirmModal.title}</h3>
                    </div>
                    <p className="text-slate-600 mb-6">{confirmModal.message}</p>
                    <div className="flex justify-end space-x-3">
                        <Button variant="secondary" onClick={cancelConfirmation}>Отмена</Button>
                        <Button variant="danger" onClick={executeConfirmation}>Да, выполнить</Button>
                    </div>
                </Card>
             </div>
        )}

        {/* Модальное окно (Форма) */}
        {isFormOpen && (
            <div className="fixed inset-0 bg-slate-900 bg-opacity-50 flex items-center justify-center p-4 z-50">
                <Card className="w-full max-w-lg p-6 bg-white shadow-xl">
                    <h2 className="text-lg font-bold text-slate-900 mb-4">
                        {editingId ? 'Редактировать запись' : 'Новая запись'}
                    </h2>
                    <form onSubmit={handleSubmitRecord} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Дата</label>
                                <input 
                                    type="date" 
                                    required
                                    value={formData.date}
                                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                                    className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Рег. Номер</label>
                                <input 
                                    type="text" 
                                    value={formData.regNo}
                                    onChange={(e) => setFormData({...formData, regNo: e.target.value})}
                                    placeholder="Вх. № 123"
                                    className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                />
                            </div>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-slate-700">Наименование документа</label>
                            <input 
                                type="text" 
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({...formData, name: e.target.value})}
                                placeholder="Ходатайство о..."
                                className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700">Корреспондент (Кому/От кого)</label>
                            <input 
                                type="text" 
                                required
                                value={formData.correspondent}
                                onChange={(e) => setFormData({...formData, correspondent: e.target.value})}
                                placeholder="Судья Иванова И.И."
                                className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700">Статус</label>
                            <select 
                                value={formData.status}
                                onChange={(e) => setFormData({...formData, status: e.target.value})}
                                className="mt-1 block w-full bg-white border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            >
                                {STATUS_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700">Примечание</label>
                            <textarea 
                                rows={3}
                                value={formData.note}
                                onChange={(e) => setFormData({...formData, note: e.target.value})}
                                className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            />
                        </div>

                        <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
                            <Button type="button" variant="secondary" onClick={() => setIsFormOpen(false)}>Отмена</Button>
                            <Button type="submit" variant="primary">Сохранить</Button>
                        </div>
                    </form>
                </Card>
            </div>
        )}

      </div>
    </div>
  );
}
