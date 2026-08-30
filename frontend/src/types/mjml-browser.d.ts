declare module "mjml-browser" {
  interface MJMLParseResults {
    html: string;
    errors: unknown[];
  }
  interface MJMLOptions {
    fonts?: Record<string, string>;
    keepComments?: boolean;
    beautify?: boolean;
    minify?: boolean;
    validationLevel?: "strict" | "soft" | "skip";
    filePath?: string;
    juicePreserveTags?: unknown;
    minifyOptions?: Record<string, unknown>;
    mjmlConfigPath?: string;
    useMjmlConfigOptions?: boolean;
  }
  const mjml: (input: string, options?: MJMLOptions) => MJMLParseResults;
  export default mjml;
}
