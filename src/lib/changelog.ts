export interface ChangelogEntry {
  version: string
  date: string
  changes: string[]
}

export const changelog: ChangelogEntry[] = [
  {
    version: '0.8.0',
    date: '2026-03-06',
    changes: [
      'Added "What\'s New" changelog panel to this website.',
      'Added an "activity period" for the Pi clients. They can now fetch content a bit slower during night-time to save resources',
      'Fixed issue where Pi clients won\'t start browser in Kiosk Mode if you have not yet uploaded any content to it. Now it will display a blank browser window instead of its desktop.',
    ],
  },
  {
    version: '0.6.0',
    date: '2026-03-05',
    changes: [
      'Added loading state to assets screen.',
      'Centralized navigation into a navbar layout.',
    ],
  },
]
