# Customizing Library Models for Go

## Purpose

Customize data-flow/taint analysis for Go by modeling frameworks/libraries via data extensions (YAML) and model packs. This enables accurate flow tracking through third-party libraries not included in CodeQL databases.

## Data Extensions Overview

### Structure

Data extensions use YAML format to extend CodeQL's knowledge of library behavior:

```yaml
extensions:
  - addsTo:
      pack: codeql/go-all
      extensible: <extensible-predicate>
    data:
      - <tuple1>
      - <tuple2>
```

### Union Semantics

- Multiple YAML files are combined
- Rows are merged across files
- Duplicates are automatically removed
- Order of files doesn't matter

## Extensible Predicates for Go

### Source Models

**`sourceModel(package, type, subtypes, name, signature, ext, output, kind, provenance)`**

Define sources of untrusted data (e.g., user input):

- **package**: Go package path (e.g., "net/http")
- **type**: Type name ("" for package-level functions)
- **subtypes**: Include subtypes (true/false)
- **name**: Function/method name
- **signature**: Function signature ("" for any)
- **ext**: External library marker ("" for stdlib)
- **output**: Access path where taint emerges
- **kind**: Threat model category
- **provenance**: Origin marker (manual/ai-manual/etc.)

**Example**: HTTP request as source

```yaml
- ['net/http', 'Request', false, 'FormValue', '', '', 'ReturnValue', 'remote', 'manual']
```

### Sink Models

**`sinkModel(package, type, subtypes, name, signature, ext, input, kind, provenance)`**

Define dangerous operations (sinks):

- **input**: Access path where taint is dangerous

**Example**: Command execution sink

```yaml
- ['os/exec', '', false, 'Command', '', '', 'Argument[1]', 'command-injection', 'manual']
```

### Summary Models

**`summaryModel(package, type, subtypes, name, signature, ext, input, output, kind, provenance)`**

Define how data flows through functions when dependency code isn't in the database:

- **input**: Where data enters the function
- **output**: Where data exits the function

**Example**: String builder flow

```yaml
- ['strings', 'Builder', false, 'WriteString', '', '', 'Argument[0]', 'Receiver', 'taint', 'manual']
```

### Neutral Models

**`neutralModel(package, type, name, signature, kind, provenance)`**

Define low-impact flows to reduce over-taint/noise:

**Example**: Safe string operations

```yaml
- ['strings', '', 'ToUpper', '', 'value', 'manual']
```

## Access Paths

### Basic Access Paths

- **`Argument[i]`** - ith argument (0-indexed)
- **`ReturnValue`** - Function return value
- **`Receiver`** - Method receiver
- **`Qualifier`** - Object being called on

### Complex Access Paths

- **`Argument[i].Field["name"]`** - Field of argument
- **`Argument[i].ArrayElement`** - Array/slice elements
- **`ReturnValue.ArrayElement`** - Elements of returned array/slice
- **`Field["name"].ArrayElement`** - Elements of field array

### Examples

```yaml
# Array/slice element flow
- ['slices', '', false, 'Max', '', '', 'Argument[0].ArrayElement', 'ReturnValue', 'value', 'manual']

# Nested array flow
- [
    'slices',
    '',
    false,
    'Concat',
    '',
    '',
    'Argument[0].ArrayElement.ArrayElement',
    'ReturnValue.ArrayElement',
    'value',
    'manual'
  ]

# Struct field flow
- [
    'encoding/json',
    '',
    false,
    'Unmarshal',
    '',
    '',
    'Argument[0]',
    'Argument[1].Field[*]',
    'taint',
    'manual'
  ]
```

## Flow Kinds

### Value vs Taint

- **"value"**: Moves whole values (precise data flow)
- **"taint"**: Propagates taint only (influence tracking)

### Security Categories

Common `kind` values for threat modeling:

- **"remote"**: Remote user input
- **"command-injection"**: Command execution
- **"sql-injection"**: Database queries
- **"path-injection"**: File system access
- **"code-injection"**: Code execution
- **"xss"**: Cross-site scripting

## Complete Examples

### HTTP Framework Modeling

```yaml
extensions:
  - addsTo:
      pack: codeql/go-all
      extensible: sourceModel
    data:
      # HTTP request sources
      - ['net/http', 'Request', false, 'FormValue', '', '', 'ReturnValue', 'remote', 'manual']
      - ['net/http', 'Request', false, 'PostFormValue', '', '', 'ReturnValue', 'remote', 'manual']
      - ['net/http', 'Request', false, 'Header', '', '', 'ReturnValue', 'remote', 'manual']
      - ['net/http', 'Request', false, 'URL', '', '', 'ReturnValue.Field[*]', 'remote', 'manual']

  - addsTo:
      pack: codeql/go-all
      extensible: sinkModel
    data:
      # HTTP response sinks
      - ['net/http', 'ResponseWriter', false, 'Write', '', '', 'Argument[0]', 'xss', 'manual']
      - [
          'net/http',
          'ResponseWriter',
          false,
          'Header',
          '',
          '',
          'ReturnValue',
          'response-header',
          'manual'
        ]
```

### Database Library Modeling

```yaml
extensions:
  - addsTo:
      pack: codeql/go-all
      extensible: summaryModel
    data:
      # Database query builders
      - [
          'github.com/jmoiron/sqlx',
          'DB',
          false,
          'Query',
          '',
          '',
          'Argument[0]',
          'ReturnValue.Field[*]',
          'taint',
          'manual'
        ]
      - [
          'github.com/jmoiron/sqlx',
          'DB',
          false,
          'Select',
          '',
          '',
          'Argument[1]',
          'Argument[0].Field[*]',
          'taint',
          'manual'
        ]

  - addsTo:
      pack: codeql/go-all
      extensible: sinkModel
    data:
      # SQL injection sinks
      - [
          'github.com/jmoiron/sqlx',
          'DB',
          false,
          'Query',
          '',
          '',
          'Argument[0]',
          'sql-injection',
          'manual'
        ]
      - [
          'github.com/jmoiron/sqlx',
          'DB',
          false,
          'Exec',
          '',
          '',
          'Argument[0]',
          'sql-injection',
          'manual'
        ]
```

### JSON Processing

```yaml
extensions:
  - addsTo:
      pack: codeql/go-all
      extensible: summaryModel
    data:
      # JSON unmarshaling
      - [
          'encoding/json',
          '',
          false,
          'Unmarshal',
          '',
          '',
          'Argument[0]',
          'Argument[1].Field[*]',
          'taint',
          'manual'
        ]
      - [
          'encoding/json',
          '',
          false,
          'Marshal',
          '',
          '',
          'Argument[0].Field[*]',
          'ReturnValue',
          'taint',
          'manual'
        ]

  - addsTo:
      pack: codeql/go-all
      extensible: sourceModel
    data:
      # JSON from HTTP as source
      - [
          'encoding/json',
          'Decoder',
          false,
          'Decode',
          '',
          '',
          'Argument[0].Field[*]',
          'remote',
          'manual'
        ]
```

### String Processing Libraries

```yaml
extensions:
  - addsTo:
      pack: codeql/go-all
      extensible: summaryModel
    data:
      # String builder patterns
      - [
          'strings',
          'Builder',
          false,
          'WriteString',
          '',
          '',
          'Argument[0]',
          'Receiver',
          'taint',
          'manual'
        ]
      - [
          'strings',
          'Builder',
          false,
          'String',
          '',
          '',
          'Receiver',
          'ReturnValue',
          'taint',
          'manual'
        ]

      # Template processing
      - [
          'text/template',
          'Template',
          false,
          'Execute',
          '',
          '',
          'Argument[1].Field[*]',
          'Argument[0]',
          'taint',
          'manual'
        ]
      - [
          'html/template',
          'Template',
          false,
          'Execute',
          '',
          '',
          'Argument[1].Field[*]',
          'Argument[0]',
          'taint',
          'manual'
        ]
```

## Model Packs

### Pack Structure

Create a CodeQL model pack to group and distribute YAML files:

```yaml
# codeql-pack.yml
name: my-org/go-security-models
version: 1.0.0
dependencies:
  codeql/go-all: '*'
dataExtensions: '*.yml'
```

### Directory Structure

```
my-go-models/
├── codeql-pack.yml
├── http-frameworks.yml
├── database-orms.yml
└── json-libraries.yml
```

### Publishing to GitHub Container Registry

```bash
codeql pack publish
```

### Consuming Model Packs

```yaml
# In consumer's codeql-pack.yml
dependencies:
  my-org/go-security-models: '^1.0.0'
```

Or via CLI:

```bash
codeql database analyze --packs my-org/go-security-models
```

## Advanced Patterns

### Framework-specific Source Patterns

```yaml
# Gin framework
- ['github.com/gin-gonic/gin', 'Context', false, 'Param', '', '', 'ReturnValue', 'remote', 'manual']
- ['github.com/gin-gonic/gin', 'Context', false, 'Query', '', '', 'ReturnValue', 'remote', 'manual']
- [
    'github.com/gin-gonic/gin',
    'Context',
    false,
    'PostForm',
    '',
    '',
    'ReturnValue',
    'remote',
    'manual'
  ]

# Echo framework
- [
    'github.com/labstack/echo/v4',
    'Context',
    false,
    'Param',
    '',
    '',
    'ReturnValue',
    'remote',
    'manual'
  ]
- [
    'github.com/labstack/echo/v4',
    'Context',
    false,
    'QueryParam',
    '',
    '',
    'ReturnValue',
    'remote',
    'manual'
  ]
- [
    'github.com/labstack/echo/v4',
    'Context',
    false,
    'FormValue',
    '',
    '',
    'ReturnValue',
    'remote',
    'manual'
  ]
```

### ORM and Query Builder Models

```yaml
# GORM models
- ['gorm.io/gorm', 'DB', false, 'Raw', '', '', 'Argument[0]', 'ReturnValue', 'taint', 'manual']
- ['gorm.io/gorm', 'DB', false, 'Exec', '', '', 'Argument[0]', '', 'sql-injection', 'manual']

# Squirrel query builder
- [
    'github.com/Masterminds/squirrel',
    'SelectBuilder',
    false,
    'Where',
    '',
    '',
    'Argument[0]',
    'Receiver',
    'taint',
    'manual'
  ]
- [
    'github.com/Masterminds/squirrel',
    'SelectBuilder',
    false,
    'ToSql',
    '',
    '',
    'Receiver',
    'ReturnValue',
    'taint',
    'manual'
  ]
```

### Utility Library Flows

```yaml
# Viper configuration
- ['github.com/spf13/viper', '', false, 'GetString', '', '', '', 'ReturnValue', 'config', 'manual']
- ['github.com/spf13/viper', '', false, 'Get', '', '', '', 'ReturnValue', 'config', 'manual']

# Cobra CLI arguments
- [
    'github.com/spf13/cobra',
    'Command',
    false,
    'Flags',
    '',
    '',
    '',
    'ReturnValue',
    'cli-input',
    'manual'
  ]
```

## Workflow and Best Practices

### Development Process

1. **Identify Gap**: Find library calls that break data flow paths
2. **Analyze Library**: Understand how data flows through the library
3. **Create Models**: Start with summaries for common flows
4. **Add Sources/Sinks**: Define security-relevant entry/exit points
5. **Test and Iterate**: Validate with path queries and unit tests

### Model Quality Guidelines

- **Narrow Matching**: Use `hasQualifiedName` for precision
- **Specific Access Paths**: Be precise about which fields/elements flow
- **Appropriate Kinds**: Match `kind` to actual threat model
- **Documentation**: Comment complex access paths
- **Testing**: Validate with realistic code examples

### Performance Considerations

- Avoid overly broad models that create too many paths
- Use `neutralModel` to reduce noise from safe operations
- Consider performance impact of complex access paths
- Test query performance with models enabled

### Integration Testing

```ql
// Test model coverage
from DataFlow::Node source, DataFlow::Node sink
where MyFlow::flow(source, sink) and
      source.getFile().getBaseName() = "test_library.go"
select source, sink

// Verify specific library modeling
from CallExpr call
where call.getTarget().hasQualifiedName("my/library", "MyFunction")
select call, "Library call found"
```

This comprehensive approach to library modeling enables accurate security analysis even when third-party library source code isn't available in the CodeQL database.
