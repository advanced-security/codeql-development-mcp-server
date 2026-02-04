# CodeQL Workshop Completion

## Workshop Information

**Workshop Name:** <!-- e.g., dataflow-analysis-cpp -->  
**Target Language:** <!-- e.g., C++, Java, Python -->  
**Source Issue:** <!-- Link to the workshop request issue, e.g., #123 -->

## Workshop Overview

<!-- Brief description of what this workshop teaches -->

This workshop teaches developers how to build a CodeQL query that:

- <!-- Key learning objective 1 -->
- <!-- Key learning objective 2 -->
- <!-- Key learning objective 3 -->

## Workshop Structure

**Number of Stages:** <!-- e.g., 5 -->

**Stage Progression:**

1. **Stage 1:** <!-- Brief description, e.g., "Find all pointer dereference expressions" -->
2. **Stage 2:** <!-- Brief description -->
3. **Stage 3:** <!-- Brief description -->
4. **Stage 4:** <!-- Brief description -->
5. **Stage 5:** <!-- Brief description -->

## Validation Results

### Solution Tests

- [ ] All solution queries compile without errors
- [ ] All solution tests pass (100% success rate)
- [ ] Solution for final stage matches production query behavior

### Exercise Quality

- [ ] Exercise queries have appropriate scaffolding
- [ ] Exercises are not too easy (giving away solutions)
- [ ] Exercises are not too hard (students can complete them)
- [ ] Hint comments guide students effectively

### Test Coverage

- [ ] Test code includes positive cases (should detect)
- [ ] Test code includes negative cases (should NOT detect)
- [ ] Test code includes edge cases
- [ ] Expected results progress logically from stage to stage

### Documentation

- [ ] README.md includes clear setup instructions
- [ ] README.md explains workshop structure
- [ ] README.md provides guidance for each stage
- [ ] build-databases.sh successfully creates test databases
- [ ] codeql-workspace.yml correctly configured

### Generated Artifacts

- [ ] AST/CFG visualizations created where helpful
- [ ] All required directories present
- [ ] qlpack.yml files correctly configured
- [ ] Test databases created successfully

## Workshop Contents

**Location:** `<base-directory>/<workshop-name>/`

**Key Files:**

```sh
├── README.md                    # Workshop guide and instructions
├── build-databases.sh           # Database creation script
├── codeql-workspace.yml         # Workspace configuration
├── exercises/                   # Student exercise queries
│   ├── qlpack.yml
│   ├── Exercise1.ql
│   └── ...
├── exercises-tests/             # Tests for exercises
│   ├── Exercise1/
│   └── ...
├── solutions/                   # Complete solution queries
│   ├── qlpack.yml
│   ├── Exercise1.ql
│   └── ...
├── solutions-tests/             # Tests for solutions
│   ├── Exercise1/
│   └── ...
├── graphs/                      # AST/CFG visualizations
│   └── ...
└── tests-common/                # Shared test code
    ├── test.{ext}
    └── qlpack.yml
```

## Testing Instructions

To validate this workshop:

1. **Clone the workshop:**

   ```bash
   cd <base-directory>/<workshop-name>
   ```

2. **Build test databases:**

   ```bash
   bash build-databases.sh
   ```

3. **Test all solutions:**

   ```bash
   codeql test run solutions-tests/ --search-path=solutions/
   ```

4. **Verify 100% pass rate:**
   - All tests should pass
   - No unexpected failures

## Target Audience

<!-- Describe who should take this workshop -->

**Prerequisites:**

- <!-- e.g., Basic C++ programming knowledge -->
- <!-- e.g., Familiarity with security concepts -->
- <!-- Optional: Previous CodeQL experience -->

**Learning Outcomes:**
After completing this workshop, developers will be able to:

- <!-- e.g., Write CodeQL queries for pointer analysis -->
- <!-- e.g., Use dataflow analysis to track values -->
- <!-- e.g., Create comprehensive test cases for queries -->

## Decomposition Strategy

<!-- Explain how the query was broken down into stages -->

This workshop uses the **<!-- e.g., Syntactic to Semantic -->** decomposition strategy:

- **Early stages** focus on <!-- e.g., identifying AST patterns -->
- **Middle stages** introduce <!-- e.g., control flow analysis -->
- **Later stages** add <!-- e.g., dataflow tracking and precision refinement -->

## Known Limitations

<!-- Any known issues or limitations with the workshop -->

- <!-- e.g., Stage 3 may be challenging for developers new to dataflow -->
- <!-- e.g., Some advanced C++ features not covered in test cases -->
- <!-- Optional: Future improvements planned -->

## Feedback and Improvements

<!-- How users can provide feedback -->

After using this workshop, please provide feedback on:

- Difficulty level of each stage
- Clarity of instructions and hints
- Additional concepts that should be covered
- Any bugs or issues encountered

## Related Resources

<!-- Links to relevant documentation or related workshops -->

- [CodeQL Documentation](https://codeql.github.com/docs/)
- [<!-- Language -->-specific CodeQL Libraries](https://codeql.github.com/codeql-standard-libraries/)
- <!-- Related workshops if any -->

---

**Workshop created by:** @mcp-enabled-ql-workshop-developer  
**Review requested:** @<!-- reviewer username -->
