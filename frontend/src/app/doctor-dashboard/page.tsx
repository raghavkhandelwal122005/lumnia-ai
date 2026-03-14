"use client";
import DashboardLayout from '../../components/DashboardLayout';
import { useDoctorStore } from '../../store/useDoctorStore';
import { useRouter } from 'next/navigation';
import { Search, Users, Activity, AlertTriangle, CheckCircle, Plus, X } from 'lucide-react';
import { useState } from 'react';

export default function DoctorDashboard() {
    const { patients, activePatientId, setActivePatient } = useDoctorStore();
    const router = useRouter();
    
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('All');

    // Add Patient State
    const [isAddPatientOpen, setIsAddPatientOpen] = useState(false);
    const [newName, setNewName] = useState('');
    const [newAge, setNewAge] = useState('');
    const [newStatus, setNewStatus] = useState<'Stable' | 'Critical' | 'Under Observation'>('Stable');

    const handlePatientClick = (id: string) => {
        setActivePatient(id);
        router.push('/dashboard');
    };

    const handleAddPatient = (e: React.FormEvent) => {
        e.preventDefault();
        const newPatient = {
            id: 'p' + Date.now().toString().slice(-4),
            name: newName,
            age: parseInt(newAge) || 0,
            lastVisit: new Date().toISOString(),
            status: newStatus,
            mockData: {
                vitals: { bloodOxygen: '', restingHeartRate: '', sleepHours: '', activityScore: '', bloodPressureSys: '', bloodPressureDia: '', healthRiskScore: '' },
                logs: [],
                reports: [],
                chatSessions: []
            }
        };
        useDoctorStore.getState().addPatient(newPatient);
        setIsAddPatientOpen(false);
        setNewName('');
        setNewAge('');
        setNewStatus('Stable');
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'Critical': return <AlertTriangle size={16} className="text-red-500" />;
            case 'Under Observation': return <Activity size={16} className="text-amber-500" />;
            case 'Stable': return <CheckCircle size={16} className="text-emerald-500" />;
            default: return null;
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'Critical': return 'bg-red-50 text-red-700 border-red-200';
            case 'Under Observation': return 'bg-amber-50 text-amber-700 border-amber-200';
            case 'Stable': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
            default: return 'bg-slate-50 text-slate-700 border-slate-200';
        }
    };

    const filteredPatients = patients.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = filterStatus === 'All' || p.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    const stats = {
        total: patients.length,
        critical: patients.filter(p => p.status === 'Critical').length,
        observation: patients.filter(p => p.status === 'Under Observation').length,
        stable: patients.filter(p => p.status === 'Stable').length,
    };

    return (
        <DashboardLayout>
            <div className="max-w-6xl mx-auto space-y-8">
                
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800">Doctor Dashboard</h2>
                        <p className="text-slate-500 font-medium mt-1">Manage your patients and monitor their health status.</p>
                    </div>
                    <button 
                        onClick={() => setIsAddPatientOpen(true)}
                        className="bg-[#25418F] text-white px-5 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-md hover:bg-blue-800 transition whitespace-nowrap"
                    >
                        <Plus size={18} /> Add New Patient
                    </button>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Users size={20} /></div>
                            <span className="text-sm font-bold text-slate-600">Total Patients</span>
                        </div>
                        <div className="text-3xl font-black text-slate-800">{stats.total}</div>
                    </div>
                    <div className="bg-red-50 p-5 rounded-2xl border border-red-100 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-white text-red-500 rounded-lg"><AlertTriangle size={20} /></div>
                            <span className="text-sm font-bold text-red-800">Critical</span>
                        </div>
                        <div className="text-3xl font-black text-red-700">{stats.critical}</div>
                    </div>
                    <div className="bg-amber-50 p-5 rounded-2xl border border-amber-100 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-white text-amber-500 rounded-lg"><Activity size={20} /></div>
                            <span className="text-sm font-bold text-amber-800">Observation</span>
                        </div>
                        <div className="text-3xl font-black text-amber-700">{stats.observation}</div>
                    </div>
                    <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-white text-emerald-500 rounded-lg"><CheckCircle size={20} /></div>
                            <span className="text-sm font-bold text-emerald-800">Stable</span>
                        </div>
                        <div className="text-3xl font-black text-emerald-700">{stats.stable}</div>
                    </div>
                </div>

                {/* Search & Filter */}
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input 
                            type="text" 
                            placeholder="Search patients by name..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 bg-white shadow-sm focus:border-[#25418F] focus:outline-none transition font-medium"
                        />
                    </div>
                    <select 
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="py-3 px-4 rounded-xl border border-slate-200 bg-white shadow-sm focus:border-[#25418F] focus:outline-none transition font-medium text-slate-700 cursor-pointer"
                    >
                        <option value="All">All Statuses</option>
                        <option value="Critical">Critical</option>
                        <option value="Under Observation">Under Observation</option>
                        <option value="Stable">Stable</option>
                    </select>
                </div>

                {/* Patient List */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-widest">Patient Details</th>
                                    <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-widest">Patient ID</th>
                                    <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-widest">Age</th>
                                    <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-widest">Last Visit</th>
                                    <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-widest">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredPatients.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-8 text-center text-slate-400 font-medium">
                                            No patients found.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredPatients.map((patient) => (
                                        <tr 
                                            key={patient.id} 
                                            onClick={() => handlePatientClick(patient.id)}
                                            className={`border-b border-slate-100 hover:bg-slate-50 transition cursor-pointer ${activePatientId === patient.id ? 'bg-blue-50/50' : ''}`}
                                        >
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold overflow-hidden shrink-0">
                                                        {patient.avatarUrl ? (
                                                            <img src={patient.avatarUrl} alt={patient.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            patient.name.charAt(0)
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-800">{patient.name}</div>
                                                        <div className="text-xs text-slate-500">View detailed profile</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 font-mono text-sm text-slate-500">
                                                #{patient.id.toUpperCase()}
                                            </td>
                                            <td className="py-4 px-6 font-medium text-slate-700">
                                                {patient.age} yrs
                                            </td>
                                            <td className="py-4 px-6 font-medium text-slate-700">
                                                {new Date(patient.lastVisit).toLocaleDateString()}
                                            </td>
                                            <td className="py-4 px-6">
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${getStatusStyle(patient.status)}`}>
                                                    {getStatusIcon(patient.status)}
                                                    {patient.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>

            {/* Add Patient Modal */}
            {isAddPatientOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                    <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="text-xl font-black text-[#1E293B] flex items-center gap-3">
                                <Users className="text-[#25418F]" /> Add New Patient
                            </h3>
                            <button onClick={() => setIsAddPatientOpen(false)} className="text-slate-400 hover:text-slate-700 transition p-2 bg-white rounded-full shadow-sm">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleAddPatient} className="p-8 space-y-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Patient Full Name</label>
                                <input 
                                    type="text" 
                                    required 
                                    value={newName} 
                                    onChange={(e) => setNewName(e.target.value)} 
                                    className="w-full p-3 rounded-xl border border-slate-200 focus:border-[#25418F] focus:outline-none focus:ring-1 focus:ring-[#25418F]" 
                                    placeholder="Jane Doe" 
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Age</label>
                                <input 
                                    type="number" 
                                    required 
                                    min="0"
                                    max="120"
                                    value={newAge} 
                                    onChange={(e) => setNewAge(e.target.value)} 
                                    className="w-full p-3 rounded-xl border border-slate-200 focus:border-[#25418F] focus:outline-none focus:ring-1 focus:ring-[#25418F]" 
                                    placeholder="35" 
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Initial Status</label>
                                <select 
                                    value={newStatus}
                                    onChange={(e) => setNewStatus(e.target.value as any)}
                                    className="w-full p-3 rounded-xl border border-slate-200 focus:border-[#25418F] focus:outline-none focus:ring-1 focus:ring-[#25418F] bg-white text-slate-700"
                                >
                                    <option value="Stable">Stable</option>
                                    <option value="Under Observation">Under Observation</option>
                                    <option value="Critical">Critical</option>
                                </select>
                            </div>
                            <button type="submit" className="w-full bg-[#25418F] text-white py-4 rounded-xl font-bold shadow-md hover:bg-blue-800 transition">
                                Create Patient Record
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
