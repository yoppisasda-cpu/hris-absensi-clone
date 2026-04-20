'use client';

import { useState, useEffect, useRef } from "react";
import { Search, ChevronDown, Check } from "lucide-react";

interface Option {
    id: string | number;
    name: string;
    description?: string;
}

interface SearchableSelectProps {
    options: Option[];
    value: string | number;
    onChange: (value: string | number) => void;
    placeholder?: string;
    className?: string;
}

export default function SearchableSelect({ options = [], value, onChange, placeholder = "Search...", className = "" }: SearchableSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const filteredOptions = options.filter(option =>
        option.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const selectedOption = options.find(option => option.id.toString() === value?.toString());

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (isOpen) {
            inputRef.current?.focus();
            setHighlightedIndex(-1);
        } else {
            setSearchTerm("");
        }
    }, [isOpen]);

    const handleSelect = (option: Option) => {
        onChange(option.id);
        setIsOpen(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!isOpen) {
            if (e.key === "Enter" || e.key === "ArrowDown") {
                setIsOpen(true);
            }
            return;
        }

        switch (e.key) {
            case "ArrowDown":
                e.preventDefault();
                setHighlightedIndex(prev => (prev < filteredOptions.length - 1 ? prev + 1 : prev));
                break;
            case "ArrowUp":
                e.preventDefault();
                setHighlightedIndex(prev => (prev > 0 ? prev - 1 : prev));
                break;
            case "Enter":
                e.preventDefault();
                if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
                    handleSelect(filteredOptions[highlightedIndex]);
                }
                break;
            case "Escape":
                setIsOpen(false);
                break;
        }
    };

    return (
        <div className={`relative w-full ${className}`} ref={containerRef}>
            {/* Trigger Button */}
            <div
                onClick={() => setIsOpen(!isOpen)}
                onKeyDown={handleKeyDown}
                tabIndex={0}
                className="w-full rounded-2xl bg-slate-950 border border-slate-800 py-3 px-5 text-[11px] font-black text-white focus:border-blue-500/50 outline-none transition-all flex items-center justify-between cursor-pointer italic text-glow-sm hover:bg-slate-900"
            >
                <span className={!selectedOption ? "text-slate-600" : "text-white"}>
                    {selectedOption ? selectedOption.name.toUpperCase() : placeholder.toUpperCase()}
                </span>
                <ChevronDown className={`h-3 w-3 text-slate-600 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute z-[110] left-0 right-0 mt-1 bg-black border border-white/20 rounded-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                    {/* Search Input */}
                    <div className="p-3 border-b border-white/5 relative bg-black">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-500" />
                        <input
                            ref={inputRef}
                            type="text"
                            className="w-full bg-slate-900 border border-white/5 rounded-xl py-2 pl-9 pr-4 text-xs text-white placeholder:text-slate-600 outline-none focus:border-blue-500/30 transition-all font-bold italic"
                            placeholder="Type to filter..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={handleKeyDown}
                        />
                    </div>

                    {/* Options List */}
                    <div className="max-h-[350px] overflow-y-auto p-0 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((option, index) => (
                                <div
                                    key={option.id}
                                    onClick={() => handleSelect(option)}
                                    onMouseEnter={() => setHighlightedIndex(index)}
                                    className={`
                                        group flex items-center justify-between px-5 py-2.5 cursor-pointer transition-all duration-75
                                        ${index === highlightedIndex ? 'bg-blue-600 text-white' : 'text-slate-200'}
                                        ${value?.toString() === option.id.toString() && index !== highlightedIndex ? 'bg-blue-500/10' : ''}
                                    `}
                                >
                                    <div className="flex flex-col">
                                        <span className={`text-[11px] font-black uppercase italic tracking-widest ${index === highlightedIndex ? 'text-white' : 'text-slate-200'}`}>
                                            {option.name}
                                        </span>
                                        {option.description && (
                                            <span className={`text-[8px] font-bold italic ${index === highlightedIndex ? 'text-blue-100/70' : 'text-slate-500'}`}>
                                                {option.description}
                                            </span>
                                        )}
                                    </div>
                                    {value?.toString() === option.id.toString() && (
                                        <Check className={`h-3 w-3 ${index === highlightedIndex ? 'text-white' : 'text-blue-500'}`} />
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="p-4 text-center">
                                <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest italic">No matching results</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
