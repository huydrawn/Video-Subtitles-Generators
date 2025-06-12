// src/components/VideoEditor/useSubtitleLanguageLogic.ts
import { useState, useEffect } from 'react';
import { message } from 'antd';

export interface LanguageOption {
    value: string;
    label: string;
}

export interface SubtitleLanguageLogic {
    availableLanguages: LanguageOption[];
    languagesLoading: boolean;
    selectedOriginalLanguage: string | undefined;
    setSelectedOriginalLanguage: React.Dispatch<React.SetStateAction<string | undefined>>;
}

export const useSubtitleLanguageLogic = (): SubtitleLanguageLogic => {
    const [availableLanguages, setAvailableLanguages] = useState<LanguageOption[]>([]);
    const [languagesLoading, setLanguagesLoading] = useState<boolean>(false);
    const [selectedOriginalLanguage, setSelectedOriginalLanguage] = useState<string | undefined>('auto');

    useEffect(() => {
        const fetchLanguages = async () => {
            setLanguagesLoading(true);
            try {
                const response = await fetch('https://restcountries.com/v3.1/all?fields=languages,cca2,name');
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                const countriesData = await response.json();
                const languageMap = new Map<string, string>();
                countriesData.forEach((country: any) => {
                    if (country.languages) {
                        Object.entries(country.languages).forEach(([code, name]) => {
                            if (typeof name === 'string' && !languageMap.has(code)) {
                                languageMap.set(code, name);
                            }
                        });
                    }
                });
                const formattedLanguages = Array.from(languageMap.entries())
                    .map(([code, name]) => ({ value: code, label: `${name} (${code})` }))
                    .sort((a, b) => a.label.localeCompare(b.label));

                const ensureSpecificLanguage = (
                    langCode: string,
                    langName: string,
                    currentLangs: typeof formattedLanguages
                ) => {
                    if (!currentLangs.some(l => l.value === langCode)) {
                        currentLangs.unshift({ value: langCode, label: `${langName} (${langCode})`});
                    }
                };
                ensureSpecificLanguage('en', 'English', formattedLanguages);
                ensureSpecificLanguage('vi', 'Vietnamese', formattedLanguages);

                setAvailableLanguages([{ value: 'auto', label: 'Auto Detect' }, ...formattedLanguages]);
                // setSelectedOriginalLanguage('auto'); // Already set initially
            } catch (error) {
                console.error("Failed to fetch languages:", error);
                message.error("Could not load languages for translation.");
                setAvailableLanguages([ // Fallback
                    { value: 'auto', label: 'Auto Detect' },
                    { value: 'en', label: 'English (en)' },
                    { value: 'vi', label: 'Vietnamese (vi)' }
                ]);
                // setSelectedOriginalLanguage('auto'); // Already set initially
            } finally {
                setLanguagesLoading(false);
            }
        };
        fetchLanguages();
    }, []);

    return {
        availableLanguages,
        languagesLoading,
        selectedOriginalLanguage,
        setSelectedOriginalLanguage,
    };
};