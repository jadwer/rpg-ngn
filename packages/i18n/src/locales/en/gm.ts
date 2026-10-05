import type { Messages } from '../../types.js'
import type { gm as es } from '../es/gm.js'

export const gm: Messages<typeof es> = {
  lintCut: 'The GM revised the narration: it revealed something the table has not discovered yet.',
  lintCutDetailOne: 'The knowledge lint cut one block. The reason is in the turn result; the mode is set with GM_LINT or per table.',
  lintCutDetailMany: 'The knowledge lint cut {{n}} blocks. The reason is in the turn result; the mode is set with GM_LINT or per table.',
  whatDoYouDo: 'What do you do, {{name}}?',
  whatDoYouAllDo: 'What do you do?',
  cutShort: 'The narration was cut short: the GM reached its writing limit.',
  cutShortDetail: 'The model ran out of maxOutputTokens. Close another turn so it continues, or raise the output budget.',
  ignoredOne: 'The GM proposed 1 line that could not be applied and was ignored.',
  ignoredMany: 'The GM proposed {{n}} lines that could not be applied and were ignored.',
  ignoredDetail: 'It is usually an event with a character who is not in the session, an item nobody has or a malformed roll. The narration the table read does not change and there is nothing to do.',
  previously: 'Previously...',
  roll: '{{name}} rolls {{die}}{{skill}}{{origin}}: {{result}}{{dice}}',
  withOwnDie: ' with their own die',
  noDeclarations: 'The turn closed with no declarations. The GM waits.',
  listening: 'Turn {{n}}: the GM listens to the table.',
  notedOne: 'The GM takes note of what {{names}} declares. The scene is still open and the table has the floor.',
  notedMany: 'The GM takes note of what {{names}} declare. The scene is still open and the table has the floor.',
  and: 'and',
  sessionStarts: 'The session starts at {{place}}.',
  yourGoal: 'You are {{name}}. Only you know this. Your goal: {{goal}}',
  youKnow: 'And you know something the others don\'t: {{knows}}',
}
