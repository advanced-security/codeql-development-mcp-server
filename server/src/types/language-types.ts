/**
 * Type definitions and constants for language-specific resources
 */

// Language mappings to resource files
export interface LanguageResource {
  language: string;
  astFile?: string;
  securityFile?: string;
  additionalFiles?: Record<string, string>;
}

export const LANGUAGE_RESOURCES: LanguageResource[] = [
  {
    language: 'actions',
    astFile: 'ql/languages/actions/tools/dev/actions_ast.prompt.md'
  },
  {
    language: 'cpp',
    astFile: 'ql/languages/cpp/tools/dev/cpp_ast.prompt.md',
    securityFile: 'ql/languages/cpp/tools/dev/cpp_security_query_guide.prompt.md'
  },
  {
    language: 'csharp',
    astFile: 'ql/languages/csharp/tools/dev/csharp_ast.prompt.md',
    securityFile: 'ql/languages/csharp/tools/dev/csharp_security_query_guide.prompt.md'
  },
  {
    language: 'go',
    astFile: 'ql/languages/go/tools/dev/go_ast.prompt.md',
    securityFile: 'ql/languages/go/tools/dev/go_security_query_guide.prompt.md',
    additionalFiles: {
      'dataflow': 'ql/languages/go/tools/dev/go_dataflow.prompt.md',
      'library-modeling': 'ql/languages/go/tools/dev/go_library_modeling.prompt.md',
      'basic-queries': 'ql/languages/go/tools/dev/go_basic_queries.prompt.md'
    }
  },
  {
    language: 'java',
    astFile: 'ql/languages/java/tools/dev/java_ast.prompt.md'
  },
  {
    language: 'javascript',
    astFile: 'ql/languages/javascript/tools/dev/javascript_ast.prompt.md',
    securityFile: 'ql/languages/javascript/tools/dev/javascript_security_query_guide.prompt.md'
  },
  {
    language: 'python',
    astFile: 'ql/languages/python/tools/dev/python_ast.prompt.md',
    securityFile: 'ql/languages/python/tools/dev/python_security_query_guide.prompt.md'
  },
  {
    language: 'ql',
    astFile: 'ql/languages/ql/tools/dev/ql_ast.prompt.md'
  },
  {
    language: 'ruby',
    astFile: 'ql/languages/ruby/tools/dev/ruby_ast.prompt.md'
  }
];