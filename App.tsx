import React, { useState, useCallback } from 'react';
import type { UserInput, GameProposal, GamePackage, Meta, SavedGameFile } from './types';
import { generateGameProposals, generateFullGamePackageStream } from './services/geminiService';

import Header from './components/Header';
import InputForm from './components/InputForm';
import ProposalList from './components/ProposalList';
import GenerationPreview from './components/GenerationPreview';
import GamePackageDisplay from './components/GamePackageDisplay';
import Spinner from './components/Spinner';

type AppState = 'input' | 'proposals' | 'generating' | 'display';

const App: React.FC = () => {
    const [appState, setAppState] = useState<AppState>('input');
    const [currentUserInput, setCurrentUserInput] = useState<UserInput | null>(null);
    const [proposals, setProposals] = useState<GameProposal[]>([]);
    
    const [finalPackage, setFinalPackage] = useState<GamePackage | null>(null);
    const [finalPackageHistory, setFinalPackageHistory] = useState<{ history: GamePackage[], currentIndex: number } | null>(null);

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [stageIndex, setStageIndex] = useState(0);


    const handleStart = async (userInput: UserInput) => {
        setIsLoading(true);
        setError(null);
        setCurrentUserInput(userInput);
        try {
            const result = await generateGameProposals(userInput);
            if (result.length > 0) {
                setProposals(result);
                setAppState('proposals');
            } else {
                setError('AI가 제안을 생성하지 못했습니다. 입력을 수정하여 다시 시도해 주세요.');
                setCurrentUserInput(null);
            }
        } catch (e: any) {
            console.error(e);
            setError(`제안 생성 중 오류: ${e.message}`);
            setCurrentUserInput(null);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectProposal = useCallback(async (proposal: GameProposal) => {
        if (!currentUserInput) {
            setError("오류: 사용자 입력이 손실되었습니다. 처음부터 다시 시작해주세요.");
            setAppState('input');
            return;
        }

        setAppState('generating');
        setStageIndex(0);
        
        try {
            let currentPackage: Partial<GamePackage> = { meta: { title: proposal.title } as Meta };
            const generator = generateFullGamePackageStream(proposal, currentUserInput);
            
            let currentStage = 0;
            for await (const chunk of generator) {
                 const updatedPackage = { ...currentPackage, ...chunk };
                 if (currentPackage.meta && (chunk as Partial<GamePackage>).meta) {
                    updatedPackage.meta = { ...currentPackage.meta, ...(chunk as Partial<GamePackage>).meta };
                }
                currentPackage = updatedPackage;
                currentStage++;
                setStageIndex(currentStage);
            }
            
            setFinalPackage(currentPackage as GamePackage);
            setFinalPackageHistory({ history: [currentPackage as GamePackage], currentIndex: 0 });
            setAppState('display');

        } catch (e: any) {
            console.error(e);
            setError(`게임 패키지 생성 중 오류가 발생했습니다: ${e.message}`);
            setAppState('proposals');
        }
    }, [currentUserInput]);


    const handleBackToStart = () => {
        setAppState('input');
        setProposals([]);
        setCurrentUserInput(null);
        setFinalPackage(null);
        setError(null);
    };

    const handleBackToProposals = () => {
        setAppState('proposals');
        setFinalPackage(null);
    };
    
    const handleShare = (gamePackage: GamePackage) => {
        console.log("Sharing package:", gamePackage);
        const url = window.location.href;
        navigator.clipboard.writeText(`GameCraft AI로 만든 게임 컨셉을 확인해보세요! ${url}`)
            .then(() => alert('공유 링크가 클립보드에 복사되었습니다!'))
            .catch(err => console.error('공유 링크 복사 실패:', err));
    };

    const handleLoadGame = (savedFile: SavedGameFile) => {
        setFinalPackage(savedFile.history[savedFile.currentIndex]);
        setFinalPackageHistory(savedFile);
        setAppState('display');
        setError(null);
        setProposals([]);
        setCurrentUserInput(null);
    };

    const renderContent = () => {
        if (error) {
            return (
                <div className="text-center text-red-400 bg-red-900/50 p-4 rounded-lg max-w-2xl mx-auto">
                    <p className="font-bold">오류가 발생했습니다</p>
                    <p className="mt-2 text-sm">{error}</p>
                    <button onClick={handleBackToStart} className="mt-4 bg-slate-600 hover:bg-slate-500 text-white font-semibold py-2 px-4 rounded-lg">
                        처음으로 돌아가기
                    </button>
                </div>
            );
        }

        if (isLoading) {
             return (
                <div className="flex flex-col items-center justify-center text-center p-8 h-[60vh]">
                    <Spinner size="h-16 w-16" />
                    <p className="text-xl text-slate-300 mt-4 animate-pulse">AI가 독창적인 게임 컨셉을 구상 중입니다...</p>
                </div>
            );
        }
        
        switch (appState) {
            case 'input':
                return <InputForm onStart={handleStart} isLoading={isLoading} onLoadGame={handleLoadGame} />;
            case 'proposals':
                return <ProposalList proposals={proposals} onSelectProposal={handleSelectProposal} onBack={handleBackToStart} isLoading={isLoading} />;
            case 'generating':
                 return <GenerationPreview stageIndex={stageIndex} />;
            case 'display':
                if (!finalPackage || !finalPackageHistory) return <div className="text-center p-8">오류: 게임 패키지를 불러올 수 없습니다.</div>;
                return <GamePackageDisplay initialHistory={finalPackageHistory.history} initialIndex={finalPackageHistory.currentIndex} onBack={handleBackToProposals} onShare={handleShare} />;
            default:
                return <InputForm onStart={handleStart} isLoading={isLoading} onLoadGame={handleLoadGame} />;
        }
    };

    return (
        <div className="bg-slate-900 text-white min-h-screen font-sans">
            <Header />
            <main className="container mx-auto px-4 py-8">
                {renderContent()}
            </main>
            <footer className="text-center py-4 text-slate-500 text-sm">
                <p>Powered by Google Gemini. Designed for creative inspiration.</p>
            </footer>
        </div>
    );
};

export default App;
