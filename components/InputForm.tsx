import React, { useState, useRef } from 'react';
import type { UserInput, GamePackage, SavedGameFile } from '../types';
import Spinner from './Spinner';
import { generateRandomPrompt } from '../services/geminiService';
import { SparklesIcon, FolderOpenIcon } from './icons';

interface InputFormProps {
    onStart: (data: UserInput) => void;
    isLoading: boolean;
    onLoadGame: (savedFile: SavedGameFile) => void;
}

const InputForm: React.FC<InputFormProps> = ({ onStart, isLoading, onLoadGame }) => {
    const [prompt, setPrompt] = useState('');
    const [isRandomLoading, setIsRandomLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (prompt.trim()) {
            onStart({ prompt });
        }
    };
    
    const handleRandom = async () => {
        setIsRandomLoading(true);
        try {
            const randomPrompt = await generateRandomPrompt();
            setPrompt(randomPrompt);
        } catch (e) {
            console.error("Failed to get random prompt", e);
            setPrompt('고양이들이 운영하는 마법 약초 가게');
        } finally {
           setIsRandomLoading(false);
        }
    };

    const handleTriggerFileInput = () => {
        fileInputRef.current?.click();
    };

    const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const result = event.target?.result as string;
                const parsed = JSON.parse(result);
                // Handle both old and new save formats
                if (parsed.history && typeof parsed.currentIndex === 'number') {
                     onLoadGame(parsed as SavedGameFile);
                } else if (parsed.meta && parsed.components && parsed.rules) {
                    // Handle old format by wrapping it in the new structure
                    onLoadGame({
                        history: [parsed as GamePackage],
                        currentIndex: 0
                    });
                } else {
                    alert('유효하지 않은 게임 패키지 파일입니다. 파일 형식을 확인해주세요.');
                }
            } catch (err) {
                console.error("Failed to parse game package file:", err);
                alert('파일을 읽는 중 오류가 발생했습니다. 올바른 JSON 형식인지 확인해주세요.');
            }
        
            if(fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        };
        reader.onerror = () => {
            alert('파일을 읽는 데 실패했습니다.');
        }
        reader.readAsText(file);
    };


    return (
        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-8 animate-fade-in text-center">
             <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelected}
                accept=".json,application/json"
                className="hidden"
            />
            <div>
                <h2 className="text-4xl font-extrabold mb-2">
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-500">
                        어떤 게임을 만들고 싶으신가요?
                    </span>
                </h2>
                <p className="text-lg text-slate-300">만들고 싶은 게임을 자유롭게 설명해주세요. AI가 아이디어를 구체화해 드립니다.</p>
            </div>
            
            <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
                <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={4}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg p-4 text-lg focus:ring-2 focus:ring-cyan-500 transition-colors placeholder:text-slate-400"
                    placeholder="상세할수록 좋습니다. 좋아하는 게임, 원하는 테마나 메커니즘을 자유롭게 적어주세요. 예: '테라포밍 마스'의 엔진 빌딩과 '카탄'의 자원 관리를 결합한, 문명 발전 테마의 게임"
                    required
                />
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <button 
                    type="submit" 
                    disabled={isLoading || isRandomLoading || !prompt.trim()}
                    className="w-full sm:w-auto bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold py-3 px-8 rounded-lg text-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                    {isLoading ? (
                        <>
                            <Spinner size="h-5 w-5 mr-2" />
                            <span className="whitespace-nowrap">생성 중...</span>
                        </>
                    ) : (
                        <span className="whitespace-nowrap">AI로 게임 아이디어 생성하기</span>
                    )}
                </button>
                <button 
                    type="button" 
                    onClick={handleRandom}
                    disabled={isLoading || isRandomLoading}
                    className="w-full sm:w-auto bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-white font-bold py-3 px-6 rounded-lg text-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {isRandomLoading ? (
                        <>
                            <Spinner size="h-5 w-5" />
                        </>
                    ) : (
                        <>
                            <SparklesIcon />
                            <span className="whitespace-nowrap">랜덤 아이디어</span>
                        </>
                    )}
                </button>
                 <div className="relative group w-full sm:w-auto">
                    <button 
                        type="button" 
                        onClick={handleTriggerFileInput}
                        disabled={isLoading || isRandomLoading}
                        className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-6 rounded-lg text-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        <FolderOpenIcon />
                        <span className="whitespace-nowrap">불러오기</span>
                    </button>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-3 py-1.5 text-sm font-medium text-white bg-slate-900 rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none border border-slate-700">
                        게임 패키지 (.json) 파일을 불러옵니다.
                        <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-slate-700"></div>
                    </div>
                </div>
            </div>
        </form>
    );
};

export default InputForm;