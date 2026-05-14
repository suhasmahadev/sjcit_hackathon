import stateClass1 from './State/class 1/knowledge.json'
import stateClass2 from './State/class 2/knowledge.json'
import stateClass3 from './State/class 3/knowledge.json'
import stateClass4 from './State/class 4/knowledge.json'
import stateClass5 from './State/class 5/knowledge.json'
import stateClass6 from './State/class 6/knowledge.json'
import stateClass7 from './State/class 7/knowledge.json'
import stateClass8 from './State/class 8/knowledge.json'
import stateClass9 from './State/class 9/knowledge.json'
import stateClass10 from './State/class 10/knowledge.json'
import stateClass11 from './State/class 11/knowledge.json'
import stateClass12 from './State/class 12/knowledge.json'

import cbseClass1 from './CBSE/class-1.json'
import cbseClass2 from './CBSE/class-2.json'
import cbseClass3 from './CBSE/class-3.json'
import cbseClass4 from './CBSE/class-4.json'
import cbseClass5 from './CBSE/class-5.json'
import cbseClass6 from './CBSE/class-6.json'
import cbseClass7 from './CBSE/class-7.json'
import cbseClass8 from './CBSE/class-8.json'
import cbseClass9 from './CBSE/class-9.json'
import cbseClass10 from './CBSE/class-10.json'
import cbseClass11 from './CBSE/class-11.json'
import cbseClass12 from './CBSE/class-12.json'

const BOARD_LABELS = {
  state: 'State Board',
  cbse: 'CBSE',
}

const BOARD_DATASETS = {
  state: [
    stateClass1,
    stateClass2,
    stateClass3,
    stateClass4,
    stateClass5,
    stateClass6,
    stateClass7,
    stateClass8,
    stateClass9,
    stateClass10,
    stateClass11,
    stateClass12,
  ],
  cbse: [
    cbseClass1,
    cbseClass2,
    cbseClass3,
    cbseClass4,
    cbseClass5,
    cbseClass6,
    cbseClass7,
    cbseClass8,
    cbseClass9,
    cbseClass10,
    cbseClass11,
    cbseClass12,
  ],
}

const ROMAN_CLASS_LABELS = {
  1: 'Class I',
  2: 'Class II',
  3: 'Class III',
  4: 'Class IV',
  5: 'Class V',
  6: 'Class VI',
  7: 'Class VII',
  8: 'Class VIII',
  9: 'Class IX',
  10: 'Class X',
  11: 'Class XI',
  12: 'Class XII',
}

const SUBJECT_SLUG_ALIASES = {
  'computer science': 'computer-science',
  'physical education': 'physical-education',
  'social science': 'social-science',
  environmental: 'evs',
  'environmental studies': 'evs',
}

const normalizedCache = new Map()

export function getBoardLabel(boardId = 'state') {
  return BOARD_LABELS[normalizeBoardId(boardId)] ?? BOARD_LABELS.state
}

export function getBoardSyllabusCatalog(boardId = 'state') {
  return getNormalizedBoard(boardId)
}

export function getBoardSyllabusClass(classSlug, boardId = 'state') {
  return getNormalizedBoard(boardId).classes.find((classItem) => classItem.class_slug === classSlug) ?? null
}

export function getBoardSyllabusSubject(classSlug, subjectSlug, boardId = 'state') {
  return getBoardSyllabusClass(classSlug, boardId)?.subjects.find((subject) => subject.subject_slug === subjectSlug) ?? null
}

export function getBoardInteractiveCatalog(classId, subjectId, boardId = 'state') {
  const classData = getBoardSyllabusClass(classId, boardId)
  const subjectData = classData?.subjects.find((subject) => subject.subject_slug === subjectId)

  if (!classData || !subjectData) return null

  return {
    classId: classData.class_slug,
    classLabel: classData.class_label,
    subject: subjectData.subject_label,
    board: getBoardLabel(boardId),
    chapters: subjectData.chapters.map((chapter, chapterIndex) => ({
      id: chapter.chapter_id,
      number: chapter.chapter_number ?? chapterIndex + 1,
      title: chapter.chapter_title,
      topics: chapter.topics.map((topic, topicIndex) => ({
        id: topic.topic_id,
        title: topic.topic_title,
        description: topic.description,
        duration: topic.duration ?? '10 min',
        difficulty: topic.difficulty ?? 'foundation',
        learningObjectives: topic.learning_objectives ?? [],
        questions: buildTopicQuestions(topic, subjectData.subject_label),
        misconceptions: buildTopicMisconceptions(topic),
        animationType: topic.animation_type,
      })),
    })),
  }
}

export function hasBoardInteractiveCatalog(classId, subjectId, boardId = 'state') {
  return Boolean(getBoardInteractiveCatalog(classId, subjectId, boardId))
}

function getNormalizedBoard(boardId = 'state') {
  const safeBoardId = normalizeBoardId(boardId)
  if (normalizedCache.has(safeBoardId)) return normalizedCache.get(safeBoardId)

  const classes = BOARD_DATASETS[safeBoardId]
    .map((classData) => normalizeClass(classData, safeBoardId))
    .sort((left, right) => classNumberFromSlug(right.class_slug) - classNumberFromSlug(left.class_slug))

  const catalog = {
    board_id: safeBoardId,
    board_label: getBoardLabel(safeBoardId),
    total_pages: classes.reduce((sum, classItem) => sum + classItem.total_pages, 0),
    classes,
  }

  normalizedCache.set(safeBoardId, catalog)
  return catalog
}

function normalizeClass(classData, boardId) {
  const classNumber = getClassNumber(classData)
  const subjects = getSubjects(classData)
    .map((subject) => normalizeSubject(subject, classNumber, boardId))
    .filter((subject) => subject.chapter_count > 0)
    .sort((left, right) => left.subject_label.localeCompare(right.subject_label))

  const totalTopics = subjects.reduce((sum, subject) => sum + subject.topic_count, 0)

  return {
    class_slug: `class-${String(classNumber).padStart(2, '0')}`,
    class_label: ROMAN_CLASS_LABELS[classNumber] ?? `Class ${classNumber}`,
    board_id: boardId,
    board_label: getBoardLabel(boardId),
    academic_year: classData.academic_year,
    medium: classData.medium ?? classData.mediums_available?.[0] ?? 'English',
    total_pages: Math.max(totalTopics * 8, subjects.length * 80),
    subject_count: subjects.length,
    subjects,
  }
}

function normalizeSubject(subject, classNumber, boardId) {
  const subjectLabel = subject.subject_name ?? subject.name ?? 'Subject'
  const subjectSlug = slugify(subjectLabel)
  const chapters = getChapters(subject)
    .map((chapter, index) => normalizeChapter(chapter, index, subjectLabel, classNumber, subjectSlug, boardId))
    .filter((chapter) => chapter.topics.length > 0)

  const topicCount = chapters.reduce((sum, chapter) => sum + chapter.topics.length, 0)
  const documents = buildDocuments(subject, classNumber, subjectLabel, subjectSlug, chapters)

  return {
    subject_slug: subjectSlug,
    subject_label: subjectLabel,
    textbook: subject.textbook,
    total_pages: Math.max(topicCount * 8, chapters.length * 12, 40),
    document_count: documents.length,
    chapter_count: chapters.length,
    topic_count: topicCount,
    toc_document_count: documents.length,
    documents,
    chapters,
  }
}

function normalizeChapter(chapter, index, subjectLabel, classNumber, subjectSlug, boardId) {
  const chapterNumber = chapter.chapter_number ?? chapter.chapter_no ?? index + 1
  const chapterIdNumber = index + 1
  const chapterTitle = chapter.chapter_title ?? chapter.chapter_name ?? chapter.unit ?? `Chapter ${chapterNumber}`
  const topics = normalizeTopics(chapter, chapterTitle).map((topicTitle, topicIndex) => ({
    topic_id: `ch${chapterIdNumber}-t${topicIndex + 1}`,
    topic_title: topicTitle,
    description: buildTopicDescription(topicTitle, chapterTitle, subjectLabel, boardId),
    duration: topicIndex === 0 ? '12 min' : '8 min',
    difficulty: topicIndex === 0 ? 'foundation' : 'core',
    learning_objectives: [
      `Understand ${topicTitle} in the context of ${chapterTitle}.`,
      `Connect ${topicTitle} with examples from the ${subjectLabel} syllabus.`,
    ],
    animation_type: getAnimationType(subjectSlug, classNumber, chapterNumber, topicTitle, topicIndex),
  }))

  return {
    chapter_id: `ch${chapterIdNumber}`,
    chapter_number: chapterNumber,
    chapter_title: chapterTitle,
    topics,
  }
}

function normalizeTopics(chapter, chapterTitle) {
  const rawTopics = chapter.topics ?? chapter.concepts ?? chapter.formulas ?? []

  if (Array.isArray(rawTopics) && rawTopics.length > 0) {
    return rawTopics.map((topic) => {
      if (typeof topic === 'string') return topic
      return topic.topic_name ?? topic.title ?? topic.name ?? topic.concept ?? String(topic)
    })
  }

  return [chapterTitle]
}

function getSubjects(classData) {
  if (Array.isArray(classData.subjects)) return classData.subjects

  if (Array.isArray(classData.streams)) {
    return classData.streams.flatMap((stream) => (
      stream.subjects?.map((subject) => ({
        ...subject,
        stream_name: stream.stream_name,
      })) ?? []
    ))
  }

  return []
}

function getChapters(subject) {
  if (Array.isArray(subject.chapters)) return subject.chapters

  if (Array.isArray(subject.parts)) {
    return subject.parts.flatMap((part) => (
      part.chapters?.map((chapter) => ({
        ...chapter,
        part_label: part.part,
      })) ?? []
    ))
  }

  if (Array.isArray(subject.concepts)) {
    return subject.concepts.map((concept, index) => ({
      chapter_no: index + 1,
      chapter_name: concept.unit ?? concept.chapter_name ?? concept.title,
      topics: concept.topics ?? concept.concepts ?? [],
    }))
  }

  return []
}

function buildDocuments(subject, classNumber, subjectLabel, subjectSlug, chapters) {
  const officialBooks = subject.official_books ?? (subject.textbook ? [subject.textbook] : [])
  const books = officialBooks.length > 0 ? officialBooks : [`${subjectLabel} Textbook`]

  return books.map((book, index) => {
    const chapterCount = Math.max(1, Math.ceil(chapters.length / books.length))
    const pageCount = Math.max(40, chapterCount * 12)

    return {
      document_id: `${subjectSlug}-${index + 1}`,
      document_title: book,
      document_kind: 'textbook',
      part_label: books.length > 1 ? `Part ${index + 1}` : null,
      chapter_count: chapterCount,
      page_count: pageCount,
      total_pages: pageCount,
      toc_entry_count: chapters.reduce((sum, chapter) => sum + chapter.topics.length, 0),
      toc_quality: 'structured',
      file_size_bytes: pageCount * 48_000,
      file_name: `${slugify(book)}-class-${classNumber}.pdf`,
      relative_pdf_path: `class-${String(classNumber).padStart(2, '0')}/${subjectSlug}/${slugify(book)}.pdf`,
      class_label: ROMAN_CLASS_LABELS[classNumber] ?? `Class ${classNumber}`,
      class_slug: `class-${String(classNumber).padStart(2, '0')}`,
      subject_slug: subjectSlug,
      subject_label: subjectLabel,
      chapters,
    }
  })
}

function buildTopicDescription(topicTitle, chapterTitle, subjectLabel, boardId) {
  return `${topicTitle} is part of ${chapterTitle} in ${subjectLabel}. Read the idea first, note the important terms, and use the visual only when you want an additional explanation.`
}

function buildTopicQuestions(topic, subjectLabel) {
  return [
    {
      id: `${topic.topic_id}-q1`,
      text: `Explain ${topic.topic_title} in your own words.`,
      hint: `Start with the meaning of ${topic.topic_title}, then add one example.`,
      expectedConcepts: [topic.topic_title, subjectLabel],
      estimatedTime: '3 min',
    },
  ]
}

function buildTopicMisconceptions(topic) {
  return [
    {
      id: `${topic.topic_id}-m1`,
      probe: `Is ${topic.topic_title} only a definition to memorize?`,
      options: [
        'Yes, memorizing the words is enough',
        'No, it should be understood through meaning and examples',
      ],
      correctIndex: 1,
      correction: `${topic.topic_title} is easier to remember when you connect it with meaning, examples, and applications.`,
      detectKeywords: ['memorize', 'definition'],
    },
  ]
}

function getAnimationType(subjectSlug, classNumber, chapterNumber, topicTitle, topicIndex) {
  const lowerTopic = topicTitle.toLowerCase()

  if (subjectSlug === 'physics' && classNumber === 12) {
    if (chapterNumber === 1 && lowerTopic.includes('coulomb')) return 'coulombsLaw'
    if (chapterNumber === 1 && lowerTopic.includes('charge')) return 'electricCharge'
    if (chapterNumber === 4 || lowerTopic.includes('magnetic')) return 'magneticField'
  }

  return topicIndex === 0 && subjectSlug === 'physics' ? 'electricCharge' : null
}

function getClassNumber(classData) {
  const value = String(classData.class ?? '').match(/\d+/)?.[0]
  return Number(value || 1)
}

function classNumberFromSlug(classSlug) {
  return Number(String(classSlug).match(/\d+/)?.[0] ?? 0)
}

function normalizeBoardId(boardId) {
  return boardId === 'cbse' ? 'cbse' : 'state'
}

function slugify(value) {
  const normalized = String(value)
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return SUBJECT_SLUG_ALIASES[normalized.replace(/-/g, ' ')] ?? normalized
}
