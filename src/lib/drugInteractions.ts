// AI-powered drug interaction detection system
// Uses a knowledge base of common drug interactions

export interface DrugInteraction {
  drug1: string;
  drug2: string;
  severity: 'mild' | 'moderate' | 'severe';
  description: string;
  recommendation: string;
}

// Common drug interaction database (expandable)
const INTERACTION_DATABASE: DrugInteraction[] = [
  // Blood thinners interactions - CRITICAL
  {
    drug1: 'rivaroxaban',
    drug2: 'ecosprin',
    severity: 'severe',
    description: 'Rivaroxaban (anticoagulant) with Ecosprin/Aspirin significantly increases bleeding risk',
    recommendation: 'This is a known combination but requires close monitoring. Report any unusual bleeding, bruising, or blood in stool/urine immediately to your doctor.'
  },
  {
    drug1: 'rivaroxaban',
    drug2: 'aspirin',
    severity: 'severe',
    description: 'Combined anticoagulant and antiplatelet therapy increases major bleeding risk',
    recommendation: 'Prescribed together only when benefits outweigh risks. Monitor for signs of bleeding. Avoid NSAIDs.'
  },
  {
    drug1: 'ecosprin',
    drug2: 'aldactone',
    severity: 'moderate',
    description: 'Aspirin may reduce the diuretic and antihypertensive effects of Aldactone (Spironolactone)',
    recommendation: 'Monitor blood pressure regularly. Your doctor may need to adjust dosages.'
  },

  // BP medications interactions
  {
    drug1: 'nicardia',
    drug2: 'arkamin',
    severity: 'moderate',
    description: 'Nicardia (Nifedipine) and Arkamin (Clonidine) together can cause excessive blood pressure lowering',
    recommendation: 'Monitor BP regularly. Rise slowly from sitting/lying position to avoid dizziness. Report severe dizziness immediately.'
  },
  {
    drug1: 'bisoprolol',
    drug2: 'nicardia',
    severity: 'mild',
    description: 'Beta-blocker (Bisoprolol) with calcium channel blocker can enhance BP lowering effect',
    recommendation: 'Monitor blood pressure and heart rate. This combination is often prescribed but needs monitoring.'
  },
  {
    drug1: 'bisoprolol',
    drug2: 'arkamin',
    severity: 'moderate',
    description: 'Both medications lower heart rate and blood pressure',
    recommendation: 'Monitor heart rate and BP. Report if heart rate drops below 50 bpm or severe dizziness occurs.'
  },

  // Diabetes medications with other drugs
  {
    drug1: 'elista',
    drug2: 'bisoprolol',
    severity: 'moderate',
    description: 'Beta-blockers can mask symptoms of low blood sugar (hypoglycemia)',
    recommendation: 'Monitor blood glucose more frequently. Be aware that usual warning signs of low sugar may be reduced.'
  },
  {
    drug1: 'glemicil',
    drug2: 'bisoprolol',
    severity: 'moderate',
    description: 'Beta-blockers may mask hypoglycemia symptoms and affect glucose control',
    recommendation: 'Check blood sugar regularly. Beta-blockers can hide warning signs of low blood sugar.'
  },

  // Diuretic interactions
  {
    drug1: 'aldactone',
    drug2: 'addna',
    severity: 'severe',
    description: 'Aldactone (Spironolactone) is potassium-sparing; adding sodium may disrupt electrolyte balance',
    recommendation: 'Monitor potassium and sodium levels regularly. This combination requires medical supervision.'
  },
  {
    drug1: 'aldactone',
    drug2: 'arkamin',
    severity: 'moderate',
    description: 'Both can lower blood pressure; Aldactone may increase antihypertensive effect',
    recommendation: 'Monitor BP and potassium levels. Rise slowly to avoid orthostatic hypotension.'
  },

  // Anti-seizure medication interactions
  {
    drug1: 'levera',
    drug2: 'pan d',
    severity: 'mild',
    description: 'Pantoprazole (in Pan D) may slightly affect Levetiracetam absorption',
    recommendation: 'Take at different times if possible. Monitor for any changes in seizure control.'
  },

  // Gastric medications
  {
    drug1: 'pan d',
    drug2: 'acotiamide',
    severity: 'mild',
    description: 'Both affect gastric function; Pan D reduces acid while Acotiamide enhances motility',
    recommendation: 'Generally safe together. Take as prescribed for complementary effects on digestion.'
  },
  {
    drug1: 'pan d',
    drug2: 'ecosprin',
    severity: 'mild',
    description: 'Pantoprazole (PPI) helps protect stomach from aspirin-induced irritation',
    recommendation: 'Beneficial combination. Pantoprazole protects stomach lining from aspirin.'
  },

  // Antibiotic interactions
  {
    drug1: 'faronem',
    drug2: 'aldactone',
    severity: 'moderate',
    description: 'Faronem (Carbapenem antibiotic) with Aldactone may affect electrolyte levels',
    recommendation: 'Monitor kidney function and electrolytes during antibiotic course. Stay hydrated.'
  },
  {
    drug1: 'faronem',
    drug2: 'levera',
    severity: 'moderate',
    description: 'Carbapenem antibiotics may reduce anti-seizure medication levels',
    recommendation: 'Monitor for breakthrough seizures. Consult doctor if any seizure activity occurs during antibiotic treatment.'
  },

  // Iron supplement interactions
  {
    drug1: 'konsyfer',
    drug2: 'levera',
    severity: 'mild',
    description: 'Iron supplements may slightly reduce Levetiracetam absorption',
    recommendation: 'Take iron and Levera at least 2 hours apart for optimal absorption.'
  },
  {
    drug1: 'konsyfer',
    drug2: 'pan d',
    severity: 'moderate',
    description: 'Pantoprazole reduces stomach acid needed for iron absorption',
    recommendation: 'Take iron with vitamin C and 2-3 hours apart from Pan D for better absorption.'
  },

  // Existing general interactions
  {
    drug1: 'aspirin',
    drug2: 'warfarin',
    severity: 'severe',
    description: 'Increased risk of bleeding',
    recommendation: 'Consult your doctor immediately. Monitor for unusual bruising or bleeding.'
  },
  {
    drug1: 'metformin',
    drug2: 'alcohol',
    severity: 'moderate',
    description: 'Risk of lactic acidosis',
    recommendation: 'Avoid alcohol consumption while taking metformin.'
  },
  {
    drug1: 'ibuprofen',
    drug2: 'aspirin',
    severity: 'moderate',
    description: 'Reduced effectiveness of aspirin and increased GI bleeding risk',
    recommendation: 'Take aspirin at least 2 hours before ibuprofen.'
  },
  {
    drug1: 'lisinopril',
    drug2: 'potassium',
    severity: 'moderate',
    description: 'Risk of hyperkalemia (high potassium levels)',
    recommendation: 'Monitor potassium levels regularly. Avoid potassium supplements.'
  },
  {
    drug1: 'atorvastatin',
    drug2: 'grapefruit',
    severity: 'moderate',
    description: 'Increased statin levels leading to muscle damage risk',
    recommendation: 'Avoid grapefruit and grapefruit juice while taking statins.'
  },
  {
    drug1: 'warfarin',
    drug2: 'vitamin k',
    severity: 'moderate',
    description: 'Reduced effectiveness of warfarin',
    recommendation: 'Maintain consistent vitamin K intake. Consult your doctor before changing diet.'
  },
  {
    drug1: 'levothyroxine',
    drug2: 'calcium',
    severity: 'mild',
    description: 'Reduced absorption of thyroid medication',
    recommendation: 'Take levothyroxine at least 4 hours before calcium supplements.'
  },
  {
    drug1: 'metoprolol',
    drug2: 'insulin',
    severity: 'moderate',
    description: 'Masked symptoms of hypoglycemia',
    recommendation: 'Monitor blood glucose more frequently. Watch for unusual symptoms.'
  },
  {
    drug1: 'prednisone',
    drug2: 'nsaid',
    severity: 'moderate',
    description: 'Increased risk of GI ulcers and bleeding',
    recommendation: 'Use stomach protective medications. Monitor for stomach pain.'
  },
  {
    drug1: 'digoxin',
    drug2: 'furosemide',
    severity: 'moderate',
    description: 'Increased risk of digoxin toxicity due to potassium loss',
    recommendation: 'Monitor potassium and digoxin levels regularly.'
  },
];

// Normalize drug names for matching
function normalizeDrugName(name: string): string {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
}

// Check if two drug names match (handles partial matches)
function drugsMatch(name1: string, name2: string, searchTerm: string): boolean {
  const normalized = normalizeDrugName(searchTerm);
  const n1 = normalizeDrugName(name1);
  const n2 = normalizeDrugName(name2);
  
  // Check if search term contains or is contained by the drug names
  return normalized.includes(n1) || n1.includes(normalized) ||
         normalized.includes(n2) || n2.includes(normalized);
}

// Find all interactions for a given list of medicines
export function findInteractions(medicineNames: string[]): DrugInteraction[] {
  const interactions: DrugInteraction[] = [];
  const normalizedNames = medicineNames.map(normalizeDrugName);

  // Check each pair of medicines
  for (let i = 0; i < medicineNames.length; i++) {
    for (let j = i + 1; j < medicineNames.length; j++) {
      const name1 = medicineNames[i];
      const name2 = medicineNames[j];

      // Check against database
      for (const interaction of INTERACTION_DATABASE) {
        const matches = 
          (drugsMatch(interaction.drug1, interaction.drug2, name1) && 
           drugsMatch(interaction.drug1, interaction.drug2, name2)) ||
          (drugsMatch(interaction.drug2, interaction.drug1, name1) && 
           drugsMatch(interaction.drug2, interaction.drug1, name2));

        if (matches) {
          // Create a customized interaction with actual medicine names
          interactions.push({
            ...interaction,
            drug1: name1,
            drug2: name2
          });
        }
      }

      // Check for same category interactions (additional logic)
      const categoryInteractions = checkCategoryInteractions(name1, name2);
      interactions.push(...categoryInteractions);
    }
  }

  return interactions;
}

// Check for category-based interactions
function checkCategoryInteractions(name1: string, name2: string): DrugInteraction[] {
  const interactions: DrugInteraction[] = [];
  const n1 = normalizeDrugName(name1);
  const n2 = normalizeDrugName(name2);

  // NSAIDs taken together
  const nsaids = ['ibuprofen', 'naproxen', 'diclofenac', 'aspirin', 'celecoxib', 'ecosprin'];
  if (nsaids.some(drug => n1.includes(drug)) && nsaids.some(drug => n2.includes(drug))) {
    interactions.push({
      drug1: name1,
      drug2: name2,
      severity: 'moderate',
      description: 'Taking multiple NSAIDs increases GI bleeding and kidney damage risk',
      recommendation: 'Avoid combining NSAIDs. Use only one at a time.'
    });
  }

  // Blood thinners taken together
  const bloodThinners = ['warfarin', 'apixaban', 'rivaroxaban', 'rivaroxaben', 'dabigatran', 'heparin', 'ecosprin'];
  if (bloodThinners.some(drug => n1.includes(drug)) && bloodThinners.some(drug => n2.includes(drug))) {
    interactions.push({
      drug1: name1,
      drug2: name2,
      severity: 'severe',
      description: 'Multiple blood thinners significantly increase bleeding risk',
      recommendation: 'URGENT: Consult your doctor immediately. Do not combine without medical supervision.'
    });
  }

  // Beta-blockers with diabetes medications
  const betaBlockers = ['bisoprolol', 'bisocil', 'metoprolol', 'atenolol', 'carvedilol', 'propranolol'];
  const diabetesMeds = ['elista', 'glemicil', 'metformin', 'glimepiride', 'insulin', 'sitagliptin'];
  if (betaBlockers.some(drug => n1.includes(drug)) && diabetesMeds.some(drug => n2.includes(drug))) {
    interactions.push({
      drug1: name1,
      drug2: name2,
      severity: 'moderate',
      description: 'Beta-blockers can mask warning signs of low blood sugar',
      recommendation: 'Monitor blood glucose more frequently. Be extra vigilant for hypoglycemia symptoms.'
    });
  }

  // Multiple BP medications
  const bpMeds = ['nicardia', 'nifedipine', 'amlodipine', 'arkamin', 'clonidine', 'bisoprolol', 'bisocil'];
  let bpCount = 0;
  if (bpMeds.some(drug => n1.includes(drug))) bpCount++;
  if (bpMeds.some(drug => n2.includes(drug))) bpCount++;
  if (bpCount === 2) {
    // Only add if not already covered by specific interactions
    const hasSpecific = INTERACTION_DATABASE.some(int => 
      (drugsMatch(int.drug1, int.drug2, name1) && drugsMatch(int.drug1, int.drug2, name2))
    );
    if (!hasSpecific) {
      interactions.push({
        drug1: name1,
        drug2: name2,
        severity: 'mild',
        description: 'Multiple blood pressure medications may cause additive BP lowering',
        recommendation: 'Monitor blood pressure regularly. Report dizziness or weakness to your doctor.'
      });
    }
  }

  // Sedatives/CNS depressants
  const sedatives = ['diazepam', 'alprazolam', 'zolpidem', 'lorazepam', 'clonazepam'];
  if (sedatives.some(drug => n1.includes(drug)) && sedatives.some(drug => n2.includes(drug))) {
    interactions.push({
      drug1: name1,
      drug2: name2,
      severity: 'moderate',
      description: 'Combined sedatives can cause excessive drowsiness and respiratory depression',
      recommendation: 'Use caution. Do not drive or operate machinery. Avoid alcohol.'
    });
  }

  // Antibiotics with probiotics or other medications
  const antibiotics = ['faronem', 'meropenem', 'uropack', 'niftas', 'ciprofloxacin', 'azithromycin'];
  if (antibiotics.some(drug => n1.includes(drug)) || antibiotics.some(drug => n2.includes(drug))) {
    // Generic antibiotic advice
    if (n1.includes('konsyfer') || n2.includes('konsyfer') || n1.includes('iron') || n2.includes('iron')) {
      interactions.push({
        drug1: name1,
        drug2: name2,
        severity: 'mild',
        description: 'Antibiotics and iron supplements may interact, reducing effectiveness',
        recommendation: 'Take at least 2 hours apart. Complete full antibiotic course.'
      });
    }
  }

  return interactions;
}

// Analyze a single medicine being added to existing medicines
export function analyzeNewMedicine(newMedicine: string, existingMedicines: string[]): DrugInteraction[] {
  return findInteractions([...existingMedicines, newMedicine])
    .filter(interaction => 
      interaction.drug1 === newMedicine || interaction.drug2 === newMedicine
    );
}

// Get severity color for UI
export function getSeverityColor(severity: DrugInteraction['severity']): string {
  switch (severity) {
    case 'severe':
      return 'text-red-600 dark:text-red-400';
    case 'moderate':
      return 'text-orange-600 dark:text-orange-400';
    case 'mild':
      return 'text-yellow-600 dark:text-yellow-400';
    default:
      return 'text-gray-600 dark:text-gray-400';
  }
}

// Get severity badge variant
export function getSeverityVariant(severity: DrugInteraction['severity']): 'destructive' | 'default' | 'secondary' {
  switch (severity) {
    case 'severe':
      return 'destructive';
    case 'moderate':
      return 'default';
    case 'mild':
      return 'secondary';
    default:
      return 'secondary';
  }
}
