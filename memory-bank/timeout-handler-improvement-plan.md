# TIMEOUT HANDLER ARCHITECTURE IMPROVEMENT PLAN

## Executive Summary

Текущий timeout handler в `stage.ts` создает сложную nested структуру ошибок, которая затрудняет доступ к оригинальным ошибкам в тестах. Необходимо упростить архитектуру error handling сохранив всю функциональность.

## Current Problem Analysis

### Проблемная структура (stage.ts:255)
```typescript
return withTimeout(promise, Config.timeout).catch(err => {
  const error = createError(new Error('Stage Error', {
    cause: {
      err,                    // Оригинальная ошибка
      context,               // Stage context
      name: this.reportName, // Stage name
      run: stageToRun,       // Function reference
      original: Context.isContext(context) ? context.original : context,
    }
  }))
  // ...
})
```

### Результирующая структура ошибки
```
CleanError: Stage Error
  chain: {
    primary: Error('Stage Error') {
      cause: {
        err: OriginalError('error'),  // ← Здесь скрыта оригинальная ошибка
        context: {...},
        name: 'StageName',
        run: function,
        original: {...}
      }
    }
  }
```

### Проблемы для тестов
- Тесты ожидают: `err?.chain.primary` = OriginalError
- Получают: `err?.chain.primary` = Error('Stage Error')
- Оригинальная ошибка доступна через: `err?.chain.primary.cause.err`
- Сложный и неинтуитивный путь доступа

## Proposed Solution: Smart Error Preservation

### Рекомендуемая архитектура
```typescript
return withTimeout(promise, Config.timeout).catch(err => {
  // Option 1: Preserve original error as primary
  const error = createError(err, {
    context: {
      timeoutType: 'stage',
      stageName: this.reportName,
      stageContext: context,
      original: Context.isContext(context) ? context.original : context,
    }
  })

  // Option 2: Use error chaining
  const timeoutError = createError('Stage timeout occurred', {
    context: {
      stageName: this.reportName,
      timeout: Config.timeout
    }
  })
  const error = chainErrors(err, timeoutError)

  // ...
})
```

### Результирующая структура (Option 1)
```
CleanError: error  // ← Оригинальное сообщение ошибки
  chain: {
    primary: OriginalError('error'),  // ← Прямой доступ к оригинальной ошибке
    context: {
      timeoutType: 'stage',
      stageName: 'StageName',
      stageContext: {...},
      original: {...}
    }
  }
```

## Implementation Strategy

### Phase 1: Error Structure Analysis (Completed by QA)
- ✅ Identified 6 failing tests due to timeout error structure
- ✅ Mapped current error flow: User Code → Timeout Handler → Test Expectations
- ✅ Analyzed test expectations vs actual error structure
- ✅ Documented complex nested structure problems

### Phase 2: Architecture Design

#### Option A: Minimal Change (Recommended)
**Goal**: Preserve original error as primary with minimal refactoring

**Changes needed**:
1. **stage.ts timeout handler**:
   ```typescript
   // Before
   const error = createError(new Error('Stage Error', {cause: {...}}))

   // After
   const error = createError(err, {
     context: {
       timeoutType: 'stage',
       stageName: this.reportName,
       stageContext: context
     }
   })
   ```

2. **Test expectations**:
   - Тесты могут остаться без изменений
   - `err?.chain.primary` будет содержать оригинальную ошибку
   - Timeout context доступен через `err?.chain.context`

**Benefits**:
- ✅ Минимальные изменения кода
- ✅ Тесты работают без модификации
- ✅ Cleaner error structure
- ✅ Better debugging experience

#### Option B: Enhanced Error Chaining
**Goal**: Create sophisticated error hierarchy with explicit chaining

**Changes needed**:
1. **Enhanced ErrorList.ts**:
   ```typescript
   export function createTimeoutError(
     originalError: Error,
     timeoutContext: TimeoutContext
   ): CleanError {
     const timeoutError = createError('Operation timed out', {
       context: timeoutContext
     })
     return chainErrors(originalError, timeoutError)
   }
   ```

2. **stage.ts integration**:
   ```typescript
   const error = createTimeoutError(err, {
     type: 'stage',
     name: this.reportName,
     timeout: Config.timeout
   })
   ```

**Benefits**:
- ✅ Explicit error relationships
- ✅ Rich timeout context
- ✅ Reusable patterns
- ⚠️ More complex implementation

### Phase 3: Implementation Plan

#### Step 1: Implement Option A (Minimal Change)
1. **Update stage.ts timeout handler** (1 file change)
2. **Test existing functionality** (verify 124 tests still pass)
3. **Validate 6 failing tests** (should now pass)
4. **Document new error structure**

#### Step 2: Testing and Validation
1. **Run full test suite**: Target 130/130 tests passing
2. **Manual error inspection**: Verify debugging experience
3. **Performance validation**: Ensure no performance impact
4. **Compatibility testing**: Verify backward compatibility

#### Step 3: Documentation and Cleanup
1. **Update error handling documentation**
2. **Create error inspection examples**
3. **Add JSDoc comments for new patterns**
4. **Clean up any temporary code**

## Success Metrics

### Functional Requirements
- ✅ **130/130 tests passing** (100% success rate)
- ✅ **Original error preservation**: Direct access via `err?.chain.primary`
- ✅ **Context preservation**: All timeout context available
- ✅ **No regressions**: All current functionality maintained

### Quality Requirements
- ✅ **Simplified error structure**: Fewer nesting levels
- ✅ **Intuitive error access**: Standard CleanError patterns
- ✅ **Better debugging**: Clear error hierarchy
- ✅ **Consistent patterns**: All error sources use same structure

### Performance Requirements
- ✅ **No performance degradation**: Same or better performance
- ✅ **Memory efficiency**: Maintain current optimizations
- ✅ **Stack trace clarity**: Clean stack traces preserved

## Risk Assessment

### Low Risk
- **Existing functionality**: All current features preserved
- **API compatibility**: No breaking changes to public API
- **Performance**: Minimal impact on performance

### Medium Risk
- **Test compatibility**: Need to verify all test expectations
- **Edge cases**: Complex error scenarios need testing
- **Documentation**: Need to update error handling guides

### Mitigation Strategies
1. **Comprehensive testing**: Test all error scenarios
2. **Gradual rollout**: Implement and test incrementally
3. **Rollback plan**: Keep current implementation available
4. **Documentation**: Clear migration and usage guides

## Timeline and Effort

### Estimated Timeline: 1-2 days
- **Design and Planning**: 2-4 hours
- **Implementation**: 4-6 hours
- **Testing and Validation**: 2-4 hours
- **Documentation**: 1-2 hours

### Complexity Level: Level 2 (Simple Enhancement)
- **Scope**: Limited to timeout error handling
- **Impact**: Improves test compatibility and debugging
- **Risk**: Low risk with high benefits

## Next Steps

1. **Approve architecture approach** (Option A recommended)
2. **Implement minimal changes** in stage.ts
3. **Validate test results** (target: 130/130 passing)
4. **Document improvements** and update guides
5. **Monitor production impact** after deployment

## Conclusion

The timeout handler architecture improvement is a low-risk, high-benefit enhancement that will:

- ✅ **Resolve all 6 failing tests** bringing success rate to 100%
- ✅ **Simplify error structure** for better debugging
- ✅ **Maintain full compatibility** with existing code
- ✅ **Improve developer experience** with cleaner error access

This improvement completes the CleanError migration and establishes a robust, consistent error handling architecture across the entire pipeline.js library.