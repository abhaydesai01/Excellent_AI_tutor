const SUBJECT_KEYWORDS: Record<string, string[]> = {
  Mathematics: [
    "algebra", "calculus", "geometry", "trigonometry", "statistics",
    "probability", "matrix", "vector", "differential", "integral",
    "equation", "polynomial", "logarithm", "sequence", "series",
    "coordinate", "function", "limit", "derivative", "permutation",
    "combination", "set theory", "number theory",
  ],
  Physics: [
    "force", "energy", "momentum", "velocity", "acceleration",
    "gravity", "electromagnetic", "wave", "optics", "thermodynamics",
    "quantum", "nuclear", "electric", "magnetic", "circuit",
    "resistance", "capacitor", "inductor", "mechanics", "fluid",
    "sound", "light", "heat", "temperature", "pressure",
  ],
  Chemistry: [
    "element", "compound", "reaction", "bond", "organic",
    "inorganic", "acid", "base", "oxidation", "reduction",
    "electrochemistry", "mole", "atomic", "molecular", "periodic",
    "chemical", "solution", "equilibrium", "kinetics", "polymer",
    "isomer", "functional group", "stoichiometry",
  ],
  Biology: [
    "cell", "dna", "rna", "protein", "gene", "evolution",
    "ecology", "anatomy", "physiology", "botany", "zoology",
    "microbiology", "genetics", "enzyme", "hormone", "neuron",
    "photosynthesis", "respiration", "mitosis", "meiosis",
    "taxonomy", "biodiversity", "ecosystem",
  ],
};

const TOPIC_MAP: Record<string, Record<string, string[]>> = {
  Mathematics: {
    Algebra: ["equation", "polynomial", "quadratic", "linear", "variable", "expression"],
    Calculus: ["derivative", "integral", "limit", "differential", "continuity"],
    Trigonometry: ["sin", "cos", "tan", "trigonometric", "angle", "radian"],
    "Coordinate Geometry": ["coordinate", "slope", "line", "circle", "parabola", "ellipse"],
    "Probability & Statistics": ["probability", "mean", "median", "mode", "variance", "distribution"],
  },
  Physics: {
    Mechanics: ["force", "newton", "momentum", "velocity", "acceleration", "friction"],
    Thermodynamics: ["heat", "temperature", "entropy", "enthalpy", "gas law"],
    Electromagnetism: ["electric", "magnetic", "current", "voltage", "resistance", "circuit"],
    Optics: ["light", "lens", "mirror", "reflection", "refraction", "wave"],
    "Modern Physics": ["quantum", "nuclear", "photoelectric", "relativity", "atom"],
  },
  Chemistry: {
    "Organic Chemistry": ["organic", "carbon", "hydrocarbon", "functional group", "isomer", "polymer"],
    "Inorganic Chemistry": ["element", "periodic", "metal", "non-metal", "coordination"],
    "Physical Chemistry": ["thermodynamics", "kinetics", "equilibrium", "electrochemistry", "solution"],
  },
  Biology: {
    "Cell Biology": ["cell", "membrane", "organelle", "mitosis", "meiosis"],
    Genetics: ["gene", "dna", "rna", "heredity", "mutation", "chromosome"],
    "Plant Biology": ["photosynthesis", "plant", "root", "leaf", "transpiration"],
    "Human Physiology": ["heart", "lung", "kidney", "brain", "blood", "digestion"],
    Ecology: ["ecosystem", "food chain", "biodiversity", "habitat", "population"],
  },
};

export interface TopicClassification {
  subject: string;
  topic: string;
  subTopic: string;
  confidence: number;
}

export function classifyTopic(question: string): TopicClassification {
  const lower = question.toLowerCase();

  // Score each subject
  const subjectScores: Record<string, number> = {};
  for (const [subject, keywords] of Object.entries(SUBJECT_KEYWORDS)) {
    subjectScores[subject] = keywords.filter(k => lower.includes(k)).length;
  }

  // Find best subject
  const bestSubject = Object.entries(subjectScores)
    .sort(([, a], [, b]) => b - a)[0];

  const subject = bestSubject[1] > 0 ? bestSubject[0] : "General";
  const confidence = Math.min(bestSubject[1] / 3, 1);

  // Find topic within subject
  let topic = "General";
  let subTopic = "General";

  if (subject !== "General" && TOPIC_MAP[subject]) {
    let bestTopicScore = 0;
    for (const [topicName, keywords] of Object.entries(TOPIC_MAP[subject])) {
      const score = keywords.filter(k => lower.includes(k)).length;
      if (score > bestTopicScore) {
        bestTopicScore = score;
        topic = topicName;
      }
    }
  }

  return { subject, topic, subTopic, confidence };
}
