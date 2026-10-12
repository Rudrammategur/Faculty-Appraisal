import { UserRound, GraduationCap, BookOpen, BriefcaseBusiness, Users, ClipboardCheck, Lightbulb, ShieldCheck } from 'lucide-react'

export const APPRAISAL_SECTIONS = [
  { id: 'profile', label: 'Profile', short: 'Basic details', icon: UserRound },
  { id: 'instructional', label: 'Instructional', short: 'Teaching & projects', icon: GraduationCap },
  { id: 'research', label: 'Research & Publications', short: 'Research output', icon: BookOpen },
  { id: 'rd', label: 'R&D & Consultancy', short: 'Projects & outreach', icon: BriefcaseBusiness },
  { id: 'institutional', label: 'Institutional', short: 'Management & service', icon: Users },
  { id: 'self', label: 'Self Appraisal', short: 'Reflection & plans', icon: ClipboardCheck },
  { id: 'innovations', label: 'Innovations', short: 'New teaching initiatives', icon: Lightbulb },
  { id: 'review', label: 'Review & Submit', short: 'Preview everything', icon: ShieldCheck },
]

export const INITIAL_ROWS = {
  teaching: [
    { period: '2026-27 I', level: 'UG', course: 'CS101 – Data Structures', students: 62, evaluated: 58, load: '3-0-0' },
    { period: '2026-27 II', level: 'PG', course: 'CS602 – Advanced Algorithms', students: 28, evaluated: 26, load: '3-0-0' },
  ],
  projects: [], phd: [], journals: [], conferences: [], books: [], reports: [], awards: [],
  sponsored: [], consultancy: [], lectures: [], deptRoles: [], instituteRoles: [],
}

export const INITIAL_FORM = {
  period: '01.08.2025 – 31.07.2026',
  name: 'Faculty Name', employeeId: 'IITDH-0000', designation: 'Assistant Professor',
  payLevel: 'Level 12', basicPay: '', phdDefence: '', joiningDate: '',
  department: 'Department / Centre / Programme / School',
  teachingInnovations: '', otherInstructional: '', otherWork: '', selfAppraisal: '',
  futureWork: '', researchAtIIT: '', expectedResearch: '', expectedOutreach: '',
  expectedProfessional: '', associateSummary: '', rows: INITIAL_ROWS,
}
