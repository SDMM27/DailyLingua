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
    source: "script",
    script: "Si pensi a un paese immaginario, che chiameremo Altavia. Per vent’anni la sua economia crebbe senza interruzione, e i governi si vantarono di ogni nuovo record. Poi, un giorno, un’inchiesta rivelò ciò che nessuna statistica aveva mai mostrato: la gente lavorava di più, dormiva di meno e si fidava sempre meno dei vicini. Il ministro dell’economia, uomo prudente, esitò a lungo prima di commentare; infine ammise che i numeri erano esatti ma che, forse, avevano risposto a una domanda sbagliata. Non ne derivò alcuna rivoluzione, com’è naturale. Ne derivò qualcosa di più modesto e, a ben vedere, di più durevole: l’abitudine di affiancare alle cifre un racconto, e di diffidare di chi pretende di bastare a se stesso con un solo dato. Ogni indicatore, in fondo, è una scorciatoia; l’importante è ricordarsi che di scorciatoia si tratta.",
    questions: [
      {
        id: "it-c1-1-l1",
        prompt: "Qu’illustre l’histoire du pays imaginaire d’Altavia ?",
        referenceAnswer: "Qu’une économie en croissance continue peut cacher une dégradation de la vie des gens, que les statistiques habituelles ne montrent pas.",
        expectedPoints: ["croissance et mal-être peuvent coexister", "les statistiques ne montrent pas tout"],
      },
      {
        id: "it-c1-1-l2",
        prompt: "Que laisse entendre le ministre en disant que les chiffres « avaient répondu à une mauvaise question » ?",
        referenceAnswer: "Que les chiffres étaient exacts mais mesuraient autre chose que ce qui importait vraiment ; c’est un aveu prudent, sans reconnaître d’erreur de calcul.",
        expectedPoints: ["chiffres exacts mais question mal choisie", "aveu mesuré, prudent"],
      },
      {
        id: "it-c1-1-l3",
        prompt: "Pourquoi l’auteur dit-il qu’il n’y eut « aucune révolution », et quelle conclusion tire-t-il sur les indicateurs ?",
        referenceAnswer: "Parce que le changement fut modeste mais plus durable : on a pris l’habitude d’accompagner les chiffres d’un récit. Un indicateur n’est qu’un raccourci, il ne faut pas l’oublier.",
        expectedPoints: ["changement modeste mais durable", "accompagner les chiffres d’un récit", "un indicateur est un raccourci"],
      },
    ],
  },
  writing: {
    prompt: "Dans un texte argumenté de 6 phrases en italien, dis si, selon toi, un seul indicateur peut mesurer le bien-être d’un pays. Défends ta position avec un argument et réfute une objection.",
  },
  audio: null,
  reviewedOn: "2026-11-03",
};
