/**
 * self-host-assets.ts
 * ────────────────────────────────────────────────────────────────────────────
 * Script de download único — roda com: npx tsx scripts/self-host-assets.ts
 *
 * O que faz:
 *   1. Busca o CSS de cada família de fonte no Google Fonts API (User-Agent de
 *      browser real para receber declarações WOFF2 em vez de TTF)
 *   2. Extrai as URLs .woff2 do CSS retornado
 *   3. Baixa cada .woff2 em public/fonts/<familia>/<arquivo>.woff2
 *   4. Gera public/fonts/fonts.css com todas as declarações @font-face
 *      apontando para caminhos locais (/fonts/...)
 *   5. Baixa as imagens placeholder do CDN unlayer para public/images/
 *
 * Após rodar, o editor funciona completamente offline para fontes e imagens.
 * ────────────────────────────────────────────────────────────────────────────
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const FONTS_DIR = join(ROOT, 'public', 'fonts')
const IMAGES_DIR = join(ROOT, 'public', 'images')

// User-Agent moderno para que o Google Fonts retorne WOFF2
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

// ─── Famílias de fontes referenciadas em editor.html e editor.js ─────────────
const FONT_FAMILIES: { name: string; query: string }[] = [
  { name: 'Open Sans', query: 'Open+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,300;1,400;1,500;1,600;1,700;1,800' },
  { name: 'Inter', query: 'Inter:wght@100;200;300;400;500;600;700;800;900' },
  { name: 'Cabin', query: 'Cabin:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600;1,700' },
  { name: 'Crimson Text', query: 'Crimson+Text:ital,wght@0,400;0,600;0,700;1,400;1,600;1,700' },
  { name: 'Lato', query: 'Lato:ital,wght@0,100;0,300;0,400;0,700;0,900;1,100;1,300;1,400;1,700;1,900' },
  { name: 'Lobster Two', query: 'Lobster+Two:ital,wght@0,400;0,700;1,400;1,700' },
  { name: 'Montserrat', query: 'Montserrat:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900' },
  { name: 'Old Standard TT', query: 'Old+Standard+TT:ital,wght@0,400;0,700;1,400' },
  { name: 'Pacifico', query: 'Pacifico' },
  { name: 'Playfair Display', query: 'Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,500;1,600;1,700;1,800;1,900' },
  { name: 'Raleway', query: 'Raleway:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900' },
  { name: 'Rubik', query: 'Rubik:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,300;1,400;1,500;1,600;1,700;1,800;1,900' },
  { name: 'Source Sans Pro', query: 'Source+Sans+3:ital,wght@0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900' },
]

// ─── Imagens placeholder do CDN Unlayer ──────────────────────────────────────
const PLACEHOLDER_IMAGES: { url: string; dest: string }[] = [
  {
    url: 'https://cdn.tools.unlayer.com/image/placeholder.png',
    dest: join(IMAGES_DIR, 'placeholder.png'),
  },
  {
    url: 'https://cdn.tools.unlayer.com/carousel/placeholder.png',
    dest: join(IMAGES_DIR, 'carousel-placeholder.png'),
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ensureDir(dir: string) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`)
  return res.text()
}

async function fetchBinary(url: string): Promise<Buffer> {
  const res = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`)
  return Buffer.from(await res.arrayBuffer())
}

/** Extrai as URLs .woff2 de um bloco CSS do Google Fonts */
function extractWoff2Urls(css: string): string[] {
  const re = /url\((https:\/\/fonts\.gstatic\.com\/[^)]+\.woff2)\)/g
  const urls: string[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(css)) !== null) urls.push(m[1])
  return [...new Set(urls)]
}

/**
 * Deriva um nome de arquivo legível a partir da URL do gstatic.
 * Ex: .../s/opensans/v40/memSYaGs126MiZpBA-UvWbX2vVnXBbObj2OVZyOOSr4dVJWUgsjZ0B4taVIGxA.woff2
 *     → opensans_v40_memSY...A.woff2   (truncado para segurança de sistema de arquivos)
 */
function urlToFileName(url: string): string {
  // Pega só o path após o host
  const path = new URL(url).pathname // /s/opensans/v40/memSY...woff2
  const parts = path.split('/').filter(Boolean) // ['s','opensans','v40','memSY...woff2']
  // Usa os últimos 3 segmentos relevantes: família, versão, arquivo
  const relevant = parts.slice(-3) // ['opensans','v40','memSY...woff2']
  return relevant.join('_')
}

// ─── Etapa 1 + 2 + 3 + 4: Fontes ─────────────────────────────────────────────

async function downloadFonts(): Promise<string[]> {
  console.log('\n=== Baixando fontes do Google Fonts ===\n')
  ensureDir(FONTS_DIR)

  const allFontFaceBlocks: string[] = []
  const downloaded: string[] = []

  for (const { name, query } of FONT_FAMILIES) {
    const cssUrl = `https://fonts.googleapis.com/css2?family=${query}&display=swap`
    console.log(`  → ${name}`)

    let css: string
    try {
      css = await fetchText(cssUrl)
    } catch (e) {
      console.warn(`    [AVISO] Falhou ao buscar CSS para ${name}: ${e}`)
      continue
    }

    // Extrai as URLs woff2 do CSS
    const woff2Urls = extractWoff2Urls(css)
    if (woff2Urls.length === 0) {
      console.warn(`    [AVISO] Nenhuma URL woff2 encontrada para ${name}`)
      continue
    }

    // Pasta da família (ex: public/fonts/open-sans/)
    const familySlug = name.toLowerCase().replace(/\s+/g, '-')
    const familyDir = join(FONTS_DIR, familySlug)
    ensureDir(familyDir)

    // Substitui cada URL no CSS pelo caminho local
    let localCss = css
    for (const woff2Url of woff2Urls) {
      const fileName = urlToFileName(woff2Url)
      const localPath = `/fonts/${familySlug}/${fileName}`
      const destFile = join(familyDir, fileName)

      if (!existsSync(destFile)) {
        try {
          const data = await fetchBinary(woff2Url)
          writeFileSync(destFile, data)
          downloaded.push(localPath)
          process.stdout.write('.')
        } catch (e) {
          console.warn(`\n    [AVISO] Falhou ao baixar ${woff2Url}: ${e}`)
        }
      } else {
        downloaded.push(localPath)
        process.stdout.write('·')
      }

      // Troca a URL original pela local no CSS
      localCss = localCss.replace(woff2Url, localPath)
    }
    process.stdout.write('\n')

    // Remove as diretivas @import (não necessárias no CSS local)
    localCss = localCss.replace(/@import[^;]+;/g, '')

    // Adiciona comentário de seção
    allFontFaceBlocks.push(`/* ── ${name} ${'─'.repeat(Math.max(0, 50 - name.length))} */\n${localCss.trim()}`)
  }

  // ─── Gera public/fonts/fonts.css ────────────────────────────────────────────
  const fontsCss = [
    '/*',
    ' * fonts.css — gerado automaticamente por scripts/self-host-assets.ts',
    ' * NÃO edite manualmente. Rode npx tsx scripts/self-host-assets.ts para regenerar.',
    ' */',
    '',
    ...allFontFaceBlocks,
    '',
  ].join('\n')

  writeFileSync(join(FONTS_DIR, 'fonts.css'), fontsCss, 'utf8')
  console.log(`\n  ✓ public/fonts/fonts.css gerado com ${allFontFaceBlocks.length} famílias`)

  return downloaded
}

// ─── Etapa 5: Imagens ─────────────────────────────────────────────────────────

async function downloadImages(): Promise<string[]> {
  console.log('\n=== Baixando imagens placeholder ===\n')
  ensureDir(IMAGES_DIR)

  const saved: string[] = []

  for (const { url, dest } of PLACEHOLDER_IMAGES) {
    const fileName = dest.split('/').pop()!
    try {
      const data = await fetchBinary(url)
      writeFileSync(dest, data)
      saved.push(`public/images/${fileName}`)
      console.log(`  ✓ ${fileName}`)
    } catch (e) {
      console.warn(`  [AVISO] Falhou ao baixar ${url}: ${e}`)
    }
  }

  return saved
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗')
  console.log('║         Unlayer — Self-Host Assets Downloader                ║')
  console.log('╚══════════════════════════════════════════════════════════════╝')

  const fontFiles = await downloadFonts()
  const imageFiles = await downloadImages()

  console.log('\n=== Relatório Final ===\n')
  console.log(`  Fontes baixadas  : ${fontFiles.length} arquivos woff2`)
  console.log(`  Imagens salvas   : ${imageFiles.length} arquivos`)
  console.log('\n  Arquivos gerados:')
  console.log('    public/fonts/fonts.css')
  imageFiles.forEach((f) => console.log(`    ${f}`))
  console.log('\n  Próximos passos:')
  console.log('    1. npm run dev')
  console.log('    2. Abrir o editor de templates')
  console.log('    3. DevTools → Network: verificar ausência de googleapis.com, gstatic.com, unlayer.com')
  console.log('')
}

main().catch((e) => {
  console.error('\n[ERRO FATAL]', e)
  process.exit(1)
})
