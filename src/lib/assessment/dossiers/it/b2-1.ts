import type { AssessmentDossier } from "@/lib/schemas/assessment";

export const dossier: AssessmentDossier = {
  id: "it-b2-1",
  language: "it",
  level: "B2",
  topic: "technologie",
  title: "Una città piena di sensori",
  reading: {
    text: "Che le città diventino più intelligenti grazie ai sensori è ormai quasi un luogo comune. Eppure, a Montefosco, comune immaginario di medie dimensioni, l’esperimento avviato due anni fa dall’amministrazione sta dividendo l’opinione pubblica più di quanto i suoi ideatori si aspettassero. L’idea di partenza era semplice: installare lungo le strade principali dei dispositivi capaci di misurare il traffico, il rumore e la qualità dell’aria, in modo che il Comune potesse regolare i semafori e organizzare meglio la raccolta dei rifiuti. I primi risultati, a detta dei tecnici, sono incoraggianti: gli ingorghi nelle ore di punta si sono ridotti e alcune zone, un tempo congestionate, respirano finalmente un po’ meglio. Tuttavia, nonostante questi progressi, cresce il malumore di chi teme che una simile rete di controllo finisca per sorvegliare i cittadini più che per servirli. L’autorità locale per la protezione dei dati personali ha chiesto che i dati vengano conservati per un periodo limitato e che non sia possibile risalire all’identità delle singole persone, salvo che un giudice ne autorizzi l’identificazione. L’amministrazione assicura che i dati sono anonimi, ma si rifiuta di rendere pubblico il contratto con l’azienda fornitrice, e questo non fa che alimentare i sospetti. Gli esperti consultati dal quotidiano locale invitano alla prudenza: la tecnologia, osservano, non è né buona né cattiva in sé; conta chi la gestisce e con quali regole. Per non compromettere la fiducia, sarebbe necessario coinvolgere i cittadini fin dall’inizio, e non limitarsi a informarli a cose fatte.",
    questions: [
      {
        id: "it-b2-1-r1",
        prompt: "Quel dilemme central l’article pose-t-il à propos du projet de Montefosco ?",
        referenceAnswer: "Le projet améliore la circulation et la qualité de l’air, mais il inquiète ceux qui craignent une surveillance des habitants plutôt qu’un service rendu.",
        expectedPoints: ["des résultats concrets encourageants", "la crainte d’une surveillance des citoyens"],
      },
      {
        id: "it-b2-1-r2",
        prompt: "Pourquoi le refus de publier le contrat avec l’entreprise fournisseuse pose-t-il problème, d’après le texte ?",
        referenceAnswer: "Parce que, malgré les assurances de la mairie sur l’anonymat des données, ce manque de transparence nourrit la méfiance des habitants.",
        expectedPoints: ["manque de transparence", "il renforce les soupçons malgré les assurances d’anonymat"],
      },
      {
        id: "it-b2-1-r3",
        prompt: "Quelle position les experts consultés défendent-ils, et que recommandent-ils pour préserver la confiance ?",
        referenceAnswer: "Ils estiment que la technologie est neutre en soi et que tout dépend de qui la gère et selon quelles règles ; ils conseillent d’associer les habitants dès le départ plutôt que de les informer après coup.",
        expectedPoints: ["la technologie n’est ni bonne ni mauvaise en soi", "ce qui compte : qui la gère et les règles", "associer les citoyens dès le début"],
      },
    ],
  },
  listening: {
    source: "youtube",
    video: {
      youtubeId: "D2a6S69w104",
      title: "3 opere FONDAMENTALI per capire l'ITALIA",
      channel: "Podcast Italiano",
      start: 187,
      end: 268,
      checkedOn: null,
    },
    questions: [
      {
        id: "it-b2-1-l1",
        prompt: "Pourquoi, selon Davide, L’École d’Athènes est-elle une œuvre si importante ?",
        referenceAnswer: "C’est le manifeste de la Renaissance dans sa phase mûre : elle résume les valeurs de toute une époque en une seule composition monumentale.",
        expectedPoints: ["manifeste de la Renaissance (mûre)", "synthèse des valeurs d’une époque en une seule œuvre"],
      },
      {
        id: "it-b2-1-l2",
        prompt: "Quelle opération « audacieuse » Raphaël réalise-t-il, et qu’affirme-t-il ainsi ?",
        referenceAnswer: "Il place les philosophes de la Grèce antique (Platon, Aristote, Socrate…) au cœur de l’Italie, à Rome, au Vatican ; il affirme ainsi que l’Italie est l’héritière légitime de la culture grecque, classique.",
        expectedPoints: ["philosophes grecs placés à Rome / au Vatican", "l’Italie héritière légitime de la culture classique"],
      },
      {
        id: "it-b2-1-l3",
        prompt: "Quelle réconciliation l’œuvre opère-t-elle, et sur quoi repose-t-elle ?",
        referenceAnswer: "En installant les sages de l’Antiquité dans le palais du pape, Raphaël réconcilie culture classique et culture chrétienne, ce qui est à la base de la pensée humaniste.",
        expectedPoints: ["réconciliation entre culture classique et culture chrétienne", "fondement de la pensée humaniste"],
      },
    ],
  },
  writing: {
    prompt: "Tu écris au journal local d’une ville qui a installé des capteurs dans ses rues. En 5 phrases en italien, dis si tu soutiens ce projet, quel risque t’inquiète le plus et quelle garantie tu demanderais à la mairie.",
  },
  audio: null,
  reviewedOn: "2026-11-03",
};
