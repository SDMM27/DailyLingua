import type { AssessmentDossier } from "@/lib/schemas/assessment";

export const dossier: AssessmentDossier = {
  id: "it-c1-1",
  language: "it",
  level: "C1",
  topic: "économie",
  title: "Il numero che non basta",
  reading: {
    text: "Ogni epoca ha la propria illusione dei numeri, e la nostra consiste forse nel credere che la ricchezza sia una grandezza misurabile con un solo numero. Per decenni il prodotto interno lordo è stato il metro con cui si giudicava la salute delle nazioni: se cresceva, il paese prosperava; se ristagnava, incombeva la crisi. Eppure, a ben guardare, tale indicatore registra con la stessa indifferenza il denaro speso per costruire una scuola e quello speso per riparare i danni di un’alluvione. Non distingue, insomma, tra ciò che arricchisce una comunità e ciò che si limita a rimetterla in piedi. Non sorprende, dunque, che da qualche tempo economisti di varia scuola reclamino strumenti più sfumati, capaci di tener conto del tempo libero, della qualità dell’ambiente, della fiducia reciproca tra i cittadini. Misurare ciò che conta, e non soltanto ciò che si può contare, diventa così l’ambizione di una disciplina che per troppo tempo si è accontentata di quest’ultimo. La proposta, tuttavia, non è priva di insidie. Quanto più un indicatore si fa complesso, tanto più risulta opinabile, e il rischio è che ciascun governo scelga i parametri che lo lusingano. Una cifra grezza ma uguale per tutti ha, se non altro, il merito di non essere negoziabile. Si aggiunga che i sostenitori del vecchio metro non mancano di argomenti: la crescita, osservano, resta una condizione necessaria per finanziare proprio quei servizi, la scuola, la sanità, la tutela del territorio, di cui i critici lamentano la scarsa considerazione. Il dibattito, a dire il vero, somiglia meno a uno scontro tra due schieramenti che a una lunga disputa sul senso delle parole. Che cosa intendiamo, infine, quando diciamo che un paese sta bene? Chi crede di poter rispondere con una percentuale rinuncia, di fatto, a porre la domanda. E forse è proprio questa la rinuncia più costosa, quella che nessun bilancio, per quanto accurato, riuscirebbe mai a registrare.",
    questions: [
      {
        id: "it-c1-1-r1",
        prompt: "Que veut montrer l’auteur avec l’exemple de l’école construite et des dégâts d’une inondation réparés ?",
        referenceAnswer: "Que l’indicateur compte de la même façon une dépense qui enrichit la collectivité et une dépense qui ne fait que réparer un dommage : il ne mesure donc pas vraiment le bien-être.",
        expectedPoints: ["l’indicateur ne fait pas de différence entre les dépenses", "enrichir une société n’est pas la même chose que réparer", "limite de l’indicateur"],
      },
      {
        id: "it-c1-1-r2",
        prompt: "Quelle attitude l’auteur adopte-t-il envers les défenseurs de l’ancien indicateur et envers ses critiques ?",
        referenceAnswer: "Une attitude nuancée : il reconnaît les risques des indicateurs plus complexes et les arguments des défenseurs de l’ancien, sans prendre franchement parti, et préfère déplacer le débat vers le sens des mots.",
        expectedPoints: ["ton équilibré, sans parti pris tranché", "il admet les faiblesses de chaque camp", "le débat porte plus sur le sens des mots que sur deux camps"],
      },
      {
        id: "it-c1-1-r3",
        prompt: "Que veut suggérer la dernière phrase, sur la « renonciation la plus coûteuse » ?",
        referenceAnswer: "Que se contenter d’un pourcentage pour dire qu’un pays va bien revient à ne plus se poser la question essentielle, ce qui est une perte qu’aucun bilan chiffré ne peut mesurer.",
        expectedPoints: ["renoncer à se poser la question du bien-être", "ironie : le coût n’apparaît dans aucun bilan"],
      },
    ],
  },
  listening: {
    source: "youtube",
    video: {
      youtubeId: "uotspWVrGVs",
      title: "Perché DANTE è il padre dell'italiano?",
      channel: "Podcast Italiano",
      start: 49,
      end: 112,
      checkedOn: null,
    },
    questions: [
      {
        id: "it-c1-1-l1",
        prompt: "Pourquoi a-t-il décidé de parler de Dante cette année-là ?",
        referenceAnswer: "Parce qu’on célèbre, en Italie et dans le monde, les 700 ans de la mort de Dante.",
        expectedPoints: ["les 700 ans de la mort de Dante"],
      },
      {
        id: "it-c1-1-l2",
        prompt: "Quelle précaution prend-il avant de commencer, et quel effet cela donne-t-il ?",
        referenceAnswer: "Il prévient qu’il n’est ni spécialiste de Dante ni de littérature, « qu’il n’est personne » : juste un amoureux de la langue qui partage ce qu’il apprend. Le ton est modeste, avec de l’autodérision ; il se place au niveau du public et devance les critiques.",
        expectedPoints: ["il n’est pas spécialiste", "un passionné qui partage ce qu’il apprend", "ton modeste / autodérision"],
      },
      {
        id: "it-c1-1-l3",
        prompt: "Qu’est-ce qui rend Dante unique dans la culture italienne, d’après lui ?",
        referenceAnswer: "C’est le seul individu qu’on appelle « père » : même Cavour ou Garibaldi ne le sont pas ; sinon « père de l’Italie », du moins « père de l’italien ».",
        expectedPoints: ["le seul qu’on appelle « père »", "pas même Cavour ou Garibaldi", "père de l’italien"],
      },
    ],
  },
  writing: {
    prompt: "Dans un texte argumenté de 6 phrases en italien, dis si, selon toi, un seul indicateur peut mesurer le bien-être d’un pays. Défends ta position avec un argument et réfute une objection.",
  },
  audio: null,
  reviewedOn: "2026-11-03",
};
