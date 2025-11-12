import React, { useState, useEffect, useRef, useCallback } from 'react';
import { jsPDF } from 'jspdf';
import type { GamePackage, ChatMessage, CompetitiveAnalysis, SavedGameFile, RuleSection, KeyToVictory, ComponentData } from '../types';
import { streamGameModification } from '../services/geminiService';
// FIX: Corrected import name for KOREAN_FONT_BASE64.
import { KOREAN_FONT_BASE64 } from '../constants';

import SectionCard from './SectionCard';
import RadarChart from './RadarChart';
import Spinner from './Spinner';
import { 
    DocumentTextIcon, CollectionIcon, ChartBarIcon, LayersIcon, 
    SendIcon, DownloadIcon, ShareAppIcon, MagicIcon, UndoIcon, RedoIcon,
    NewspaperIcon
} from './icons';

interface GamePackageDisplayProps {
    initialHistory: GamePackage[];
    initialIndex: number;
    onBack: () => void;
    onShare: (gamePackage: GamePackage) => void;
}

// Helper component to render simple markdown (bold and newlines)
const SimpleMarkdown: React.FC<{ text: any; className?: string }> = ({ text, className }) => {
    // If text is falsy (null, undefined, ''), don't render anything.
    if (!text) return null;

    // Ensure the text is a string before trying to call string methods on it.
    // If it's an object or array, this will prevent a crash by converting it to a string representation.
    const safeText = typeof text === 'string' ? text : String(text);

    const html = safeText
        .replace(/\*\*(.*?)\*\*/g, '<strong class="text-amber-300 font-semibold">$1</strong>')
        .replace(/__(.*?)__/g, '<strong class="text-sky-300 font-semibold">$1</strong>')
        .replace(/\*(.*?)\*/g, '<i class="text-slate-400">$1</i>')
        .replace(/\n/g, '<br/>');
    return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />;
};


const GamePackageDisplay: React.FC<GamePackageDisplayProps> = ({ initialHistory, initialIndex, onBack, onShare }) => {
    const [history, setHistory] = useState<GamePackage[]>(initialHistory);
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const gamePackage = history[currentIndex];

    const [activeTab, setActiveTab] = useState('dashboard');
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [isModifying, setIsModifying] = useState(false);
    const [lastChangedTabs, setLastChangedTabs] = useState<string[]>([]);

    const chatContainerRef = useRef<HTMLDivElement>(null);
    const bottomOfChatRef = useRef<HTMLDivElement>(null);
    const chatInputRef = useRef<HTMLInputElement>(null);


    useEffect(() => {
        bottomOfChatRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatHistory]);

    useEffect(() => {
        // When initial props change (e.g., loading a new game), reset the state
        setHistory(initialHistory);
        setCurrentIndex(initialIndex);
    }, [initialHistory, initialIndex]);

    const handleChatSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!chatInput.trim() || isModifying) return;

        const userMessage: ChatMessage = { sender: 'user', text: chatInput };
        setChatHistory(prev => [...prev, userMessage]);
        const currentInput = chatInput;
        setChatInput('');
        setIsModifying(true);

        const aiMessage: ChatMessage = { sender: 'ai', text: '' };
        setChatHistory(prev => [...prev, aiMessage]);

        let responseBuffer = '';
        let jsonStarted = false;
        let streamedText = '';

        try {
            await streamGameModification(gamePackage, currentInput, (chunk) => {
                responseBuffer += chunk;
                
                if (!jsonStarted && responseBuffer.includes('```json')) {
                    jsonStarted = true;
                }
                
                if (!jsonStarted) {
                    streamedText += chunk;
                     setChatHistory(prev => {
                        const newHistory = [...prev];
                        const lastMessage = newHistory[newHistory.length - 1];
                        if (lastMessage) lastMessage.text = streamedText;
                        return newHistory;
                    });
                }
            });

            const jsonMatch = responseBuffer.match(/```json\s*([\s\S]*?)\s*```/);
            if (jsonMatch && jsonMatch[1]) {
                const newPackage = JSON.parse(jsonMatch[1]) as GamePackage;
                
                if (typeof newPackage === 'object' && newPackage !== null && !Array.isArray(newPackage)) {
                    
                    const newHistory = [...history.slice(0, currentIndex + 1), newPackage];
                    setHistory(newHistory);
                    setCurrentIndex(newHistory.length - 1);

                    const lastMod = newPackage.modificationHistory?.[newPackage.modificationHistory.length - 1];
                    setLastChangedTabs(lastMod?.changedKeys || []);

                    setChatHistory(prev => {
                        const newChatHistory = [...prev];
                        const lastMessage = newChatHistory[newChatHistory.length - 1];
                        if (lastMessage) lastMessage.text = "게임 디자인이 성공적으로 업데이트되었습니다! 변경 사항을 확인해보세요.";
                        return newChatHistory;
                    });
                } else {
                    throw new Error("AI가 유효한 게임 패키지 객체를 반환하지 않았습니다.");
                }
            } else {
                 setChatHistory(prev => {
                    const newChatHistory = [...prev];
                    const lastMessage = newChatHistory[newChatHistory.length - 1];
                    if (lastMessage) lastMessage.text = "AI 응답에서 유효한 JSON 객체를 찾지 못했습니다. 다시 시도해주세요. 응답: " + responseBuffer.slice(0, 500);
                    return newChatHistory;
                });
            }

        } catch (error: any) {
            console.error("Modification failed:", error);
            setChatHistory(prev => {
                const newChatHistory = [...prev];
                const lastMessage = newChatHistory[newChatHistory.length - 1];
                if(lastMessage) lastMessage.text = `오류가 발생했습니다: ${error.message}`;
                return newChatHistory;
            });
        } finally {
            setIsModifying(false);
        }
    };

    const handleSaveGame = useCallback(() => {
        if (!gamePackage) return;
        try {
            const filename = `${(gamePackage.meta.title || 'game') .replace(/[^a-z0-9ㄱ-힣_]/gi, '_').toLowerCase()}.json`;
            const savedFile: SavedGameFile = { history, currentIndex };
            const jsonString = JSON.stringify(savedFile, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
        } catch (error) {
            console.error("Failed to save game package:", error);
            alert("게임 저장에 실패했습니다.");
        }
    }, [gamePackage, history, currentIndex]);

    const handleExportPdf = useCallback(() => {
        const doc = new jsPDF();
        doc.addFileToVFS('NanumGothic-Regular.ttf', KOREAN_FONT_BASE64);
        doc.addFont('NanumGothic-Regular.ttf', 'NanumGothic', 'normal');
        doc.setFont('NanumGothic');

        const pageHeight = doc.internal.pageSize.height;
        let y = 20;
        const margin = 15;
        const maxWidth = doc.internal.pageSize.width - margin * 2;
        
        const checkPageBreak = (heightNeeded: number) => {
            if (y + heightNeeded > pageHeight - margin) {
                doc.addPage();
                y = margin;
            }
        };

        // Title Page
        doc.setFontSize(28);
        doc.text(gamePackage.meta.title || 'Untitled Game', doc.internal.pageSize.width / 2, 80, { align: 'center' });
        doc.setFontSize(16);
        doc.setTextColor(100);
        doc.text(gamePackage.meta.tagline || '', doc.internal.pageSize.width / 2, 95, { align: 'center' });

        doc.addPage();
        y = margin;

        // Rules
        doc.setFontSize(22);
        doc.setTextColor(0);
        doc.text('게임 규칙', margin, y);
        y += 15;

        (gamePackage.rules ?? []).forEach((rule: RuleSection) => {
            doc.setFontSize(16);
            checkPageBreak(12);
            doc.text(rule.title, margin, y);
            y += 8;

            doc.setFontSize(10);
            doc.setTextColor(50);
            const contentLines = doc.splitTextToSize((rule.content || '').replace(/\*\*/g, ''), maxWidth);
            checkPageBreak(contentLines.length * 5);
            doc.text(contentLines, margin, y);
            y += contentLines.length * 5;

            const examples = (rule.examples ?? []);
            if (examples.length > 0) {
                y += 4;
                examples.forEach((ex: any) => {
                    const exText = `상황: ${ex.situation || ''}\n결과: ${ex.result || ''}`;
                    const exLines = doc.splitTextToSize(exText, maxWidth - 10);
                    checkPageBreak(exLines.length * 5 + 8);
                    doc.setFillColor(240, 240, 240);
                    doc.rect(margin, y - 4, maxWidth, exLines.length * 5 + 8, 'F');
                    doc.setTextColor(0);
                    doc.text(exLines, margin + 5, y);
                    y += exLines.length * 5 + 8;
                });
            }
            y+= 10;
        });
        
        doc.save(`${(gamePackage.meta.title || 'game')}_Rulebook.pdf`);
    }, [gamePackage]);
    
    const handleContextualRequest = (prompt: string) => {
        setChatInput(prompt);
        chatInputRef.current?.focus();
    };


    if (!gamePackage) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <Spinner size="h-12 w-12" />
                    <p className="mt-4 text-lg text-slate-300">게임 데이터를 불러오는 중...</p>
                </div>
            </div>
        );
    }
    
    const tabs = [
        { id: 'dashboard', label: '대시보드', icon: NewspaperIcon },
        { id: 'meta', label: '개요', icon: DocumentTextIcon },
        { id: 'components', label: `구성물 (${gamePackage?.components?.length || 0})`, icon: CollectionIcon },
        { id: 'rules', label: '게임룰', icon: LayersIcon },
        { id: 'analysis', label: 'AI 분석', icon: ChartBarIcon },
    ];

    const renderTabContent = () => {
        switch (activeTab) {
            case 'dashboard':
                 return (
                    <div className="space-y-6">
                        <SectionCard title="게임 핵심 정보" subtitle={gamePackage.meta.tagline || ''}>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-lg">
                                <div className="bg-slate-900/50 p-3 rounded-lg"> <p className="font-semibold text-slate-400">타겟 유저</p> <p className="text-slate-200">{gamePackage.meta.targetAudience || '-'}</p> </div>
                                <div className="bg-slate-900/50 p-3 rounded-lg"> <p className="font-semibold text-slate-400">장르</p> <p className="text-slate-200">{(gamePackage.meta.genres ?? []).join(', ') || '-'}</p> </div>
                                <div className="bg-slate-900/50 p-3 rounded-lg"> <p className="font-semibold text-slate-400">테마</p> <p className="text-slate-200">{gamePackage.meta.theme || '-'}</p> </div>
                                <div className="bg-slate-900/50 p-3 rounded-lg"> <p className="font-semibold text-slate-400">인원</p> <p className="text-slate-200">{gamePackage.meta.players || '-'}</p> </div>
                                <div className="bg-slate-900/50 p-3 rounded-lg"> <p className="font-semibold text-slate-400">플레이 시간</p> <p className="text-slate-200">{gamePackage.meta.playtime || '-'}</p> </div>
                                <div className="bg-slate-900/50 p-3 rounded-lg"> <p className="font-semibold text-slate-400">복잡도</p> <SimpleMarkdown text={gamePackage.meta.complexity} className="text-slate-200" /> </div>
                            </div>
                        </SectionCard>
                        {gamePackage.aiPlaytestReport && gamePackage.aiPlaytestReport.funFactorAnalysis && 
                            <SectionCard title="재미 요소 분석">
                                <RadarChart analysis={gamePackage.aiPlaytestReport.funFactorAnalysis} />
                            </SectionCard>
                        }
                        <SectionCard title="게임 요약 카드">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-lg">
                                <div>
                                    <h4 className="font-bold text-amber-300 mb-2">게임 준비</h4>
                                    <ul className="list-decimal list-inside text-slate-300 space-y-1">{(gamePackage.gameSummaryCard?.setup ?? []).map((s,i) => <li key={i}>{(s || '').replace(/^\d+\.\s*/, '')}</li>)}</ul>
                                </div>
                                <div>
                                    <h4 className="font-bold text-amber-300 mb-2">턴 요약</h4>
                                    <ul className="list-decimal list-inside text-slate-300 space-y-1">{(gamePackage.gameSummaryCard?.turnSummary ?? []).map((s,i) => <li key={i}>{(s || '').replace(/^\d+\.\s*/, '')}</li>)}</ul>
                                </div>
                                <div>
                                    <h4 className="font-bold text-amber-300 mb-2">게임 종료 조건</h4>
                                    <p className="text-slate-300">{gamePackage.gameSummaryCard?.endCondition || '-'}</p>
                                </div>
                                <div>
                                    <h4 className="font-bold text-amber-300 mb-2">점수 계산</h4>
                                    <ul className="list-decimal list-inside text-slate-300 space-y-1">{(gamePackage.gameSummaryCard?.scoringSummary ?? []).map((s,i) => <li key={i}>{(s || '').replace(/^\d+\.\s*/, '')}</li>)}</ul>
                                </div>
                            </div>
                        </SectionCard>
                    </div>
                );
            case 'meta':
                return gamePackage.meta && (
                    <>
                    <SectionCard title="게임 핵심 정보" subtitle={gamePackage.meta.tagline || ''}>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-lg">
                            <div className="bg-slate-900/50 p-3 rounded-lg"> <p className="font-semibold text-slate-400">타겟 유저</p> <p className="text-slate-200">{gamePackage.meta.targetAudience || '-'}</p> </div>
                            <div className="bg-slate-900/50 p-3 rounded-lg"> <p className="font-semibold text-slate-400">장르</p> <p className="text-slate-200">{(gamePackage.meta.genres ?? []).join(', ') || '-'}</p> </div>
                            <div className="bg-slate-900/50 p-3 rounded-lg"> <p className="font-semibold text-slate-400">테마</p> <p className="text-slate-200">{gamePackage.meta.theme || '-'}</p> </div>
                            <div className="bg-slate-900/50 p-3 rounded-lg"> <p className="font-semibold text-slate-400">인원</p> <p className="text-slate-200">{gamePackage.meta.players || '-'}</p> </div>
                            <div className="bg-slate-900/50 p-3 rounded-lg"> <p className="font-semibold text-slate-400">플레이 시간</p> <p className="text-slate-200">{gamePackage.meta.playtime || '-'}</p> </div>
                            <div className="bg-slate-900/50 p-3 rounded-lg"> <p className="font-semibold text-slate-400">복잡도</p> <SimpleMarkdown text={gamePackage.meta.complexity} className="text-slate-200"/> </div>
                        </div>
                    </SectionCard>
                    {gamePackage.meta.designerNotes && (
                        <SectionCard title="AI 디자이너 노트: 재미 요소 설계 의도">
                            {typeof gamePackage.meta.designerNotes === 'string' ? (
                                <SimpleMarkdown text={gamePackage.meta.designerNotes} className="text-slate-300 whitespace-pre-wrap leading-relaxed text-lg"/>
                            ) : (
                                <div className="space-y-6 text-slate-300 leading-relaxed text-lg">
                                    {gamePackage.meta.designerNotes.introduction && <SimpleMarkdown text={gamePackage.meta.designerNotes.introduction} />}
                                    {gamePackage.meta.designerNotes.meaningfulDecisions && <div><h4 className="font-bold text-xl text-amber-300 mb-2">의미있는 결정</h4><SimpleMarkdown text={gamePackage.meta.designerNotes.meaningfulDecisions}/></div>}
                                    {gamePackage.meta.designerNotes.tensionArc && <div><h4 className="font-bold text-xl text-amber-300 mb-2">긴장감 아크</h4><SimpleMarkdown text={gamePackage.meta.designerNotes.tensionArc}/></div>}
                                    {gamePackage.meta.designerNotes.playerAgency && <div><h4 className="font-bold text-xl text-amber-300 mb-2">플레이어 주도성</h4><SimpleMarkdown text={gamePackage.meta.designerNotes.playerAgency}/></div>}
                                    {gamePackage.meta.designerNotes.positiveInteraction && <div><h4 className="font-bold text-xl text-amber-300 mb-2">긍정적 상호작용</h4><SimpleMarkdown text={gamePackage.meta.designerNotes.positiveInteraction}/></div>}
                                </div>
                            )}
                        </SectionCard>
                    )}
                    {gamePackage.keyToVictory && (
                        <SectionCard title="승리 전략 가이드">
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {(gamePackage.keyToVictory ?? []).map((kv: KeyToVictory, i) => (
                                    <div key={i} className="bg-slate-900/50 p-4 rounded-lg">
                                        <h4 className="font-bold text-xl text-slate-200">{kv.name || ''}</h4>
                                        <p className="text-base text-cyan-300 mb-2">{kv.archetype || ''}</p>
                                        <SimpleMarkdown text={kv.description} className="text-lg text-slate-300"/>
                                    </div>
                                ))}
                            </div>
                        </SectionCard>
                    )}
                    {gamePackage.launchKit && (
                        <SectionCard title="마케팅 및 런치킷">
                             <h4 className="font-bold text-xl text-amber-300 mb-2">핵심 판매 포인트</h4>
                             <ul className="list-disc list-inside text-slate-300 space-y-2 mb-6 text-lg">
                                {(gamePackage.launchKit.sellingPoints ?? []).map((p, i) => <li key={i}><SimpleMarkdown text={p} className="inline"/></li>)}
                            </ul>
                            <h4 className="font-bold text-xl text-amber-300 mb-2">소셜 미디어 홍보 포스트 (예시)</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {(gamePackage.launchKit.socialMediaPosts ?? []).map((post, i) => (
                                    <div key={i} className="bg-slate-900/50 p-4 rounded-lg">
                                        <h5 className="font-semibold text-slate-200">{post.platform}</h5>
                                        <SimpleMarkdown text={post.content} className="text-lg text-slate-300 mt-2 whitespace-pre-wrap"/>
                                    </div>
                                ))}
                            </div>
                        </SectionCard>
                    )}
                    </>
                );
            case 'components':
                 return (
                    <SectionCard title="게임 구성물 상세">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-base table-fixed">
                                <thead className="bg-slate-700/50 text-slate-300 uppercase text-sm">
                                    <tr>
                                        <th className="p-3 w-[20%]">이름</th>
                                        <th className="p-3 w-[10%]">타입</th>
                                        <th className="p-3 w-[45%]">목적 및 플레이버 텍스트</th>
                                        <th className="p-3 w-[20%]">획득 및 사용</th>
                                        <th className="p-3 w-[5%] text-center">수정</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(gamePackage.components ?? []).map((c: ComponentData, i) => (
                                        <tr key={i} className="border-b border-slate-700 align-top">
                                            <td className="p-3 font-semibold text-slate-100 break-words">{c.name || ''}</td>
                                            <td className="p-3 text-cyan-300 break-words">{c.type || ''}</td>
                                            <td className="p-3 break-words">
                                                <SimpleMarkdown text={c.purpose} className="text-base leading-relaxed"/>
                                                {c.designerNote && (
                                                    <div className="mt-2 pt-2 border-t border-slate-700/50 bg-slate-900/30 p-2 rounded">
                                                        <p className="text-sm text-amber-400 font-semibold">AI 디자이너 노트</p>
                                                        <p className="text-sm text-slate-400 italic">"{c.designerNote}"</p>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-3 break-words">
                                                <div><strong className="text-slate-400">획득:</strong> <SimpleMarkdown text={c.acquisition} className="inline"/></div>
                                                <div><strong className="text-slate-400">소모:</strong> <SimpleMarkdown text={c.consumption} className="inline"/></div>
                                            </td>
                                            <td className="p-3 text-center">
                                                <button onClick={() => handleContextualRequest(`'${c.name}' 구성품의 역할을 '...'으로 바꿔줘.`)} className="text-slate-400 hover:text-cyan-400 inline-block"><MagicIcon /></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </SectionCard>
                );
            case 'rules':
                return (
                    <>
                        {(gamePackage.rules ?? []).map((rule, index) => (
                             <SectionCard key={rule.title || index} title={
                                <div className="flex justify-between items-center">
                                    {rule.title || 'Untitled Rule'}
                                    <button onClick={() => handleContextualRequest(`'${rule.title}' 규칙을 '...'으로 수정해줘.`)} className="text-slate-500 hover:text-cyan-400 transition-colors">
                                        <MagicIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            }>
                                <SimpleMarkdown text={rule.content} className="prose prose-lg prose-invert max-w-none leading-relaxed"/>
                                {(rule.playerCountAdjustments ?? []).length > 0 && (
                                    <div className="mt-6">
                                        <h4 className="font-bold text-xl text-amber-300 mb-2">플레이어 인원별 조정</h4>
                                        <div className="space-y-2">
                                            {(rule.playerCountAdjustments ?? []).map((adj, i) => (
                                                <div key={i} className="bg-slate-900/70 p-3 rounded-lg flex items-start gap-3 text-lg">
                                                    <span className="font-bold text-cyan-400 flex-shrink-0">{adj.playerCount}:</span>
                                                    <p className="text-slate-300">{adj.adjustment}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {(rule.examples ?? []).length > 0 && (
                                    <div className="mt-6">
                                        <h4 className="font-bold text-xl text-amber-300 mb-2">구체적인 예시</h4>
                                        <div className="space-y-3">
                                            {(rule.examples ?? []).map((ex, i) => (
                                                <div key={i} className="bg-slate-900/70 border-l-4 border-cyan-500 p-4 rounded-r-lg text-lg">
                                                    <p className="font-semibold text-slate-200 leading-relaxed"><strong className="text-cyan-400">상황:</strong> {(ex as any).situation || ''}</p>
                                                    <p className="text-slate-300 mt-1 leading-relaxed"><strong className="text-cyan-400">결과:</strong> {(ex as any).result || ''}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </SectionCard>
                        ))}
                        {gamePackage.firstTurnWalkthrough && (
                            <SectionCard title={gamePackage.firstTurnWalkthrough.title || 'First Turn Walkthrough'}>
                                <SimpleMarkdown text={gamePackage.firstTurnWalkthrough.content} className="prose prose-lg prose-invert max-w-none leading-relaxed"/>
                            </SectionCard>
                        )}
                    </>
                );
            case 'analysis':
                const getSeverityClass = (severity: '치명적' | '주요' | '사소함' | undefined) => {
                    switch (severity) {
                        case '치명적': return 'text-red-400';
                        case '주요': return 'text-amber-400';
                        case '사소함': return 'text-slate-400';
                        default: return 'text-slate-400';
                    }
                };
                return (
                    <>
                    {gamePackage.aiPlaytestReport && (
                        <SectionCard title="AI 플레이테스트 리포트">
                             <div className="md:flex gap-8">
                                <div className="flex-1">
                                    <h4 className="font-bold text-xl text-amber-300 mb-2">종합 평가</h4>
                                    <SimpleMarkdown text={gamePackage.aiPlaytestReport.overallFeedback} className="mb-4 text-slate-300 text-lg leading-relaxed"/>

                                    <h4 className="font-bold text-xl text-amber-300 mb-2">강점</h4>
                                    <ul className="list-disc list-inside mb-4 text-slate-300 text-lg leading-relaxed">
                                        {(gamePackage.aiPlaytestReport?.strengths ?? []).map((s, i) => <li key={i}><SimpleMarkdown text={s} className="inline"/></li>)}
                                    </ul>
                                    <h4 className="font-bold text-xl text-amber-300 mb-2">잠재적 이슈 및 제안</h4>
                                     <ul className="list-disc list-inside text-slate-300 space-y-2 text-lg leading-relaxed">
                                        {(gamePackage.aiPlaytestReport?.potentialIssues ?? []).map((p, i) => (
                                            <li key={i}>
                                                <span className={`font-semibold ${getSeverityClass(p.severity)}`}>[{p.severity || '정보'}]</span> <strong>{p.issue || ''}:</strong> <SimpleMarkdown text={p.suggestion} className="inline"/>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                {gamePackage.aiPlaytestReport.funFactorAnalysis && <div className="flex-shrink-0 mt-6 md:mt-0"><RadarChart analysis={gamePackage.aiPlaytestReport.funFactorAnalysis} /></div>}
                            </div>
                        </SectionCard>
                    )}
                    {gamePackage.simulationReport && (
                         <SectionCard title="밸런스 시뮬레이션 리포트">
                            <h4 className="font-bold text-xl text-amber-300 mb-2">시뮬레이션 요약</h4>
                            <SimpleMarkdown text={gamePackage.simulationReport.summary} className="mb-4 text-slate-300 text-lg leading-relaxed"/>
                            
                            <h4 className="font-bold text-xl text-amber-300 mb-2">AI 자동 밸런스 조정 내역</h4>
                            <div className="bg-slate-900/50 p-4 rounded-lg mb-4">
                                <SimpleMarkdown text={gamePackage.simulationReport.balanceNotes} className="text-slate-300 text-lg leading-relaxed"/>
                            </div>

                            {(gamePackage.simulationReport?.tables ?? []).map((table, index) => (
                                <div key={index} className="mt-4">
                                    <h5 className="font-semibold text-slate-200 mb-2 text-lg">{table.title || ''}</h5>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-base">
                                            <thead className="bg-slate-700/50 text-slate-300 text-sm">
                                                {(table.data && Array.isArray(table.data) && table.data.length > 0 && Array.isArray(table.data[0])) && (
                                                    <tr>
                                                        {table.data[0].map((header: any, i: any) => (
                                                            <th key={i} className="p-2">{header || ''}</th>
                                                        ))}
                                                    </tr>
                                                )}
                                            </thead>
                                            <tbody>
                                                {(table.data && Array.isArray(table.data) && table.data.length > 1) && table.data.slice(1).map((row: any, i: any) => (
                                                    <tr key={i} className="border-b border-slate-700">
                                                        {Array.isArray(row) && row.map((cell, j) => (
                                                            <td key={j} className="p-2">{cell || ''}</td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ))}
                         </SectionCard>
                    )}
                    {gamePackage.competitiveAnalysis && (
                        <SectionCard title="경쟁 분석">
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {(gamePackage.competitiveAnalysis ?? []).map((game: CompetitiveAnalysis, idx: number) => (
                                    <div key={idx} className="bg-slate-900/50 p-4 rounded-lg">
                                        <h4 className="font-bold text-xl text-slate-200">{(game.name || '')} <span className="text-lg font-normal text-slate-400">(BGG 평점: {game.bggRating || 'N/A'})</span></h4>
                                        <div className="text-lg mt-2"><strong className="text-slate-400">강점:</strong> <SimpleMarkdown text={game.strengths} className="inline"/></div>
                                        <div className="text-lg mt-1"><strong className="text-slate-400">우리 게임의 차별점:</strong> <SimpleMarkdown text={game.ourDifferentiation} className="inline"/></div>
                                    </div>
                                ))}
                            </div>
                        </SectionCard>
                    )}
                    </>
                );
            default:
                return null;
        }
    }

    return (
        <div className="animate-fade-in">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                 <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h2 className="text-3xl md:text-4xl font-extrabold text-white">{gamePackage.meta.title || '제목 없음'}</h2>
                        <p className="text-slate-400 mt-1 text-lg">{gamePackage.meta.tagline || ''}</p>
                    </div>
                     <div className="flex gap-2 flex-wrap justify-start items-center">
                         <button onClick={onBack} className="bg-slate-800/50 hover:bg-slate-700 text-white font-semibold py-2 px-4 rounded-lg border border-slate-600">제안 목록으로</button>
                         <div className="flex items-center bg-slate-800/50 border border-slate-600 rounded-lg">
                            <button onClick={() => setCurrentIndex(i => i - 1)} disabled={currentIndex === 0} className="p-2 text-white disabled:text-slate-600 hover:bg-slate-700 rounded-l-md"><UndoIcon/></button>
                            <span className="text-sm font-mono text-slate-400 px-2">{currentIndex + 1} / {history.length}</span>
                             <button onClick={() => setCurrentIndex(i => i + 1)} disabled={currentIndex === history.length - 1} className="p-2 text-white disabled:text-slate-600 hover:bg-slate-700 rounded-r-md"><RedoIcon/></button>
                         </div>
                         <button onClick={() => onShare(gamePackage)} className="bg-slate-800/50 hover:bg-slate-700 text-white font-semibold p-2 rounded-lg border border-slate-600"><ShareAppIcon/></button>
                         <button onClick={handleExportPdf} className="bg-slate-800/50 hover:bg-slate-700 text-white font-semibold py-2 px-4 rounded-lg border border-slate-600 flex items-center gap-2">PDF 룰북</button>
                         <button onClick={handleSaveGame} className="bg-violet-600 hover:bg-violet-500 text-white font-semibold py-2 px-4 rounded-lg flex items-center gap-2"><DownloadIcon/> 전체 저장</button>
                    </div>
                </div>

                <div className="flex flex-col xl:flex-row gap-8">
                     {/* Left/Main Column: Game Package Details */}
                    <div className="w-full xl:w-2/3">
                        <div className="flex items-center border-b border-slate-700 mb-6 overflow-x-auto">
                            {tabs.map(tab => (
                                <button key={tab.id} onClick={() => { setActiveTab(tab.id); setLastChangedTabs(prev => prev.filter(t => t !== tab.id)); }}
                                    className={`relative flex items-center gap-2 px-4 py-3 font-semibold border-b-2 transition-colors flex-shrink-0 ${activeTab === tab.id ? 'text-cyan-400 border-cyan-400' : 'text-slate-400 border-transparent hover:text-white'}`}>
                                    <tab.icon className="w-5 h-5"/> {tab.label}
                                    {lastChangedTabs.includes(tab.id) && <span className="absolute top-2 right-2 w-2 h-2 bg-amber-400 rounded-full"></span>}
                                </button>
                            ))}
                        </div>
                        <div className="space-y-6">{renderTabContent()}</div>
                    </div>
                    {/* Right/Side Column: Modification Chat */}
                     <div className="w-full xl:w-1/3 bg-slate-800/50 border border-slate-700 rounded-2xl flex flex-col h-[75vh]">
                        <div className="p-4 border-b border-slate-700 flex items-center gap-2">
                           <MagicIcon className="text-cyan-400" />
                           <h3 className="text-lg font-bold">AI 디자이너와 대화하기</h3>
                        </div>
                         <div ref={chatContainerRef} className="flex-grow p-4 overflow-y-auto space-y-4">
                             {chatHistory.length === 0 && <div className="text-center text-slate-400 text-sm p-8">게임 디자인을 수정하고 싶으신가요? <br/> 예: "테마를 우주 탐사로 바꿔줘"</div>}
                            {chatHistory.map((msg, index) => (
                                <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-xs md:max-w-sm rounded-xl px-4 py-2 ${msg.sender === 'user' ? 'bg-violet-600' : 'bg-slate-700'}`}>
                                        <p className="text-white whitespace-pre-wrap text-base">{msg.text || ''}</p>
                                    </div>
                                </div>
                            ))}
                            {isModifying && chatHistory[chatHistory.length - 1]?.sender === 'ai' && !chatHistory[chatHistory.length - 1]?.text && <div className="flex justify-start"><div className="bg-slate-700 rounded-xl px-4 py-2"><Spinner size="h-5 w-5"/></div></div>}
                            <div ref={bottomOfChatRef} />
                        </div>
                        <form onSubmit={handleChatSubmit} className="p-4 border-t border-slate-700 flex gap-2">
                             <input ref={chatInputRef} type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="게임 디자인 수정 요청..." disabled={isModifying} className="w-full bg-slate-700 border border-slate-600 rounded-lg p-2 focus:ring-2 focus:ring-cyan-500 text-base"/>
                             <button type="submit" disabled={isModifying || !chatInput.trim()} className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold p-2 rounded-lg disabled:opacity-50"><SendIcon /></button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GamePackageDisplay;