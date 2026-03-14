import { create } from 'zustand';
import { useHealthStore } from './useHealthStore';
import { useReportStore } from './useReportStore';
import { useChatStore } from './useChatStore';

export interface Patient {
    id: string;
    name: string;
    age: number;
    lastVisit: string;
    status: 'Stable' | 'Critical' | 'Under Observation';
    avatarUrl?: string;
    mockData: {
        vitals: any;
        logs: any[];
        reports: any[];
        chatSessions: any[];
    };
}

interface DoctorState {
    patients: Patient[];
    activePatientId: string | null;
    setActivePatient: (id: string) => void;
    getActivePatient: () => Patient | null;
    addPatient: (patient: Patient) => void;
}

const initialPatients: Patient[] = [
    {
        id: 'p1',
        name: 'John Doe',
        age: 42,
        lastVisit: '2023-11-01',
        status: 'Stable',
        mockData: {
            vitals: { bloodOxygen: '98', restingHeartRate: '75', sleepHours: '7', activityScore: '80', bloodPressureSys: '120', bloodPressureDia: '80', healthRiskScore: '15' },
            logs: [{ id: '1', date: '2023-11-01T10:00:00Z', type: 'Vitals', description: 'Routine checkup. All normal.' }],
            reports: [{ id: '1', title: 'Annual Bloodwork', date: '2023-11-01T10:00:00Z', category: 'Bloodwork', source: 'File Upload', summary: 'Cholesterol levels improved slightly.' }],
            chatSessions: []
        }
    },
    {
        id: 'p2',
        name: 'Jane Smith',
        age: 35,
        lastVisit: '2023-11-12',
        status: 'Under Observation',
        mockData: {
            vitals: { bloodOxygen: '95', restingHeartRate: '88', sleepHours: '5', activityScore: '40', bloodPressureSys: '135', bloodPressureDia: '85', healthRiskScore: '60' },
            logs: [{ id: '2', date: '2023-11-12T14:30:00Z', type: 'Symptoms', description: 'Patient reports feeling fatigued and dizzy upon waking up.' }],
            reports: [],
            chatSessions: []
        }
    },
    {
        id: 'p3',
        name: 'Robert Johnson',
        age: 58,
        lastVisit: '2023-11-14',
        status: 'Critical',
        mockData: {
            vitals: { bloodOxygen: '91', restingHeartRate: '105', sleepHours: '4', activityScore: '15', bloodPressureSys: '150', bloodPressureDia: '95', healthRiskScore: '90' },
            logs: [{ id: '3', date: '2023-11-14T09:15:00Z', type: 'Symptoms', description: 'Severe chest tightness and shortness of breath.' }],
            reports: [{ id: '2', title: 'Chest X-Ray', date: '2023-11-14T10:30:00Z', category: 'Imaging', source: 'EMR Integration', summary: 'Signs of slight pulmonary edema.' }],
            chatSessions: []
        }
    }
];

export const useDoctorStore = create<DoctorState>((set, get) => ({
    patients: initialPatients,
    activePatientId: null,
    setActivePatient: (id: string) => {
        const { patients, activePatientId } = get();
        
        // Save current state to previous patient before switching
        if (activePatientId) {
            const currentVitals = useHealthStore.getState().vitals;
            const currentLogs = useHealthStore.getState().logs;
            const currentReports = useReportStore.getState().reports;
            const currentChats = useChatStore.getState().sessions;
            
            set((state) => ({
                patients: state.patients.map((p) => 
                    p.id === activePatientId ? { 
                        ...p, 
                        mockData: { vitals: currentVitals, logs: currentLogs, reports: currentReports, chatSessions: currentChats } 
                    } : p
                )
            }));
        }

        // Set new active patient
        set({ activePatientId: id });
        
        // Load new patient's data into stores
        const newPatient = get().patients.find(p => p.id === id);
        if (newPatient) {
            useHealthStore.setState({ vitals: newPatient.mockData.vitals, logs: newPatient.mockData.logs });
            useReportStore.setState({ reports: newPatient.mockData.reports });
            useChatStore.setState({ sessions: newPatient.mockData.chatSessions });
        }
    },
    getActivePatient: () => {
        const { patients, activePatientId } = get();
        return patients.find(p => p.id === activePatientId) || null;
    },
    addPatient: (patient: Patient) => {
        set((state) => ({
            patients: [patient, ...state.patients]
        }));
    }
}));
