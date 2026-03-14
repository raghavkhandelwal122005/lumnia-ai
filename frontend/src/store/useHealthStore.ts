import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface HealthVitals {
    bloodOxygen: string;
    restingHeartRate: string;
    sleepHours: string;
    sleepMinutes: string;
    activityScore: string;
    bloodPressureSys: string;
    bloodPressureDia: string;
    healthRiskScore: string;
    sugarLevel?: string;
    weight?: string;
    healthAnalysisNotes?: string;
    healthPrecautions?: string[];
    possibleConditions?: any[];
    doctorAdvice?: string;
}

export interface HealthLog {
    id: string;
    date: string;
    type: 'Vitals' | 'Symptoms';
    description: string;
    vitals?: Partial<HealthVitals>;
}

interface HealthState {
    vitals: HealthVitals;
    logs: HealthLog[];
    a11yMode: boolean;
    updateVitals: (vitals: Partial<HealthVitals>) => void;
    addLog: (log: Omit<HealthLog, 'id' | 'date'>) => void;
    clearVitals: () => void;
    toggleA11yMode: () => void;
}

const defaultVitals: HealthVitals = {
    bloodOxygen: '',
    restingHeartRate: '',
    sleepHours: '',
    sleepMinutes: '',
    activityScore: '',
    bloodPressureSys: '',
    bloodPressureDia: '',
    healthRiskScore: '',
};

export const useHealthStore = create<HealthState>()(
    persist(
        (set) => ({
            vitals: defaultVitals,
            logs: [],
            a11yMode: false,
            updateVitals: (newVitals) =>
                set((state) => ({
                    vitals: { ...state.vitals, ...newVitals },
                })),
            addLog: (logData) =>
                set((state) => {
                    const newLog: HealthLog = {
                        ...logData,
                        id: Date.now().toString(),
                        date: new Date().toISOString(),
                    };
                    return { logs: [newLog, ...state.logs] };
                }),
            clearVitals: () => set({ vitals: defaultVitals, logs: [] }),
            toggleA11yMode: () => set((state) => ({ a11yMode: !state.a11yMode })),
        }),
        {
            name: 'health-storage',
        }
    )
);

