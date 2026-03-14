"use client";
import DashboardLayout from '../../components/DashboardLayout';
import { Activity, Droplet, Heart, Moon, Zap, Download, X, FileImage, Upload, CheckCircle } from 'lucide-react';
import { useHealthStore } from '../../store/useHealthStore';
import { useState, useRef, useEffect, useMemo } from 'react';
import jsPDF from 'jspdf';
import axios from 'axios';

export default function DashboardPage() {
    const { vitals, logs } = useHealthStore();
    const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadResult, setUploadResult] = useState<any>(null);
    const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
    const [loadingSuggestions, setLoadingSuggestions] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Live-computed risk score from ALL available vitals — updates instantly as vitals change
    const computedRiskScore = useMemo(() => {
        const hasAnyVital = vitals.restingHeartRate || vitals.bloodOxygen || vitals.sleepHours ||
            vitals.bloodPressureSys || vitals.activityScore;
        if (!hasAnyVital) return null;

        let score = 10;
        const hr = parseInt(vitals.restingHeartRate) || 0;
        const spo2 = parseInt(vitals.bloodOxygen) || 0;
        const sleep = parseInt(vitals.sleepHours) || 0;
        const activity = parseInt(vitals.activityScore) || 0;
        const bpSys = parseInt(vitals.bloodPressureSys) || 0;
        const bpDia = parseInt(vitals.bloodPressureDia) || 0;
        const sugar = parseInt((vitals as any).sugarLevel) || 0;

        if (hr > 100) score += 25;
        else if (hr > 90) score += 15;
        else if (hr > 0 && hr < 50) score += 20;

        if (spo2 > 0 && spo2 < 92) score += 30;
        else if (spo2 >= 92 && spo2 < 95) score += 18;
        else if (spo2 >= 95 && spo2 < 97) score += 8;

        if (sleep > 0 && sleep < 5) score += 20;
        else if (sleep >= 5 && sleep < 7) score += 10;

        if (bpSys > 140 || bpDia > 90) score += 25;
        else if (bpSys > 120 || bpDia > 80) score += 12;

        if (sugar > 200) score += 20;
        else if (sugar > 140) score += 10;

        if (activity > 0 && activity < 30) score += 10;
        else if (activity >= 30 && activity < 50) score += 5;

        return Math.min(score, 100);
    }, [vitals]);

    // Use AI-set score if available, otherwise fall back to live computed score
    const displayScore = vitals.healthRiskScore || (computedRiskScore !== null ? computedRiskScore.toString() : null);
    const scoreLabel = getScoreLabel(displayScore);

    function getScoreLabel(score: string | null): { text: string; color: string } {
        if (!score) return { text: 'No Data', color: 'text-blue-200' };
        const n = parseInt(score);
        if (n <= 25) return { text: 'Low Risk', color: 'text-emerald-300' };
        if (n <= 50) return { text: 'Moderate Risk', color: 'text-yellow-300' };
        if (n <= 75) return { text: 'High Risk', color: 'text-orange-300' };
        return { text: 'Critical', color: 'text-red-300' };
    }

    // Fetch AI Suggestions
    useEffect(() => {
        const fetchSuggestions = async () => {
            if (logs.length === 0 && !vitals.bloodOxygen) return; // Skip if completely empty
            
            setLoadingSuggestions(true);
            try {
                const res = await axios.post('http://localhost:5000/api/suggestions/generate', { vitals, logs }, {
                    headers: { Authorization: 'Bearer DUMMY_TOKEN' }
                });
                setAiSuggestions(res.data.suggestions || []);
            } catch (err) {
                console.error("Failed to fetch AI suggestions:", err);
            } finally {
                setLoadingSuggestions(false);
            }
        };

        fetchSuggestions();
    }, [vitals, logs]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
            setUploadResult(null);
        }
    };

    const handleUpload = async () => {
        if (!selectedFile) return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append('image', selectedFile);

        try {
            // Include token if using auth, assumed no auth needed for local dev or handle globally
            const response = await axios.post('http://localhost:5000/api/upload/image', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer mock-jwt-token` // Placeholder for required auth middleware
                }
            });
            setUploadResult(response.data.analysis);
        } catch (error) {
            console.error('Error uploading image:', error);
            alert('Failed to analyze image. Please check the backend server.');
        } finally {
            setIsUploading(false);
            setSelectedFile(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const generatePDF = () => {
        const doc = new jsPDF();

        doc.setFont("helvetica", "bold");
        doc.setFontSize(22);
        doc.setTextColor(37, 65, 143); // #25418F
        doc.text("Lumina Health - Medical Analysis Report", 20, 20);

        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 100, 100);
        const date = new Date().toLocaleString();
        doc.text(`Generated: ${date}`, 20, 30);

        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.5);
        doc.line(20, 35, 190, 35);

        doc.setTextColor(30, 41, 59); // slate-800
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text("Patient Vitals Summary", 20, 48);

        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        doc.text(`Blood Oxygen: ${vitals.bloodOxygen || 'N/A'}%`, 20, 58);
        doc.text(`Resting Heart Rate: ${vitals.restingHeartRate || 'N/A'} BPM`, 20, 68);
        doc.text(`Sleep Duration: ${vitals.sleepHours || '0'}h ${vitals.sleepMinutes || '0'}m`, 20, 78);
        doc.text(`Activity Score: ${vitals.activityScore || 'N/A'}/100`, 20, 88);

        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(37, 65, 143);
        doc.text(`Overall Risk Score: ${vitals.healthRiskScore || 'Pending'}/100`, 20, 108);

        doc.setFontSize(14);
        doc.setTextColor(30, 41, 59);
        doc.text("AI Analysis Notes:", 20, 122);

        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(71, 85, 105);

        let notes = "Awaiting complete data to generate comprehensive AI analysis.";
        if (vitals.healthRiskScore) {
            const risk = parseInt(vitals.healthRiskScore);
            if (risk > 60) {
                notes = "Higher than normal health risk detected. Please review cardiovascular activity and oxygenation.\nWe highly recommend scheduling a consultation with a registered specialist.";
            } else if (risk > 30) {
                notes = "Moderate health risk. Vitals show general stability but indicate room for improvement.\nConsider increasing activity duration and aiming for a standardized 8-hour sleep cycle.";
            } else {
                notes = "Low health risk. Current vitals reflect a healthy baseline. Maintain current lifestyle choices and\ncontinue periodic monitoring to ensure continued wellbeing.";
            }
        }

        const splitNotes = doc.splitTextToSize(notes, 170);
        doc.text(splitNotes, 20, 132);

        // Footer
        doc.setFontSize(10);
        doc.setTextColor(150, 150, 150);
        doc.text("Generated securely by Lumina Health AI • Not a substitute for medical advice.", 20, 280);

        doc.save("lumina-health-analysis.pdf");
    };
    return (
        <DashboardLayout>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-extrabold text-[#1E293B]">Dashboard</h1>
                <div className="flex gap-4">
                    <input type="text" placeholder="Search health records, symptoms, or docs..." className="bg-white border border-slate-200 px-4 py-2 w-80 rounded-full text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#25418F]/20 transition" />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* Main Risk Score Card */}
                <div className="lg:col-span-2 bg-[#25418F] p-8 rounded-3xl text-white relative overflow-hidden shadow-xl shadow-blue-900/20 flex flex-col justify-between">
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-10">
                            <div>
                                <h2 className="text-xl font-bold mb-1">Overall Health Risk Score</h2>
                                <p className="text-sm font-medium text-blue-200">
                                    {displayScore ? "Live — updates as you enter vitals" : "Log your vitals to generate a score"}
                                </p>
                            </div>
                            <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 text-sm font-bold tracking-wide">
                                {displayScore ? "Analysis Complete" : "Awaiting Data"}
                            </div>
                        </div>

                        <div className="flex items-end gap-4 mb-4">
                            <span className="text-7xl font-black tabular-nums">{displayScore || '--'}</span>
                            <div className="mb-3">
                                <span className="text-2xl font-bold text-blue-200">/ 100</span>
                                {displayScore && (
                                    <p className={`text-sm font-bold mt-1 ${scoreLabel.color}`}>{scoreLabel.text}</p>
                                )}
                            </div>
                        </div>

                        {displayScore && (
                            <div className="w-full bg-white/10 rounded-full h-2 mb-6">
                                <div
                                    className="h-2 rounded-full transition-all duration-700"
                                    style={{
                                        width: `${displayScore}%`,
                                        backgroundColor: parseInt(displayScore) <= 25 ? '#34d399' : parseInt(displayScore) <= 50 ? '#fbbf24' : parseInt(displayScore) <= 75 ? '#fb923c' : '#f87171'
                                    }}
                                />
                            </div>
                        )}

                        <p className="text-blue-100 font-medium max-w-md mb-8 leading-relaxed">
                            {displayScore
                                ? "Your risk score is a live metric computed from all logged vitals. It updates instantly when you enter new values."
                                : "Awaiting data. Log vitals in Health Logs or Health Data Input to generate your personalized score."}
                        </p>

                        <div className="flex gap-4">
                            <button onClick={() => setIsAnalysisOpen(true)} className="bg-white text-[#25418F] px-6 py-3 rounded-xl font-bold shadow hover:bg-slate-50 transition">View Full Analysis</button>
                            <button onClick={generatePDF} className="bg-blue-800 text-white px-6 py-3 rounded-xl font-bold shadow hover:bg-blue-700 transition border border-blue-600 flex items-center gap-2">
                                <Download size={18} /> Download PDF
                            </button>
                        </div>
                    </div>
                </div>

                {/* AI Health Suggestions */}
                <div className="bg-indigo-50/50 p-6 rounded-3xl border border-indigo-100 flex flex-col h-full">
                    <h3 className="text-lg font-bold text-indigo-900 flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-700">
                            <Zap size={18} />
                        </div>
                        AI Health Tips
                    </h3>
                    
                    {loadingSuggestions ? (
                        <div className="flex-1 flex flex-col items-center justify-center">
                            <Activity className="animate-pulse text-indigo-400 mb-2" />
                            <p className="text-sm font-medium text-indigo-600">Generating insights...</p>
                        </div>
                    ) : aiSuggestions.length > 0 ? (
                        <div className="flex-1 flex flex-col gap-3 overflow-y-auto pr-2">
                            {aiSuggestions.map((suggestion, idx) => (
                                <div key={idx} className="bg-white p-4 rounded-2xl border border-indigo-50 shadow-sm text-sm font-medium text-slate-700">
                                    {suggestion}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center">
                            <p className="text-sm font-medium text-indigo-400">Not enough data to generate targeted suggestions yet. Log your vitals!</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
                {/* AI Image Upload / Scan Analysis */}
                <div className="lg:col-span-4 bg-white p-6 rounded-3xl border border-slate-200 flex flex-col gap-4">
                    <div className="flex items-start justify-between flex-wrap gap-3">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-[#25418F]">
                                    <FileImage size={18} />
                                </div>
                                AI Medical Scan Analysis
                            </h3>
                            <p className="text-xs text-slate-500 font-medium mt-1 ml-10">
                                Upload an X-ray, MRI snippet, skin photo, or any medical image. Our AI will scan it and provide a preliminary finding.
                                <span className="text-slate-400"> (Not a substitute for professional diagnosis)</span>
                            </p>
                        </div>
                        <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 text-xs font-bold text-slate-500">
                            <FileImage size={12} /> PNG · JPG · JPEG
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row gap-3">
                        <input
                            type="file"
                            accept="image/png, image/jpeg, image/jpg"
                            onChange={handleFileChange}
                            ref={fileInputRef}
                            className="hidden"
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="flex-1 py-5 border-2 border-dashed border-slate-300 text-slate-500 font-bold text-sm rounded-2xl hover:bg-slate-50 hover:border-[#25418F]/40 transition flex flex-col items-center justify-center gap-2"
                        >
                            <Upload size={24} className={selectedFile ? 'text-[#25418F]' : 'text-slate-300'} />
                            <span className={selectedFile ? 'text-[#25418F]' : 'text-slate-400'}>
                                {selectedFile ? `✓ ${selectedFile.name}` : 'Click to select medical image'}
                            </span>
                            {!selectedFile && <span className="text-[11px] text-slate-400 font-normal">X-Ray, skin photo, MRI image, etc.</span>}
                        </button>
                        
                        {selectedFile && (
                            <button
                                onClick={handleUpload}
                                disabled={isUploading}
                                className="px-10 bg-[#25418F] text-white py-3 rounded-2xl font-bold shadow hover:bg-blue-800 transition disabled:opacity-50 flex items-center gap-2"
                            >
                                {isUploading ? (
                                    <><Activity size={16} className="animate-spin" /> Analyzing...</>
                                ) : (
                                    <><Zap size={16} /> Analyze Now</>
                                )}
                            </button>
                        )}
                    </div>

                    {uploadResult && (
                        <div className="mt-2 p-5 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 flex flex-col gap-3">
                            <div className="flex items-center gap-2 text-sm font-bold text-[#25418F]">
                                <CheckCircle size={18} /> AI Scan Analysis Complete
                            </div>
                            <p className="text-sm font-semibold text-slate-800 leading-relaxed">{uploadResult.finding}</p>
                            <div className="flex items-center gap-3">
                                <span className="text-xs font-bold text-slate-500">AI Confidence:</span>
                                <div className="flex-1 bg-blue-100 rounded-full h-2 max-w-xs">
                                    <div
                                        className="bg-[#25418F] h-2 rounded-full transition-all duration-700"
                                        style={{ width: `${Math.round(uploadResult.confidence * 100)}%` }}
                                    />
                                </div>
                                <span className="text-xs font-bold text-[#25418F]">{Math.round(uploadResult.confidence * 100)}%</span>
                            </div>
                            <p className="text-xs text-slate-400 font-medium border-t border-blue-100 pt-3">
                                ⚕️ This is a preliminary AI analysis only. Always consult a licensed radiologist or physician for a definitive diagnosis.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-slate-200 flex flex-col justify-center shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-bold text-slate-400 tracking-wider">BLOOD OXYGEN</span>
                        <Activity size={18} className="text-[#25418F]" />
                    </div>
                    <span className="text-3xl font-black text-slate-800">{vitals.bloodOxygen || '__'}%</span>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-200 flex flex-col justify-center shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-bold text-slate-400 tracking-wider">RESTING HEART</span>
                        <Heart size={18} className="text-[#25418F]" />
                    </div>
                    <span className="text-3xl font-black text-slate-800">{vitals.restingHeartRate || '__'} <span className="text-lg font-bold text-slate-500">BPM</span></span>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-200 flex flex-col justify-center shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-bold text-slate-400 tracking-wider">SLEEP DURATION</span>
                        <Moon size={18} className="text-[#25418F]" />
                    </div>
                    <span className="text-3xl font-black text-slate-800">
                        {vitals.sleepHours || '__'}h {vitals.sleepMinutes || '__'}m
                    </span>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-200 flex flex-col justify-center shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-bold text-slate-400 tracking-wider">ACTIVITY SCORE</span>
                        <Zap size={18} className="text-[#25418F]" />
                    </div>
                    <span className="text-3xl font-black text-slate-800">{vitals.activityScore || '__'}</span>
                </div>
            </div>

            {/* Recent Logs + Health Alerts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
                {/* Recent Health Logs */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-[#25418F]">
                            <Activity size={18} />
                        </div>
                        Recent Health Logs
                        {logs.length > 0 && <span className="ml-auto text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-full">{logs.length} entries</span>}
                    </h3>
                    {logs.length === 0 ? (
                        <div className="text-center py-10 flex flex-col items-center gap-3">
                            <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                                <Activity size={28} />
                            </div>
                            <p className="text-sm font-semibold text-slate-400">No health logs yet.</p>
                            <p className="text-xs text-slate-400">Go to <strong>Health Logs</strong> to start tracking.</p>
                        </div>
                    ) : (
                        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                            {logs.slice(0, 5).map((log, idx) => {
                                const isVitals = log.type === 'Vitals';
                                const logDate = log.date ? new Date(log.date) : null;
                                const timeStr = logDate ? logDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--';
                                const dateStr = logDate ? logDate.toLocaleDateString([], { day: 'numeric', month: 'short' }) : 'Today';
                                return (
                                    <div key={log.id || idx} className={`flex items-start gap-4 p-4 rounded-2xl border ${
                                        isVitals ? 'bg-blue-50/40 border-blue-100' : 'bg-amber-50/40 border-amber-100'
                                    }`}>
                                        {/* Icon */}
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm ${
                                            isVitals ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                                        }`}>
                                            {isVitals ? <Heart size={18} /> : <Activity size={18} />}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-1.5">
                                                <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                                                    isVitals ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                                                }`}>{log.type}</span>
                                                <span className="text-[11px] font-semibold text-slate-400">{dateStr} · {timeStr}</span>
                                            </div>

                                            {/* Vital badges */}
                                            {isVitals && log.vitals && (
                                                <div className="flex flex-wrap gap-1.5 mb-2">
                                                    {log.vitals.restingHeartRate && <span className="inline-flex items-center gap-1 text-xs font-bold bg-red-50 text-red-600 border border-red-100 px-2 py-0.5 rounded-full"><Heart size={10} /> {log.vitals.restingHeartRate} BPM</span>}
                                                    {log.vitals.bloodPressureSys && <span className="inline-flex items-center gap-1 text-xs font-bold bg-purple-50 text-purple-700 border border-purple-100 px-2 py-0.5 rounded-full"><Droplet size={10} /> {log.vitals.bloodPressureSys}/{log.vitals.bloodPressureDia} mmHg</span>}
                                                    {(log.vitals as any).sugarLevel && <span className="inline-flex items-center gap-1 text-xs font-bold bg-orange-50 text-orange-600 border border-orange-100 px-2 py-0.5 rounded-full">🍬 {(log.vitals as any).sugarLevel} mg/dL</span>}
                                                    {(log.vitals as any).weight && <span className="inline-flex items-center gap-1 text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full">⚖️ {(log.vitals as any).weight} kg</span>}
                                                </div>
                                            )}

                                            {/* Description */}
                                            {log.description && (
                                                <p className="text-xs text-slate-500 font-medium leading-relaxed truncate" title={log.description}>{log.description}</p>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Health Alerts */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center text-red-500">
                            <Heart size={18} />
                        </div>
                        Health Alerts
                    </h3>
                    {(() => {
                        const alerts: {type: string; message: string; severity: 'warning' | 'danger' | 'info'}[] = [];

                        if (vitals.restingHeartRate && parseInt(vitals.restingHeartRate) > 100) {
                            alerts.push({ type: 'Heart Rate', message: `Resting HR is ${vitals.restingHeartRate} BPM — above normal range (60–100). Consider monitoring closely.`, severity: 'danger' });
                        } else if (vitals.restingHeartRate && parseInt(vitals.restingHeartRate) > 90) {
                            alerts.push({ type: 'Heart Rate', message: `Resting HR is ${vitals.restingHeartRate} BPM — slightly elevated. Try relaxation techniques.`, severity: 'warning' });
                        }

                        if (vitals.bloodOxygen && parseInt(vitals.bloodOxygen) < 95) {
                            alerts.push({ type: 'Blood Oxygen', message: `SpO2 is ${vitals.bloodOxygen}% — below optimal. Ensure good ventilation.`, severity: 'danger' });
                        }

                        if (vitals.sleepHours && parseInt(vitals.sleepHours) < 6) {
                            alerts.push({ type: 'Sleep', message: `Only ${vitals.sleepHours}h of sleep recorded. Aim for 7–9 hours.`, severity: 'warning' });
                        }

                        const lastLog = logs.length > 0 ? logs[logs.length - 1] : null;
                        if (lastLog?.vitals?.sugarLevel && parseInt(lastLog.vitals.sugarLevel) > 180) {
                            alerts.push({ type: 'Blood Sugar', message: `Last sugar reading: ${lastLog.vitals.sugarLevel} mg/dL — consider dietary review.`, severity: 'danger' });
                        }

                        if (vitals.healthRiskScore && parseInt(vitals.healthRiskScore) > 70) {
                            alerts.push({ type: 'Risk Score', message: `Overall risk score is ${vitals.healthRiskScore}/100 — schedule a checkup.`, severity: 'danger' });
                        }

                        if (alerts.length === 0) {
                            alerts.push({ type: 'All Clear', message: 'No health alerts at this time. Keep up the good work!', severity: 'info' });
                        }

                        return (
                            <div className="space-y-3">
                                {alerts.map((alert, idx) => (
                                    <div key={idx} className={`p-4 rounded-xl border ${
                                        alert.severity === 'danger' ? 'bg-red-50 border-red-100' :
                                        alert.severity === 'warning' ? 'bg-amber-50 border-amber-100' :
                                        'bg-emerald-50 border-emerald-100'
                                    }`}>
                                        <span className={`text-xs font-bold uppercase tracking-wider ${
                                            alert.severity === 'danger' ? 'text-red-600' :
                                            alert.severity === 'warning' ? 'text-amber-600' :
                                            'text-emerald-600'
                                        }`}>{alert.type}</span>
                                        <p className="text-sm font-medium text-slate-700 mt-1">{alert.message}</p>
                                    </div>
                                ))}
                            </div>
                        );
                    })()}
                </div>
            </div>



            {/* Full Analysis Modal */}
            {isAnalysisOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                    <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="text-xl font-black text-[#1E293B] flex items-center gap-3">
                                <Activity className="text-[#25418F]" /> In-Depth AI Analysis
                            </h3>
                            <button onClick={() => setIsAnalysisOpen(false)} className="text-slate-400 hover:text-slate-700 transition p-2 bg-white rounded-full shadow-sm">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-8 overflow-y-auto space-y-8">
                            {/* Card 1 */}
                            <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100 rounded-full blur-3xl -mr-10 -mt-10"></div>
                                <h4 className="text-sm font-bold text-[#25418F] uppercase tracking-widest mb-2 relative z-10">Cardiovascular Health</h4>
                                <p className="text-slate-700 font-medium leading-relaxed relative z-10">
                                    {(vitals.restingHeartRate && parseInt(vitals.restingHeartRate) > 90) ?
                                        "Your resting heart rate is slightly elevated compared to optimal metrics. Consider deep breathing exercises and reducing caffeine intake." :
                                        "Heart rate maintains an excellent baseline. This indicates good cardiovascular foundation and stress resilience."}
                                </p>
                            </div>

                            {/* Card 2 */}
                            <div className="bg-emerald-50/50 p-6 rounded-2xl border border-emerald-100 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-100 rounded-full blur-3xl -mr-10 -mt-10"></div>
                                <h4 className="text-sm font-bold text-emerald-700 uppercase tracking-widest mb-2 relative z-10">Oxygenation & Respiratory</h4>
                                <p className="text-slate-700 font-medium leading-relaxed relative z-10">
                                    {vitals.bloodOxygen ? `Current oxygen saturation is at ${vitals.bloodOxygen}%. ` : "No recent data. "}
                                    {(vitals.bloodOxygen && parseInt(vitals.bloodOxygen) < 95) ?
                                        "Levels indicate mild hypoxemia. Strongly consider fresh air circulation and light aerobic activity." :
                                        "Levels are within healthy physiological limits, ensuring optimal cognitive function and energy."}
                                </p>
                            </div>

                            {/* Card 3 */}
                            <div className="bg-amber-50/50 p-6 rounded-2xl border border-amber-100 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-100 rounded-full blur-3xl -mr-10 -mt-10"></div>
                                <h4 className="text-sm font-bold text-amber-700 uppercase tracking-widest mb-2 relative z-10">Recovery & Activity</h4>
                                <p className="text-slate-700 font-medium leading-relaxed relative z-10">
                                    {(vitals.sleepHours && parseInt(vitals.sleepHours) < 6) ?
                                        "Inadequate sleep duration detected. Reduced REM cycles are likely impacting daytime activity scores." :
                                        "Good sleep duration noted. Rest-to-activity balance seems optimized for long-term health."}
                                </p>
                            </div>
                        </div>
                        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end">
                            <button onClick={generatePDF} className="bg-[#25418F] text-white px-6 py-3 rounded-xl font-bold shadow hover:bg-blue-800 transition flex items-center gap-2">
                                <Download size={18} /> Export Full Report
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
