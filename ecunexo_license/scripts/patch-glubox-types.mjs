/**
 * glubox ships some .d.ts with wrong relative roots. Re-run after each install.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const distSrc = fs.existsSync(path.join(root, 'node_modules', 'glubox', 'dist', 'src'))
  ? path.join(root, 'node_modules', 'glubox', 'dist', 'src')
  : path.join(root, 'node_modules', 'glubox', 'dist')

if (!fs.existsSync(distSrc)) {
  console.warn('[patch-glubox-types] glubox dist not found — skip')
  process.exit(0)
}

function patchFile(filePath, transform) {
  const before = fs.readFileSync(filePath, 'utf8')
  const after = transform(before)
  if (after !== before) {
    fs.writeFileSync(filePath, after, 'utf8')
    return true
  }
  return false
}

let changed = 0

const indexPath = path.join(distSrc, 'index.d.ts')
if (
  patchFile(indexPath, (s) =>
    s
      .replaceAll("from '../components/", "from './components/")
      .replaceAll("from '../shared/", "from './shared/")
  )
) {
  changed += 1
}

/** @type {Array<[string, (s: string) => string]>} */
const filePatches = [
  [
    'components/PageActionsMenu/type/PageActionsMenu.types.d.ts',
    (s) =>
      s.replace(
        "from '../../../../components/navigation'",
        "from '../../../navigation'"
      ),
  ],
  [
    'components/DateBox/type/DateBox.types.d.ts',
    (s) =>
      s.replace(
        "from '../../../../shared/fieldClear.types'",
        "from '../../../shared/fieldClear.types'"
      ),
  ],
  [
    'components/RangeDateBox/type/RangeDateBox.types.d.ts',
    (s) =>
      s.replace(
        "from '../../../../shared/fieldClear.types'",
        "from '../../../shared/fieldClear.types'"
      ),
  ],
  [
    'components/Select/type/Select.types.d.ts',
    (s) =>
      s.replace(
        "from '../../../../shared/fieldClear.types'",
        "from '../../../shared/fieldClear.types'"
      ),
  ],
  [
    'components/TextArea/type/TextArea.types.d.ts',
    (s) =>
      s.replace(
        "from '../../../../shared/fieldClear.types'",
        "from '../../../shared/fieldClear.types'"
      ),
  ],
  [
    'components/TextBox/type/TextBox.types.d.ts',
    (s) =>
      s.replace(
        "from '../../../../shared/fieldClear.types'",
        "from '../../../shared/fieldClear.types'"
      ),
  ],
  [
    'components/Popup/theme/Popup.theme.types.d.ts',
    (s) =>
      s.replace(
        "from '../../../../components/shared/overlayThemeBuilder'",
        "from '../../../shared/overlayThemeBuilder'"
      ),
  ],
  [
    'components/Popup/type/Popup.types.d.ts',
    (s) =>
      s.replace(
        "from '../../../../components/Button/type/Button.types'",
        "from '../../../Button/type/Button.types'"
      ),
  ],
  [
    'components/Sidebar/type/filterVisibleMenu.d.ts',
    (s) =>
      s.replace(
        "from '../../../../components/Sidebar/type/menu.types'",
        "from './menu.types'"
      ),
  ],
]

for (const [rel, transform] of filePatches) {
  const full = path.join(distSrc, rel)
  if (!fs.existsSync(full)) continue
  if (patchFile(full, transform)) changed += 1
}

console.log(`[patch-glubox-types] patched ${changed} file(s)`)
