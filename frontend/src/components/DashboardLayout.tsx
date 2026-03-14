import Sidebar from './Sidebar';
import { useDoctorStore } from '../store/useDoctorStore';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const activePatient = useDoctorStore(state => state.getActivePatient());

    return (
        <div className="flex min-h-screen bg-[#F8FAFC]">
            <Sidebar />
            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                {/* Top Header Placeholder (Global to dashboard) */}
                <div className="h-16 border-b border-slate-200 bg-white flex items-center px-8 shrink-0 justify-between">
                    <div>
                        {activePatient ? (
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-extrabold text-[#25418F] bg-blue-50 px-3 py-1.5 rounded-l-full uppercase tracking-widest border border-blue-100 border-r-0">
                                    Current Patient
                                </span>
                                <select 
                                    className="bg-blue-50 border border-blue-100 text-[#25418F] font-bold text-sm py-1 pl-2 pr-6 rounded-r-full focus:outline-none appearance-none cursor-pointer"
                                    value={activePatient.id}
                                    onChange={(e) => useDoctorStore.getState().setActivePatient(e.target.value)}
                                >
                                    {useDoctorStore.getState().patients.map(p => (
                                        <option key={p.id} value={p.id}>{p.name} (Age {p.age})</option>
                                    ))}
                                </select>
                            </div>
                        ) : (
                            <div className="text-sm font-bold text-slate-400">Welcome, Doctor</div>
                        )}
                    </div>
                    {/* Header content varies per page, so we can inject dynamically or handle in pages */}
                    <div className="flex items-center justify-end">
                        {/* User profile common area */}
                        <div className="flex items-center gap-4">
                            {/* Could add a global Notifications icon, User Profile etc. */}
                        </div>
                    </div>
                </div>

                {/* Page Content */}
                <main className="flex-1 overflow-y-auto px-8 py-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
