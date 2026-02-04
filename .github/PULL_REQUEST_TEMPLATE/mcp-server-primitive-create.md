---
name: 🔧 New MCP Server Primitive
about: Pull request for creating a new tool or resource in the CodeQL Development MCP Server
title: '[NEW PRIMITIVE] '
labels:
  - mcp-primitive-create
  - enhancement
---

## 📝 Primitive Information

### Primitive Details

- **Type**: <!-- Tool, Resource, or Both -->
- **Name**: <!-- e.g., validate_query_performance, codeql_advanced_patterns -->
- **Domain**: <!-- e.g., Query Development, Database Management, etc. -->

## ⚠️ CRITICAL: PR SCOPE VALIDATION

**This PR is for creating a new MCP server primitive and must ONLY include these file types:**

✅ **ALLOWED FILES:**

- Server implementation files (`server/src/**/*.ts`)
- New primitive implementations (tools or resources)
- Updated registration files (`server/src/tools/*.ts`)
- Test files for the new primitive (`server/test/**/*.ts`)
- Documentation updates (`README.md`, server docs)
- Type definitions (`server/src/types/*.ts`)
- Supporting library files (`server/src/lib/*.ts`)
- Configuration files related to the primitive (`package.json`, `tsconfig.json`)

🚫 **FORBIDDEN FILES:**

- Files unrelated to the MCP server implementation
- Temporary or test output files
- IDE configuration files
- Log files or debug output

**Rationale**: This PR should contain only the files necessary to implement and test the new primitive.

**🚨 PRs that include forbidden files will be rejected and must be revised.**

---

## 🛑 MANDATORY PR VALIDATION CHECKLIST

**BEFORE SUBMITTING THIS PR, CONFIRM:**

- [ ] **ONLY server implementation files** are included
- [ ] **NO temporary or output files** are included
- [ ] **NO unrelated configuration files** are included
- [ ] **ALL new functionality is properly tested**

---

- **Category**: <!-- Security, Performance, Code Quality, Learning, etc. -->

### Primitive Metadata

- **MCP Type**: <!-- Tool (interactive) or Resource (static content) -->
- **Input Schema**: <!-- Zod schema definition -->
- **Output Format**: <!-- Expected return format -->

## 🎯 Functionality Description

### What This Primitive Does

<!-- Provide a clear description of the primitive's functionality -->

### Use Cases

<!-- Explain how AI assistants will use this primitive -->

### Example Usage

```typescript
// Example of how the primitive is called
const result = await server.call('primitive_name', {
  parameter1: 'value1',
  parameter2: 'value2'
});
```

### Example Input/Output

```json
// Input
{
  "query": "import java\nfrom Method m\nselect m",
  "options": {
    "validate": true
  }
}

// Output
{
  "status": "success",
  "result": {
    "isValid": true,
    "suggestions": ["Consider adding type constraints"]
  }
}
```

## 🧪 Implementation Details

### Files Added/Modified

<!-- List all new or modified files -->

- [ ] **New Implementation**: `server/src/[path]/[primitive-name].ts`
- [ ] **Registration Update**: `server/src/tools/[registration-file].ts`
- [ ] **Type Definitions**: `server/src/types/[types-file].ts`
- [ ] **Tests**: `server/test/[test-files].ts`
- [ ] **Documentation**: Updated README.md or added docs

### Architecture Integration

- [ ] **Server Registration**: Primitive properly registered with MCP server
- [ ] **Error Handling**: Comprehensive error handling implemented
- [ ] **Logging**: Appropriate logging added
- [ ] **Type Safety**: Full TypeScript type coverage
- [ ] **Schema Validation**: Zod schemas for input/output validation
- [ ] **Session Tracking**: Compatible with monitoring and reporting system
- [ ] **Quality Assessment**: Participates in quality score calculations

### Design Patterns

- [ ] **Follows Existing Patterns**: Consistent with other primitives
- [ ] **Modular Design**: Properly separated concerns
- [ ] **Dependency Management**: Minimal and appropriate dependencies
- [ ] **Performance Considerations**: Optimized for expected usage

## 📋 Testing Coverage

### Unit Tests

- [ ] **Input Validation**: Tests for all input parameter combinations
- [ ] **Core Functionality**: Tests for main primitive logic
- [ ] **Error Conditions**: Tests for error handling and edge cases
- [ ] **Integration**: Tests for MCP server integration

### Test Scenarios

<!-- Describe specific test scenarios implemented -->

1. **Basic Functionality**: <!-- e.g., Valid CodeQL query processing -->
2. **Error Handling**: <!-- e.g., Invalid input handling -->
3. **Edge Cases**: <!-- e.g., Empty inputs, large inputs -->
4. **Integration**: <!-- e.g., Works with existing server components -->

### Test Files

<!-- List test files added -->

- [ ] `server/test/[primitive-name].test.ts`
- [ ] Additional test utilities or fixtures

## 🔗 References

### Related Implementation

<!-- Reference to any existing primitives this is based on -->

### External References

<!-- Links to documentation, specifications, or examples -->

- [ ] MCP Specification: <!-- relevant MCP docs -->
- [ ] CodeQL Documentation: <!-- relevant CodeQL docs -->
- [ ] Implementation Examples: <!-- reference implementations -->

### Validation Materials

<!-- Reference to materials used to validate functionality -->

- **Test Queries**: <!-- Example CodeQL queries used for testing -->
- **Expected Behaviors**: <!-- Documented expected behaviors -->

## 🚀 Server Integration

### Registration Details

```typescript
// How the primitive is registered
server.tool(
  'primitive_name',
  'Description of what the primitive does',
  {
    // Zod schema for parameters
  },
  async (params) => {
    // Implementation
  }
);
```

### Compatibility

- [ ] **MCP Protocol Version**: Compatible with current MCP version
- [ ] **Node.js Version**: Compatible with required Node.js version
- [ ] **Dependencies**: All dependencies properly declared
- [ ] **TypeScript Version**: Compatible with project TypeScript version

### Performance Considerations

- [ ] **Memory Usage**: Reasonable memory footprint
- [ ] **Execution Time**: Appropriate response times
- [ ] **Concurrency**: Thread-safe implementation
- [ ] **Resource Cleanup**: Proper resource management

## 🔍 Quality Assurance

### Code Quality

- [ ] **TypeScript Compilation**: Compiles without errors or warnings
- [ ] **Linting**: Passes ESLint checks
- [ ] **Formatting**: Follows Prettier formatting
- [ ] **Documentation**: JSDoc comments for all public interfaces

### Validation Testing

- [ ] **Manual Testing**: Manually tested with various inputs
- [ ] **Automated Testing**: All unit tests pass
- [ ] **Integration Testing**: Works with full MCP server
- [ ] **Error Path Testing**: Error conditions properly handled

### Security Considerations

- [ ] **Input Sanitization**: All inputs properly validated
- [ ] **No Code Injection**: Safe from code injection attacks
- [ ] **Resource Limits**: Appropriate limits on resource usage
- [ ] **Error Information**: Error messages don't leak sensitive data

## 👥 Review Guidelines

### For Reviewers

Please verify:

- [ ] **⚠️ SCOPE COMPLIANCE**: PR contains only server implementation files
- [ ] **⚠️ NO UNRELATED FILES**: No temporary, output, or unrelated files
- [ ] **Functionality**: Primitive works as described
- [ ] **Test Coverage**: Comprehensive test coverage
- [ ] **Code Quality**: Follows project standards
- [ ] **Documentation**: Clear documentation and examples
- [ ] **Performance**: Acceptable performance characteristics
- [ ] **Integration**: Properly integrated with MCP server
- [ ] **Type Safety**: Full TypeScript coverage
- [ ] **Error Handling**: Robust error handling

### Testing Instructions

```bash
# Build and test the server
npm install
npm run build
npm test

# Test the specific primitive
npm test -- --grep "primitive_name"

# Manual testing (if applicable)
npm run dev:stdio
# Test the primitive via MCP client

# Linting and formatting
npm run lint
npm run format
```

### Manual Validation Steps

1. **Start MCP Server**: Verify server starts without errors
2. **Test Primitive**: Call the primitive with various inputs
3. **Validate Outputs**: Confirm outputs match expected format
4. **Error Testing**: Test with invalid inputs
5. **Integration Testing**: Verify works with existing primitives

## 📊 Impact Analysis

### Server Impact

- [ ] **Startup Time**: No significant impact on server startup
- [ ] **Memory Usage**: Reasonable memory footprint
- [ ] **API Surface**: Clean addition to MCP API
- [ ] **Dependencies**: Minimal new dependencies

### AI Assistant Benefits

- [ ] **Enhanced Capabilities**: Provides new functionality for AI assistants
- [ ] **Improved Accuracy**: Helps AI assistants provide better CodeQL guidance
- [ ] **Better Coverage**: Expands supported use cases
- [ ] **Workflow Integration**: Fits well into existing AI workflows
- [ ] **Quality Measurement**: Contributes to monitoring and quality assessment

### Monitoring & Reporting Integration

- [ ] **Session Tracking**: Compatible with session-based development tracking
- [ ] **Quality Metrics**: Contributes to multi-dimensional quality scoring
- [ ] **Usage Analytics**: Provides data for tool effectiveness analysis
- [ ] **Test-Driven Workflow**: Integrates with test-driven development practices

### Maintenance Considerations

- [ ] **Code Maintainability**: Well-structured and documented code
- [ ] **Test Maintainability**: Tests are clear and maintainable
- [ ] **Documentation**: Sufficient documentation for future maintenance
- [ ] **Compatibility**: Forward-compatible design

## 🔄 Deployment Considerations

### Rollout Strategy

- [ ] **Safe Deployment**: Can be deployed without breaking existing functionality
- [ ] **Feature Flag**: Consider if feature flagging is needed
- [ ] **Monitoring**: Appropriate logging for monitoring
- [ ] **Rollback**: Can be safely rolled back if needed

### Migration Notes

<!-- Any steps required when deploying this primitive -->

---

**Implementation Methodology**: This primitive follows best practices:

1. ✅ Proper MCP protocol compliance
2. ✅ TypeScript type safety
3. ✅ Comprehensive error handling
4. ✅ Thorough testing coverage
5. ✅ Clear documentation
6. ✅ Performance optimization
