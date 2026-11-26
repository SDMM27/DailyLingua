import type { RoleplayScenario } from "@dailylingua/schemas";

/**
 * The scenarios of the role play (`j5-pr3-jeu-de-role.md` §1). They do not depend on the target language: the AI plays
 * the character in the language the learner studies. Each has three objectives a learner can reach in one reply and a
 * reader can check from the conversation alone. Texts are in the two languages of the interface.
 */
export const ROLEPLAY_SCENARIO_LIST: readonly RoleplayScenario[] = [
  {
    id: "cafe-order",
    minLevel: "A1",
    maxLevel: "A2",
    title: { fr: "Commander au café", en: "Ordering at a café" },
    situation: {
      fr: "Tu t'assois à la terrasse d'un café. Le serveur arrive pour prendre ta commande.",
      en: "You sit down on a café terrace. The waiter comes over to take your order.",
    },
    aiRole: { fr: "Le serveur du café", en: "The café waiter" },
    learnerRole: { fr: "Un client", en: "A customer" },
    objectives: [
      { fr: "Commande une boisson", en: "Order a drink" },
      { fr: "Commande quelque chose à manger", en: "Order something to eat" },
      { fr: "Demande l'addition", en: "Ask for the bill" },
    ],
  },
  {
    id: "ask-directions",
    minLevel: "A1",
    maxLevel: "A2",
    title: { fr: "Demander son chemin", en: "Asking for directions" },
    situation: {
      fr: "Tu es perdu dans une ville que tu ne connais pas. Tu cherches la gare et tu arrêtes un passant.",
      en: "You are lost in a town you do not know. You are looking for the station and stop a passer-by.",
    },
    aiRole: { fr: "Un passant qui connaît bien le quartier", en: "A passer-by who knows the area well" },
    learnerRole: { fr: "Un touriste perdu", en: "A lost tourist" },
    objectives: [
      { fr: "Demande où se trouve la gare", en: "Ask where the station is" },
      { fr: "Demande si c'est loin à pied", en: "Ask whether it is far on foot" },
      { fr: "Répète l'itinéraire pour vérifier que tu as bien compris", en: "Repeat the route to check you understood" },
    ],
  },
  {
    id: "book-a-room",
    minLevel: "A2",
    maxLevel: "B1",
    title: { fr: "Réserver une chambre", en: "Booking a hotel room" },
    situation: {
      fr: "Tu téléphones à un petit hôtel pour réserver une chambre pour un week-end.",
      en: "You phone a small hotel to book a room for a weekend.",
    },
    aiRole: { fr: "Le réceptionniste de l'hôtel", en: "The hotel receptionist" },
    learnerRole: { fr: "Un voyageur qui réserve", en: "A traveller making a booking" },
    objectives: [
      { fr: "Indique les dates de ton séjour et le nombre de personnes", en: "Give the dates of your stay and the number of guests" },
      { fr: "Demande le prix de la chambre", en: "Ask the price of the room" },
      { fr: "Demande si le petit-déjeuner est compris", en: "Ask whether breakfast is included" },
    ],
  },
  {
    id: "at-the-pharmacy",
    minLevel: "A2",
    maxLevel: "B1",
    title: { fr: "À la pharmacie", en: "At the pharmacy" },
    situation: {
      fr: "Tu as mal à la gorge et un peu de fièvre depuis hier. Tu entres dans une pharmacie pour demander conseil.",
      en: "You have had a sore throat and a slight fever since yesterday. You walk into a pharmacy to ask for advice.",
    },
    aiRole: { fr: "Le pharmacien", en: "The pharmacist" },
    learnerRole: { fr: "Un client qui se sent malade", en: "A customer who feels ill" },
    objectives: [
      { fr: "Décris tes symptômes", en: "Describe your symptoms" },
      { fr: "Dis depuis combien de temps tu les as", en: "Say how long you have had them" },
      { fr: "Demande comment prendre le médicament proposé", en: "Ask how to take the medicine suggested" },
    ],
  },
  {
    id: "doctor-appointment",
    minLevel: "A2",
    maxLevel: "B2",
    title: { fr: "Un rendez-vous chez le médecin par téléphone", en: "Booking a doctor's appointment by phone" },
    situation: {
      fr: "Tu appelles le cabinet de ton médecin parce que tu as besoin d'un rendez-vous cette semaine.",
      en: "You call your doctor's surgery because you need an appointment this week.",
    },
    aiRole: { fr: "La secrétaire du cabinet médical", en: "The surgery receptionist" },
    learnerRole: { fr: "Un patient", en: "A patient" },
    objectives: [
      { fr: "Explique pourquoi tu veux un rendez-vous", en: "Explain why you want an appointment" },
      { fr: "Propose ou accepte un jour et une heure précis", en: "Suggest or accept a specific day and time" },
      { fr: "Donne ton nom et un numéro de téléphone", en: "Give your name and a phone number" },
    ],
  },
  {
    id: "return-an-item",
    minLevel: "B1",
    maxLevel: "B2",
    title: { fr: "Retourner un article", en: "Returning an item" },
    situation: {
      fr: "Tu as acheté un pull il y a trois jours, mais il est trop petit. Tu retournes au magasin pour le rendre.",
      en: "You bought a jumper three days ago, but it is too small. You go back to the shop to return it.",
    },
    aiRole: { fr: "Le vendeur, poli mais strict sur les règles du magasin", en: "The shop assistant, polite but strict about the shop's rules" },
    learnerRole: { fr: "Un client qui veut rendre un article", en: "A customer returning an item" },
    objectives: [
      { fr: "Explique clairement pourquoi tu rapportes l'article", en: "Explain clearly why you are bringing the item back" },
      { fr: "Demande un remboursement ou un échange", en: "Ask for a refund or an exchange" },
      { fr: "Reste poli et trouve une solution acceptable pour les deux", en: "Stay polite and reach a solution both sides accept" },
    ],
  },
  {
    id: "negotiate-rent",
    minLevel: "B2",
    maxLevel: "C1",
    title: { fr: "Négocier un loyer", en: "Negotiating a rent" },
    situation: {
      fr: "Tu visites un appartement qui te plaît, mais le loyer dépasse ton budget. Tu en parles avec le propriétaire.",
      en: "You are viewing a flat you like, but the rent is above your budget. You discuss it with the landlord.",
    },
    aiRole: { fr: "Le propriétaire, prêt à discuter mais attaché à son prix", en: "The landlord, open to discussion but attached to the price" },
    learnerRole: { fr: "Un locataire potentiel", en: "A prospective tenant" },
    objectives: [
      { fr: "Annonce le loyer que tu peux payer et justifie-le", en: "State the rent you can afford and justify it" },
      { fr: "Propose une contrepartie (durée du bail, caution, travaux…)", en: "Offer something in return (lease length, deposit, repairs…)" },
      { fr: "Obtiens un accord, même partiel, sur le montant", en: "Reach an agreement on the amount, even a partial one" },
    ],
  },
  {
    id: "defend-an-idea",
    minLevel: "B2",
    maxLevel: "C2",
    title: { fr: "Défendre une idée en réunion", en: "Defending an idea in a meeting" },
    situation: {
      fr: "Pendant une réunion d'équipe, tu proposes de tester un nouveau projet. Ta responsable a des doutes.",
      en: "In a team meeting you suggest trying out a new project. Your manager has doubts.",
    },
    aiRole: { fr: "Ta responsable, sceptique mais ouverte aux bons arguments", en: "Your manager, sceptical but open to good arguments" },
    learnerRole: { fr: "Un membre de l'équipe qui présente son idée", en: "A team member presenting an idea" },
    objectives: [
      { fr: "Présente ton idée en quelques phrases claires", en: "Present your idea in a few clear sentences" },
      { fr: "Réponds à une objection avec un argument précis", en: "Answer an objection with a specific argument" },
      { fr: "Propose une première étape concrète pour la tester", en: "Suggest a concrete first step to test it" },
    ],
  },
];
