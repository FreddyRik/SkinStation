import type { ReactNode } from "react";

export type PanelVariant = "solid" | "quiet" | "inset";

export type PanelProps = {
  children: ReactNode;
  variant?: PanelVariant;
  /** Accent hairline across the top edge. */
  lit?: boolean;
  /** Bracket ticks at opposing corners. */
  corners?: boolean;
  className?: string;
};

export type SegmentedOption<T extends string> = {
  value: T;
  label: string;
  /** Optional mono code rendered above the label. */
  code?: string;
  title?: string;
};

export type SegmentedControlProps<T extends string> = {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  size?: "sm" | "md";
  ariaLabel: string;
  className?: string;
};

export type SearchFieldProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel: string;
  className?: string;
  autoFocus?: boolean;
};

export type StatTone = "neutral" | "accent" | "positive" | "negative";

export type StatCardProps = {
  label: string;
  value: string;
  hint?: string;
  tone?: StatTone;
};

export type ProbabilityBarProps = {
  /** 0..1 */
  value: number;
  /** Bar colour; defaults to the theme accent. */
  color?: string;
  className?: string;
};

export type EmptyStateProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

export type SkeletonProps = {
  className?: string;
};
