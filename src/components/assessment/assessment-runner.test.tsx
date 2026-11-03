// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toPublicDossier } from "@/lib/assessment/public-dossier";
import { SPEAKING_CLAIMS } from "@/lib/assessment/speaking-claims";
import type { ActionResult } from "@/app/actions/result";
import type { AssessmentAnswers, AssessmentGradingResult } from "@/lib/schemas/assessment";
import { FIXTURE_DOSSIER, FIXTURE_YOUTUBE_DOSSIER } from "@/test/assessment-fixtures";
import { AssessmentRunner, SAVE_DELAY_MS } from "./assessment-runner";

const { refresh, save, grade } = vi.hoisted(() => ({ refresh: vi.fn(), save: vi.fn(), grade: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh, push: vi.fn() }) }));
vi.mock("@/app/actions/assessment", () => ({ saveAssessmentAnswers: save, gradeAssessment: grade }));
// The player has its own tests: here a button stands for the first listening.
vi.mock("@/components/assessment/listening-player", () => ({
  ListeningPlayer: ({ src, onPlaysChange, initialPlays }: { src: string; onPlaysChange: (n: number) => void; initialPlays: number }) => (
    <button type="button" data-src={src} onClick={() => onPlaysChange(initialPlays + 1)}>
      Écouter le passage
    </button>
  ),
}));

vi.mock("@/components/assessment/youtube-listening-player", () => ({
  YouTubeListeningPlayer: ({ video, title, onPlaysChange, initialPlays }: { video: { youtubeId: string }; title: string; onPlaysChange: (n: number) => void; initialPlays: number }) => (
    <button type="button" data-video={video.youtubeId} onClick={() => onPlaysChange(initialPlays + 1)}>
      {title}
    </button>
  ),
}));

const AUDIO = { file: "/assessment/it/it-a1-1.m4a", speaker: "Giulia", licence: "granted-commercial", recordedOn: "2026-11-01" } as const;
const recorded = toPublicDossier({ ...FIXTURE_DOSSIER, audio: AUDIO, reviewedOn: "2026-11-01" }, "audio");
const draft = toPublicDossier(FIXTURE_DOSSIER, "draft-script");

const none: AssessmentAnswers = { questions: {}, writing: "", speaking: {} };
const READING = FIXTURE_DOSSIER.reading.questions.map((q) => q.id);
const fill = (ids: string[]) => Object.fromEntries(ids.map((id) => [id, "une réponse"]));

const OK: ActionResult = { ok: true, data: undefined };

beforeEach(() => {
  save.mockResolvedValue(OK);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.clearAllMocks();
});

function setup(props: Partial<Parameters<typeof AssessmentRunner>[0]> = {}) {
  const user = userEvent.setup();
  render(
    <AssessmentRunner
      assessmentId="as-1"
      dossier={recorded}
      answers={none}
      listeningPlays={0}
      claims={SPEAKING_CLAIMS}
      {...props}
    />,
  );
  return user;
}

const next = (user: ReturnType<typeof userEvent.setup>) => user.click(screen.getByRole("button", { name: /Suivant/ }));
const savedWith = (n: number) => save.mock.calls[n][0] as { assessmentId: string; answers: AssessmentAnswers; listeningPlays: number };

/** Moves to the recap with the answers given, going through the four steps. */
async function toRecap(user: ReturnType<typeof userEvent.setup>) {
  while (screen.queryByRole("button", { name: /Suivant/ })) await next(user);
  await user.click(screen.getByRole("button", { name: /Voir le récapitulatif/ }));
}

describe("AssessmentRunner steps", () => {
  it("starts with the reading step: progress, text in its language, questions in French", () => {
    setup();
    expect(screen.getByText("Étape 1 sur 4")).toBeTruthy();
    expect(screen.getByRole("progressbar", { name: "Progression du bilan" }).getAttribute("aria-valuenow")).toBe("0");
    expect(screen.getByRole("heading", { level: 1, name: "Comprendre un texte" })).toBeTruthy();
    const text = screen.getByText(/Mi chiamo Marta/);
    expect(text.getAttribute("lang")).toBe("it");
    expect(text.getAttribute("dir")).toBe("ltr");
    expect(screen.getByText("Réponds en français ou dans la langue, au choix : seul le sens compte.")).toBeTruthy();
    for (const q of recorded.reading.questions) expect(screen.getByLabelText(q.prompt)).toBeTruthy();
  });

  it("gives each answer a full-width field of 16 px or more, with automatic direction", () => {
    setup();
    const field = screen.getByLabelText("Où habite Marta ?");
    expect(field.tagName).toBe("TEXTAREA");
    expect(field.getAttribute("dir")).toBe("auto");
    expect(field.className).toContain("w-full");
    expect(field.className).toContain("text-base");
    expect(field.getAttribute("aria-describedby")).toBeTruthy();
  });

  it("resumes at the first open step", () => {
    setup({ answers: { ...none, questions: fill(READING) } });
    expect(screen.getByText("Étape 2 sur 4")).toBeTruthy();
    expect(screen.getByRole("heading", { level: 1, name: "Comprendre à l’oral" })).toBeTruthy();
  });

  it("shows a counter only near the limit of an answer", async () => {
    setup({ answers: { ...none, questions: { [READING[0]]: "x".repeat(1200) } } });
    expect(screen.getByText("1200 / 1500 caractères")).toBeTruthy();
    cleanup();
    setup({ answers: { ...none, questions: { [READING[0]]: "x".repeat(1100) } } });
    expect(screen.queryByText(/caractères/)).toBeNull();
  });

  it("offers the recording for the listening, with the plays left", async () => {
    const user = setup();
    await next(user);
    expect(screen.getByText("Étape 2 sur 4")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Écouter le passage" }).getAttribute("data-src")).toBe(AUDIO.file);
    expect(screen.getByText(/3 fois au plus/)).toBeTruthy();
    expect(screen.queryByText(/Brouillon/)).toBeNull();
    expect(screen.queryByText(/Al parco/)).toBeNull();
  });

  it("plays the video passage for a YouTube listening, and records the plays", async () => {
    const user = setup({ dossier: toPublicDossier(FIXTURE_YOUTUBE_DOSSIER, "youtube") });
    await next(user);
    const button = screen.getByRole("button", { name: "Regarde et écoute le passage" });
    expect(button.getAttribute("data-video")).toBe("dQw4w9WgXcQ");
    expect(screen.getByText(/3 fois au plus/)).toBeTruthy();
    expect(screen.queryByText(/n’est pas disponible/)).toBeNull();
    await user.click(button);
    expect(savedWith(0).listeningPlays).toBe(1);
  });

  it("shows the marked draft script when there is no recording", async () => {
    const user = setup({ dossier: draft });
    await next(user);
    expect(screen.getByText("Brouillon : pas encore enregistré")).toBeTruthy();
    expect(screen.getByText(/Al parco i bambini/)).toBeTruthy();
  });

  it("gives the writing task with the number of sentences", async () => {
    const user = setup();
    await next(user);
    await next(user);
    expect(screen.getByText("Étape 3 sur 4")).toBeTruthy();
    expect(screen.getByText(recorded.writing.prompt)).toBeTruthy();
    expect(screen.getByText("Environ 3 phrases.")).toBeTruthy();
    expect(screen.getByLabelText("Ton texte").getAttribute("dir")).toBe("auto");
  });

  it("lists the eight speaking statements as yes or no, with controls of 44 px, and says they are not checked", async () => {
    const user = setup();
    await next(user);
    await next(user);
    await next(user);
    expect(screen.getByText("Étape 4 sur 4")).toBeTruthy();
    expect(screen.getByText(/ne sera pas vérifié/)).toBeTruthy();
    expect(screen.getAllByRole("group")).toHaveLength(8);
    expect(screen.getAllByRole("radio")).toHaveLength(16);
    for (const label of document.querySelectorAll("label")) expect(label.className).toContain("min-h-11");
  });

  it("goes back a step", async () => {
    const user = setup({ answers: { ...none, questions: fill(READING) } });
    await user.click(screen.getByRole("button", { name: "Précédent" }));
    expect(screen.getByText("Étape 1 sur 4")).toBeTruthy();
    expect((screen.getByLabelText("Où habite Marta ?") as HTMLTextAreaElement).value).toBe("une réponse");
  });
});

describe("AssessmentRunner saving", () => {
  it("saves SAVE_DELAY_MS after the last keystroke, not before", async () => {
    vi.useFakeTimers();
    render(<AssessmentRunner assessmentId="as-1" dossier={recorded} answers={none} listeningPlays={0} claims={SPEAKING_CLAIMS} />);
    const field = screen.getByLabelText("Où habite Marta ?");
    fireEvent.change(field, { target: { value: "A Torino" } });
    await act(() => vi.advanceTimersByTimeAsync(SAVE_DELAY_MS - 100));
    expect(save).not.toHaveBeenCalled();
    fireEvent.change(field, { target: { value: "A Torino!" } });
    await act(() => vi.advanceTimersByTimeAsync(SAVE_DELAY_MS - 100));
    expect(save).not.toHaveBeenCalled();
    await act(() => vi.advanceTimersByTimeAsync(200));
    expect(save).toHaveBeenCalledTimes(1);
    expect(savedWith(0)).toEqual({
      assessmentId: "as-1",
      answers: { questions: { [READING[0]]: "A Torino!" }, writing: "", speaking: {} },
      listeningPlays: 0,
    });
    expect(screen.getByText("Enregistré")).toBeTruthy();
  });

  it("saves when a field loses focus", async () => {
    const user = setup();
    await user.type(screen.getByLabelText("Où habite Marta ?"), "A Torino");
    await user.tab();
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(savedWith(0).answers.questions[READING[0]]).toBe("A Torino");
  });

  it("saves when the step changes", async () => {
    const user = setup();
    fireEvent.change(screen.getByLabelText("Où habite Marta ?"), { target: { value: "A Torino" } });
    await next(user);
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(savedWith(0).answers.questions[READING[0]]).toBe("A Torino");
  });

  it("does not save what the server already has", async () => {
    const user = setup();
    await next(user);
    await user.click(screen.getByRole("button", { name: "Précédent" }));
    expect(save).not.toHaveBeenCalled();
  });

  it("records a listening at once, with the plays", async () => {
    const user = setup();
    await next(user);
    await user.click(screen.getByRole("button", { name: "Écouter le passage" }));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(savedWith(0).listeningPlays).toBe(1);
  });

  it("saves a speaking answer at once", async () => {
    const user = setup();
    for (let i = 0; i < 3; i++) await next(user);
    await user.click(within(screen.getAllByRole("group")[0]).getByLabelText("Oui"));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(savedWith(0).answers.speaking).toEqual({ s1: true });
  });

  it("sends one request at a time and the last state wins", async () => {
    let release!: (value: ActionResult) => void;
    save.mockImplementationOnce(() => new Promise<ActionResult>((resolve) => (release = resolve)));
    setup();
    const field = screen.getByLabelText("Où habite Marta ?");
    fireEvent.change(field, { target: { value: "un" } });
    fireEvent.blur(field);
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    // Two more changes while the first request is out: no request starts.
    fireEvent.change(field, { target: { value: "deux" } });
    fireEvent.blur(field);
    fireEvent.change(field, { target: { value: "trois" } });
    fireEvent.blur(field);
    expect(save).toHaveBeenCalledTimes(1);
    await act(async () => release(OK));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(2));
    expect(savedWith(0).answers.questions[READING[0]]).toBe("un");
    expect(savedWith(1).answers.questions[READING[0]]).toBe("trois");
  });

  it("shows a failure without blocking, and sends again on the next change", async () => {
    save.mockResolvedValueOnce({ ok: false, error: "Ce bilan est introuvable." });
    const user = setup();
    fireEvent.change(screen.getByLabelText("Où habite Marta ?"), { target: { value: "A" } });
    fireEvent.blur(screen.getByLabelText("Où habite Marta ?"));
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("n’ont pas pu être enregistrées");
    expect(alert.textContent).toContain("Ce bilan est introuvable.");
    // Not blocking: the learner moves on, and the answers go out again.
    await next(user);
    await waitFor(() => expect(save).toHaveBeenCalledTimes(2));
    expect(screen.getByText("Étape 2 sur 4")).toBeTruthy();
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
  });

  it("announces the state in a live region", async () => {
    setup();
    fireEvent.change(screen.getByLabelText("Où habite Marta ?"), { target: { value: "A" } });
    fireEvent.blur(screen.getByLabelText("Où habite Marta ?"));
    const status = await screen.findByText("Enregistré");
    expect(status.getAttribute("aria-live")).toBe("polite");
  });
});

describe("AssessmentRunner recap and grading", () => {
  const fullSpeaking = Object.fromEntries(SPEAKING_CLAIMS.map((c) => [c.id, true]));

  it("flags the empty tests as not assessed, and the unanswered questions as wrong", async () => {
    const user = setup({ answers: { questions: { [READING[0]]: "Torino" }, writing: "", speaking: {} } });
    await toRecap(user);
    const rows = screen.getAllByRole("listitem");
    expect(within(rows[0]).getByText("2 questions sans réponse compteront comme fausses")).toBeTruthy();
    expect(within(rows[1]).getByText("non évaluée")).toBeTruthy();
    expect(within(rows[2]).getByText("non évaluée")).toBeTruthy();
    expect(within(rows[3]).getByText("non évaluée")).toBeTruthy();
  });

  it("says a single unanswered question will count as wrong, and a listening started counts as evaluated", async () => {
    const user = setup({
      answers: { questions: { ...fill(READING.slice(0, 2)) }, writing: "Una frase.", speaking: fullSpeaking },
      listeningPlays: 1,
    });
    await toRecap(user);
    const rows = screen.getAllByRole("listitem");
    expect(within(rows[0]).getByText("1 question sans réponse comptera comme fausse")).toBeTruthy();
    expect(within(rows[1]).getByText("3 questions sans réponse compteront comme fausses")).toBeTruthy();
    expect(within(rows[2]).getByText("texte écrit")).toBeTruthy();
    expect(within(rows[3]).getByText("toutes les affirmations ont une réponse")).toBeTruthy();
  });

  it("lets the learner go back to a step from the recap", async () => {
    const user = setup();
    await toRecap(user);
    await user.click(within(screen.getAllByRole("listitem")[2]).getByRole("button"));
    expect(screen.getByText("Étape 3 sur 4")).toBeTruthy();
  });

  it("does not offer to finish when nothing was answered", async () => {
    const user = setup();
    await toRecap(user);
    expect((screen.getByRole("button", { name: "Terminer" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("saves first, then grades, with a waiting screen, then refreshes the page", async () => {
    const order: string[] = [];
    save.mockImplementation(async () => {
      order.push("save");
      return OK;
    });
    let finishGrading!: (value: ActionResult<AssessmentGradingResult>) => void;
    grade.mockImplementation(() => {
      order.push("grade");
      return new Promise((resolve) => (finishGrading = resolve));
    });
    const user = setup();
    fireEvent.change(screen.getByLabelText("Où habite Marta ?"), { target: { value: "A Torino" } });
    await toRecap(user);
    await user.click(screen.getByRole("button", { name: "Terminer" }));
    expect(await screen.findByText("Correction en cours…")).toBeTruthy();
    await waitFor(() => expect(grade).toHaveBeenCalledWith({ assessmentId: "as-1" }));
    expect(order).toEqual(["save", "grade"]);
    expect(refresh).not.toHaveBeenCalled();
    await act(async () => finishGrading({ ok: true, data: { status: "ready", results: {} as never } }));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("does not grade when the answers could not be saved", async () => {
    save.mockResolvedValue({ ok: false, error: "Hors ligne." });
    const user = setup();
    fireEvent.change(screen.getByLabelText("Où habite Marta ?"), { target: { value: "A Torino" } });
    await toRecap(user);
    await user.click(screen.getByRole("button", { name: "Terminer" }));
    expect((await screen.findByRole("alert")).textContent).toContain("Hors ligne.");
    expect(grade).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: "Récapitulatif" })).toBeTruthy();
  });

  async function finishWith(result: ActionResult<AssessmentGradingResult>) {
    grade.mockResolvedValue(result);
    const user = setup({ answers: { ...none, questions: fill(READING) } });
    await toRecap(user);
    await user.click(screen.getByRole("button", { name: "Terminer" }));
    return user;
  }

  it("explains that there is nothing to grade", async () => {
    await finishWith({ ok: true, data: { status: "empty" } });
    expect((await screen.findByRole("alert")).textContent).toContain("rien à corriger");
    expect(screen.queryByRole("button", { name: "Réessayer" })).toBeNull();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("tells to come back tomorrow when the daily limit is reached, and keeps the answers", async () => {
    const user = await finishWith({ ok: true, data: { status: "limit" } });
    expect((await screen.findByRole("alert")).textContent).toBe(
      "Trop de corrections aujourd’hui, reviens demain : tes réponses sont gardées.",
    );
    expect(screen.queryByRole("button", { name: "Réessayer" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Revenir à mes réponses" }));
    expect(screen.getByRole("heading", { name: "Récapitulatif" })).toBeTruthy();
  });

  it("says the assessment is not available when its dossier is not", async () => {
    await finishWith({ ok: true, data: { status: "unavailable-dossier" } });
    expect((await screen.findByRole("alert")).textContent).toContain("n’est plus disponible");
    expect(screen.queryByRole("button", { name: "Réessayer" })).toBeNull();
  });

  it("offers a new try when the grading failed and attempts are left", async () => {
    const user = await finishWith({ ok: true, data: { status: "unavailable", attemptsLeft: 2 } });
    expect((await screen.findByRole("alert")).textContent).toContain("il te reste 2 essais");
    grade.mockResolvedValue({ ok: true, data: { status: "ready", results: {} as never } });
    await user.click(screen.getByRole("button", { name: "Réessayer" }));
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    expect(grade).toHaveBeenCalledTimes(2);
  });

  it("says there is no try left only when the server says so", async () => {
    await finishWith({ ok: true, data: { status: "unavailable", attemptsLeft: 0 } });
    expect((await screen.findByRole("alert")).textContent).toContain("plus d’essai");
    expect(screen.queryByRole("button", { name: "Réessayer" })).toBeNull();
  });

  it("does not claim there is no try left when the number is unknown", async () => {
    await finishWith({ ok: true, data: { status: "unavailable", attemptsLeft: null } });
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).not.toContain("plus d’essai");
    expect(alert.textContent).toContain("Tes réponses sont gardées");
    expect(screen.getByRole("button", { name: "Réessayer" })).toBeTruthy();
  });

  it("shows the message of a failed action and allows another try", async () => {
    await finishWith({ ok: false, error: "Une erreur est survenue. Réessaie dans un instant." });
    expect((await screen.findByRole("alert")).textContent).toBe("Une erreur est survenue. Réessaie dans un instant.");
    expect(screen.getByRole("button", { name: "Réessayer" })).toBeTruthy();
  });
});
