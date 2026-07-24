import type {
  BieAnalyzer,
  BieAnalyzerInput,
} from "@/lib/bie/shared/bie-types";

export class BieAnalyzerRegistry {
  private readonly analyzers = new Map<string, BieAnalyzer>();

  register(analyzer: BieAnalyzer) {
    if (this.analyzers.has(analyzer.name)) {
      throw new Error(`BIE analyzer already registered: ${analyzer.name}`);
    }

    this.analyzers.set(analyzer.name, analyzer);
    return this;
  }

  unregister(name: string) {
    this.analyzers.delete(name);
    return this;
  }

  list() {
    return [...this.analyzers.values()];
  }

  resolve(input: BieAnalyzerInput) {
    return this.list().filter((analyzer) => analyzer.supports(input));
  }
}
