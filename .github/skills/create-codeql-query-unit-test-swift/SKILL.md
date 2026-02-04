---
name: create-codeql-query-unit-test-swift
description: Create comprehensive unit tests for CodeQL queries targeting Swift code. Use this skill when you need to create, validate, or enhance test coverage for Swift CodeQL queries using the CodeQL Development MCP Server tools.
---

# Create CodeQL Query Unit Test for Swift

This skill guides you through creating comprehensive unit tests for CodeQL queries that analyze Swift code.

## When to Use This Skill

- Creating new unit tests for a Swift CodeQL query
- Adding test cases to existing Swift query tests
- Validating Swift query behavior against known code patterns
- Testing Swift security queries, code quality queries, or analysis queries

## Prerequisites

Before creating tests, ensure you have:

- A CodeQL query (`.ql` file) that you want to test
- Understanding of what Swift code patterns the query should detect
- Knowledge of Swift language features and frameworks relevant to your query
- Access to CodeQL Development MCP Server tools
- A query pack directory where your query is organized
- **macOS environment** - Swift CodeQL extraction requires macOS and Xcode

> **Important**: Swift CodeQL analysis requires macOS because the Swift extractor depends on `xcodebuild` and macOS SDK frameworks.

## Swift Test Structure

### Directory Layout

Organize tests in your query pack's test directory:

```bash
<query-pack>/test/{QueryName}/
├── {QueryName}.qlref           # Reference to the query being tested
├── Example1.swift              # Primary test source file
├── Example2.swift              # Additional test cases (optional)
├── {QueryName}.expected        # Expected query results
└── {QueryName}.testproj/       # Generated test database (auto-created)
```

### File Naming Conventions

- **Primary test source file**: **Must be named `Example1.swift`** - This is required because Swift tool queries use filename matching as a fallback when external predicates aren't available during unit tests
- **Additional test files**: `Example2.swift`, `Example3.swift`, etc.
- **Query reference**: `{QueryName}.qlref` (exact match to query directory name)
- **Expected results**: `{QueryName}.expected` (exact match to query name)

> **Important**: Unlike some other languages that can use directory path matching, Swift queries match on the specific filename `Example1.swift` for unit test fallback behavior. This is consistent with the Java tool queries pattern.

## Step-by-Step Guide

### Step 1: Create Test Directory

Create the test directory structure within your query pack:

```bash
mkdir -p <query-pack>/test/{QueryName}
```

### Step 2: Create Query Reference File

Create `{QueryName}.qlref` with the relative path to your query:

```bash
{QueryName}/{QueryName}.ql
```

**Example** (`FindUnsafeDeserialization.qlref`):

```bash
FindUnsafeDeserialization/FindUnsafeDeserialization.ql
```

**Important**: The path is relative to your query pack's source directory.

### Step 3: Write Test Source Code

Create `Example1.swift` with comprehensive test cases:

**Positive Cases** (should detect):

```swift
import Foundation

// Should detect: SQL injection
func unsafeQuery(userInput: String) {
    let query = "SELECT * FROM users WHERE name = '\(userInput)'"
    executeSQL(query)
}

// Should detect: Command injection
func unsafeCommand(userInput: String) {
    let task = Process()
    task.launchPath = "/bin/bash"
    task.arguments = ["-c", "echo \(userInput)"]
    task.launch()
}
```

**Negative Cases** (should NOT detect):

```swift
import Foundation
import SQLite

// Safe: parameterized query
func safeQuery(userInput: String) {
    let stmt = try db.prepare("SELECT * FROM users WHERE name = ?")
    for row in try db.run(stmt.bind(userInput)) {
        // Process row
    }
}

// Safe: validated input
func safeCommand(option: String) {
    guard ["start", "stop", "restart"].contains(option) else {
        return
    }
    executeCommand(option)
}
```

**Key Swift Patterns to Test:**

- **iOS Frameworks**: UIKit, Foundation, Security, CryptoKit
- **Cryptography**: Insecure algorithms, hardcoded keys, weak hashing
- **Network**: URLSession, Alamofire, insecure TLS configurations
- **Data Storage**: UserDefaults, Keychain, Core Data, Realm
- **Web Views**: WKWebView JavaScript injection, unsafe URL loading
- **Deserialization**: NSKeyedUnarchiver, JSONDecoder with untrusted data
- **String Formatting**: Uncontrolled format strings, SQL/predicate injection

### Step 4: Create Expected Results File

Create `{QueryName}.expected` with the expected query output:

```text
| file           | line | col | endLine | endCol | message                          |
| Example1.swift | 6    | 17  | 6       | 65     | SQL injection vulnerability      |
| Example1.swift | 13   | 22  | 13      | 38     | Command injection vulnerability  |
```

**Column Definitions:**

- `file`: Test source file name (e.g., `Example1.swift`)
- `line`: Starting line number (1-indexed)
- `col`: Starting column number (1-indexed)
- `endLine`: Ending line number
- `endCol`: Ending column number
- `message`: Expected alert message from the query

**Important Notes:**

- Line and column numbers are 1-indexed
- Message text should match query output exactly
- Use consistent spacing with `|` separators
- Order results by file, then line, then column

### Step 5: Extract Test Database

Use the `codeql_test_extract` MCP tool to create a test database:

```json
{
  "testPath": "<query-pack>/test/{QueryName}",
  "searchPath": ["<query-pack>"]
}
```

**What This Does:**

- Parses your Swift test code using the CodeQL Swift extractor
- Creates a CodeQL database at `test/{QueryName}/{QueryName}.testproj/`
- Extracts AST and semantic information
- Prepares database for query execution

**Swift Extraction Notes:**

- Requires macOS with Xcode installed
- Supports Swift 5.4 through 6.2
- Handles async/await, actors, property wrappers
- Processes multiple source files
- Includes standard library modeling (Foundation, UIKit, etc.)
- Extracts iOS/macOS framework patterns

### Step 6: Analyze Swift Code Structure (Optional)

Before finalizing your query, use analysis tools to understand the Swift AST structure.

#### Understanding Swift AST

Use the `codeql_query_run` MCP tool with a PrintAST-style query to examine the AST:

**Key Swift AST Nodes to Look For:**

- **Declarations**: `ClassDecl`, `StructDecl`, `EnumDecl`, `ProtocolDecl`, `FuncDecl`
- **Expressions**: `CallExpr`, `MemberRefExpr`, `DeclRefExpr`, `StringLiteralExpr`
- **Statements**: `IfStmt`, `GuardStmt`, `ForEachStmt`, `SwitchStmt`, `ReturnStmt`
- **Types**: `NominalType`, `FunctionType`, `OptionalType`, `ArrayType`
- **Patterns**: `NamedPattern`, `TypedPattern`, `EnumElementPattern`
- **Control Flow**: `CfgNode`, `BasicBlock` for dataflow analysis

### Step 7: Run Tests

Execute your tests using the `codeql_test_run` MCP tool:

```json
{
  "testPath": "<query-pack>/test/{QueryName}",
  "searchPath": ["<query-pack>"]
}
```

**Interpreting Results:**

✅ **Tests Pass**: Output matches `.expected` file exactly

- All expected alerts are found
- No unexpected alerts are produced
- Line and column numbers match

❌ **Tests Fail**: Differences between actual and expected

- Missing alerts: Query didn't find expected patterns
- Extra alerts: Query found unexpected patterns
- Position mismatch: Line/column numbers don't match

### Step 8: Iterate Until Tests Pass

If tests fail, analyze the differences:

1. **Review actual query output**: Check what the query actually found
2. **Compare with expected results**: Identify discrepancies
3. **Update query or expected file**:
   - If query is wrong: Fix the query logic
   - If expected is wrong: Update `.expected` file
4. **Re-run tests**: Use `codeql_test_run` again
5. **Repeat until all tests pass**

#### Accepting New Results (Use Carefully)

If the actual results are correct and you want to update the baseline:

```json
{
  "testPath": "<query-pack>/test/{QueryName}",
  "searchPath": ["<query-pack>"]
}
```

Use `codeql_test_accept` tool, but **only** after verifying the results are correct.

### Step 9: Add More Test Cases

Expand test coverage by adding more test files:

1. Create `Example2.swift` with additional scenarios
2. Update `{QueryName}.expected` with new expected results
3. Re-extract test database with `codeql_test_extract`
4. Run tests again with `codeql_test_run`

## Swift-Specific Best Practices

### 1. Test Swift Language Features

- **Optionals**: Optional chaining, nil coalescing, forced unwrapping
- **Closures**: Trailing closures, escaping/non-escaping, capture lists
- **Generics**: Generic functions, type constraints, associated types
- **Concurrency**: async/await, Task, actors, structured concurrency
- **Property Wrappers**: @State, @Binding, @Published, custom wrappers
- **Result Builders**: @ViewBuilder, @resultBuilder
- **Macros**: Swift macros (5.9+)

### 2. Test iOS/macOS Framework Patterns

**Security:**

- Keychain access patterns
- Cryptographic operations (CryptoKit, CommonCrypto)
- Certificate validation
- Biometric authentication (LocalAuthentication)

**Networking:**

- URLSession with insecure configurations
- Alamofire usage patterns
- TLS/SSL certificate pinning
- WebSocket connections

**Data Storage:**

- UserDefaults for sensitive data (bad practice)
- Core Data configurations
- Realm Swift patterns
- File system operations

**Web Views:**

- WKWebView JavaScript evaluation
- URL scheme handling
- Deep link processing

### 3. Test Data Flow

```swift
func source() -> String {
    return getUserInput()  // Source
}

func intermediate(data: String) -> String {
    return data.uppercased()  // Pass-through
}

func sink(data: String) {
    eval(data)  // Sink - should detect tainted flow
}

// Flow: source -> intermediate -> sink
let input = source()
let processed = intermediate(data: input)
sink(data: processed)
```

### 4. Test Security Patterns

- **SQL Injection**: String interpolation in database queries
- **Predicate Injection**: NSPredicate with user input
- **Command Injection**: Process() with untrusted arguments
- **Path Traversal**: URL/file path manipulation
- **Insecure Storage**: Cleartext passwords in UserDefaults
- **Weak Cryptography**: MD5/SHA1 for sensitive data, ECB mode
- **Hardcoded Secrets**: API keys, passwords in source code

## Swift Framework-Specific Test Cases

### Foundation

```swift
import Foundation

// Test NSKeyedUnarchiver (unsafe)
func unsafeUnarchive(data: Data) -> Any? {
    return NSKeyedUnarchiver.unarchiveObject(with: data)  // Unsafe
}

// Test secure coding
func safeUnarchive(data: Data) throws -> SecureClass? {
    let unarchiver = try NSKeyedUnarchiver(forReadingFrom: data)
    unarchiver.requiresSecureCoding = true
    return unarchiver.decodeObject(of: SecureClass.self, forKey: "root")
}
```

### CryptoKit

```swift
import CryptoKit

// Test weak hashing (should detect)
func weakHash(data: Data) -> String {
    let hash = Insecure.MD5.hash(data: data)
    return hash.description
}

// Test secure hashing (should NOT detect)
func secureHash(data: Data) -> String {
    let hash = SHA256.hash(data: data)
    return hash.description
}
```

### URLSession

```swift
import Foundation

// Test insecure TLS (should detect)
class InsecureDelegate: NSObject, URLSessionDelegate {
    func urlSession(_ session: URLSession,
                    didReceive challenge: URLAuthenticationChallenge,
                    completionHandler: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void) {
        // Always trust - insecure!
        completionHandler(.useCredential, URLCredential(trust: challenge.protectionSpace.serverTrust!))
    }
}
```

## MCP Tools Reference

### Test Creation and Validation

- **`codeql_test_extract`**: Extract test databases from Swift source code
- **`codeql_test_run`**: Run query tests and compare with expected results
- **`codeql_test_accept`**: Accept actual results as new baseline (use with caution)

### Query Development

- **`codeql_query_compile`**: Compile CodeQL queries and check for syntax errors
- **`codeql_query_format`**: Format CodeQL query files
- **`codeql_query_run`**: Run queries against test databases

### Result Analysis

- **`codeql_bqrs_decode`**: Decode binary query results to human-readable text
- **`codeql_bqrs_interpret`**: Interpret results in various formats (SARIF, CSV, graph)
- **`codeql_bqrs_info`**: Get metadata about query results

### Pack Management

- **`codeql_pack_install`**: Install query pack dependencies before testing

## Common Swift Testing Pitfalls

❌ **Don't:**

- Forget that Swift extraction requires macOS
- Write tests with syntax errors
- Mix Swift versions (e.g., async/await in Swift 4 target)
- Ignore iOS framework-specific patterns
- Skip testing optionals and error handling
- Forget to test both sync and async patterns
- Use unavailable APIs for target Swift version

✅ **Do:**

- Run tests on macOS with Xcode installed
- Write valid, compilable Swift code
- Include comments explaining each test case
- Test both positive and negative cases
- Cover edge cases and boundary conditions
- Use realistic iOS/macOS patterns from real applications
- Test relevant framework usage (Foundation, UIKit, CryptoKit)
- Include async/await tests for concurrency queries
- Test SwiftUI patterns when relevant
- Follow Swift API design guidelines for readability

## Quality Checklist

Before considering your Swift tests complete:

- [ ] Test directory created with correct naming
- [ ] `.qlref` file correctly references query
- [ ] `Example1.swift` includes comprehensive test cases
- [ ] Test code is valid Swift with no syntax errors
- [ ] All Swift features used by query are tested
- [ ] Framework-specific patterns tested (if applicable)
- [ ] Positive cases (should detect) are included
- [ ] Negative cases (should not detect) are included
- [ ] Edge cases are covered
- [ ] `.expected` file has correct format with proper columns
- [ ] Line and column numbers in `.expected` are accurate
- [ ] Test database extracted successfully with `codeql_test_extract`
- [ ] Tests run successfully with `codeql_test_run`
- [ ] All tests pass (actual matches expected)
- [ ] Additional test files added if needed (Example2.swift, etc.)
- [ ] Tests verified on macOS environment

## Example: Complete Swift Test Structure

### Query: FindInsecureTLS

Detects insecure TLS configuration in Swift code.

#### Directory Structure

```bash
server/ql/swift/tools/test/FindInsecureTLS/
├── FindInsecureTLS.qlref
├── Example1.swift
├── FindInsecureTLS.expected
└── FindInsecureTLS.testproj/  (auto-generated)
```

#### FindInsecureTLS.qlref

```bash
FindInsecureTLS/FindInsecureTLS.ql
```

#### Example1.swift

```swift
import Foundation

// Test case 1: Insecure TLS delegate (should detect)
class InsecureSessionDelegate: NSObject, URLSessionDelegate {
    func urlSession(_ session: URLSession,
                    didReceive challenge: URLAuthenticationChallenge,
                    completionHandler: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void) {
        // Always trust any certificate - insecure!
        let trust = challenge.protectionSpace.serverTrust!
        completionHandler(.useCredential, URLCredential(trust: trust))
    }
}

// Test case 2: Secure TLS handling (should NOT detect)
class SecureSessionDelegate: NSObject, URLSessionDelegate {
    func urlSession(_ session: URLSession,
                    didReceive challenge: URLAuthenticationChallenge,
                    completionHandler: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void) {
        // Proper certificate validation
        guard let trust = challenge.protectionSpace.serverTrust else {
            completionHandler(.cancelAuthenticationChallenge, nil)
            return
        }

        var error: CFError?
        let isValid = SecTrustEvaluateWithError(trust, &error)

        if isValid {
            completionHandler(.useCredential, URLCredential(trust: trust))
        } else {
            completionHandler(.cancelAuthenticationChallenge, nil)
        }
    }
}

// Test case 3: Allow arbitrary loads (should detect)
// Note: This would be in Info.plist, not Swift code
// Including as pattern reference

// Test case 4: Insecure protocol (should detect)
func createInsecureConnection() -> URLSession {
    let config = URLSessionConfiguration.default
    config.tlsMinimumSupportedProtocolVersion = .TLSv10  // Insecure
    return URLSession(configuration: config)
}

// Test case 5: Secure protocol (should NOT detect)
func createSecureConnection() -> URLSession {
    let config = URLSessionConfiguration.default
    config.tlsMinimumSupportedProtocolVersion = .TLSv12
    return URLSession(configuration: config)
}
```

#### FindInsecureTLS.expected

```text
| file           | line | col | endLine | endCol | message                                |
| Example1.swift | 10   | 9   | 10      | 73     | Insecure TLS: always trusts server     |
| Example1.swift | 42   | 5   | 42      | 56     | Insecure TLS: TLSv1.0 is deprecated    |
```

## Troubleshooting

### Test Extraction Fails

- Verify you're running on macOS with Xcode installed
- Check for Swift syntax errors in test files
- Ensure Swift version compatibility
- Verify framework imports are available
- Check that the CodeQL Swift extractor is properly installed

### Test Results Don't Match Expected

- Compare actual output with `.expected` file
- Verify line and column numbers are correct (1-indexed)
- Check message text matches exactly
- Review query logic for correctness
- Ensure AST node types match expectations

### Tests Pass Locally But Fail in CI

- Ensure CI runs on macOS runners (`macos-latest`)
- Check for Xcode version differences
- Verify all dependencies are available
- Review test database extraction settings
- Check Swift version compatibility

## Related Resources

- [Swift CodeQL Documentation](https://codeql.github.com/docs/codeql-language-guides/codeql-for-swift/) - Official Swift language guide
- [Basic Query for Swift Code](https://codeql.github.com/docs/codeql-language-guides/basic-query-for-swift-code/) - Tutorial for Swift queries
- [Analyzing Data Flow in Swift](https://codeql.github.com/docs/codeql-language-guides/analyzing-data-flow-in-swift/) - Data flow analysis guide
- [Swift Built-in Queries](https://docs.github.com/en/code-security/reference/code-scanning/codeql/codeql-queries/swift-built-in-queries) - Reference for built-in queries
- [Swift Standard Library Reference](https://codeql.github.com/codeql-standard-libraries/swift/) - Swift CodeQL library API
- [CodeQL TDD Generic Skill](../create-codeql-query-tdd-generic/SKILL.md) - General test-driven development workflow

## Success Criteria

Your Swift query unit tests are successful when:

1. ✅ Test structure follows conventions
2. ✅ Swift test code is valid and compilable
3. ✅ Test database extracts without errors (on macOS)
4. ✅ All tests pass consistently
5. ✅ Comprehensive coverage of Swift features
6. ✅ Framework-specific patterns tested (if applicable)
7. ✅ Both positive and negative cases included
8. ✅ Edge cases properly handled
9. ✅ Expected results accurately reflect query behavior
