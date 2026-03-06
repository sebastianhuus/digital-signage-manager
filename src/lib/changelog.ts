export interface ChangelogEntry {
  version: string
  date: string
  changes: string[]
}

export const changelog: ChangelogEntry[] = [
  {
    version: '0.7.0',
    date: '2026-03-06',
    changes: [
      'Added "What\'s New" changelog panel',
    ],
  },
  {
    version: '0.6.0',
    date: '2026-03-05',
    changes: [
      'Added loading state to assets screen',
      'Centralized navigation into a navbar layout',
    ],
  },
]
