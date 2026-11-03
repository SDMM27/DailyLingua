import type { AssessmentDossier } from "@/lib/schemas/assessment";

export const dossier: AssessmentDossier = {
  id: "it-a2-1",
  language: "it",
  level: "A2",
  topic: "gastronomie",
  title: "Una domenica in trattoria",
  reading: {
    text: "Domenica scorsa sono andato con i miei amici in una piccola trattoria di campagna. Era un posto semplice: i tavoli erano di legno e la cucina profumava di pomodoro e di basilico. Il cuoco, un signore anziano, ci ha salutati con un grande sorriso. Mentre aspettavamo, ci ha portato del pane caldo con un po’ d’olio. Poi abbiamo ordinato la pasta fatta in casa. Io ho preso le tagliatelle al ragù, mentre la mia amica Sara ha scelto una zuppa di verdure perché non aveva molta fame. Tutto era buonissimo, ma il dolce era il migliore: una torta di mele ancora tiepida. Alla fine abbiamo speso poco e siamo usciti molto contenti. Quando ero piccolo, la nonna cucinava così, e quel pranzo mi ha fatto tornare in mente le domeniche a casa sua.",
    questions: [
      {
        id: "it-a2-1-r1",
        prompt: "Où le narrateur est-il allé dimanche dernier, et avec qui ?",
        referenceAnswer: "Il est allé dans une petite trattoria de campagne avec ses amis.",
        expectedPoints: ["dans une petite trattoria de campagne", "avec ses amis"],
      },
      {
        id: "it-a2-1-r2",
        prompt: "Pourquoi Sara a-t-elle choisi une soupe de légumes ?",
        referenceAnswer: "Parce qu’elle n’avait pas très faim.",
        expectedPoints: ["elle n’avait pas très faim"],
      },
      {
        id: "it-a2-1-r3",
        prompt: "Quel était le dessert, et dans quel état était-il ?",
        referenceAnswer: "C’était une tarte aux pommes encore tiède.",
        expectedPoints: ["une tarte aux pommes", "encore tiède"],
      },
    ],
  },
  listening: {
    source: "script",
    script: "Prima di partire, abbiamo comprato delle tagliatelle fresche per la nonna. Lei era felice e ha invitato tutti a cena sabato. Ha detto: «Porto io il dolce!». Ho chiesto la ricetta del ragù, ma lei ha risposto che non esiste: bisogna affidarsi al profumo e assaggiare di tanto in tanto.",
    questions: [
      {
        id: "it-a2-1-l1",
        prompt: "Qu’ont-ils acheté avant de partir, et pour qui ?",
        referenceAnswer: "Ils ont acheté des tagliatelles fraîches pour la grand-mère.",
        expectedPoints: ["des tagliatelles fraîches", "pour la grand-mère"],
      },
      {
        id: "it-a2-1-l2",
        prompt: "Que propose la grand-mère pour samedi ?",
        referenceAnswer: "Elle invite tout le monde à dîner samedi et dit qu’elle apportera le dessert.",
        expectedPoints: ["un dîner samedi", "elle apporte le dessert"],
      },
      {
        id: "it-a2-1-l3",
        prompt: "Pourquoi le narrateur n’obtient-il pas la recette du ragù ?",
        referenceAnswer: "Parce que, selon la grand-mère, la recette n’existe pas : il faut sentir le parfum et goûter de temps en temps.",
        expectedPoints: ["la recette n’existe pas", "il faut sentir et goûter"],
      },
    ],
  },
  writing: {
    prompt: "Raconte un repas que tu as apprécié. Écris 3 phrases en italien, au passé : où tu étais, avec qui, et ce que tu as mangé.",
  },
  audio: null,
  reviewedOn: "2026-11-03",
};
