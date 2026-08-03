# Internationalization (i18n) Implementation

## Overview
NFTopia mobile app now supports multiple languages with full internationalization.

## Supported Languages
- English (en) 🇺🇸
- French (fr) 🇫🇷
- Spanish (es) 🇪🇸
- German (de) 🇩🇪
- Arabic (ar) 🇸🇦 (RTL support)

## Features
- Automatic device language detection
- Language persistence across sessions
- RTL layout support for Arabic
- Pluralization support
- Variable interpolation
- Nested translation keys
- Fallback language support
- Date, currency, and number formatting per locale

## How to Use

### In Components
```typescript
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();
  
  return (
    <Text>{t('common.loading')}</Text>
    // With interpolation
    <Text>{t('home.greeting', { name: 'John' })}</Text>
    // With pluralization
    <Text>{t('profile.manageWallets', { count: 5 })}</Text>
  );
}
```

### Formatted Components
```typescript
import { FormattedDate } from '@/src/components/FormattedDate';
import { FormattedCurrency } from '@/src/components/FormattedCurrency';
import { FormattedNumber } from '@/src/components/FormattedNumber';

<FormattedDate date={new Date()} format="long" />
<FormattedCurrency amount={1234.56} currency="USD" />
<FormattedNumber value={1234.56} minimumFractionDigits={2} />
```

### Language Switcher
```typescript
import { LanguageSwitcher } from '@/src/components/LanguageSwitcher';

// Full width dropdown
<LanguageSwitcher variant="full" />

// Compact button
<LanguageSwitcher variant="compact" />

// Icon only
<LanguageSwitcher variant="icon" />
```

## Translation File Structure
```
src/i18n/
├── index.ts              # i18n configuration
├── types.ts              # Type definitions
├── resources/
│   ├── en.json          # English translations
│   ├── fr.json          # French translations
│   ├── es.json          # Spanish translations
│   ├── de.json          # German translations
│   └── ar.json          # Arabic translations (RTL)
└── index.ts             # Entry point
```

## Adding New Languages

Create new JSON file in src/i18n/resources/

Add language to SUPPORTED_LANGUAGES in src/i18n/types.ts

Add language option to LANGUAGE_OPTIONS in src/i18n/types.ts

Import and add to resources in src/i18n/resources/index.ts

## Adding New Translation Keys

Add key to all language JSON files

Use nested structure for organization

Follow naming convention: section.key.subkey

## Testing Translation

```bash
    npm test src/i18n/__tests__/
```
## Best Practices

Always use t() function for user-facing strings

Use interpolation for dynamic content

Use pluralization for countable items

Keep translation keys descriptive

Organize translations by feature/section

Test RTL layout with Arabic language