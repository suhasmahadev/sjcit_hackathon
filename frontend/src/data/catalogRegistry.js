/**
 * catalogRegistry.js
 * Central registry for all catalogs (CBSE and State).
 * Maps (boardId, classId, subjectId) → catalog object.
 */

import { getBoardInteractiveCatalog, hasBoardInteractiveCatalog } from './boardSyllabus'

const EAGER_CATALOGS = {
}

const LAZY_CATALOG_LOADERS = {
  'state:class-12:biology': () => import('./State/catalogs/class-12/biology'),
  'state:class-12:chemistry': () => import('./State/catalogs/class-12/chemistry'),
  'state:class-12:computer-science': () => import('./State/catalogs/class-12/computer-science'),
  'state:class-12:electronics': () => import('./State/catalogs/class-12/electronics'),
  'state:class-12:english': () => import('./State/catalogs/class-12/english'),
  'state:class-12:hindi': () => import('./State/catalogs/class-12/hindi'),
  'state:class-12:kannada': () => import('./State/catalogs/class-12/kannada'),
  'state:class-12:mathematics': () => import('./State/catalogs/class-12/mathematics'),
  'state:class-12:physics': () => import('./State/catalogs/class-12/physics'),
  'state:class-12:sanskrit': () => import('./State/catalogs/class-12/sanskrit'),
  
}

const _cache = {}

export function getCatalogKey(classId, subjectId, boardId = 'state') {
  return `${normalizeBoardId(boardId)}:${classId}:${subjectId}`
}

export function getEagerCatalog(classId, subjectId, boardId = 'state') {
  return EAGER_CATALOGS[getCatalogKey(classId, subjectId, boardId)] ?? null
}

export async function loadCatalog(classId, subjectId, boardId = 'state') {
  const safeBoardId = normalizeBoardId(boardId)
  const key = getCatalogKey(classId, subjectId, safeBoardId)

  if (EAGER_CATALOGS[key]) return EAGER_CATALOGS[key]
  if (_cache[key]) return _cache[key]

  const loader = LAZY_CATALOG_LOADERS[key]
  if (!loader) return getBoardInteractiveCatalog(classId, subjectId, safeBoardId)

  try {
    const module = await loader()
    const catalog = module.default ?? Object.values(module)[0]
    _cache[key] = catalog
    return catalog
  } catch (err) {
    console.error(`[catalogRegistry] Failed to load catalog for ${key}:`, err)
    return getBoardInteractiveCatalog(classId, subjectId, safeBoardId)
  }
}

export function hasCatalog(classId, subjectId, boardId = 'state') {
  const safeBoardId = normalizeBoardId(boardId)
  const key = getCatalogKey(classId, subjectId, safeBoardId)
  return key in EAGER_CATALOGS || key in LAZY_CATALOG_LOADERS || hasBoardInteractiveCatalog(classId, subjectId, safeBoardId)
}

export function getCatalogChapter(catalog, chapterId) {
  return catalog?.chapters?.find(c => c.id === chapterId) ?? null
}

export function getCatalogTopic(catalog, chapterId, topicId) {
  return getCatalogChapter(catalog, chapterId)?.topics?.find(t => t.id === topicId) ?? null
}

export function getAllLoadedCatalogs() {
  return [ ...Object.values(EAGER_CATALOGS), ...Object.values(_cache) ]
}

function normalizeBoardId(boardId) {
  return boardId === 'cbse' ? 'cbse' : 'state'
}
