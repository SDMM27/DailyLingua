import type { AssessmentDossier } from "@/lib/schemas/assessment";

export const dossier: AssessmentDossier = {
  id: "it-b2-1",
  language: "it",
  level: "B2",
  topic: "technologie",
  title: "Una città piena di sensori",
  reading: {
    text: "Che le città diventino più intelligenti grazie ai sensori è ormai quasi un luogo comune. Eppure, a Montefosco, comune immaginario di medie dimensioni, l’esperimento avviato due anni fa dall’amministrazione sta dividendo l’opinione pubblica più di quanto i suoi ideatori si aspettassero. L’idea di partenza era semplice: installare lungo le strade principali dei dispositivi capaci di misurare il traffico, il rumore e la qualità dell’aria, in modo che il Comune potesse regolare i semafori e organizzare meglio la raccolta dei rifiuti. I primi risultati, a detta dei tecnici, sono incoraggianti: gli ingorghi nelle ore di punta si sono ridotti e alcune zone, un tempo congestionate, respirano finalmente un po’ meglio. Tuttavia, nonostante questi progressi, cresce il malumore di chi teme che una simile rete di controllo finisca per sorvegliare i cittadini più che per servirli. Il garante locale per la riservatezza ha chiesto che i dati vengano conservati per un periodo limitato e che nessuno possa risalire alle singole persone, a meno che non intervenga un giudice. L’amministrazione assicura che i dati sono anonimi, ma si rifiuta di rendere pubblico il contratto con l’azienda fornitrice, e questo non fa che alimentare i sospetti. Gli esperti consultati dal quotidiano locale invitano alla prudenza: la tecnologia, osservano, non è né buona né cattiva in sé; conta chi la gestisce e con quali regole. Perché la fiducia non si perda, sarebbe necessario che i cittadini fossero coinvolti fin dall’inizio, e non soltanto informati a cose fatte.",
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
    script: "Allora, riprendiamo da dove eravamo rimasti. Nei giorni scorsi il consiglio comunale di Montefosco si è riunito per decidere se estendere i sensori anche ai quartieri periferici. Come dire… la discussione è stata piuttosto accesa. Da una parte, i consiglieri di maggioranza sostengono che sarebbe un errore fermarsi proprio adesso, ora che i benefici cominciano a vedersi. Dall’altra, l’opposizione chiede che, prima di andare avanti, si faccia una verifica indipendente e che i risultati siano resi pubblici. Insomma, nessuno mette in discussione l’utilità della tecnologia; il punto è chi controlla chi. Alla fine, dopo quasi tre ore, è stato approvato un compromesso: niente nuovi sensori finché una commissione, composta anche da cittadini scelti a sorteggio, non avrà presentato le sue conclusioni. Vedremo, quindi, se il dialogo basterà a ricucire la fiducia.",
    questions: [
      {
        id: "it-b2-1-l1",
        prompt: "Que devait décider le conseil municipal, et que répondent la majorité et l’opposition ?",
        referenceAnswer: "Il devait décider d’étendre ou non les capteurs aux quartiers périphériques ; la majorité juge qu’il serait faux de s’arrêter maintenant, l’opposition réclame d’abord une vérification indépendante et publique.",
        expectedPoints: ["extension aux quartiers périphériques", "majorité : continuer, les bénéfices apparaissent", "opposition : vérification indépendante et publique"],
      },
      {
        id: "it-b2-1-l2",
        prompt: "Que signifie l’expression « le point est de savoir qui contrôle qui » dans ce contexte ?",
        referenceAnswer: "Le désaccord ne porte pas sur l’utilité de la technologie mais sur le pouvoir de surveillance : qui détient les données et peut contrôler les autres.",
        expectedPoints: ["l’utilité de la technologie n’est pas contestée", "le vrai enjeu est le contrôle et le pouvoir sur les données"],
      },
      {
        id: "it-b2-1-l3",
        prompt: "Quel compromis a été adopté, et qu’espère-t-on en obtenir ?",
        referenceAnswer: "Aucun nouveau capteur tant qu’une commission, comprenant des citoyens tirés au sort, n’a pas rendu ses conclusions ; on espère que le dialogue rétablira la confiance.",
        expectedPoints: ["pause sur les nouveaux capteurs", "commission avec des citoyens tirés au sort", "rétablir la confiance"],
      },
    ],
  },
  writing: {
    prompt: "Vous écrivez au journal local d’une ville qui a installé des capteurs dans ses rues. En 5 phrases en italien, dites si vous soutenez ce projet, quel risque vous inquiète le plus et quelle garantie vous demanderiez à la mairie.",
  },
  audio: null,
  reviewedOn: null,
};
