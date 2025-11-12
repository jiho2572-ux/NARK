
import React from 'react';

interface SectionCardProps {
    // FIX: Changed type from 'string' to 'React.ReactNode' to allow JSX elements as titles.
    title: React.ReactNode;
    subtitle?: string;
    children: React.ReactNode;
}

const SectionCard: React.FC<SectionCardProps> = ({ title, subtitle, children }) => {
    return (
        <div className="bg-slate-800/50 p-6 rounded-xl shadow-lg border border-slate-700 mb-6">
            <h3 className="text-2xl font-bold text-cyan-300 mb-1">{title}</h3>
            {subtitle && <p className="text-slate-400 mb-4">{subtitle}</p>}
            <div className="border-t border-slate-700 pt-6">
                {children}
            </div>
        </div>
    );
};

export default SectionCard;
