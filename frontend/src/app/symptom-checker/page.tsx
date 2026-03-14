"use client";
import DashboardLayout from '../../components/DashboardLayout';
import { Activity, Heart, Moon, Zap, Send } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useHealthStore } from '../../store/useHealthStore';

export default function SymptomCheckerPage() {
    const router = useRouter();
    const { vitals, updateVitals, addLog } = useHealthStore();

    const [formData, setFormData] = useState({
        bloodOxygen: vitals.bloodOxygen,
        restingHeartRate: vitals.restingHeartRate,
        sleepHours: vitals.sleepHours,
        sleepMinutes: vitals.sleepMinutes,
        activityScore: vitals.activityScore,
        symptoms: ''
    });

    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // Compute a local risk score from vitals (used as fallback if AI fails)
    const computeLocalRiskScore = (data: typeof formData): number => {
        let score = 10;
        const hr = parseInt(data.restingHeartRate) || 0;
        const spo2 = parseInt(data.bloodOxygen) || 0;
        const sleep = parseInt(data.sleepHours) || 0;
        const activity = parseInt(data.activityScore) || 0;

        // Heart rate risk
        if (hr > 100) score += 25;
        else if (hr > 90) score += 15;
        else if (hr > 0 && hr < 50) score += 20;

        // Blood oxygen risk
        if (spo2 > 0 && spo2 < 92) score += 30;
        else if (spo2 >= 92 && spo2 < 95) score += 18;
        else if (spo2 >= 95 && spo2 < 97) score += 8;

        // Sleep risk
        if (sleep > 0 && sleep < 5) score += 20;
        else if (sleep >= 5 && sleep < 7) score += 10;

        // Low activity risk
        if (activity > 0 && activity < 30) score += 10;
        else if (activity >= 30 && activity < 50) score += 5;

        return Math.min(score, 100);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const updated = { ...formData, [e.target.name]: e.target.value };
        setFormData(updated);

        // Immediately sync vitals to the global store so dashboard updates live
        if (e.target.name !== 'symptoms') {
            const liveScore = computeLocalRiskScore(updated);
            updateVitals({
                bloodOxygen: updated.bloodOxygen,
                restingHeartRate: updated.restingHeartRate,
                sleepHours: updated.sleepHours,
                sleepMinutes: updated.sleepMinutes,
                activityScore: updated.activityScore,
                healthRiskScore: liveScore.toString(),
            });
        }
    };

    const [showResults, setShowResults] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsAnalyzing(true);

        // Always persist vitals to store immediately (live risk score already set by handleChange)
        const fallbackScore = computeLocalRiskScore(formData);

        try {
            const response = await fetch('http://localhost:5000/api/symptoms/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer DUMMY_TOKEN'
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                console.error("AI Analysis failed to fetch.");
                // Still save vitals with computed local score
                updateVitals({
                    bloodOxygen: formData.bloodOxygen,
                    restingHeartRate: formData.restingHeartRate,
                    sleepHours: formData.sleepHours,
                    sleepMinutes: formData.sleepMinutes,
                    activityScore: formData.activityScore,
                    healthRiskScore: fallbackScore.toString(),
                });
            } else {
                const data = await response.json();
                // Use AI risk score if provided; otherwise use our local computation
                const finalScore = (data.risk_score && data.risk_score > 0)
                    ? data.risk_score.toString()
                    : fallbackScore.toString();

                updateVitals({
                    bloodOxygen: formData.bloodOxygen,
                    restingHeartRate: formData.restingHeartRate,
                    sleepHours: formData.sleepHours,
                    sleepMinutes: formData.sleepMinutes,
                    activityScore: formData.activityScore,
                    healthRiskScore: finalScore,
                    healthAnalysisNotes: data.ai_analysis_notes,
                    healthPrecautions: data.precautions,
                    possibleConditions: data.possible_conditions,
                    doctorAdvice: data.doctor_advice
                });

                addLog({
                    type: 'Vitals',
                    description: `AI Symptom Check: ${formData.symptoms || 'Routine check'}`,
                    vitals: {
                        bloodOxygen: formData.bloodOxygen,
                        restingHeartRate: formData.restingHeartRate,
                        sleepHours: formData.sleepHours,
                        sleepMinutes: formData.sleepMinutes,
                        activityScore: formData.activityScore,
                    }
                });
                
                setShowResults(true);
            }
        } catch (error) {
            console.error("AI Connection Error:", error);
            // Even on network error, save the computed risk score for the dashboard
            updateVitals({
                bloodOxygen: formData.bloodOxygen,
                restingHeartRate: formData.restingHeartRate,
                sleepHours: formData.sleepHours,
                sleepMinutes: formData.sleepMinutes,
                activityScore: formData.activityScore,
                healthRiskScore: fallbackScore.toString(),
            });
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <DashboardLayout>
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-2xl font-extrabold text-[#1E293B]">Health Data Input</h1>
                <div className="flex gap-4">
                    <span className="bg-[#25418F] text-white px-4 py-2 font-bold text-xs uppercase tracking-wider rounded-full">
                        Manual Entry Mode
                    </span>
                </div>
            </div>

            <div className="max-w-4xl mx-auto bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
                <div className="mb-8 border-b border-slate-100 pb-6">
                    <h2 className="text-xl font-bold text-slate-800 mb-2">Log Your Remote Vitals</h2>
                    <p className="text-sm font-medium text-slate-500">
                        Enter your current physical measurements to instantly update your Dashboard and allow the AI to generate a new Health Risk Score.
                    </p>
                </div>

                {isAnalyzing ? (
                    <div className="py-24 flex flex-col items-center justify-center">
                        <Activity size={48} className="text-[#25418F] animate-pulse mb-6" />
                        <h3 className="text-2xl font-black text-slate-800 mb-2">Analyzing Vitals...</h3>
                        <p className="text-slate-500 font-medium">Please wait while the AI processes your data.</p>
                        <div className="w-64 h-2 bg-slate-100 rounded-full mt-6 overflow-hidden relative">
                            <div className="absolute top-0 bottom-0 left-0 bg-[#25418F] animate-[pulse_2s_ease-in-out_infinite] w-full origin-left"></div>
                        </div>
                    </div>
                ) : showResults ? (
                    <div className="space-y-8 animate-in fade-in zoom-in duration-500">
                        <div className="text-center mb-8">
                            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-50 text-[#25418F] mb-4 shadow-inner">
                                <Activity size={32} />
                            </div>
                            <h2 className="text-3xl font-black text-slate-800 mb-2">Analysis Complete</h2>
                            <p className="text-slate-500 font-medium text-lg">
                                Risk Score: <span className="font-bold text-[#25418F]">{vitals.healthRiskScore}/100</span>
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Possible Conditions */}
                            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 h-full">
                                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <Activity size={18} className="text-[#25418F]" /> Possible Conditions
                                </h3>
                                {vitals.possibleConditions && vitals.possibleConditions.length > 0 ? (
                                    <ul className="space-y-3">
                                        {vitals.possibleConditions.map((cond: any, i: number) => (
                                            <li key={i} className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                                                <span className="font-semibold text-slate-700">{cond.condition}</span>
                                                <span className="text-sm font-bold px-2 py-1 rounded bg-blue-50 text-blue-700">
                                                    {Math.round(cond.probability * 100)}% Match
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-sm text-slate-500 italic">No specific conditions identified.</p>
                                )}
                            </div>

                            {/* Doctor Advice */}
                            <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100 h-full">
                                <h3 className="font-bold text-[#25418F] mb-4 flex items-center gap-2">
                                    <Heart size={18} /> Doctor's Advice
                                </h3>
                                <p className="text-slate-700 font-medium leading-relaxed">
                                    {vitals.doctorAdvice || "Monitor your symptoms closely. If they worsen, consult a healthcare professional."}
                                </p>
                            </div>
                        </div>

                        {/* Precautions */}
                        <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100">
                            <h3 className="font-bold text-amber-800 mb-4 flex items-center gap-2">
                                <Zap size={18} /> Recommended Precautions
                            </h3>
                            {vitals.healthPrecautions && vitals.healthPrecautions.length > 0 ? (
                                <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-2">
                                    {vitals.healthPrecautions.map((prec: string, i: number) => (
                                        <li key={i} className="flex items-start gap-2 text-amber-900 font-medium text-sm">
                                            <span className="bg-amber-200 text-amber-800 rounded-full w-5 h-5 flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">{i + 1}</span>
                                            {prec}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-slate-500 italic">Rest and hydrate.</p>
                            )}
                        </div>

                        <div className="flex justify-center pt-6">
                            <button
                                onClick={() => router.push('/dashboard')}
                                className="bg-[#25418F] text-white px-8 py-4 rounded-xl font-bold shadow-lg hover:bg-blue-800 transition transform hover:-translate-y-1"
                            >
                                Return to Dashboard
                            </button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Blood Oxygen */}
                            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                                <label className="flex items-center gap-2 text-xs font-bold text-slate-500 tracking-wider mb-4 uppercase">
                                    <Activity size={16} className="text-[#25418F]" /> Blood Oxygen (%)
                                </label>
                                <input
                                    type="number"
                                    name="bloodOxygen"
                                    value={formData.bloodOxygen}
                                    onChange={handleChange}
                                    placeholder="e.g., 98"
                                    className="w-full text-2xl font-black text-slate-800 bg-transparent border-b-2 border-slate-200 focus:border-[#25418F] focus:outline-none transition pb-2 placeholder:text-slate-300"
                                />
                            </div>

                            {/* Resting Heart Rate */}
                            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                                <label className="flex items-center gap-2 text-xs font-bold text-slate-500 tracking-wider mb-4 uppercase">
                                    <Heart size={16} className="text-[#25418F]" /> Resting Heart Rate (BPM)
                                </label>
                                <input
                                    type="number"
                                    name="restingHeartRate"
                                    value={formData.restingHeartRate}
                                    onChange={handleChange}
                                    placeholder="e.g., 72"
                                    className="w-full text-2xl font-black text-slate-800 bg-transparent border-b-2 border-slate-200 focus:border-[#25418F] focus:outline-none transition pb-2 placeholder:text-slate-300"
                                />
                            </div>

                            {/* Sleep Duration */}
                            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                                <label className="flex items-center gap-2 text-xs font-bold text-slate-500 tracking-wider mb-4 uppercase">
                                    <Moon size={16} className="text-[#25418F]" /> Sleep Duration
                                </label>
                                <div className="flex items-center gap-4">
                                    <div className="flex-1 relative">
                                        <input
                                            type="number"
                                            name="sleepHours"
                                            value={formData.sleepHours}
                                            onChange={handleChange}
                                            placeholder="Hours"
                                            className="w-full text-2xl font-black text-slate-800 bg-transparent border-b-2 border-slate-200 focus:border-[#25418F] focus:outline-none transition pb-2 placeholder:text-slate-300"
                                        />
                                        <span className="absolute right-0 bottom-3 text-sm font-bold text-slate-400">h</span>
                                    </div>
                                    <div className="flex-1 relative">
                                        <input
                                            type="number"
                                            name="sleepMinutes"
                                            value={formData.sleepMinutes}
                                            onChange={handleChange}
                                            placeholder="Mins"
                                            className="w-full text-2xl font-black text-slate-800 bg-transparent border-b-2 border-slate-200 focus:border-[#25418F] focus:outline-none transition pb-2 placeholder:text-slate-300"
                                        />
                                        <span className="absolute right-0 bottom-3 text-sm font-bold text-slate-400">m</span>
                                    </div>
                                </div>
                            </div>

                            {/* Activity Score */}
                            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                                <label className="flex items-center gap-2 text-xs font-bold text-slate-500 tracking-wider mb-4 uppercase">
                                    <Zap size={16} className="text-[#25418F]" /> Activity Score (1-100)
                                </label>
                                <input
                                    type="number"
                                    name="activityScore"
                                    value={formData.activityScore}
                                    onChange={handleChange}
                                    placeholder="e.g., 85"
                                    className="w-full text-2xl font-black text-slate-800 bg-transparent border-b-2 border-slate-200 focus:border-[#25418F] focus:outline-none transition pb-2 placeholder:text-slate-300"
                                />
                            </div>
                        </div>

                        {/* Additional Text Input for Symptoms */}
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                            <label className="block text-xs font-bold text-slate-500 tracking-wider mb-4 uppercase">
                                Describe Additional Symptoms
                            </label>
                            <textarea
                                name="symptoms"
                                value={formData.symptoms}
                                onChange={handleChange}
                                placeholder="E.g., I have been feeling a mild headache since morning..."
                                className="w-full h-32 p-4 rounded-xl border border-slate-200 bg-white font-medium text-slate-800 focus:border-[#25418F] focus:outline-none transition resize-none shadow-inner"
                            ></textarea>
                        </div>

                        <div className="flex justify-end pt-4">
                            <button
                                type="submit"
                                className="bg-[#25418F] text-white px-8 py-4 rounded-xl font-bold shadow-lg hover:bg-blue-800 transition flex items-center gap-3"
                            >
                                Process Data & Update Dashboard <Send size={18} />
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </DashboardLayout>
    );
}
