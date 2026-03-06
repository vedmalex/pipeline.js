# Memory Bank: Технический контекст

## Обзор проекта
**Название:** pipeline.js v2.0.32
**Описание:** Modular async workflow framework для Node.js и браузера
**Автор:** Alex Vedmedenko (vedmalex@gmail.com)
**Repository:** https://github.com/vedmalex/pipeline.js

## Архитектура системы

### Основные концепции
1. **Pipeline** - последовательность stages для обработки данных
2. **Stage** - единичная рабочая единица обработки
3. **Context** - объект данных, проходящий через pipeline
4. **Event-driven** - основанная на событиях архитектура

### Иерархия классов
```
Stage (базовый класс)
├── Pipeline (последовательность stages)
├── IfElse (условная обработка)
├── MultiWaySwitch (множественный выбор)
├── Parallel (параллельная обработка)
├── Sequential (последовательная обработка)
├── DoWhile (циклическая обработка)
├── Timeout (обработка с таймаутом)
├── RetryOnError (повторы при ошибках)
├── Wrap (изменение контекста)
└── Empty (пустой stage)
```

## Технический стек

### Основные технологии
- **Language:** TypeScript (компилируется в ES5)
- **Runtime:** Node.js + браузер
- **Package Manager:** Bun
- **Build System:** TypeScript compiler + esbuild
- **Testing Framework:** Bun test

### Зависимости
**Production:**
- `ajv` ^8.17.1 - JSON Schema validation
- `ajv-errors` ^3.0.0 - улучшенные сообщения об ошибках
- `ajv-formats` ^3.0.1 - форматы для ajv
- `ajv-keywords` ^5.1.0 - дополнительные ключевые слова
- `fte.js` 3.0.0-rc.4 - template engine
- `js-schema` 1.0.1 - schema validation
- `lodash` ^4.17.21 - utility library

**Development:**
- `@types/bun` ^1.2.5
- `@types/lodash` ^4.17.16
- `@types/node` 22.13.10
- `esbuild` latest
- `typescript` next
- `glob` ^8.0.3

## Структура файлов

### Исходный код (`src/`)
- `stage.ts` - базовый класс Stage (420 строк)
- `pipeline.ts` - Pipeline класс
- `context.ts` - Context управление
- `ifelse.ts` - условная логика
- `multiwayswitch.ts` - множественные условия
- `parallel.ts` - параллельная обработка
- `sequential.ts` - последовательная обработка
- `dowhile.ts` - циклы
- `timeout.ts` - таймауты
- `retryonerror.ts` - повторы
- `wrap.ts` - контекст wrapping
- `empty.ts` - пустой stage

### Утилиты (`src/utils/`)
- `types.ts` - типы TypeScript
- `ErrorList.ts` - управление ошибками
- `can_fix_error.ts` - анализ ошибок
- `execute_*.ts` - различные execution utilities
- `async/` - асинхронные утилиты

### Тесты (`src/tests/`)
- Полный набор тестов для всех компонентов
- Snapshot тестирование
- Test coverage анализ

## Компиляция и сборка

### TypeScript конфигурация
- `tsconfig.json` - основная конфигурация
- `tsconfig.bun.json` - Bun-специфичная конфигурация
- Компиляция в ES5 для совместимости

### Build скрипты
```json
{
  "build": "bun build.ts && tsc -p tsconfig.bun.json",
  "lib": "tsc -p tsconfig.json",
  "watch": "tsc -w -p tsconfig.json",
  "clean": "git clean -dfqX -- {types,dist}/** && rm -rf tsconfig.tsbuildinfo dist types"
}
```

## Выявленные технические проблемы

### 🔴 Критические
1. **ES5 Target** - устаревший target компиляции
2. **instanceof Issues** - проблемы с проверками типов в ES5
3. **TypeScript Version** - использование "next" версии
4. **Legacy Patterns** - устаревшие паттерны кода

### 🟡 Высокие
1. **Missing Modern Features** - отсутствие async/await
2. **Type Safety** - недостаточная типизация
3. **API Design** - отсутствие fluent API
4. **Dependency Management** - устаревшие зависимости

### 🟢 Средние
1. **Documentation** - неполная документация
2. **Test Coverage** - может быть улучшено
3. **Build Process** - можно оптимизировать
4. **Code Style** - отсутствие линтера

## Совместимость

### Поддерживаемые платформы
- Node.js (все современные версии)
- Браузеры (через ES5 компиляцию)
- Bun (native support)

### Известные ограничения
- ES5 target ограничивает возможности
- instanceof проверки не работают корректно
- Отсутствие native async/await поддержки
- Большой bundle size из-за ES5

## Планируемые улучшения
См. подробный список в `tasks.md` и `activeContext.md`