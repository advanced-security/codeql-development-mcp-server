/**
 * Type definitions and constants for language-specific resources.
 *
 * Content is imported statically at build time via esbuild's `.md: 'text'`
 * loader, following the same pattern as `server/src/lib/resources.ts`.
 */

import actionsAst from '../resources/languages/actions_ast.md';
import cppAst from '../resources/languages/cpp_ast.md';
import cppLibraryModeling from '../resources/languages/cpp_library_modeling.md';
import cppSecurity from '../resources/languages/cpp_security_query_guide.md';
import csharpAst from '../resources/languages/csharp_ast.md';
import csharpLibraryModeling from '../resources/languages/csharp_library_modeling.md';
import csharpSecurity from '../resources/languages/csharp_security_query_guide.md';
import goAst from '../resources/languages/go_ast.md';
import goBasicQueries from '../resources/languages/go_basic_queries.md';
import goDataflow from '../resources/languages/go_dataflow.md';
import goLibraryModeling from '../resources/languages/go_library_modeling.md';
import goSecurity from '../resources/languages/go_security_query_guide.md';
import javaAst from '../resources/languages/java_ast.md';
import javaLibraryModeling from '../resources/languages/java_library_modeling.md';
import javascriptAst from '../resources/languages/javascript_ast.md';
import javascriptLibraryModeling from '../resources/languages/javascript_library_modeling.md';
import javascriptSecurity from '../resources/languages/javascript_security_query_guide.md';
import pythonAst from '../resources/languages/python_ast.md';
import pythonLibraryModeling from '../resources/languages/python_library_modeling.md';
import pythonSecurity from '../resources/languages/python_security_query_guide.md';
import rubyAst from '../resources/languages/ruby_ast.md';
import rubyLibraryModeling from '../resources/languages/ruby_library_modeling.md';
import rustAst from '../resources/languages/rust_ast.md';

export interface LanguageResource {
  language: string;
  astContent?: string;
  securityContent?: string;
  additionalResources?: Record<string, string>;
}

export const LANGUAGE_RESOURCES: LanguageResource[] = [
  {
    language: 'actions',
    astContent: actionsAst
  },
  {
    language: 'cpp',
    astContent: cppAst,
    securityContent: cppSecurity,
    additionalResources: {
      'library-modeling': cppLibraryModeling,
    }
  },
  {
    language: 'csharp',
    astContent: csharpAst,
    securityContent: csharpSecurity,
    additionalResources: {
      'library-modeling': csharpLibraryModeling,
    }
  },
  {
    language: 'go',
    astContent: goAst,
    securityContent: goSecurity,
    additionalResources: {
      'basic-queries': goBasicQueries,
      'dataflow': goDataflow,
      'library-modeling': goLibraryModeling,
    }
  },
  {
    language: 'java',
    astContent: javaAst,
    additionalResources: {
      'library-modeling': javaLibraryModeling,
    }
  },
  {
    language: 'javascript',
    astContent: javascriptAst,
    securityContent: javascriptSecurity,
    additionalResources: {
      'library-modeling': javascriptLibraryModeling,
    }
  },
  {
    language: 'python',
    astContent: pythonAst,
    securityContent: pythonSecurity,
    additionalResources: {
      'library-modeling': pythonLibraryModeling,
    }
  },
  {
    language: 'ruby',
    astContent: rubyAst,
    additionalResources: {
      'library-modeling': rubyLibraryModeling,
    }
  },
  {
    language: 'rust',
    astContent: rustAst
  }
];