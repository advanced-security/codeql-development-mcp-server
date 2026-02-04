---
name: 🔄 Update MCP Server Primitive
about: Pull request for updating existing tools or resources in the CodeQL Development MCP Server
title: '[UPDATE PRIMITIVE] '
labels:
  - mcp-primitive-update
  - enhancement
---

## 📝 Update Information

### Primitive Details

- **Type**: <!-- Tool, Resource, or Both -->
- **Name**: <!-- Name of existing primitive being updated -->
- **Update Category**: <!-- Bug Fix, Feature Enhancement, Performance, etc. -->

## ⚠️ CRITICAL: PR SCOPE VALIDATION

**This PR is for updating an existing MCP server primitive and must ONLY include these file types:**

✅ **ALLOWED FILES:**

- Server implementation files (`server/src/**/*.ts`)
- Updated primitive implementations
- Modified registration files (`server/src/tools/*.ts`)
- Updated or new test files (`server/test/**/*.ts`)
- Documentation updates (`README.md`, server docs)
- Updated type definitions (`server/src/types/*.ts`)
- Modified supporting library files (`server/src/lib/*.ts`)
- Configuration updates if needed (`package.json`, `tsconfig.json`)

🚫 **FORBIDDEN FILES:**

- Files unrelated to the primitive update
- Temporary or test output files
- IDE configuration files
- Log files or debug output
- Analysis or summary files

**Rationale**: This PR should contain only the files necessary to update and test the primitive.

**🚨 PRs that include forbidden files will be rejected and must be revised.**

---

## 🛑 MANDATORY PR VALIDATION CHECKLIST

**BEFORE SUBMITTING THIS PR, CONFIRM:**

- [ ] **ONLY server implementation files** are included
- [ ] **NO temporary or output files** are included
- [ ] **NO unrelated configuration files** are included
- [ ] **ALL existing tests continue to pass**
- [ ] **NEW functionality is properly tested**

---

- **Impact Scope**: <!-- Localized, Moderate, or Extensive changes -->

### Update Metadata

- **Breaking Changes**: <!-- Yes/No and description if applicable -->
- **API Compatibility**: <!-- Maintained/Enhanced/Changed -->
- **Performance Impact**: <!-- Improved/Neutral/Regression with details -->

## 🎯 Changes Description

### Current Behavior

<!-- Describe how the primitive currently works and what issues exist -->

### Updated Behavior

<!-- Describe how the primitive works after this update -->

### Motivation

<!-- Explain why this update was needed -->

## 🔄 Before vs. After Comparison

### Functionality Changes

```typescript
// BEFORE: Current implementation
async function oldBehavior(params) {
  // Previous implementation details
}

// AFTER: Updated implementation
async function newBehavior(params) {
  // New implementation details
}
```

### API Changes

```typescript
// Input Schema Changes (if any)
// BEFORE:
const oldSchema = z.object({
  query: z.string()
});

// AFTER:
const newSchema = z.object({
  query: z.string(),
  options: z
    .object({
      validate: z.boolean().optional()
    })
    .optional()
});
```

### Output Format Changes

```json
// BEFORE:
{
  "status": "success",
  "result": "simple string"
}

// AFTER:
{
  "status": "success",
  "result": {
    "value": "enhanced string",
    "metadata": {
      "confidence": 0.95,
      "suggestions": ["improvement 1", "improvement 2"]
    }
  }
}
```

## 🧪 Testing & Validation

### Test Coverage Updates

- [ ] **Existing Tests**: All existing tests continue to pass
- [ ] **New Test Cases**: Added tests for new functionality
- [ ] **Regression Tests**: Added tests to prevent regression of fixed issues
- [ ] **Edge Case Tests**: Enhanced edge case coverage

### Validation Scenarios

<!-- Describe specific scenarios tested to validate the update -->

1. **Backward Compatibility**: <!-- Tests ensuring existing usage continues to work -->
2. **New Functionality**: <!-- Tests validating new features -->
3. **Error Handling**: <!-- Tests for improved error conditions -->
4. **Performance**: <!-- Tests showing performance improvements -->

### Test Results

- [ ] **Unit Tests**: All pass (X/Y tests)
- [ ] **Integration Tests**: All pass (X/Y tests)
- [ ] **Manual Testing**: Validated with real scenarios
- [ ] **Performance Testing**: No regressions detected

## 📋 Implementation Details

### Files Modified

<!-- List all files that were changed -->

- [ ] **Core Implementation**: `server/src/[path]/[primitive-file].ts`
- [ ] **Supporting Libraries**: `server/src/lib/[library-files].ts`
- [ ] **Type Definitions**: `server/src/types/[type-files].ts`
- [ ] **Tests**: `server/test/[test-files].ts`
- [ ] **Documentation**: Updated README.md or related docs

### Code Changes Summary

- [ ] **Algorithm Improvements**: Enhanced core logic
- [ ] **Error Handling**: Improved error handling and messaging
- [ ] **Performance Optimization**: Optimized execution paths
- [ ] **Type Safety**: Enhanced TypeScript types
- [ ] **Input Validation**: Improved input validation
- [ ] **Output Format**: Enhanced output structure

### Dependencies

- [ ] **No New Dependencies**: Update uses existing dependencies only
- [ ] **Updated Dependencies**: Updated to newer versions (list changes)
- [ ] **New Dependencies**: Added new dependencies (justify need)

## 🔍 Quality Improvements

### Bug Fixes (if applicable)

- **Issue**: <!-- Description of the bug that was fixed -->
- **Root Cause**: <!-- Why the bug occurred -->
- **Solution**: <!-- How it was fixed -->
- **Prevention**: <!-- How similar bugs are prevented -->

### Performance Improvements

- **Baseline Performance**: <!-- Previous performance metrics -->
- **Improved Performance**: <!-- New performance metrics -->
- **Optimization Techniques**: <!-- What optimizations were applied -->

### Code Quality Enhancements

- [ ] **Readability**: Improved code clarity and documentation
- [ ] **Maintainability**: Better code organization and structure
- [ ] **Testability**: Enhanced test coverage and clarity
- [ ] **Reusability**: More modular and reusable components

## 🔗 References

### Related Issues/PRs

<!-- Link to issues this update addresses -->

- **Fixes Issue**: <!-- #123 or link to issue -->
- **Related PRs**: <!-- Links to related updates -->

### External References

<!-- Links to documentation or research that informed the update -->

### Validation Materials

<!-- Materials used to validate the improvements -->

- **Test Cases**: <!-- Examples used for validation -->
- **Performance Benchmarks**: <!-- Benchmarking data -->

## 🚀 Compatibility & Migration

### Backward Compatibility

- [ ] **Fully Compatible**: No breaking changes
- [ ] **Deprecation Warnings**: Deprecated features with warnings
- [ ] **Breaking Changes**: Changes that break existing usage (detailed below)

### Breaking Changes (if any)

<!-- If there are breaking changes, detail them here -->

**Changes Made**:

- <!-- List specific breaking changes -->

**Migration Guide**:

- <!-- Provide guidance for updating existing usage -->

**Timeline**:

- <!-- When breaking changes take effect -->

### API Evolution

- [ ] **Enhanced Parameters**: New optional parameters added
- [ ] **Improved Responses**: Richer response formats
- [ ] **Better Error Messages**: More descriptive error information
- [ ] **Maintained Contracts**: Core API contracts preserved

## 👥 Review Guidelines

### For Reviewers

Please verify:

- [ ] **⚠️ SCOPE COMPLIANCE**: PR contains only server implementation files
- [ ] **⚠️ NO UNRELATED FILES**: No temporary, output, or unrelated files
- [ ] **⚠️ BACKWARD COMPATIBILITY**: Existing functionality preserved (unless breaking changes approved)
- [ ] **Functionality**: Updates work as described
- [ ] **Test Coverage**: All existing tests pass, new tests comprehensive
- [ ] **Performance**: No performance regressions
- [ ] **Code Quality**: Maintains or improves code quality
- [ ] **Documentation**: Updated documentation accurate
- [ ] **Error Handling**: Improved error handling
- [ ] **Type Safety**: TypeScript types properly updated

### Testing Instructions

```bash
# Full test suite
npm install
npm run build
npm test

# Specific primitive tests
npm test -- --grep "primitive_name"

# Performance testing (if applicable)
npm run test:performance

# Manual testing scenarios
npm run dev:stdio
# Test with before/after scenarios

# Code quality checks
npm run lint
npm run format
npm run type-check
```

### Validation Checklist

1. **Regression Testing**: Verify no existing functionality is broken
2. **New Feature Testing**: Validate all new functionality works
3. **Performance Testing**: Confirm no performance regressions
4. **Error Testing**: Test error conditions and edge cases
5. **Integration Testing**: Verify integration with rest of server
6. **Documentation Review**: Ensure documentation is accurate

## 📊 Impact Assessment

### Performance Impact

- **Memory Usage**: <!-- Before/after memory usage -->
- **Execution Time**: <!-- Before/after execution times -->
- **Throughput**: <!-- Before/after throughput metrics -->

### Server Impact

- [ ] **Startup Time**: No significant impact on server startup
- [ ] **Runtime Stability**: No impact on server stability
- [ ] **Resource Usage**: Reasonable resource consumption
- [ ] **Concurrent Usage**: Safe for concurrent access

### AI Assistant Impact

- [ ] **Enhanced Accuracy**: Improved AI assistant responses
- [ ] **Better Coverage**: Expanded use case support
- [ ] **Improved Reliability**: More reliable primitive behavior
- [ ] **Enhanced User Experience**: Better AI assistant workflows

## 🔄 Deployment Strategy

### Rollout Considerations

- [ ] **Safe Deployment**: Can be deployed safely to production
- [ ] **Gradual Rollout**: Consider gradual rollout if high-impact changes
- [ ] **Monitoring**: Appropriate monitoring for the update
- [ ] **Rollback Plan**: Clear rollback strategy if issues arise

### Post-Deployment Validation

- [ ] **Monitoring**: Key metrics to monitor after deployment
- [ ] **User Feedback**: Channels for collecting user feedback
- [ ] **Performance Tracking**: Performance metrics to track
- [ ] **Error Tracking**: Error patterns to watch for

---

**Update Methodology**: This update follows best practices:

1. ✅ Comprehensive backward compatibility analysis
2. ✅ Thorough testing of all changes
3. ✅ Performance impact assessment
4. ✅ Clear documentation of changes
5. ✅ Robust error handling improvements
6. ✅ Maintained code quality standards
