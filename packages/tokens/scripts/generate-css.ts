/**
 * 从 tokens 包生成 Tailwind CSS 主题变量
 * 用法: tsx generate-css.ts <输出路径>
 *
 * Web / Desktop 各自的 generate:css 脚本调用此文件，传入各自的输出路径
 */
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { toKebabCase } from '@nicenote/shared'
import {
  borderRadius,
  colors,
  darkColors,
  darkShadowWeb,
  duration,
  easing,
  FONT_MONO_STACK,
  FONT_SANS_STACK,
  fontSize,
  fontWeight,
  shadowWeb,
  spacing,
  zIndex,
} from '@nicenote/tokens'

type Palette = Record<keyof typeof colors, string>
type VarEntry = [name: string, value: string]
type VarSection = {
  title: string
  entries: VarEntry[]
}

function typedEntries<const T extends Record<string, unknown>>(
  value: T
): [keyof T & string, T[keyof T]][] {
  return Object.entries(value) as [keyof T & string, T[keyof T]][]
}

const COLOR_SECTIONS: VarSection[] = [
  {
    title: 'Primary colors',
    entries: [
      ['color-primary', 'primary'],
      ['color-primary-hover', 'primaryHover'],
      ['color-primary-active', 'primaryActive'],
      ['color-primary-focus', 'primaryFocus'],
      ['color-primary-disabled', 'primaryDisabled'],
      ['color-primary-text', 'primaryText'],
      ['color-primary-bg', 'primaryBg'],
      ['color-primary-foreground', 'textInverse'],
    ],
  },
  {
    title: 'Secondary colors',
    entries: [
      ['color-secondary', 'secondary'],
      ['color-secondary-hover', 'secondaryHover'],
      ['color-secondary-active', 'secondaryActive'],
      ['color-secondary-disabled', 'secondaryDisabled'],
      ['color-secondary-text', 'secondaryText'],
      ['color-secondary-bg', 'secondaryBg'],
      ['color-secondary-foreground', 'var(--color-foreground)'],
    ],
  },
  {
    title: 'Background and foreground',
    entries: [
      ['color-background', 'bgBase'],
      ['color-foreground', 'textPrimary'],
    ],
  },
  {
    title: 'Muted',
    entries: [
      ['color-muted', 'bgMuted'],
      ['color-muted-foreground', 'textSecondary'],
    ],
  },
  {
    title: 'Border',
    entries: [
      ['color-border', 'border'],
      ['color-ring', 'borderFocus'],
    ],
  },
  {
    title: 'Accent',
    entries: [
      ['color-accent', 'var(--color-hover)'],
      ['color-accent-foreground', 'var(--color-hover-foreground)'],
    ],
  },
  {
    title: 'Active state',
    entries: [
      ['color-active', 'bgActive'],
      ['color-active-foreground', 'var(--color-primary-text)'],
    ],
  },
  {
    title: 'Hover state',
    entries: [
      ['color-hover', 'bgHover'],
      ['color-hover-foreground', 'var(--color-primary-text)'],
    ],
  },
  {
    title: 'Destructive',
    entries: [
      ['color-destructive', 'error'],
      ['color-destructive-hover', 'errorHover'],
      ['color-destructive-foreground', 'var(--color-primary-foreground)'],
      ['color-destructive-text', 'errorText'],
      ['color-destructive-bg', 'errorBg'],
      ['color-destructive-border', 'errorBorder'],
    ],
  },
  {
    title: 'Success',
    entries: [
      ['color-success', 'success'],
      ['color-success-hover', 'successHover'],
      ['color-success-text', 'successText'],
      ['color-success-bg', 'successBg'],
      ['color-success-border', 'successBorder'],
    ],
  },
  {
    title: 'Warning',
    entries: [
      ['color-warning', 'warning'],
      ['color-warning-hover', 'warningHover'],
      ['color-warning-text', 'warningText'],
      ['color-warning-bg', 'warningBg'],
      ['color-warning-border', 'warningBorder'],
    ],
  },
  {
    title: 'Info',
    entries: [
      ['color-info', 'info'],
      ['color-info-hover', 'infoHover'],
      ['color-info-text', 'infoText'],
      ['color-info-bg', 'infoBg'],
      ['color-info-border', 'infoBorder'],
    ],
  },
  {
    title: 'Popover',
    entries: [
      ['color-popover', 'var(--color-background)'],
      ['color-popover-foreground', 'var(--color-foreground)'],
    ],
  },
  {
    title: 'Card',
    entries: [
      ['color-card', 'var(--color-background)'],
      ['color-card-foreground', 'var(--color-foreground)'],
    ],
  },
]

function toSpacingTokenKey(value: string): string {
  return toKebabCase(value).replace(/\./g, '\\.')
}

function toFontWeightTokenKey(value: string): string {
  if (value === 'regular') return 'normal'
  if (value === 'semi-bold') return 'semibold'
  return value
}

function toRem(value: number): string {
  if (value === 0) return '0'
  return `${Number((value / 16).toFixed(4))}rem`
}

function toDurationSeconds(value: number): string {
  if (value === 0) return '0s'
  return `${Number((value / 1000).toFixed(3))}s`
}

function normalizeCssValue(value: string): string {
  return value.replace(/#([0-9A-F]{3,8})\b/g, (match) => match.toLowerCase())
}

function resolveColor(palette: Palette, value: string): string {
  if (value in palette) {
    return palette[value as keyof Palette]
  }
  return value
}

function buildBaseSections(): VarSection[] {
  return [
    {
      title: 'Typography',
      entries: [
        ['font-sans', FONT_SANS_STACK],
        ['font-mono', FONT_MONO_STACK],
        ...typedEntries(fontSize).flatMap(([key, value]): VarEntry[] => [
          [`text-${toKebabCase(key)}`, toRem(value.size)],
          [`text-${toKebabCase(key)}--line-height`, toRem(value.lineHeight)],
        ]),
        ...typedEntries(fontWeight).map(
          ([key, value]): VarEntry => [
            `font-weight-${toFontWeightTokenKey(toKebabCase(key))}`,
            String(value),
          ]
        ),
      ],
    },
    {
      title: 'Radius',
      entries: typedEntries(borderRadius).map(
        ([key, value]): VarEntry => [`radius-${toKebabCase(key)}`, toRem(value)]
      ),
    },
    {
      title: 'Spacing',
      entries: [
        ['spacing', toRem(spacing[1])],
        ...typedEntries(spacing).map(
          ([key, value]): VarEntry => [`spacing-${toSpacingTokenKey(key)}`, toRem(value)]
        ),
      ],
    },
    {
      title: 'Shadows',
      entries: typedEntries(shadowWeb).map(
        ([key, value]): VarEntry => [`shadow-${toKebabCase(key)}`, value]
      ),
    },
    {
      title: 'Motion',
      entries: [
        ...typedEntries(duration).map(
          ([key, value]): VarEntry => [
            `motion-duration-${toKebabCase(key)}`,
            toDurationSeconds(value),
          ]
        ),
        ...typedEntries(easing).map(
          ([key, value]): VarEntry => [`motion-easing-${toKebabCase(key)}`, value]
        ),
      ],
    },
    {
      title: 'Z-Index',
      entries: typedEntries(zIndex).map(
        ([key, value]): VarEntry => [`z-index-${toKebabCase(key)}`, String(value)]
      ),
    },
  ]
}

function buildColorSections(palette: Palette): VarSection[] {
  return COLOR_SECTIONS.map((section) => ({
    title: section.title,
    entries: section.entries.map(([name, value]): VarEntry => [name, resolveColor(palette, value)]),
  }))
}

function buildDarkShadowSection(): VarSection {
  return {
    title: 'Shadows',
    entries: typedEntries(darkShadowWeb).map(
      ([key, value]): VarEntry => [`shadow-${toKebabCase(key)}`, value]
    ),
  }
}

function buildThemeBlock(
  selector: string,
  palette: Palette,
  options: { includeBase?: boolean; includeDarkShadows?: boolean; comment?: string } = {}
): string {
  const { includeBase = false, includeDarkShadows = false, comment } = options
  const sections = [
    ...(includeBase ? buildBaseSections() : []),
    ...buildColorSections(palette),
    ...(includeDarkShadows ? [buildDarkShadowSection()] : []),
  ]
  const lines: string[] = [`${selector} {`]

  if (comment) {
    lines.push(`  /* ${comment} */`, '')
  }

  for (const section of sections) {
    lines.push(`  /* ${section.title} */`)
    for (const [name, value] of section.entries) {
      lines.push(`  --${name}: ${normalizeCssValue(value)};`)
    }
    lines.push('')
  }

  lines.push('}')

  return lines.join('\n')
}

// 生成 CSS 内容
const themeCSS = buildThemeBlock('@theme', colors, {
  includeBase: true,
  comment: 'Auto-generated from @nicenote/tokens — do not edit manually',
})
const darkThemeCSS = buildThemeBlock('.dark', darkColors, { includeDarkShadows: true })

const generatedTokensContent = `/* Auto-generated from @nicenote/tokens — do not edit manually */

${themeCSS}

/* Dark mode */
${darkThemeCSS}
`

// 从 CLI 参数获取输出路径
const outputPath = process.argv[2]
if (!outputPath) {
  console.error('❌ 请指定输出路径，例如: tsx generate-css.ts ./src/generated-tokens.css')
  process.exit(1)
}

writeFileSync(resolve(outputPath), generatedTokensContent, 'utf-8')
console.log(`✅ Theme CSS generated successfully → ${outputPath}`)
