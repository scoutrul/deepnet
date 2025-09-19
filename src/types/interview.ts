/**
 * Типы для системы контекстных подсказок интервью
 */

export interface InterviewContext {
  id: string
  role: RoleInfo
  skills: SkillsInfo
  background: BackgroundInfo
  experience: ExperienceInfo
  createdAt: Date
  updatedAt: Date
}

export interface RoleInfo {
  position: string
  level: string
  company: string
  industry: string
}

export interface SkillsInfo {
  primary: string[]
  secondary: string[]
  frameworks: string[]
  tools: string[]
}

export interface BackgroundInfo {
  education: string
  yearsOfExperience: number
  previousRoles: string[]
  achievements: string[]
}

export interface ExperienceInfo {
  currentRole: string
  responsibilities: string[]
  projects: string[]
  technologies: string[]
}

export interface TechnologyHint {
  id: string
  name: string
  category: string
  relevance: number
  description?: string
}

export interface HintDetailRequest {
  hintId: string
  context: InterviewContext
}

export interface HintDetailResponse {
  hint: TechnologyHint
  details: string
  contextualInfo: string
  examples: string[]
  relatedTopics: string[]
}

export interface HintGenerationRequest {
  context: InterviewContext
  count?: number
}

export interface HintGenerationResponse {
  hints: TechnologyHint[]
  generatedAt: Date
  contextHash: string
}
