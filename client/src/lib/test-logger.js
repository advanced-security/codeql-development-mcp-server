/**
 * Test logger and reporter for MCP client integration tests
 */

/**
 * Test logger class
 */
export class TestLogger {
  constructor() {
    this.testResults = {
      passed: 0,
      failed: 0,
      errors: []
    };
  }

  /**
   * Get test results
   */
  getResults() {
    return this.testResults;
  }

  /**
   * Check if all tests passed
   */
  isSuccess() {
    return this.testResults.failed === 0 && this.testResults.passed > 0;
  }

  /**
   * Log a message with timestamp
   */
  log(message, level = "INFO") {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${level}] ${message}`);
  }

  /**
   * Log a test result
   */
  logTest(testName, passed, error = null) {
    if (passed) {
      this.testResults.passed++;
      this.log(`✅ ${testName}`, "TEST");
    } else {
      this.testResults.failed++;
      this.testResults.errors.push({ test: testName, error: error?.message || "Unknown error" });
      this.log(`❌ ${testName}: ${error?.message || "Failed"}`, "TEST");
    }
  }

  /**
   * Print test summary
   */
  printTestSummary() {
    this.log("=".repeat(50));
    this.log("TEST SUMMARY");
    this.log("=".repeat(50));
    this.log(`✅ Passed: ${this.testResults.passed}`);
    this.log(`❌ Failed: ${this.testResults.failed}`);
    this.log(`📊 Total:  ${this.testResults.passed + this.testResults.failed}`);

    if (this.testResults.errors.length > 0) {
      this.log("\nFAILED TESTS:");
      for (const error of this.testResults.errors) {
        this.log(`  - ${error.test}: ${error.error}`);
      }
    }

    const success = this.testResults.failed === 0 && this.testResults.passed > 0;
    this.log(`\n🎯 Overall: ${success ? "SUCCESS" : "FAILURE"}`);
  }
}
