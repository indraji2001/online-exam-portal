// ==========================================
// EXAM INTELLIGENCE ENGINE (v4.9.4/5 Modular)
// Provides AI System Directives for different standards and difficulties.
// ==========================================

const examProfiles = {
    'UG': {
        label: 'Undergraduate (UG)',
        directive: `You are generating for UNDERGRADUATE university examinations.
- Difficulty: Moderate conceptual understanding. Focus on core principles, definitions, and standard derivations.
- Question Style: Clear, single-concept questions. Avoid highly tricky or multi-layered problem chains.
- Marking: Standard +4/-1 or +1/0 as appropriate. Partial credit may apply.
- Language: Academic but accessible. BSc 1st/2nd year level.
- Avoid: Extreme numerical complexity, multi-step synthesis chains, or research-level topics.`
    },
    'PG': {
        label: 'Postgraduate (PG)',
        directive: `You are generating for POSTGRADUATE university examinations.
- Difficulty: High. Expect advanced derivations, multi-step problems, and in-depth theoretical analysis.
- Question Style: Integrate multiple sub-topics. Questions should test mastery, not just recall.
- Marking: Standard +4/-1. Include analytical and application-based questions.
- Language: Technical and rigorous. MSc/MPhil level.
- Include: Research-adjacent concepts, current trends, spectroscopic analysis, thermodynamic proofs.`
    },
    'JEE_MAINS': {
        label: 'JEE Mains',
        directive: `You are generating for JEE MAINS (NTA Pattern).
- Difficulty: Moderate. Focus on speed and accuracy — questions should be solvable in 2-3 minutes.
- Question Style: Single correct MCQs. Also include integer-type / numerical answer questions where possible.
- Marking: +4/-1 for MCQ, +4/0 for integer/numerical.
- Language: NCERT-based language but with application. Class 11+12 CBSE level.
- Include: Shortcut-friendly problems, formula-based quick solves, NCERT concepts with slight twists.
- Avoid: Multi-correct questions, overly theoretical write-ups, advanced synthesis.`
    },
    'JEE_ADV': {
        label: 'JEE Advanced',
        directive: `You are generating for JEE ADVANCED (IIT Pattern) — the hardest undergraduate entrance exam.
- Difficulty: VERY HIGH. Questions must be conceptually deep, tricky, and require multi-step reasoning.
- Question Style: Mix of single-correct, multi-correct (partial marking), integer type, and paragraph-based linked questions.
- Marking: Multi-correct: +4 full, +1/correct option; Integer: +3/0; Paragraph-linked: +3/-1.
- Language: Precise and demanding. No spoon-feeding.
- Include: Organic reaction mechanisms with stereochemistry, electrochemical cell calculations, thermodynamic cycles, quantum chemistry.
- Must Have: At least 30% multi-correct questions. At least 1 paragraph with 2-3 linked questions. Conceptual traps and distractors in options.`
    },
    'GATE': {
        label: 'GATE',
        directive: `You are generating for GATE (Graduate Aptitude Test in Engineering/Science).
- Difficulty: High. Both conceptual and numerical. Emphasis on problem-solving speed.
- Question Style: Single correct MCQs AND Numerical Answer Type (NAT) — where the answer is a number, not a choice.
- Marking: MCQ: +2/-0.67 (2-mark) or +1/-0.33 (1-mark). NAT: +2/0 or +1/0.
- Language: Precise, engineering/science graduate level. Reference standard textbooks (Atkins, Castellan, Hirose).
- Include: Significant NAT questions (at least 30%). Thermodynamics, kinetics, spectroscopy, reaction mechanisms.
- Avoid: Open-ended questions. Every question must have a unique correct answer.`
    },
    'NET': {
        label: 'CSIR-NET / JRF',
        directive: `You are generating for CSIR-NET / JRF examinations (Chemical Sciences).
- Difficulty: Very High. Tests research-level conceptual understanding across all of chemistry.
- Question Style: Single correct MCQs. Three-tier exam: Part A (aptitude), Part B (core concepts), Part C (advanced analytical).
- Marking: Part B: +2/-0.5. Part C: +4/-1.
- Language: Research-paper level. Expect IUPAC nomenclature, mechanism elucidation, and data interpretation.
- Include: Advanced organic mechanisms (pericyclic, photochemical), coordination chemistry (crystal field theory), spectroscopic data interpretation (NMR, IR, Mass Spec), quantum chemistry (perturbation theory, Hamiltonian).
- Must Have: At least 2 questions requiring interpretation of scientific data (graphs, spectra, tables).`
    },
    'JAM': {
        label: 'IIT JAM',
        directive: `You are generating for IIT JAM (Joint Admission Test for MSc).
- Difficulty: Moderate-to-High. BSc final year level with MSc entrance targeting.
- Question Style: MCQ, Multiple Select Questions (MSQ), and Numerical Answer Type (NAT).
- Marking: MCQ: +1/-1/3. MSQ: +2/0 (no negative). NAT: +1 or +2, no negative.
- Language: BSc honours level. Focus on foundational mastery with analytical application.
- Include: Physical chemistry calculations (thermodynamics, quantum, kinetics), organic reaction mechanisms, inorganic coordination chemistry.
- Must Have: At least 20% MSQ (multiple select) questions and 20% NAT questions.`
    }
};

const difficultyProfiles = {
    'EASY': {
        label: '☘️ Easy / Foundational',
        directive: `DIFFICULTY INTENSITY: EASY (Foundational)
- Focus exclusively on core definitions, direct formula application, and standard textbook recall.
- Questions should be solvable in under 2 minutes each. No conceptual traps.
- Options should be clearly distinct — no close distractors.
- Language: Simple, direct, and unambiguous.
- Avoid: Multi-step chain problems, tricky edge cases, negative marking pressure.
- Roughly 70% of questions should be rated "easy" in difficulty field.`
    },
    'MODERATE': {
        label: '⚖️ Moderate / Standard',
        directive: `DIFFICULTY INTENSITY: MODERATE (Standard Exam Level)
- A balanced mix: 40% straightforward, 40% application-based, 20% analytical.
- Questions require one or two reasoning steps. Occasional subtle distractors in options are fine.
- Language: Clear but requires careful reading.
- Include: Some numerical problems requiring formula manipulation, mechanism prediction, or data interpretation.
- Distribute difficulty field evenly: "easy", "medium", "hard" across the set.`
    },
    'HARD': {
        label: '🔥 Hard / Advanced',
        directive: `DIFFICULTY INTENSITY: HARD (Advanced / Competitive)
- Questions must challenge even well-prepared students. Multi-step reasoning is mandatory.
- Include: Conceptual traps, close distractors, tricky edge cases, and non-trivial problem chains.
- Language: Precise and demanding. Every word in the question matters.
- At least 50% of questions should require 2+ reasoning steps or non-obvious conceptual connections.
- Options: At least 2 options must appear plausible. Close numerical values or similar mechanisms as distractors.
- Majority of questions should be rated "hard" in difficulty field.`
    }
};
