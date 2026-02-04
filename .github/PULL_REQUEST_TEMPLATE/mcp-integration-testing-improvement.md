# Integration Testing Improvement PR: MCP Server Primitives

Use this template for PRs that implement an accepted issue created from: `.github/ISSUE_TEMPLATE/mcp-integration-testing-improvement.yml`.

Related Issue: <!-- e.g. #123 -->

⚠ **Scope Guard:** This PR must only modify files under `client/integration-tests/**` (and _exceptionally_ may adjust the issue / PR template if required). If other changes are needed (server code, tooling, resources, prompts), open a separate PR.

## Summary

Explain the integration test improvements. What primitive(s) (tool/resource/prompt) are covered? What gaps are now addressed?

## Primitive Metadata

- Primitive name(s):
- Type(s): Tool | Resource | Prompt | Combination
- Related resources or prompts (if any):

## Test Additions / Modifications

List each new or updated test file with a short description.

- `client/integration-tests/...` : rationale / what is validated

## Before vs After File States

If the issue provided BEFORE/AFTER examples, confirm they are now asserted. Provide any new or refined examples (keep concise):

Example format (remove if not needed):

```text
file: path/to/fileA.ext (before snippet referenced) -> after state now asserted
(optional concise excerpt)

file: path/to/fileB.ext unchanged (not asserted because no change expected)
```

## Assertions Added

Describe the kinds of assertions now present (choose all that apply):

- [ ] File content equality / diff assertions
- [ ] Presence / absence of generated files
- [ ] Prompt output shape / content
- [ ] Tool result validation (success, error handling)
- [ ] Resource retrieval correctness
- [ ] Idempotency (re-running does not introduce drift)
- [ ] Error path / negative case
- [ ] Performance (basic timing threshold)
- [ ] Other: <!-- describe -->

## Edge & Negative Cases

List any edge conditions or failure scenarios covered (or explicitly deferred).

## Non-Goals / Deferred Follow-ups

Clarify anything intentionally left out (open a tracking issue if needed).

## Local Verification

Outline how you verified the tests locally.

```bash
# Example (adjust if project uses a different script)
npm run test:integration --workspaces --filter client
```

If tests are flaky, explain mitigation or retry logic.

## Checklist

- [ ] Scope limited to `client/integration-tests/**`
- [ ] All new tests pass locally
- [ ] Does not introduce unrelated refactors
- [ ] Documentation/comments updated where helpful
- [ ] Re-ran tests to confirm deterministic results
- [ ] Added negative test (or documented why not applicable)
- [ ] Linked accepted issue in description
- [ ] Followed directory structure (`primitives/tools/<tool>/<test>/before|after`)
- [ ] Each file in `before` has matching file in `after`
- [ ] No binary or non-diffable files added
- [ ] Tests focus on a single primitive concern
- [ ] Ran `npm run lint:fix` and `npm run build-and-test` successfully
- [ ] Checked for accidental changes outside allowed path

## Screenshots / Logs (Optional)

Attach relevant excerpts (trimmed) if output validates behavior (e.g., diff summary, timing stats).

## Additional Notes

Anything else reviewers should know.

---

Maintainers: Reject or request split if scope exceeds integration test boundaries.
