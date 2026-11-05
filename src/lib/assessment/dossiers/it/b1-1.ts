import type { AssessmentDossier } from "@/lib/schemas/assessment";

export const dossier: AssessmentDossier = {
  id: "it-b1-1",
  language: "it",
  level: "B1",
  topic: "culture",
  title: "Il teatro di Valbruna riapre",
  reading: {
    text: "Il piccolo teatro comunale di Valbruna, chiuso da quasi vent’anni, riaprirà le porte al pubblico la prossima primavera. Lo ha annunciato ieri l’assessora alla cultura, spiegando che i lavori di restauro, che erano stati rimandati più volte per mancanza di fondi, cominceranno entro l’autunno. «Se tutto andrà come previsto, potremo inaugurare la stagione già ad aprile», ha dichiarato. Il progetto non prevede soltanto spettacoli. Secondo i promotori, la sala dovrebbe ospitare anche corsi di teatro per i ragazzi, incontri con scrittori e un piccolo cinema d’essai, così che il teatro diventi un luogo vissuto tutti i giorni e non solo nelle serate di gala. Non tutti, però, sono convinti. Alcuni abitanti temono che i costi superino le previsioni e che il Comune sia costretto ad aumentare le tasse; altri vorrebbero che prima si sistemassero le strade del paese. L’associazione degli amici del teatro, che raccoglie centinaia di volontari, risponde che la cultura non è un lusso, ma un investimento: un teatro vivo, sostiene, attirerebbe visitatori, darebbe lavoro a giovani artisti e renderebbe il paese più attraente per chi decide di restarci. Nelle prossime settimane si terrà un’assemblea pubblica per discutere il progetto.",
    questions: [
      {
        id: "it-b1-1-r1",
        prompt: "Quelle est la nouvelle annoncée, et à quelle condition le théâtre pourrait-il ouvrir dès avril ?",
        referenceAnswer: "La réouverture du théâtre, fermé depuis près de vingt ans, est annoncée pour le printemps prochain ; il pourrait ouvrir dès avril si les travaux se déroulent comme prévu.",
        expectedPoints: ["réouverture du théâtre fermé depuis longtemps", "ouverture possible en avril", "à condition que tout se passe comme prévu"],
      },
      {
        id: "it-b1-1-r2",
        prompt: "Que veulent faire les promoteurs du projet en plus des spectacles, et dans quel but ?",
        referenceAnswer: "Ils veulent proposer des cours, des rencontres avec des écrivains et un petit cinéma, afin que le théâtre soit fréquenté tous les jours et pas seulement les soirs de gala.",
        expectedPoints: ["cours de théâtre, rencontres, petit cinéma", "faire du théâtre un lieu vivant au quotidien"],
      },
      {
        id: "it-b1-1-r3",
        prompt: "Pourquoi certains habitants sont-ils sceptiques, et comment l’association des amis du théâtre leur répond-elle ?",
        referenceAnswer: "Ils craignent que les coûts dépassent les prévisions et que les impôts augmentent ; l’association répond que la culture est un investissement qui attirerait des visiteurs et créerait des emplois.",
        expectedPoints: ["crainte de coûts et d’impôts en hausse", "la culture vue comme un investissement"],
      },
    ],
  },
  listening: {
    source: "youtube",
    video: {
      youtubeId: "BNF7uSEayzk",
      title: "La Storia Della Pizza in Italia In Pochi Minuti",
      channel: "Impara l'Italiano con Italiano Automatico",
      start: 184,
      end: 241,
      checkedOn: null,
    },
    questions: [
      {
        id: "it-b1-1-l1",
        prompt: "Qu’est-ce qui l’a surpris dans l’histoire de la pizza ?",
        referenceAnswer: "Pendant des siècles, la pizza était blanche, sans tomate.",
        expectedPoints: ["la pizza était blanche", "pendant des siècles / sans tomate"],
      },
      {
        id: "it-b1-1-l2",
        prompt: "Pourquoi les Italiens n’ont-ils pas adopté la tomate tout de suite ?",
        referenceAnswer: "Elle venait d’Amérique, arrivée après 1492, et ils s’en méfiaient : beaucoup la croyaient décorative, ou même toxique.",
        expectedPoints: ["elle venait d’Amérique", "ils la croyaient décorative ou toxique"],
      },
      {
        id: "it-b1-1-l3",
        prompt: "Qui a commencé à mettre la tomate sur la pizza, et quand ?",
        referenceAnswer: "Les Napolitains, au XVIIIe siècle.",
        expectedPoints: ["les Napolitains", "au XVIIIe siècle"],
      },
    ],
  },
  writing: {
    prompt: "Un journal local te demande ton avis : un ancien théâtre de ta ville va rouvrir. Écris 4 phrases en italien : si le projet te semble utile, quelle activité tu y proposerais et pourquoi.",
  },
  audio: null,
  reviewedOn: "2026-11-03",
};
