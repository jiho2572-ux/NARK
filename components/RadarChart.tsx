import React from 'react';
import type { FunFactorAnalysis } from '../types';

interface RadarChartProps {
    analysis: FunFactorAnalysis;
    size?: number;
}

const RadarChart: React.FC<RadarChartProps> = ({ analysis, size = 240 }) => {
    if (!analysis || !analysis.metrics) {
        return null;
    }

    const center = size / 2;
    const metricOrder: FunFactorAnalysis['metrics'][0]['name'][] = ['의미있는 결정', '긴장감 아크', '플레이어 주도성', '긍정적 상호작용'];
    const metrics = metricOrder.map(name => analysis.metrics.find(m => m.name === name) || { name, score: 0, rationale: '' });
    const numMetrics = metrics.length;
    
    if (numMetrics === 0) return null;

    const angleSlice = (Math.PI * 2) / numMetrics;

    const points = metrics.map((metric, i) => {
        const angle = angleSlice * i - Math.PI / 2;
        const value = Math.max(0, Math.min(metric.score, 10)) / 10;
        const x = center + center * 0.8 * value * Math.cos(angle);
        const y = center + center * 0.8 * value * Math.sin(angle);
        return `${x},${y}`;
    }).join(' ');

    const axisPoints = Array.from({ length: numMetrics }, (_, i) => {
        const angle = angleSlice * i - Math.PI / 2;
        const x = center + center * 0.9 * Math.cos(angle);
        const y = center + center * 0.9 * Math.sin(angle);
        return { x, y, label: metrics[i].name };
    });

    const gridLevels = [0.25, 0.5, 0.75, 1];
    
    const getShortLabel = (label: string) => {
        switch(label) {
            case '의미있는 결정': return '의미있는 결정';
            case '긴장감 아크': return '긴장감';
            case '플레이어 주도성': return '주도성';
            case '긍정적 상호작용': return '상호작용';
            default: return label;
        }
    }

    return (
        <div className="flex flex-col items-center">
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="text-slate-500">
                <g>
                    {gridLevels.map(level => (
                        <polygon
                            key={level}
                            points={Array.from({ length: numMetrics }, (_, i) => {
                                const angle = angleSlice * i - Math.PI / 2;
                                const x = center + center * 0.8 * level * Math.cos(angle);
                                const y = center + center * 0.8 * level * Math.sin(angle);
                                return `${x},${y}`;
                            }).join(' ')}
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1"
                        />
                    ))}
                    {axisPoints.map((point, i) => (
                         <line key={i} x1={center} y1={center} x2={point.x} y2={point.y} stroke="currentColor" strokeWidth="0.5" />
                    ))}
                    <polygon
                        points={points}
                        className="text-cyan-400"
                        fill="currentColor"
                        fillOpacity="0.3"
                        stroke="currentColor"
                        strokeWidth="2"
                    />
                    {metrics.map((metric, i) => {
                        const angle = angleSlice * i - Math.PI / 2;
                        const value = Math.max(0, Math.min(metric.score, 10)) / 10;
                        const x = center + center * 0.8 * value * Math.cos(angle);
                        const y = center + center * 0.8 * value * Math.sin(angle);
                        return <circle key={i} cx={x} cy={y} r="3.5" className="text-cyan-400" fill="currentColor" stroke="#FFF" strokeWidth="1" />;
                    })}
                </g>
                {axisPoints.map((point, i) => (
                     <text
                        key={i}
                        x={center + center * 1.05 * Math.cos(angleSlice * i - Math.PI / 2)}
                        y={center + center * 1.05 * Math.sin(angleSlice * i - Math.PI / 2)}
                        className="text-slate-300"
                        fontSize="14"
                        fontWeight="500"
                        textAnchor="middle"
                        dominantBaseline="middle"
                    >
                        {getShortLabel(point.label)}
                    </text>
                ))}
            </svg>
             {analysis.overallScore !== undefined && (
                <div className="mt-2 text-center">
                    <p className="text-slate-400 text-sm font-semibold uppercase tracking-wider">종합 평가 점수</p>
                    <p className="text-4xl font-bold text-amber-400 my-0.5">{analysis.overallScore.toFixed(1)}</p>
                    {analysis.scoreRationale && <p className="text-sm text-slate-500 max-w-xs mx-auto leading-relaxed">{analysis.scoreRationale}</p>}
                </div>
            )}
        </div>
    );
};

export default RadarChart;