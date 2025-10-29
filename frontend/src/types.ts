export type AnnotationType = 'comparison' | 'rubric' | 'demonstration';

export type RubricScore = {
  dimension: string;
  score: number;
  maxScore: number;
};

export type PreferenceRanking = {
  preferredModelOutputId: number;
  rejectedModelOutputIds: number[];
  rationale?: string;
};
