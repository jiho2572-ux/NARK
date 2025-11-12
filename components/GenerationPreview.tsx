import React from 'react';
import { GENERATION_STAGES } from '../constants';
import { CheckCircleIcon, CogIcon, ClockIcon } from './icons';

interface GenerationPreviewProps {
    stageIndex: number;
    totalStages?: number;
}

const GenerationPreview: React.FC<GenerationPreviewProps> = ({ stageIndex, totalStages }) => {

    const stages = totalStages === 1 ? [GENERATION_STAGES[0]] : GENERATION_STAGES;

    const getStatus = (currentStage: number) => {
        if (stageIndex > currentStage) {
            return { text: '완료', icon: <CheckCircleIcon className="text-green-400" />, color: 'text-green-400' };
        }
        if (stageIndex === currentStage) {
             return { text: '생성 중...', icon: <CogIcon className="text-cyan-400 animate-spin" />, color: 'text-cyan-400' };
        }
        return { text: '대기 중', icon: <ClockIcon className="text-slate-500" />, color: 'text-slate-500' };
    };

    return (
        <div className="text-center p-8 bg-slate-800/50 rounded-2xl shadow-lg border border-slate-700 animate-fade-in max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold text-cyan-400 mb-2">AI가 게임을 설계하는 중...</h2>
            <p className="text-slate-300 text-lg mb-8">실시간으로 각 설계 단계가 완료되는 것을 확인하세요.</p>
            
            <div className="space-y-4 text-left">
                {stages.map((stage, index) => {
                    const status = getStatus(index);
                    const isDone = stageIndex > index;
                    
                    return (
                        <div 
                            key={index} 
                            className={`p-4 rounded-lg border flex items-center gap-4 transition-all duration-500 ${
                                stageIndex === index ? 'bg-slate-700/50 border-cyan-500' : 
                                isDone ? 'bg-slate-800 border-slate-700' : 'bg-slate-800/50 border-slate-700'
                            }`}
                        >
                            <div className="w-6 h-6 flex-shrink-0">{status.icon}</div>
                            <div className="flex-grow">
                                <h3 className={`font-semibold text-lg ${isDone ? 'text-slate-200' : 'text-slate-100'}`}>{stage.title}</h3>
                            </div>
                             <span className={`font-mono text-sm font-medium ${status.color}`}>{status.text}</span>
                        </div>
                    );
                })}
            </div>

            <p className="mt-8 text-sm text-slate-500">각 단계는 AI의 복잡한 분석 및 생성 과정으로 인해 시간이 소요될 수 있습니다.</p>
        </div>
    );
};

export default GenerationPreview;
