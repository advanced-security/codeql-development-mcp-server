/**
 * Type definitions and constants for language-specific resources.
 *
 * Content is imported statically at build time via esbuild's `.md: 'text'`
 * loader, following the same pattern as `server/src/lib/resources.ts`.
 */

import actionsAst from '../resources/languages/actions_ast.md';
import cppAst from '../resources/languages/cpp_ast.md';
import cppSecurity from '../resources/languages/cpp_security_query_guide.md';
import csharpAst from '../resources/languages/csharp_ast.md';
import csharpSecurity from '../resources/languages/csharp_security_query_guide.md';
import goAst from '../resources/languages/go_ast.md';
import goBasicQueries from '../resources/languages/go_basic_queries.md';
import goDataflow from '../resources/languages/go_dataflow.md';
import goLibraryModeling from '../resources/languages/go_library_modeling.md';
import goSecurity from '../resources/languages/go_security_query_guide.md';
import javaAst from '../resources/languages/java_ast.md';
import javascriptAst from '../resources/languages/javascript_ast.md';
import javascriptSecurity from '../resources/languages/javascript_security_query_guide.md';
import pythonAst from '../resources/languages/python_ast.md';
import pythonSecurity from '../resources/languages/python_security_query_guide.md';
import rubyAst from '../resources/languages/ruby_ast.md';

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
    securityContent: cppSecurity
  },
  {
    language: 'csharp',
    astContent: csharpAst,
    securityContent: csharpSecurity
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
  },
  {
    language: 'javascript',
    astContent: javascriptAst,
    securityContent: javascriptSecurity
  },
  {
    language: 'python',
    astContent: pythonAst,
    securityContent: pythonSecurity
  },
  {
    language: 'ruby',
    astContent: rubyAst
  }
];