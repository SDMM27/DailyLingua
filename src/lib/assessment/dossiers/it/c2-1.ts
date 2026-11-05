import type { AssessmentDossier } from "@/lib/schemas/assessment";

export const dossier: AssessmentDossier = {
  id: "it-c2-1",
  language: "it",
  level: "C2",
  topic: "cinéma",
  title: "Lo spettatore con la sentenza in tasca",
  reading: {
    text: "Esiste un genere di spettatore che chi frequenta le sale riconosce al primo sguardo: non guarda il film, ma arriva avendo già assorbito il giudizio che lo accompagna. Entra con la sentenza già in tasca e valuta il film scena per scena come un contabile scrupoloso, e se ne va soddisfatto soltanto quando i conti tornano: cioè quando il film ha confermato ciò che di esso si diceva. È una forma di pigrizia travestita da competenza, e proprio per questo tanto più diffusa. Il cinema, del resto, ha fatto di tutto per meritarsela. Per decenni ha coltivato la figura dell’autore, quel demiurgo a cui si perdona ogni lungaggine in nome di una visione, e ha insegnato al pubblico che l’oscurità, purché solenne, equivale alla profondità. Ne è nato un curioso patto di reciproca indulgenza: il regista promette il mistero, lo spettatore finge di averlo capito, e nessuno dei due, per pudore, ammette di essersi annoiato. Il silenzio che cala nell’atrio quando, all’uscita, si commenta il film è uno dei rumori più eloquenti della vita culturale: tutti sono d’accordo, e nessuno sa su che cosa. Si immagini ora un cineasta, inventato per l’occasione, che decida di rompere il patto. Gira un film di novanta minuti in cui accade quasi nulla: una donna attraversa una città di notte, parla poco, guarda molto. Nessun simbolo è spiegato, nessuna musica suggerisce come commuoversi. La critica, spiazzata, si divide con l’eleganza di chi non sa che pensare. Gli articoli si moltiplicano, i convegni pure, e a ogni nuova interpretazione il film sembra allontanarsi un po’ di più da chi lo ha fatto: c’è chi vi scorge un capolavoro dell’assenza, chi un esercizio di vanità. Il paradosso, che il nostro cineasta avrebbe probabilmente apprezzato, è che entrambe le fazioni hanno ragione, e che proprio lì sta il punto. Un’opera che sopporta letture opposte non è necessariamente ambigua per astuzia; talvolta lo è per onestà, perché rinuncia a stabilire in anticipo che cosa dobbiamo sentire. Il vero rischio, per chi la guarda, non è non capire, ma capire troppo in fretta, ossia ricondurre l’ignoto al già noto e uscire dalla sala identici a come vi si era entrati, soltanto un po’ più persuasi di avere ragione.",
    questions: [
      {
        id: "it-c2-1-r1",
        prompt: "Quel ton l’auteur adopte-t-il à l’égard du spectateur qui arrive « avec la sentence en poche », et à quoi le voit-on ?",
        referenceAnswer: "Un ton ironique et critique : il le compare à un comptable scrupuleux et parle d’une paresse déguisée en compétence.",
        expectedPoints: ["ironie, regard critique", "image du comptable", "paresse déguisée en compétence"],
      },
      {
        id: "it-c2-1-r2",
        prompt: "Que désigne l’auteur par « pacte d’indulgence réciproque » entre le cinéaste et le public, et que pense-t-il de ce pacte ?",
        referenceAnswer: "Le cinéaste promet du mystère, le spectateur feint de comprendre et personne n’avoue s’être ennuyé : l’auteur y voit une complaisance mutuelle, qu’il moque.",
        expectedPoints: ["chacun feint : mystère promis, compréhension simulée", "personne n’avoue l’ennui", "regard moqueur sur cette complaisance"],
      },
      {
        id: "it-c2-1-r3",
        prompt: "Pourquoi l’auteur juge-t-il que le vrai risque est de « comprendre trop vite » ?",
        referenceAnswer: "Parce que comprendre trop vite revient à ramener l’inconnu au déjà connu : on sort de la salle inchangé, simplement plus sûr d’avoir raison.",
        expectedPoints: ["ramener l’inconnu au connu", "ressortir inchangé", "plus convaincu d’avoir raison"],
      },
    ],
  },
  listening: {
    source: "youtube",
    video: {
      youtubeId: "BCZDcZ8ueGA",
      title: "Alessandro Barbero - La rivoluzione di Francesco d'Assisi",
      channel: "Festival del Medioevo",
      start: 460,
      end: 555,
      checkedOn: null,
    },
    questions: [
      {
        id: "it-c2-1-l1",
        prompt: "Pourquoi Rome refuse-t-elle aux Vaudois le droit de prêcher ?",
        referenceAnswer: "On les juge ignorants : leur Évangile est traduit en français parce qu’ils ne savent pas le latin, et ils ne comprennent pas la théologie. Pour l’Église, prêcher revient à un clergé formé, qui connaît les pièges.",
        expectedPoints: ["ils sont jugés ignorants (pas de latin, pas de théologie)", "la prédication revient à un clergé formé"],
      },
      {
        id: "it-c2-1-l2",
        prompt: "Quel ton prend Barbero quand il fait parler les gens de Rome (« Ragazzi, mi dispiace… », « state buoni e zitti ») ?",
        referenceAnswer: "Il les fait parler au style direct, de façon familière et un peu comique ; c’est ironique, mais sans méchanceté : la scène devient vivante.",
        expectedPoints: ["style direct / langage familier", "ironie légère, sans méchanceté"],
      },
      {
        id: "it-c2-1-l3",
        prompt: "Pourquoi insiste-t-il sur la « parfaite bonne foi » du clergé ?",
        referenceAnswer: "Pour éviter un jugement moralisateur ou anachronique : le refus ne vient pas de la corruption, mais de la conviction sincère que la foi doit être enseignée par des gens formés.",
        expectedPoints: ["éviter de juger / caricaturer le clergé", "conviction sincère, pas de la corruption"],
      },
    ],
  },
  writing: {
    prompt: "Dans un court texte de 6 phrases en italien, défends ou conteste l’idée qu’un film exigeant mérite plus de patience de la part du spectateur. Appuie-toi sur un exemple général ou imaginaire, sans citer d’œuvre réelle.",
  },
  audio: null,
  reviewedOn: "2026-11-03",
};
