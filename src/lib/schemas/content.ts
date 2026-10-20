import { z } from "zod";
import { cefrLevelSchema, contentTypeSchema, dateKeySchema, languageSchema } from "./common";

export const LICENSE_KINDS = ["cc-by", "cc-by-sa", "cc-by-nd", "public-domain", "all-rights-reserved"] as const;
export const licenseKindSchema = z.enum(LICENSE_KINDS);
export type LicenseKind = z.infer<typeof licenseKindSchema>;

export const SOURCE_ACCESS = ["free", "metered", "paywalled"] as const;
export const sourceAccessSchema = z.enum(SOURCE_ACCESS);
export type SourceAccess = z.infer<typeof sourceAccessSchema>;

/** Languages a teaching channel may explain in (the app's users read French, then English). */
export const INSTRUCTION_LANGUAGES = ["fr", "en"] as const;
export type InstructionLanguage = (typeof INSTRUCTION_LANGUAGES)[number];

export const SOURCE_AUDIENCES = ["children"] as const;
export type SourceAudience = (typeof SOURCE_AUDIENCES)[number];

const httpsUrl = z.url({ protocol: /^https$/ });

/** Licence and terms of a source, as checked by a person on `verifiedOn`. */
export const sourceLicenseSchema = z.object({
  kind: licenseKindSchema,
  /** Short label shown to users, e.g. "CC BY 3.0" or "Tous droits réservés". */
  name: z.string().min(1).max(80),
  /** Text of the licence (Creative Commons deed), when there is one. */
  url: z.url().optional(),
  /** Page of the publisher's own terms or republishing policy. */
  termsUrl: z.url(),
  /** Whether the terms allow use in a paid product without a separate agreement. */
  commercialUse: z.boolean(),
  /** Credit line required by the licence, when it asks for a specific one. */
  attribution: z.string().max(200).optional(),
  verifiedOn: dateKeySchema,
  /** What was checked and anything a reviewer should know. Not shown to users. */
  note: z.string().min(1),
});
export type SourceLicense = z.infer<typeof sourceLicenseSchema>;

/** One feed of the catalogue (src/lib/content/catalog.ts). */
export const sourceDefinitionSchema = z
  .object({
    key: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
    name: z.string().min(1).max(120),
    language: languageSchema,
    homepageUrl: httpsUrl,
    feedUrl: httpsUrl,
    contentType: contentTypeSchema,
    /** Typical level of the source, used until a content is assessed individually. */
    difficulty: cefrLevelSchema,
    /** Duration assumed when the feed does not give one (articles never do). */
    defaultMinutes: z.number().int().min(1).max(120),
    /**
     * Host names item links may point to (subdomains included). Items linking anywhere else are
     * dropped, and link checks never follow a redirect outside them.
     */
    hosts: z.array(z.string().regex(/^[a-z0-9.-]+\.[a-z]{2,}$/)).min(1),
    /**
     * Podcasts only: hosts an episode's audio file (RSS `<enclosure>`) may be served from, subdomains
     * included (the publisher's CDN, its podcast host, a measurement redirector it uses). Absent: the
     * episodes are only linked, never played in the app.
     */
    audioHosts: z.array(z.string().regex(/^[a-z0-9.-]+\.[a-z]{2,}$/)).min(1).optional(),
    /**
     * Items older than this many days are ignored. Defaults to MAX_ITEM_AGE_DAYS (news); sources
     * whose items stay useful for longer, such as learning videos, set a wider window.
     */
    maxAgeDays: z.number().int().min(1).max(365).optional(),
    /**
     * Level of an item read from its title, for channels that label them (« A2 », « Beginner »...).
     * The first rule whose pattern matches the cleaned title wins; otherwise `difficulty` applies.
     */
    levelRules: z.array(z.object({ pattern: z.instanceof(RegExp), difficulty: cefrLevelSchema })).optional(),
    /** Keeps only the items whose cleaned title matches, for channels that also publish off-topic videos. */
    titleFilter: z.instanceof(RegExp).optional(),
    /**
     * Language the videos explain in when it is not the studied one (a channel that teaches Russian
     * in French). Absent: the video is in the target language only.
     */
    instructionLanguage: z.enum(INSTRUCTION_LANGUAGES).optional(),
    /** "children": made for children (cartoons, kids' news), good material for the first levels. */
    audience: z.enum(SOURCE_AUDIENCES).optional(),
    access: sourceAccessSchema.default("free"),
    /**
     * How items are read. "wikipedia-featured": the feed entry is a dated wrapper; the real article
     * is the first bold link of the summary. "youtube": a channel feed; Shorts are dropped, only
     * `watch?v=` links are kept and the teaser stops where the description turns to promotion.
     */
    itemFormat: z.enum(["standard", "wikipedia-featured", "youtube"]).default("standard"),
    license: sourceLicenseSchema,
  })
  .refine((s) => s.license.kind === "all-rights-reserved" || s.license.url !== undefined, {
    message: "an open licence needs the URL of its text",
    path: ["license", "url"],
  });
export type SourceDefinition = z.input<typeof sourceDefinitionSchema>;
export type ParsedSourceDefinition = z.output<typeof sourceDefinitionSchema>;

/**
 * Which sources may be used. "all": every source of the catalogue (personal use). "commercial":
 * only sources whose terms allow a paid product; set it before selling the app.
 */
export const CONTENT_LICENSE_POLICIES = ["all", "commercial"] as const;
export const contentLicensePolicySchema = z.enum(CONTENT_LICENSE_POLICIES);
export type ContentLicensePolicy = z.infer<typeof contentLicensePolicySchema>;

/** A source as shown to users (sources and licences screen). */
export const sourceInfoSchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  language: languageSchema,
  homepage: z.url(),
  contentType: contentTypeSchema,
  access: sourceAccessSchema,
  license: z.object({
    kind: licenseKindSchema,
    name: z.string().min(1),
    url: z.url().optional(),
    termsUrl: z.url(),
  }),
  /** Last successful ingestion, null if never fetched (or in the demo). */
  lastFetchedAt: z.iso.datetime({ offset: true }).nullable(),
});
export type SourceInfo = z.infer<typeof sourceInfoSchema>;

/** A content of the reading list. */
export const contentListItemSchema = z.object({
  id: z.string().min(1),
  language: languageSchema,
  type: contentTypeSchema,
  title: z.string().min(1),
  url: z.url(),
  difficulty: cefrLevelSchema,
  durationMinutes: z.number().int().positive(),
  summary: z.string().min(1),
  /** Podcasts: the episode's audio file (https), played in the app on demand. */
  audioUrl: z.url({ protocol: /^https$/ }).nullish(),
  author: z.string().optional(),
  publishedAt: z.iso.datetime({ offset: true }).nullable(),
  source: sourceInfoSchema.pick({ key: true, name: true, homepage: true, access: true, license: true }),
});
export type ContentListItem = z.infer<typeof contentListItemSchema>;

/** A paid (metered / paywalled) source the user can declare they have access to. */
export const paidSourceSchema = z.object({
  /** Database id (the catalogue key in the demo). */
  id: z.string().min(1),
  name: z.string().min(1),
  homepage: z.url(),
  language: languageSchema,
  access: z.enum(["metered", "paywalled"]),
  /** Whether the user declared that they can read it. */
  declared: z.boolean(),
});
export type PaidSource = z.infer<typeof paidSourceSchema>;

/** Input of the « J'y ai accès » toggle. */
export const sourceAccessInputSchema = z.object({
  sourceId: z.uuid(),
  hasAccess: z.boolean(),
});
export type SourceAccessInput = z.infer<typeof sourceAccessInputSchema>;
