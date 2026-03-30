import ts from "typescript"

const THRESHOLD = 0.8
const SOURCE_DIR = new URL("../src/", import.meta.url)

function hasJSDoc(node, sourceFile) {
  const ranges = ts.getLeadingCommentRanges(sourceFile.getFullText(), node.getFullStart()) ?? []
  return ranges.some((range) => sourceFile.getFullText().slice(range.pos, range.end).startsWith("/**"))
}

function visit(node, sourceFile, counts) {
  if (ts.isFunctionDeclaration(node) && node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) {
    counts.total += 1
    if (hasJSDoc(node, sourceFile)) counts.documented += 1
  }

  if (ts.isVariableStatement(node) && node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) {
    counts.total += 1
    if (hasJSDoc(node, sourceFile)) counts.documented += 1
  }

  if ((ts.isTypeAliasDeclaration(node) || ts.isInterfaceDeclaration(node)) && node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) {
    counts.total += 1
    if (hasJSDoc(node, sourceFile)) counts.documented += 1
  }

  ts.forEachChild(node, (child) => visit(child, sourceFile, counts))
}

async function getSourceFiles(dirUrl) {
  const cwd = Bun.fileURLToPath(dirUrl)
  return Array.fromAsync(new Bun.Glob("**/*.ts").scan({ cwd, absolute: true }))
}

const files = await getSourceFiles(SOURCE_DIR)
const counts = { total: 0, documented: 0 }

for (const file of files) {
  const sourceText = await Bun.file(file).text()
  const sourceFile = ts.createSourceFile(file, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
  visit(sourceFile, sourceFile, counts)
}

const coverage = counts.total === 0 ? 1 : counts.documented / counts.total
if (coverage < THRESHOLD) {
  console.error(`JSDoc coverage ${(coverage * 100).toFixed(2)}% is below required ${(THRESHOLD * 100).toFixed(2)}% (${counts.documented}/${counts.total})`)
  process.exit(1)
}

console.log(`JSDoc coverage ${(coverage * 100).toFixed(2)}% (${counts.documented}/${counts.total})`)
