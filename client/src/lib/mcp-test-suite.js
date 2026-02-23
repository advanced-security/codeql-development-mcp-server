/**
 * MCP connectivity and basic functionality test suite
 */

/**
 * MCP test suite class
 */
export class MCPTestSuite {
  constructor(client, logger) {
    this.client = client;
    this.logger = logger;
  }

  /**
   * Run all basic MCP tests
   */
  async runAllTests() {
    await this.testCapabilities();
    await this.testListTools();
    await this.testCallTool();
    await this.testListResources();
    await this.testReadResource();
    await this.testListPrompts();
    await this.testGetPrompt();
  }

  /**
   * Test calling a simple tool
   */
  async testCallTool() {
    try {
      this.logger.log("Testing tool execution...");

      // Try to call a simple resolve languages tool
      const result = await this.client.callTool(
        { name: "codeql_resolve_languages", arguments: {} },
        undefined,
        { timeout: 300000, resetTimeoutOnProgress: true }
      );

      this.logger.log(`Tool result: ${JSON.stringify(result, null, 2)}`);

      const hasContent = result.content && result.content.length > 0;
      this.logger.logTest("Call Tool (codeql_resolve_languages)", hasContent);

      return hasContent;
    } catch (error) {
      this.logger.logTest("Call Tool (codeql_resolve_languages)", false, error);
      return false;
    }
  }

  /**
   * Test server capabilities
   */
  async testCapabilities() {
    try {
      this.logger.log("Testing server capabilities...");

      const capabilities = this.client.getServerCapabilities();

      // Check for expected capabilities
      const expectedCapabilities = ["tools", "resources", "prompts"];
      let allPresent = true;

      for (const capability of expectedCapabilities) {
        if (!capabilities[capability]) {
          this.logger.log(`Missing capability: ${capability}`, "WARN");
          allPresent = false;
        }
      }

      this.logger.log(`Server Capabilities: ${JSON.stringify(capabilities, null, 2)}`);
      this.logger.logTest("Server Capabilities", allPresent);

      return allPresent;
    } catch (error) {
      this.logger.logTest("Server Capabilities", false, error);
      return false;
    }
  }

  /**
   * Test getting a prompt
   */
  async testGetPrompt() {
    try {
      this.logger.log("Testing prompt retrieval...");

      // First get list of prompts
      const response = await this.client.listPrompts();
      const prompts = response.prompts || [];

      if (prompts.length === 0) {
        throw new Error("No prompts available to test");
      }

      // Try to get the first prompt
      const prompt = prompts[0];
      const args = {};

      // Add any required arguments with default values
      if (prompt.arguments) {
        for (const arg of prompt.arguments) {
          if (arg.required) {
            // Provide valid default values based on the argument name and schema
            if (arg.name === "queryType") {
              args[arg.name] = "security";
            } else if (arg.name === "language") {
              args[arg.name] = "javascript";
            } else {
              args[arg.name] = "test-value";
            }
          }
        }
      }

      const result = await this.client.getPrompt({
        name: prompt.name,
        arguments: args
      });

      this.logger.log(`Prompt has ${result.messages?.length || 0} messages`);

      const hasMessages = result.messages && result.messages.length > 0;
      this.logger.logTest("Get Prompt", hasMessages);

      return hasMessages;
    } catch (error) {
      this.logger.logTest("Get Prompt", false, error);
      return false;
    }
  }

  /**
   * Test listing prompts
   */
  async testListPrompts() {
    try {
      this.logger.log("Testing prompt listing...");

      const response = await this.client.listPrompts();
      const prompts = response.prompts || [];

      this.logger.log(`Found ${prompts.length} prompts`);
      for (const prompt of prompts) {
        // Log all prompts found
        this.logger.log(`  - ${prompt.name}: ${prompt.description}`);
      }

      this.logger.logTest("List Prompts", prompts.length > 0);
      return prompts.length > 0;
    } catch (error) {
      this.logger.logTest("List Prompts", false, error);
      return false;
    }
  }

  /**
   * Test listing resources
   */
  async testListResources() {
    try {
      this.logger.log("Testing resource listing...");

      const response = await this.client.listResources();
      const resources = response.resources || [];

      this.logger.log(`Found ${resources.length} resources`);
      for (const resource of resources) {
        // Log all resources found
        this.logger.log(`  - ${resource.uri}: ${resource.name || "No name"}`);
      }

      this.logger.logTest("List Resources", resources.length > 0);
      return resources.length > 0;
    } catch (error) {
      this.logger.logTest("List Resources", false, error);
      return false;
    }
  }

  /**
   * Test listing tools
   */
  async testListTools() {
    try {
      this.logger.log("Testing tool listing...");

      const response = await this.client.listTools();
      const tools = response.tools || [];

      this.logger.log(`Found ${tools.length} tools`);
      for (const tool of tools) {
        // Log all tools found
        this.logger.log(`  - ${tool.name}: ${tool.description}`);
      }

      // Check for some expected CodeQL tools
      const expectedTools = ["codeql_resolve_languages", "codeql_database_create"];
      const foundTools = tools.map((t) => t.name);
      const hasExpectedTools = expectedTools.some((tool) => foundTools.includes(tool));

      this.logger.logTest("List Tools", tools.length > 0 && hasExpectedTools);
      return tools.length > 0;
    } catch (error) {
      this.logger.logTest("List Tools", false, error);
      return false;
    }
  }

  /**
   * Test reading a resource
   */
  async testReadResource() {
    try {
      this.logger.log("Testing resource reading...");

      // First get list of resources
      const response = await this.client.listResources();
      const resources = response.resources || [];

      if (resources.length === 0) {
        throw new Error("No resources available to test");
      }

      // Try to read the first resource
      const resource = resources[0];
      const result = await this.client.readResource({
        uri: resource.uri
      });

      this.logger.log(`Resource content length: ${result.contents?.[0]?.text?.length || 0} chars`);

      const hasContent = result.contents && result.contents.length > 0;
      this.logger.logTest("Read Resource", hasContent);

      return hasContent;
    } catch (error) {
      this.logger.logTest("Read Resource", false, error);
      return false;
    }
  }
}
