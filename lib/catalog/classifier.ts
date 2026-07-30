export const CLASSIFICATION_VERSION = "title-tokens-v1";

export type ClassificationOverride = "include" | "exclude" | null;

export type DzrzvdClassification = {
  included: boolean;
  method: "manual_include" | "manual_exclude" | "title_token" | "no_match";
  evidence: string | null;
  normalizedTitle: string;
};

export function normalizeProductTitle(title: string): string {
  return title.normalize("NFKC").replace(/\s+/g, " ").trim();
}

export function classifyDzrzvdTitle(
  title: string,
  override: ClassificationOverride = null,
): DzrzvdClassification {
  const normalizedTitle = normalizeProductTitle(title);

  if (override === "include") {
    return {
      included: true,
      method: "manual_include",
      evidence: "operator_override",
      normalizedTitle,
    };
  }

  if (override === "exclude") {
    return {
      included: false,
      method: "manual_exclude",
      evidence: "operator_override",
      normalizedTitle,
    };
  }

  const latinMatch = normalizedTitle.toLocaleUpperCase("en").includes("DZRZVD");
  const chineseMatch = normalizedTitle.includes("杜戛地");

  if (latinMatch || chineseMatch) {
    return {
      included: true,
      method: "title_token",
      evidence: latinMatch ? "DZRZVD" : "杜戛地",
      normalizedTitle,
    };
  }

  return {
    included: false,
    method: "no_match",
    evidence: null,
    normalizedTitle,
  };
}
