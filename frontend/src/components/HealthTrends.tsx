import { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Activity, Heart, Moon, Zap } from 'lucide-react';

interface HealthTrendsProps {
    logs: any[];
}

export default function HealthTrends({ logs }: HealthTrendsProps) {
    const [activeTab, setActiveTab] = useState<'HR' | 'Sleep' | 'Activity' | 'Sugar' | 'Weight'>('HR');

    // Only map Vitals type logs
    const vitalsLogs = logs.filter(l => l.type === 'Vitals').map(log => ({
        date: new Date(log.date).toLocaleDateString([], { month: 'short', day: 'numeric' }),
        hr: log.vitals?.restingHeartRate ? Number(log.vitals.restingHeartRate) : null,
        sleep: (Number(log.vitals?.sleepHours || 0) + Number(log.vitals?.sleepMinutes || 0) / 60).toFixed(1),
        activity: log.vitals?.activityScore ? Number(log.vitals.activityScore) : null,
        sugar: log.vitals?.sugarLevel ? Number(log.vitals.sugarLevel) : null,
        weight: log.vitals?.weight ? Number(log.vitals.weight) : null,
    })).reverse(); // Oldest to newest for plotting

    return (
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm col-span-1 md:col-span-2 lg:col-span-3">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Activity className="text-[#25418F]" /> Health Trends
                    </h2>
                    <p className="text-sm font-medium text-slate-500 mt-1">
                        Track your vitals over time
                    </p>
                </div>

                <div className="flex gap-2 bg-slate-100 p-1 rounded-xl overflow-x-auto w-full md:w-auto">
                    <button
                        onClick={() => setActiveTab('HR')}
                        className={`px-4 py-2 rounded-lg font-bold text-sm transition whitespace-nowrap ${activeTab === 'HR' ? 'bg-white shadow-sm text-rose-600' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                        Heart Rate
                    </button>
                    <button
                        onClick={() => setActiveTab('Sleep')}
                        className={`px-4 py-2 rounded-lg font-bold text-sm transition whitespace-nowrap ${activeTab === 'Sleep' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                        Sleep
                    </button>
                    <button
                        onClick={() => setActiveTab('Activity')}
                        className={`px-4 py-2 rounded-lg font-bold text-sm transition whitespace-nowrap ${activeTab === 'Activity' ? 'bg-white shadow-sm text-amber-600' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                        Activity
                    </button>
                    <button
                        onClick={() => setActiveTab('Sugar')}
                        className={`px-4 py-2 rounded-lg font-bold text-sm transition whitespace-nowrap ${activeTab === 'Sugar' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                        Sugar Level
                    </button>
                    <button
                        onClick={() => setActiveTab('Weight')}
                        className={`px-4 py-2 rounded-lg font-bold text-sm transition whitespace-nowrap ${activeTab === 'Weight' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                        Weight
                    </button>
                </div>
            </div>

            <div className="h-72 w-full">
                {vitalsLogs.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400">
                        <Activity size={32} className="mb-2 opacity-50" />
                        <p className="font-medium">No trend data available yet.</p>
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        {activeTab === 'HR' ? (
                            <AreaChart data={vitalsLogs} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorHr" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#e11d48" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#e11d48" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', fontWeight: 'bold' }}
                                    cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '5 5' }}
                                />
                                <Area type="monotone" dataKey="hr" stroke="#e11d48" strokeWidth={3} fillOpacity={1} fill="url(#colorHr)" activeDot={{ r: 6, strokeWidth: 0, fill: '#e11d48' }} />
                            </AreaChart>
                        ) : activeTab === 'Sleep' ? (
                            <AreaChart data={vitalsLogs} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorSleep" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', fontWeight: 'bold' }}
                                    cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '5 5' }}
                                />
                                <Area type="monotone" dataKey="sleep" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorSleep)" activeDot={{ r: 6, strokeWidth: 0, fill: '#4f46e5' }} />
                            </AreaChart>
                        ) : activeTab === 'Activity' ? (
                            <BarChart data={vitalsLogs} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', fontWeight: 'bold' }}
                                    cursor={{ stroke: '#cbd5e1', strokeWidth: 0 }}
                                />
                                <Bar dataKey="activity" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        ) : activeTab === 'Sugar' ? (
                            <AreaChart data={vitalsLogs} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorSugar" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', fontWeight: 'bold' }}
                                    cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '5 5' }}
                                />
                                <Area type="monotone" dataKey="sugar" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorSugar)" activeDot={{ r: 6, strokeWidth: 0, fill: '#2563eb' }} />
                            </AreaChart>
                        ) : (
                            <AreaChart data={vitalsLogs} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#059669" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', fontWeight: 'bold' }}
                                    cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '5 5' }}
                                />
                                <Area type="monotone" dataKey="weight" stroke="#059669" strokeWidth={3} fillOpacity={1} fill="url(#colorWeight)" activeDot={{ r: 6, strokeWidth: 0, fill: '#059669' }} />
                            </AreaChart>
                        )}
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
}
