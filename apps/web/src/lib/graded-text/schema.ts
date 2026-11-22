import { z } from "zod";

const line = (max: number) => z.string().trim().min(1).max(max);
const indexes = z.array(z.number().int().min(0).max(99)).min(1).max(12);
const choices = z.object({
  question: line(200),
  options: z.array(line(200)).length(4),
  answerIndex: z.number().int().min(0).max(3),
});

const gap = z.object({
  sentence: z.number().int().min(0).max(99),
  before: z.string().max(200),
  removed: line(100),
  after: z.string().max(200),
  accept: z.array(line(100)).min(1).max(8),
});

export const gradedTextDraftSchema = z.object({
  title: line(200),
  paragraphs: z.array(z.array(line(400)).min(1).max(20)).min(2).max(12),
  listening: z.object({ from: z.number().int().min(0).max(99), to: z.number().int().min(0).max(99) }),
  words: z.array(z.object({
    lemma: line(80),
    dictionaryForm: line(100),
    forms: z.array(line(100)).min(1).max(8),
    definition: line(150),
    sentence: z.number().int().min(0).max(99),
    exercise: choices,
  })).min(5).max(8),
  reading: z.array(choices.extend({
    skill: z.enum(["gist", "detail", "inference"]),
    listeningOnly: z.boolean(),
    evidence: indexes,
  })).length(5),
  grammar: z.object({
    id: line(200),
    evidence: indexes,
    gaps: z.array(gap).length(3),
    transformations: z.array(z.object({
      question: line(200),
      accept: z.array(line(200)).min(1).max(8),
    })).length(2),
  }),
  wordGaps: z.array(gap).length(4),
  writingTask: line(400),
});

export const gradedTextReviewSchema = z.object({
  approved: z.boolean(),
  issues: z.array(line(200)).max(10),
});

export type GradedTextDraft = z.infer<typeof gradedTextDraftSchema>;
