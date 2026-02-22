import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("password123", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@aitutor.com" },
    update: {},
    create: { name: "Admin User", email: "admin@aitutor.com", passwordHash, role: "admin", emailVerified: true },
  });

  await prisma.user.upsert({
    where: { email: "educator@aitutor.com" },
    update: {},
    create: { name: "Dr. Sharma", email: "educator@aitutor.com", passwordHash, role: "educator", emailVerified: true },
  });

  await prisma.user.upsert({
    where: { email: "mentor@aitutor.com" },
    update: {},
    create: { name: "Mentor Singh", email: "mentor@aitutor.com", passwordHash, role: "mentor", emailVerified: true },
  });

  const studentData = [
    { name: "Aarav Patel", email: "aarav@student.com", batch: "JEE-2026" },
    { name: "Priya Sharma", email: "priya@student.com", batch: "NEET-2026" },
    { name: "Rohan Gupta", email: "rohan@student.com", batch: "JEE-2026" },
    { name: "Ananya Singh", email: "ananya@student.com", batch: "NEET-2026" },
    { name: "Vikram Reddy", email: "vikram@student.com", batch: "JEE-2026" },
    { name: "Sneha Kumar", email: "sneha@student.com", batch: "NEET-2026" },
    { name: "Arjun Nair", email: "arjun@student.com", batch: "JEE-2026" },
    { name: "Kavya Iyer", email: "kavya@student.com", batch: "NEET-2026" },
    { name: "Rahul Verma", email: "rahul@student.com", batch: "JEE-2026" },
    { name: "Meera Joshi", email: "meera@student.com", batch: "NEET-2026" },
    { name: "Aditya Rao", email: "aditya@student.com", batch: "JEE-2026" },
    { name: "Ishita Mehta", email: "ishita@student.com", batch: "NEET-2026" },
  ];

  const students = [];
  for (const s of studentData) {
    const student = await prisma.user.upsert({
      where: { email: s.email },
      update: {},
      create: { name: s.name, email: s.email, passwordHash, role: "student", batch: s.batch, emailVerified: true },
    });
    students.push(student);
  }

  const sampleResponse = `## Solution
This is a detailed step-by-step solution for the question asked.

Step 1: Identify the key concepts involved.
Step 2: Apply the relevant formula or principle.
Step 3: Solve step by step showing all work.
Step 4: Verify the answer.

## Simplified Explanation
Here's a simpler way to think about this concept using an everyday analogy.

## Related Concepts
- Related concept 1
- Related concept 2
- Related concept 3`;

  const allDoubts: {
    question: string; subject: string; topic: string; complexity: string;
    difficulty: number; confidence: number;
  }[] = [
    // Mathematics - Calculus (heavy - simulates struggling)
    { question: "How do I solve the integral of x^2 * e^x dx using integration by parts?", subject: "Mathematics", topic: "Calculus", complexity: "hard", difficulty: 6, confidence: 0.4 },
    { question: "What is the integral of sin^2(x) dx?", subject: "Mathematics", topic: "Calculus", complexity: "medium", difficulty: 4, confidence: 0.5 },
    { question: "Solve: lim(x→0) (sin x)/x using L'Hopital's rule", subject: "Mathematics", topic: "Calculus", complexity: "easy", difficulty: 2, confidence: 0.8 },
    { question: "Find d/dx of ln(x^2 + 1)", subject: "Mathematics", topic: "Calculus", complexity: "easy", difficulty: 2, confidence: 0.7 },
    { question: "Evaluate the definite integral of x*cos(x) from 0 to pi", subject: "Mathematics", topic: "Calculus", complexity: "hard", difficulty: 7, confidence: 0.3 },
    { question: "What is the Taylor series expansion of e^x?", subject: "Mathematics", topic: "Calculus", complexity: "hard", difficulty: 6, confidence: 0.4 },
    { question: "How to solve differential equation dy/dx + y*tan(x) = sin(2x)?", subject: "Mathematics", topic: "Calculus", complexity: "expert", difficulty: 9, confidence: 0.2 },
    { question: "I still don't understand integration by parts. Can you explain again?", subject: "Mathematics", topic: "Calculus", complexity: "medium", difficulty: 5, confidence: 0.3 },
    { question: "What is the Maclaurin series for sin(x)?", subject: "Mathematics", topic: "Calculus", complexity: "hard", difficulty: 6, confidence: 0.4 },

    // Mathematics - Algebra
    { question: "Solve the quadratic equation 2x^2 - 5x + 3 = 0", subject: "Mathematics", topic: "Algebra", complexity: "easy", difficulty: 2, confidence: 0.9 },
    { question: "What is the remainder theorem? Explain with example.", subject: "Mathematics", topic: "Algebra", complexity: "easy", difficulty: 2, confidence: 0.8 },
    { question: "Solve using matrices: 2x + 3y = 5, 4x - y = 3", subject: "Mathematics", topic: "Algebra", complexity: "medium", difficulty: 3, confidence: 0.7 },
    { question: "Find the determinant of a 3x3 matrix", subject: "Mathematics", topic: "Algebra", complexity: "medium", difficulty: 4, confidence: 0.6 },

    // Mathematics - Trigonometry
    { question: "Prove that sin^2(x) + cos^2(x) = 1", subject: "Mathematics", topic: "Trigonometry", complexity: "easy", difficulty: 1, confidence: 0.9 },
    { question: "Solve: 2sin(x)cos(x) = sin(2x)", subject: "Mathematics", topic: "Trigonometry", complexity: "easy", difficulty: 2, confidence: 0.8 },

    // Mathematics - Coordinate Geometry
    { question: "Find the equation of a circle with center (2,3) and radius 5", subject: "Mathematics", topic: "Coordinate Geometry", complexity: "medium", difficulty: 3, confidence: 0.7 },

    // Physics - Mechanics
    { question: "What is Newton's second law? Explain with examples.", subject: "Physics", topic: "Mechanics", complexity: "easy", difficulty: 2, confidence: 0.9 },
    { question: "A projectile is launched at 45° with velocity 20 m/s. Find max height and range.", subject: "Physics", topic: "Mechanics", complexity: "medium", difficulty: 4, confidence: 0.6 },
    { question: "Derive the work-energy theorem", subject: "Physics", topic: "Mechanics", complexity: "hard", difficulty: 6, confidence: 0.4 },
    { question: "How to calculate moment of inertia of a solid sphere?", subject: "Physics", topic: "Mechanics", complexity: "hard", difficulty: 7, confidence: 0.3 },
    { question: "Explain rotational mechanics and torque for JEE Advanced", subject: "Physics", topic: "Mechanics", complexity: "expert", difficulty: 8, confidence: 0.2 },
    { question: "I keep getting confused between angular momentum and torque", subject: "Physics", topic: "Mechanics", complexity: "medium", difficulty: 5, confidence: 0.3 },
    { question: "Explain conservation of angular momentum with examples", subject: "Physics", topic: "Mechanics", complexity: "hard", difficulty: 6, confidence: 0.4 },

    // Physics - Thermodynamics
    { question: "Explain the first law of thermodynamics", subject: "Physics", topic: "Thermodynamics", complexity: "easy", difficulty: 2, confidence: 0.8 },
    { question: "Derive the efficiency of Carnot engine", subject: "Physics", topic: "Thermodynamics", complexity: "hard", difficulty: 7, confidence: 0.3 },
    { question: "What is entropy? Explain for JEE.", subject: "Physics", topic: "Thermodynamics", complexity: "hard", difficulty: 6, confidence: 0.4 },
    { question: "I don't understand adiabatic vs isothermal processes", subject: "Physics", topic: "Thermodynamics", complexity: "medium", difficulty: 4, confidence: 0.4 },

    // Physics - Electromagnetism
    { question: "Explain Faraday's law of electromagnetic induction", subject: "Physics", topic: "Electromagnetism", complexity: "hard", difficulty: 6, confidence: 0.4 },
    { question: "Derive the force on a charged particle in crossed E and B fields", subject: "Physics", topic: "Electromagnetism", complexity: "expert", difficulty: 9, confidence: 0.2 },
    { question: "What is Coulomb's law? Numerical examples for JEE", subject: "Physics", topic: "Electromagnetism", complexity: "medium", difficulty: 4, confidence: 0.6 },

    // Physics - Optics
    { question: "Explain the photoelectric effect and Einstein's equation", subject: "Physics", topic: "Optics", complexity: "hard", difficulty: 6, confidence: 0.5 },
    { question: "What is total internal reflection? Give real-life examples.", subject: "Physics", topic: "Optics", complexity: "easy", difficulty: 2, confidence: 0.8 },

    // Chemistry - Organic
    { question: "Explain SN1 and SN2 reaction mechanisms", subject: "Chemistry", topic: "Organic Chemistry", complexity: "medium", difficulty: 4, confidence: 0.5 },
    { question: "What are the rules for IUPAC nomenclature of organic compounds?", subject: "Chemistry", topic: "Organic Chemistry", complexity: "easy", difficulty: 2, confidence: 0.7 },
    { question: "Explain Markovnikov's rule with examples", subject: "Chemistry", topic: "Organic Chemistry", complexity: "medium", difficulty: 4, confidence: 0.5 },
    { question: "I keep confusing electrophilic and nucleophilic addition", subject: "Chemistry", topic: "Organic Chemistry", complexity: "medium", difficulty: 5, confidence: 0.3 },
    { question: "Mechanism of aldol condensation reaction", subject: "Chemistry", topic: "Organic Chemistry", complexity: "hard", difficulty: 6, confidence: 0.4 },
    { question: "How to identify E1 vs E2 elimination?", subject: "Chemistry", topic: "Organic Chemistry", complexity: "hard", difficulty: 6, confidence: 0.3 },

    // Chemistry - Physical
    { question: "Explain Le Chatelier's principle with examples", subject: "Chemistry", topic: "Physical Chemistry", complexity: "medium", difficulty: 4, confidence: 0.6 },
    { question: "How to solve electrochemistry numericals for JEE?", subject: "Chemistry", topic: "Physical Chemistry", complexity: "hard", difficulty: 6, confidence: 0.4 },
    { question: "What is Hess's law? Solve a numerical.", subject: "Chemistry", topic: "Physical Chemistry", complexity: "medium", difficulty: 4, confidence: 0.6 },

    // Chemistry - Inorganic
    { question: "Explain d-block elements and their properties", subject: "Chemistry", topic: "Inorganic Chemistry", complexity: "medium", difficulty: 4, confidence: 0.6 },
    { question: "What are coordination compounds? Explain for NEET.", subject: "Chemistry", topic: "Inorganic Chemistry", complexity: "hard", difficulty: 5, confidence: 0.5 },

    // Biology - Cell Biology
    { question: "What is the difference between mitosis and meiosis?", subject: "Biology", topic: "Cell Biology", complexity: "easy", difficulty: 2, confidence: 0.9 },
    { question: "Explain the Krebs cycle step by step for NEET", subject: "Biology", topic: "Cell Biology", complexity: "hard", difficulty: 7, confidence: 0.3 },
    { question: "What are the phases of cell cycle?", subject: "Biology", topic: "Cell Biology", complexity: "easy", difficulty: 2, confidence: 0.8 },

    // Biology - Genetics
    { question: "Explain Mendel's laws of inheritance", subject: "Biology", topic: "Genetics", complexity: "easy", difficulty: 2, confidence: 0.8 },
    { question: "What is Hardy-Weinberg equilibrium?", subject: "Biology", topic: "Genetics", complexity: "medium", difficulty: 5, confidence: 0.5 },
    { question: "Explain DNA replication process", subject: "Biology", topic: "Genetics", complexity: "medium", difficulty: 4, confidence: 0.6 },
    { question: "What is the central dogma of molecular biology?", subject: "Biology", topic: "Genetics", complexity: "medium", difficulty: 4, confidence: 0.5 },

    // Biology - Plant Biology
    { question: "Explain photosynthesis light and dark reactions", subject: "Biology", topic: "Plant Biology", complexity: "medium", difficulty: 4, confidence: 0.6 },
    { question: "What is transpiration? Types and factors affecting it.", subject: "Biology", topic: "Plant Biology", complexity: "easy", difficulty: 2, confidence: 0.8 },

    // Biology - Human Physiology
    { question: "Explain the human digestive system for NEET", subject: "Biology", topic: "Human Physiology", complexity: "medium", difficulty: 3, confidence: 0.7 },
    { question: "How does the human heart work? Explain cardiac cycle.", subject: "Biology", topic: "Human Physiology", complexity: "medium", difficulty: 4, confidence: 0.6 },
  ];

  const models = ["gpt-4o-mini", "gpt-4o-mini", "gpt-4o-mini", "gpt-4.1", "claude-opus-4-6"];
  const inputModes: ("text" | "voice")[] = ["text", "text", "text", "text", "voice"];
  const ratings: (string | null)[] = ["helpful", "helpful", "helpful", "not_helpful", null, null];

  let doubtCount = 0;

  for (let i = 0; i < allDoubts.length; i++) {
    const studentIdx = i % students.length;
    const d = allDoubts[i];
    const daysAgo = Math.floor(Math.random() * 30);
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - daysAgo);
    createdAt.setHours(Math.floor(Math.random() * 14) + 8);

    const modelIdx = d.complexity === "expert" ? 4 : d.complexity === "hard" ? 3 : Math.floor(Math.random() * 3);

    await prisma.doubt.create({
      data: {
        studentId: students[studentIdx].id,
        question: d.question,
        aiResponse: sampleResponse,
        subject: d.subject,
        topic: d.topic,
        subTopic: "General",
        difficultyScore: d.difficulty,
        confidenceScore: d.confidence,
        complexityLevel: d.complexity,
        modelUsed: models[modelIdx],
        inputMode: inputModes[Math.floor(Math.random() * inputModes.length)],
        status: Math.random() > 0.15 ? "resolved" : "unresolved",
        rating: ratings[Math.floor(Math.random() * ratings.length)],
        responseTimeMs: 1000 + Math.floor(Math.random() * 4000),
        createdAt,
      },
    });
    doubtCount++;
  }

  // At-risk student: Aarav - repeating Calculus, high difficulty
  for (let i = 0; i < 10; i++) {
    const daysAgo = Math.floor(Math.random() * 5);
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - daysAgo);

    await prisma.doubt.create({
      data: {
        studentId: students[0].id,
        question: `I still don't understand Calculus problem ${i + 1}. Integration by parts keeps confusing me.`,
        aiResponse: sampleResponse,
        subject: "Mathematics",
        topic: "Calculus",
        subTopic: "Integration",
        difficultyScore: 7 + Math.random() * 3,
        confidenceScore: 0.15 + Math.random() * 0.15,
        complexityLevel: "hard",
        modelUsed: "gpt-4.1",
        inputMode: i % 3 === 0 ? "voice" : "text",
        status: i % 3 === 0 ? "unresolved" : "resolved",
        rating: i % 2 === 0 ? "not_helpful" : null,
        responseTimeMs: 2000 + Math.floor(Math.random() * 3000),
        createdAt,
      },
    });
    doubtCount++;
  }

  // At-risk student: Rohan - struggling with Physics Mechanics
  for (let i = 0; i < 7; i++) {
    const daysAgo = Math.floor(Math.random() * 7);
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - daysAgo);

    await prisma.doubt.create({
      data: {
        studentId: students[2].id,
        question: `Rotational mechanics problem ${i + 1} - still confused about moment of inertia`,
        aiResponse: sampleResponse,
        subject: "Physics",
        topic: "Mechanics",
        subTopic: "Rotational Mechanics",
        difficultyScore: 6 + Math.random() * 3,
        confidenceScore: 0.2 + Math.random() * 0.2,
        complexityLevel: "hard",
        modelUsed: "gpt-4.1",
        inputMode: "text",
        status: i % 4 === 0 ? "unresolved" : "resolved",
        rating: i % 3 === 0 ? "not_helpful" : "helpful",
        responseTimeMs: 2500 + Math.floor(Math.random() * 2500),
        createdAt,
      },
    });
    doubtCount++;
  }

  // Inactive student: Vikram - last active 20 days ago
  const oldDate = new Date();
  oldDate.setDate(oldDate.getDate() - 20);
  await prisma.doubt.create({
    data: {
      studentId: students[4].id,
      question: "Basic algebra question from 20 days ago",
      aiResponse: sampleResponse,
      subject: "Mathematics",
      topic: "Algebra",
      subTopic: "General",
      difficultyScore: 2,
      confidenceScore: 0.8,
      complexityLevel: "easy",
      modelUsed: "gpt-4o-mini",
      inputMode: "text",
      status: "resolved",
      rating: "helpful",
      responseTimeMs: 1200,
      createdAt: oldDate,
    },
  });
  doubtCount++;

  // Today's doubts for active metrics
  for (let i = 0; i < 8; i++) {
    const student = students[Math.floor(Math.random() * 6)];
    await prisma.doubt.create({
      data: {
        studentId: student.id,
        question: `Today's question ${i + 1} about ${["Physics", "Mathematics", "Chemistry", "Biology"][i % 4]}`,
        aiResponse: sampleResponse,
        subject: ["Physics", "Mathematics", "Chemistry", "Biology"][i % 4],
        topic: ["Mechanics", "Calculus", "Organic Chemistry", "Genetics"][i % 4],
        subTopic: "General",
        difficultyScore: 2 + Math.floor(Math.random() * 6),
        confidenceScore: 0.3 + Math.random() * 0.6,
        complexityLevel: ["easy", "medium", "hard"][Math.floor(Math.random() * 3)],
        modelUsed: models[Math.floor(Math.random() * 4)],
        inputMode: i % 3 === 0 ? "voice" : "text",
        status: "resolved",
        rating: Math.random() > 0.3 ? "helpful" : "not_helpful",
        responseTimeMs: 1000 + Math.floor(Math.random() * 3000),
        createdAt: new Date(),
      },
    });
    doubtCount++;
  }

  // Create sample alerts
  await prisma.alert.createMany({
    data: [
      {
        type: "high_risk",
        title: "High Risk Student Detected",
        message: "Aarav Patel has a risk score of 85%. Repeated struggles with Calculus (Integration). Recommend immediate intervention.",
        studentId: students[0].id,
        severity: "critical",
      },
      {
        type: "high_risk",
        title: "Student Struggling with Mechanics",
        message: "Rohan Gupta has asked 7 doubts about Rotational Mechanics in the last week with low confidence scores.",
        studentId: students[2].id,
        severity: "high",
      },
      {
        type: "inactivity",
        title: "Student Inactive for 20 Days",
        message: "Vikram Reddy has not asked any doubts for 20 days. Last active on Mathematics - Algebra.",
        studentId: students[4].id,
        severity: "medium",
      },
      {
        type: "confusion_spike",
        title: "Confusion Spike in Calculus",
        message: "30% increase in Calculus-related doubts this week. 5 students showing repeated confusion in Integration.",
        subject: "Mathematics",
        severity: "high",
      },
      {
        type: "confusion_spike",
        title: "Organic Chemistry Confusion Rising",
        message: "Multiple students struggling with SN1/SN2 mechanisms and elimination reactions.",
        subject: "Chemistry",
        severity: "medium",
      },
      {
        type: "repeated_doubt",
        title: "Repeated Doubts Pattern Detected",
        message: "3 students have asked similar questions about Thermodynamics in the last 3 days.",
        subject: "Physics",
        severity: "low",
      },
    ],
  });

  console.log("Database seeded successfully!");
  console.log(`Created ${students.length} students, 1 admin, 1 educator, 1 mentor`);
  console.log(`Created ${doubtCount} doubts, 6 alerts`);
  console.log("\nAll users password: password123");
  console.log("Admin: admin@aitutor.com");
  console.log("Student: aarav@student.com");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
