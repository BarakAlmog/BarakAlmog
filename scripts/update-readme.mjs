#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs'

const USER = 'BarakAlmog'
const README = 'README.md'

const gh = async (path) => {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'readme-updater',
      ...(process.env.GH_TOKEN ? { Authorization: `Bearer ${process.env.GH_TOKEN}` } : {}),
    },
  })
  if (!res.ok) throw new Error(`GitHub API ${path}: ${res.status} ${res.statusText}`)
  return res.json()
}

const replaceBlock = (content, marker, body) => {
  const start = `<!-- ${marker}_START -->`
  const end = `<!-- ${marker}_END -->`
  const re = new RegExp(`${start}[\\s\\S]*?${end}`)
  return content.replace(re, `${start}\n${body}\n${end}`)
}

const main = async () => {
  const user = await gh(`/users/${USER}`)
  const repos = await gh(`/users/${USER}/repos?per_page=100&sort=updated`)

  const totalStars = repos.reduce((sum, r) => sum + r.stargazers_count, 0)

  const stats = `
<div align="center">

![Repos](https://img.shields.io/badge/Public_Repos-${user.public_repos}-4f46e5?style=for-the-badge&logo=github)
![Followers](https://img.shields.io/badge/Followers-${user.followers}-0a66c2?style=for-the-badge&logo=github)
![Stars](https://img.shields.io/badge/Total_Stars-${totalStars}-f59e0b?style=for-the-badge&logo=github)

</div>`.trim()

  const topRepos = repos
    .filter((r) => !r.fork && !r.private && r.name.toLowerCase() !== USER.toLowerCase())
    .sort((a, b) => b.stargazers_count - a.stargazers_count)
    .slice(0, 6)

  const recent = repos
    .filter((r) => !r.fork)
    .slice(0, 5)
    .map((r) => {
      const when = new Date(r.pushed_at).toISOString().slice(0, 10)
      return `- [\`${r.name}\`](${r.html_url}) - ${r.description ?? 'No description'} _(updated ${when})_`
    })
    .join('\n')

  const featured = topRepos
    .map((r) => `- ⭐ **[${r.name}](${r.html_url})** (${r.stargazers_count}) - ${r.description ?? 'No description'}`)
    .join('\n')

  const reposBody = `
## ⭐ Featured repositories

${featured || '_No public repos yet._'}

## 🔄 Recently updated

${recent || '_Nothing recent._'}

<sub>Last sync: \`${new Date().toISOString()}\`</sub>`.trim()

  let content = readFileSync(README, 'utf8')
  content = replaceBlock(content, 'DYNAMIC_STATS', stats)
  content = replaceBlock(content, 'DYNAMIC_REPOS', reposBody)
  writeFileSync(README, content)
  console.log('README updated.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
