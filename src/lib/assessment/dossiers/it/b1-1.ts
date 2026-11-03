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
    source: "script",
    script: "Intanto i volontari del teatro di Valbruna non aspettano. Sabato scorso hanno aperto il teatro per una giornata di pulizie. Una signora ha raccontato di aver visto lì il suo primo spettacolo, da bambina, e di sognare il giorno in cui potrà portarci i nipoti. Se i fondi arriveranno in tempo, dicono gli organizzatori, la prima rappresentazione sarà una commedia scritta da un gruppo di studenti del liceo. Sarebbe un bel modo di ricominciare, perché il teatro tornerebbe a parlare alla generazione che lo erediterà.",
    questions: [
      {
        id: "it-b1-1-l1",
        prompt: "Qu’ont fait les bénévoles samedi dernier ?",
        referenceAnswer: "Ils ont participé à une journée de nettoyage du théâtre.",
        expectedPoints: ["journée de nettoyage", "du théâtre"],
      },
      {
        id: "it-b1-1-l2",
        prompt: "Pourquoi ce lieu est-il particulier pour la dame interrogée, et que rêve-t-elle d’y faire ?",
        referenceAnswer: "C’est là qu’elle a vu son premier spectacle, enfant ; elle rêve d’y emmener un jour ses petits-enfants.",
        expectedPoints: ["premier spectacle dans l’enfance", "y emmener ses petits-enfants"],
      },
      {
        id: "it-b1-1-l3",
        prompt: "Pourquoi une comédie écrite par des lycéens serait-elle un bon début, selon le message ?",
        referenceAnswer: "Parce que le théâtre s’adresserait ainsi à la génération qui en héritera, ce qui serait une belle façon de recommencer.",
        expectedPoints: ["il parle aux jeunes", "ils sont la génération qui héritera du théâtre"],
      },
    ],
  },
  writing: {
    prompt: "Un journal local te demande ton avis : un ancien théâtre de ta ville va rouvrir. Écris 4 phrases en italien : si le projet te semble utile, quelle activité tu y proposerais et pourquoi.",
  },
  audio: null,
  reviewedOn: "2026-11-03",
};
