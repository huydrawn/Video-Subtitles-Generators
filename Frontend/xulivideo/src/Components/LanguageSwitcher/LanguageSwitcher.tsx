import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from 'antd';
import { GlobalOutlined } from '@ant-design/icons';

const LanguageSwitcher: React.FC = () => {
    const { i18n, t } = useTranslation();
    const [hovered, setHovered] = useState(false);

    const currentLang = i18n.language;
    const targetLang = currentLang === 'en' ? 'vi' : 'en'; // The language to switch to

    const handleLanguageChange = () => {
        i18n.changeLanguage(targetLang);
    };

    const getButtonText = () => {
        if (hovered) {
            // Display the name of the language you will switch TO
            return targetLang === 'en' ? t('languageSwitcher.english') : t('languageSwitcher.vietnamese');
        }
        // Display the current language label (e.g., "Language")
        return t('languageSwitcher.label');
    };

    return (
        <Button
            icon={<GlobalOutlined />}
            onClick={handleLanguageChange}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{ position: 'absolute', top: 20, right: 20, zIndex: 1000 }} // Example positioning
        >
            {getButtonText()}
        </Button>
    );
};

export default LanguageSwitcher;