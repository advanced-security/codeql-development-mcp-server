## CodeQL's core AST classes for `actions` language

Based on analysis of CodeQL's Actions AST test results from local test files, here are the core AST classes for GitHub Actions analysis:

### Top-Level Action and Workflow Structures

**Action Files (action.yml):**

- `CompositeActionImpl` - Root composite action declaration (e.g., `name: "Hello World"`)
- Action metadata including name, description, and runtime configuration

**Workflow Files (.github/workflows/\*.yml):**

- `WorkflowImpl` - Root workflow declaration (e.g., `name: Reusable workflow example`)
- Complete workflow structure with events, jobs, and steps

### Event Handling

**Event Triggers:**

- `OnImpl` - Event trigger definitions (e.g., `workflow_call:`)
- `EventImpl` - Specific event types (e.g., `workflow_call`)
- Event configuration with inputs, outputs, and secrets

### Input and Output Management

**Input Structures:**

- `InputsImpl` - Input containers for actions and workflows
- `InputImpl` - Individual input definitions (e.g., `who-to-greet`, `config-path`)
- Input properties: description, required, type, default values

**Output Structures:**

- `OutputsImpl` - Output containers for workflows and jobs
- Output value expressions and job output references

### Job Management

**Job Structure:**

- `JobImpl` - Job definitions (e.g., `Job: job1`)
- Job configuration including runner, outputs, and steps
- Job-level environment and dependency management

**Job Execution Environment:**

- Runner specifications (e.g., `ubuntu-latest`)
- Job outputs and step output references

### Step Execution

**Step Types:**

- `StepImpl` - Generic step containers
- `Run Step` - Steps with shell commands and scripts
- `Uses Step` - Steps using external actions

**Step Components:**

- Step identification and naming
- Shell command execution
- External action usage (e.g., `tj-actions/changed-files@v40`)

### Environment and Variable Management

**Environment Variables:**

- `EnvImpl` - Environment variable definitions
- Environment variable scoping (step-level, job-level)
- Variable interpolation and expression evaluation

### Expression System

**Expression Handling:**

- `ExpressionImpl` - GitHub Actions expressions (e.g., `inputs.who-to-greet`, `jobs.job1.outputs.job-output1`)
- Expression contexts: inputs, steps, jobs, github, env
- Complex expression evaluation and context access

**Expression Contexts:**

- Input references: `inputs.config-path`, `inputs.who-to-greet`
- Step output references: `steps.step1.outputs.step-output`, `steps.step2.outputs.all_changed_files`
- Job output references: `jobs.job1.outputs.job-output1`

### Value and Data Types

**Scalar Values:**

- `ScalarValueImpl` - String literals, booleans, and scalar data
- Configuration values (e.g., `"Hello World"`, `"composite"`, `true`)
- Command strings and action references

**Value Types:**

- String values for names, descriptions, commands
- Boolean values for required flags and conditions
- Action references and version specifications

### Action Runtime Configuration

**Composite Actions:**

- `using: "composite"` runtime specification
- Step sequence execution within composite actions
- Input parameter passing and environment setup

**Action Metadata:**

- Action names and descriptions
- Input/output specifications
- Runtime environment configuration

### Shell and Command Execution

**Command Execution:**

- Shell command strings (e.g., `echo "Hello $INPUT_WHO_TO_GREET."`)
- Shell specification (e.g., `bash`)
- Multi-line command support

**Environment Integration:**

- Environment variable usage in commands
- Variable substitution and expansion
- Input-to-environment variable mapping

### External Action Integration

**Action Usage:**

- External action references (e.g., `tj-actions/changed-files@v40`)
- Version pinning and action marketplace integration
- Action parameter passing and configuration

### Workflow Reusability

**Reusable Workflows:**

- Workflow call triggers and parameters
- Input/output parameter definitions
- Secret management and passing

**Workflow Composition:**

- Job dependencies and sequencing
- Output propagation between jobs
- Workflow-level input and output management

### Security and Secrets

**Secret Management:**

- Secret declarations and requirements
- Secret passing in reusable workflows
- Secure environment variable handling

### Example AST Hierarchy

Based on CodeQL's GitHub Actions analysis capabilities:

```
WorkflowImpl (root workflow)
├── OnImpl (event triggers)
│   └── EventImpl (specific events like workflow_call)
├── InputsImpl (workflow inputs)
│   └── InputImpl (individual inputs)
├── OutputsImpl (workflow outputs)
├── JobImpl (job definitions)
│   ├── OutputsImpl (job outputs)
│   └── StepImpl (job steps)
│       ├── EnvImpl (step environment)
│       └── ScalarValueImpl (step commands/actions)
└── ScalarValueImpl (scalar values throughout)

CompositeActionImpl (root action)
├── InputsImpl (action inputs)
├── RunsImpl (execution configuration)
└── StepImpl (action steps)
    ├── EnvImpl (step environment)
    └── ScalarValueImpl (commands and values)

ExpressionImpl (expressions like ${{ inputs.name }})
└── Context access (inputs, steps, jobs, github, env)
```

## Expected test results for local `PrintAst.ql` query

This repo contains a variant of the open-source `PrintAst.ql` query for `actions` language, with modifications for local testing:

- [local actions PrintAst.ql query](../src/PrintAST/PrintAST.ql)
- [local actions PrintAst.expected results](../test/PrintAST/PrintAST.expected)
