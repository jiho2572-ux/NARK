import React from 'react';
import { DiceIcon } from './icons';

const Header: React.FC = () => {
    return (
        <header className="bg-slate-900/80 backdrop-blur-sm sticky top-0 z-40 border-b border-slate-700">
            <div className="container mx-auto px-4 py-3 flex justify-center items-center">
                <div className="flex items-center gap-3">
                    <DiceIcon className="h-8 w-8 text-cyan-400" />
                    <h1 className="text-2xl font-bold text-white">
                        GameCraft AI
                    </h1>
                </div>
            </div>
        </header>
    );
};

export default Header;