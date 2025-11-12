
import React from 'react';
import type { GameProposal } from '../types';

interface ProposalListProps {
    proposals: GameProposal[];
    onSelectProposal: (proposal: GameProposal) => void;
    onBack: () => void;
    isLoading: boolean;
}

const ProposalCard: React.FC<{ proposal: GameProposal, onSelect: () => void }> = ({ proposal, onSelect }) => (
    <div className="bg-slate-800/70 p-6 rounded-2xl border border-slate-700 flex flex-col h-full transform hover:-translate-y-1 transition-transform duration-300">
        <div className="flex-grow">
            <h3 className="text-2xl font-bold text-cyan-300 mb-1">{proposal.title || 'Untitled Proposal'}</h3>
            <p className="text-lg text-slate-400 italic mb-3">"{proposal.tagline || ''}"</p>
            <p className="text-slate-300 text-lg mb-4 leading-relaxed">{proposal.playerExperience || ''}</p>
            
            <div className="mb-4">
                <h4 className="font-semibold text-slate-200 mb-2 text-lg">핵심 특징</h4>
                <ul className="list-disc list-inside text-lg text-slate-300 space-y-1">
                    {(proposal.keyFeatures || []).slice(0, 3).map((feature, idx) => <li key={idx}>{feature || ''}</li>)}
                </ul>
            </div>

            <div className="flex flex-wrap gap-2">
                {(proposal.mechanics || []).map((mech, idx) => (
                    <span key={idx} className="text-sm bg-slate-700 text-cyan-200 px-2 py-1 rounded-full">{mech || ''}</span>
                ))}
            </div>
        </div>
        <button 
            onClick={onSelect} 
            className="mt-6 w-full bg-violet-600 hover:bg-violet-500 text-white font-bold py-2 px-4 rounded-lg transition-colors"
        >
            이 컨셉으로 게임 개발하기
        </button>
    </div>
);


const ProposalList: React.FC<ProposalListProps> = ({ proposals, onSelectProposal, onBack }) => {
    const stableProposals = proposals.filter(p => p.creativitySource === 'stable');
    const balancedProposals = proposals.filter(p => p.creativitySource === 'balanced');
    const experimentalProposals = proposals.filter(p => p.creativitySource === 'experimental');

    const sections = [
        { title: '안정형 제안', description: '요청하신 아이디어를 충실하게 해석하여 완성도를 높인 컨셉입니다.', data: stableProposals },
        { title: '균형형 제안', description: '핵심 아이디어에 새로운 메커니즘이나 테마를 더해 독창성을 가미한 컨셉입니다.', data: balancedProposals },
        { title: '실험형 제안', description: '아이디어에서 영감을 받아, 매우 혁신적이고 예상치 못한 방향으로 재해석한 컨셉입니다.', data: experimentalProposals },
    ];

    return (
        <div className="animate-fade-in">
            <div className="text-center mb-12">
                <h2 className="text-3xl font-bold mb-2">
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-500">
                        AI가 제안하는 6가지 게임 컨셉
                    </span>
                </h2>
                <p className="text-lg text-slate-300">가장 마음에 드는 아이디어를 선택하여 상세 설계를 진행하세요.</p>
            </div>
            
            <div className="space-y-12">
                {sections.map(section => (
                    section.data.length > 0 && (
                        <div key={section.title}>
                             <div className="text-center mb-6">
                                <h3 className="text-2xl font-bold text-slate-100">{section.title}</h3>
                                <p className="text-slate-400">{section.description}</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {section.data.map(p => (
                                    <ProposalCard key={p.id} proposal={p} onSelect={() => onSelectProposal(p)} />
                                ))}
                            </div>
                        </div>
                    )
                ))}
            </div>

            <div className="text-center mt-12">
                <button 
                    onClick={onBack} 
                    className="bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
                >
                    &larr; 다른 아이디어 구상하기
                </button>
            </div>
        </div>
    );
};

export default ProposalList;
